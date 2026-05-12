from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import io
import PyPDF2
import spacy
import re
import requests
import json
from pydantic import BaseModel
import re
from datetime import datetime, timedelta
import numpy as np # La magia para los días hábiles
from pydantic import BaseModel
from typing import List

class MensajeChat(BaseModel):
    rol: str  # "user" o "assistant"
    contenido: str

class ChatRequest(BaseModel):
    query: str
    texto_expediente: str
    historial: list[MensajeChat] = []  # Usamos list nativo de Python
    datos_extraidos: dict = {}

# Inicialización de la API del Sistema de Análisis Automatizado
app = FastAPI(
    title="API SIGEJA - Juzgados de Familia",
    description="Motor de análisis de expedientes digitales alimentarios",
    version="1.0.0"
)

# Configurar CORS para permitir que el frontend web (React) se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción limitar al dominio de la app web
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar el modelo NLP en español
try:
    nlp = spacy.load("es_core_news_sm")
except OSError:
    print("Advertencia: El modelo 'es_core_news_sm' no está instalado. Ejecuta: python -m spacy download es_core_news_sm")
    nlp = None

# --- MÓDULOS DE PROCESAMIENTO (PIPELINE) ---

def modulo_ocr_tesseract(contenido_pdf: bytes) -> str:
    """
    Extrae el texto del expediente digital.
    MVP: Intenta extraer texto nativo primero. Si está vacío (es un escaneo),
    se requerirá OCR profundo con Tesseract.
    """
    texto_extraido = ""
    try:
        # Usamos io.BytesIO para leer el archivo en memoria sin guardarlo en disco
        lector_pdf = PyPDF2.PdfReader(io.BytesIO(contenido_pdf))
        
        for num_pagina in range(len(lector_pdf.pages)):
            pagina = lector_pdf.pages[num_pagina]
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                texto_extraido += texto_pagina + "\n"
        
        # Limpieza básica del texto para los Juzgados del Callao
        texto_extraido = texto_extraido.replace("..", "").replace("\n\n", "\n").strip()
        
        if not texto_extraido:
            # Si el texto está vacío, significa que el PDF son puras imágenes escaneadas
            print("Advertencia: El PDF no contiene texto nativo. Se requiere Tesseract OCR.")
            texto_extraido = "[TEXTO NO DETECTADO - REQUIERE OCR PROFUNDO]"
            # Aquí irá la lógica de pdf2image + pytesseract en la siguiente iteración
            
    except Exception as e:
        print(f"Error al leer el PDF: {e}")
        raise ValueError("El archivo PDF está corrupto o no se puede leer.")

    return texto_extraido

def modulo_ner_spacy(texto_plano: str) -> dict:
    """
    Versión 7.0: Anclaje Narrativo y Filtro Anti-OCR.
    Ignora tablas rotas y extrae nombres y DNIs directamente de los párrafos continuos.
    """
    import json, re, requests

    entidades = {
        "demandante": {"nombre": "No detectado", "dni": "No detectado"},
        "demandado": {"nombre": "No detectado", "dni": "No detectado"},
        "monto_solicitado": 0.0
    }

    def estandarizar_nombre(texto):
        if not texto or texto.upper() in ["NO DETECTADO", "NULL", ""]: return "No detectado"
        limpio = re.sub(r'\s+', ' ', texto).strip().upper()
        # Quitamos ruido de OCR o prefijos
        for prefijo in ['PARTE ', 'LA ', 'EL ', 'DON ', 'DOÑA ']:
            if limpio.startswith(prefijo): limpio = limpio[len(prefijo):]
        # Invertimos si tiene coma (APELLIDO, NOMBRE -> NOMBRE APELLIDO)
        if ',' in limpio:
            partes = limpio.split(',', 1)
            limpio = f"{partes[1].strip()} {partes[0].strip()}"
        return limpio

    # 1. EXTRACCIÓN DE MONTO
    match_monto = re.search(r'(?:petitorio|pensión|solicit[oa]|suma de|fija.*?en).{0,60}?(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)', texto_plano, re.IGNORECASE)
    if match_monto:
        entidades["monto_solicitado"] = float(match_monto.group(1).replace(',', ''))
    else:
        montos = re.findall(r'(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)', texto_plano)
        for m in montos:
            val = float(m.replace(',', ''))
            if val > 100.0:
                entidades["monto_solicitado"] = val
                break

    # 2. EXTRACCIÓN POR ANCLAJE NARRATIVO (La solución a tu imagen)
    # Buscamos en el párrafo continuo, donde el nombre siempre está seguido de "identificada" o "con DNI"
    # Esto ignora totalmente el expediente porque un expediente nunca dice "identificado con DNI"
    
    # -- DEMANDANTE --
    match_demte = re.search(r'DEMANDANTE\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]+?)\s*,\s*(?:identificad[ao]|con\s+docu|con\s+D\.?N\.?I)', texto_plano, re.IGNORECASE)
    if match_demte:
        entidades["demandante"]["nombre"] = match_demte.group(1)
        # Buscamos el DNI en los 150 caracteres siguientes (Proximidad exacta)
        frag_dni = texto_plano[match_demte.end():match_demte.end()+150]
        match_d = re.search(r'(\d{8})', frag_dni)
        if match_d: entidades["demandante"]["dni"] = match_d.group(1)

    # -- DEMANDADO --
    match_demdo = re.search(r'(?:DEMANDAD[OA]|contra)\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]+?)\s*,\s*(?:identificad[ao]|domiciliad[ao]|con\s+docu)', texto_plano, re.IGNORECASE)
    if match_demdo:
        entidades["demandado"]["nombre"] = match_demdo.group(1)
        frag_dni_demdo = texto_plano[match_demdo.end():match_demdo.end()+150]
        match_dd = re.search(r'(\d{8})', frag_dni_demdo)
        if match_dd: entidades["demandado"]["dni"] = match_dd.group(1)

    # 3. RESPALDO INTELIGENTE CON MISTRAL (Por si el párrafo tiene otro formato)
    if entidades["demandante"]["nombre"] == "No detectado" or entidades["demandado"]["nombre"] == "No detectado":
        fragmento_inicial = texto_plano[:2500]
        prompt_ner = f"""
        Extrae las partes procesales del texto.
        REGLAS:
        - NO extraigas números de expediente (ej. 01639-2014...). Los nombres solo tienen letras.
        - NO extraigas al "JUEZ".
        TEXTO: {fragmento_inicial}
        Responde SOLO JSON: {{"demandante_nombre": "...", "demandante_dni": "...", "demandado_nombre": "...", "demandado_dni": "..."}}
        """
        try:
            res = requests.post("http://localhost:11434/api/generate", json={"model": "mistral", "prompt": prompt_ner, "format": "json", "stream": False, "options": {"temperature": 0.0}}, timeout=35)
            ia_ner = json.loads(res.json().get("response", "{}"))

            if entidades["demandante"]["nombre"] == "No detectado":
                nom = str(ia_ner.get("demandante_nombre", "")).upper()
                if not re.search(r'\d', nom) and "JUEZ" not in nom: # Seguro anti-expedientes
                    entidades["demandante"]["nombre"] = nom
                    
            if entidades["demandado"]["nombre"] == "No detectado":
                nom = str(ia_ner.get("demandado_nombre", "")).upper()
                if not re.search(r'\d', nom) and "JUEZ" not in nom:
                    entidades["demandado"]["nombre"] = nom

            # DNIs
            if entidades["demandante"]["dni"] == "No detectado":
                dni_d = re.search(r'(\d{8})', str(ia_ner.get("demandante_dni", "")))
                if dni_d: entidades["demandante"]["dni"] = dni_d.group(1)
            if entidades["demandado"]["dni"] == "No detectado":
                dni_dd = re.search(r'(\d{8})', str(ia_ner.get("demandado_dni", "")))
                if dni_dd: entidades["demandado"]["dni"] = dni_dd.group(1)
        except:
            pass

    # 4. RED DE SEGURIDAD PARA DNIS 
    if entidades["demandante"]["dni"] == "No detectado" or entidades["demandado"]["dni"] == "No detectado":
        dnis_globales = re.findall(r'(?<!\d)\d{8}(?!\d)', texto_plano)
        dnis_unicos = list(dict.fromkeys(dnis_globales))
        if entidades["demandante"]["dni"] == "No detectado" and len(dnis_unicos) > 0:
            entidades["demandante"]["dni"] = dnis_unicos[0]
        if entidades["demandado"]["dni"] == "No detectado" and len(dnis_unicos) > 1:
            for d in dnis_unicos:
                if d != entidades["demandante"]["dni"]:
                    entidades["demandado"]["dni"] = d
                    break

    # 5. ESTANDARIZACIÓN FINAL (Aplica para Mistral y Python)
    entidades["demandante"]["nombre"] = estandarizar_nombre(entidades["demandante"]["nombre"])
    entidades["demandado"]["nombre"] = estandarizar_nombre(entidades["demandado"]["nombre"])

    return entidades

def modulo_extraccion_plazos(texto_plano: str) -> dict:
    """
    Extrae fechas clave del documento y calcula los días hábiles transcurridos.
    Utiliza expresiones regulares adaptadas a la redacción jurídica peruana.
    """
    # Diccionario de meses para convertir texto a número
    meses = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
        "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
        "noviembre": 11, "diciembre": 12
    }

    # 1. Buscar la fecha de presentación (Ej: "Callao, 08 de mayo del 2026")
    fecha_presentacion_str = None
    fecha_presentacion_obj = datetime.now() # Fallback al día de hoy si no se encuentra
    
    # Regex para capturar "DD de [Mes] de/del YYYY"
    patron_fecha = r'(\d{1,2})\s+de\s+([a-zA-Z]+)\s+d[e|el]+\s+(\d{4})'
    fechas_encontradas = re.findall(patron_fecha, texto_plano.lower())

    if fechas_encontradas:
        # Tomamos la última fecha encontrada (suele ser la firma al final del documento)
        dia, mes_str, anio = fechas_encontradas[-1]
        mes_num = meses.get(mes_str, 1)
        try:
            fecha_presentacion_obj = datetime(int(anio), mes_num, int(dia))
            fecha_presentacion_str = fecha_presentacion_obj.strftime("%d/%m/%Y")
        except ValueError:
            pass

    # Si no encontró el formato largo, busca el formato corto (DD/MM/YYYY)
    if not fecha_presentacion_str:
        fechas_cortas = re.findall(r'(\d{2})[-/](\d{2})[-/](\d{4})', texto_plano)
        if fechas_cortas:
            dia, mes, anio = fechas_cortas[-1]
            fecha_presentacion_obj = datetime(int(anio), int(mes), int(dia))
            fecha_presentacion_str = fecha_presentacion_obj.strftime("%d/%m/%Y")
        else:
            fecha_presentacion_str = datetime.now().strftime("%d/%m/%Y") # Asume hoy como presentación

    # 2. Simulación de Fecha de Notificación (En SIPLAN-ALIM-PE esto vendría de la BD del SINOE)
    # Para la tesis, asumiremos que fue notificado 6 días calendario antes de la presentación
    fecha_notificacion_obj = fecha_presentacion_obj - timedelta(days=6)
    fecha_notificacion_str = fecha_notificacion_obj.strftime("%d/%m/%Y")

    # 3. Cálculo matemático de Días Hábiles usando NumPy
    # Convertimos a formato fecha nativo de numpy (YYYY-MM-DD)
    inicio_np = np.datetime64(fecha_notificacion_obj.strftime('%Y-%m-%d'))
    fin_np = np.datetime64(fecha_presentacion_obj.strftime('%Y-%m-%d'))
    
    # busday_count excluye sábados y domingos automáticamente
    dias_habiles = int(np.busday_count(inicio_np, fin_np))

    # 4. Lógica Procesal (Proceso Único de Familia: 5 días para contestar)
    estado = "Dentro del Plazo"
    observacion = "Presentación oportuna."
    
    if dias_habiles > 5:
        estado = "Vencido"
        observacion = f"Excedió el plazo legal por {dias_habiles - 5} día(s) hábil(es)."

    return {
        "fecha_notificacion": fecha_notificacion_str,
        "fecha_presentacion": fecha_presentacion_str,
        "dias_transcurridos": dias_habiles,
        "estado": estado,
        "observacion": observacion
    }

def modulo_verificacion_admisibilidad(texto_plano: str) -> list:
    """
    Escanea el texto en busca de menciones a los anexos obligatorios 
    para procesos de alimentos.
    """
    texto_min = texto_plano.lower()
    
    # Definimos los requisitos y las palabras clave que los identifican
    requisitos = [
        {
            "anexo": "DNI del Demandante",
            "keywords": [r"dni", r"documento nacional de identidad", r"copia de mi documento"]
        },
        {
            "anexo": "Partida de Nacimiento",
            "keywords": [r"partida de nacimiento", r"acta de nacimiento", r"nacimiento del menor"]
        },
        {
            "anexo": "Pruebas de Capacidad",
            "keywords": [r"boletas de pago", r"recibos de honorarios", r"estado de cuenta", r"ingresos"]
        },
        {
            "anexo": "Certificado Domiciliario",
            "keywords": [r"certificado domiciliario", r"recibo de luz", r"recibo de agua", r"domicilio"]
        }
    ]

    analisis_admisibilidad = []

    for req in requisitos:
        encontrado = False
        for pattern in req["keywords"]:
            if re.search(pattern, texto_min):
                encontrado = True
                break
        
        analisis_admisibilidad.append({
            "anexo": req["anexo"],
            "estado": "encontrado" if encontrado else "no encontrado"
        })

    return analisis_admisibilidad

def modulo_auditoria_financiera(texto_plano: str, monto_p_spacy: float):
    """
    Versión 5.1: Mapeo Atómico Dinámico.
    Garantiza precisión de centavos y se adapta a cualquier monto de petitorio.
    """
    import json, re

    # 1. ESCANEO INICIAL: Python encuentra los montos reales
    patron_monto = r'(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)'
    matches = list(re.finditer(patron_monto, texto_plano))
    
    mapeo_montos = {}
    
    for i, match in enumerate(matches):
        valor_raw = match.group(1).replace(',', '')
        try:
            valor_float = float(valor_raw)
            token = f"[[MONTO_ID_{i}]]"
            mapeo_montos[token] = valor_float
        except: continue

    # 2. PROMPT DE CLASIFICACIÓN
    fragmentos = re.findall(r'([^.]{0,70}(?:S/|S/\.)\s*\d+(?:[.,]\d{1,2})?[^.]{0,70})', texto_plano)
    contexto_ia = "\n".join(fragmentos)

    prompt_ia = f"""
    Eres un perito contable judicial. Tu tarea es categorizar los montos encontrados.
    
    TEXTO A ANALIZAR:
    {contexto_ia}

    INSTRUCCIONES:
    - Identifica el PETITORIO (Pensión total que se pide en la demanda).
    - Identifica gastos de ALIMENTACIÓN (comida, mercado).
    - Identifica gastos de SALUD (farmacia, medicinas).
    - Devuelve solo el monto que veas en el texto.

    Responde ESTRICTAMENTE con este JSON:
    {{
      "petitorio_detectado": 0.0,
      "gastos": [
        {{ "concepto": "Salud/Alimentación", "monto_exacto": 0.0 }}
      ]
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {"model": "mistral", "prompt": prompt_ia, "format": "json", "stream": False, "options": {"temperature": 0}}
        
        response = requests.post(url, json=payload, timeout=45)
        raw_res = json.loads(response.json().get("response", "{}"))

        # --- LÓGICA DE NEGOCIO DINÁMICA ---
        
        # Le damos prioridad a spaCy (que es más exacto con la estructura del documento) 
        # Si spaCy falló (0.0), confiamos en lo que detectó Mistral.
        pa_ia = float(raw_res.get("petitorio_detectado", 0))
        pa = monto_p_spacy if monto_p_spacy > 0 else pa_ia

        detalles_ia = raw_res.get("gastos") or []
        suma_gn = 0
        detalles_finales = []

        for g in detalles_ia:
            monto_ia = float(g.get("monto_exacto", 0))
            monto_real = monto_ia
            
            # Recuperamos los decimales exactos mapeando con el escaneo de Python
            for token_val in mapeo_montos.values():
                if abs(token_val - monto_ia) < 1.0: 
                    monto_real = token_val
                    break
            
            # Condición dinámica: el gasto no puede ser igual al petitorio detectado
            if monto_real > 0 and abs(monto_real - pa) > 10:
                detalles_finales.append({
                    "concepto": g.get("concepto"),
                    "monto": monto_real,
                    "evidencia": "Detección por contexto legal"
                })
                suma_gn += monto_real

        # Cálculo de la Brecha B = Pa - Σ Gn
        brecha = pa - suma_gn
        porcentaje_b = (brecha / pa * 100) if pa > 0 else 0

        return {
            "petitorio": pa,
            "suma_gastos_sustentados": round(suma_gn, 2),
            "brecha_valor": round(brecha, 2),
            "porcentaje_brecha": round(abs(porcentaje_b), 1),
            "detalles_gastos": detalles_finales,
            "alerta": porcentaje_b > 15.0
        }

    except Exception as e:
        # El bloque except también debe ser dinámico, usando monto_p_spacy
        print(f"Error en auditoría financiera: {e}")
        return {"petitorio": monto_p_spacy, "suma_gastos_sustentados": 0, "brecha_valor": monto_p_spacy, "porcentaje_brecha": 100, "detalles_gastos": [], "alerta": True}

def modulo_rag_mistral(texto_plano: str, entidades: dict) -> dict:
    """
    Versión Pro: Genera síntesis legales exhaustivas y detalladas
    optimizadas para el sistema judicial de familia.
    """
    if not texto_plano or texto_plano == "[TEXTO NO DETECTADO - REQUIERE OCR PROFUNDO]":
        return {
            "resumen": "No se pudo generar síntesis por falta de texto procesable.",
            "postura": "Desconocida.",
            "puntos_controvertidos": []
        }

    # 1. Prompt de Alta Definición (Evitamos la palabra "breve")
    prompt = f"""
    Eres un Secretario Judicial Senior de la Corte Superior del Callao. 
    Tu objetivo es realizar un análisis técnico EXHAUSTIVO del expediente.

    INSTRUCCIONES DE DETALLE:
    - En 'resumen': Describe los hechos, el vínculo familiar, las necesidades específicas del menor mencionadas y la fundamentación legal (artículos del Código Civil).
    - En 'postura': Si existe contestación, detalla los argumentos de defensa, si el demandado admite o niega el vínculo, y cuál es su situación económica declarada. 
    - Si no hay contestación, escribe "Pendiente de contestación: El expediente solo contiene la etapa postulatoria de demanda".

    TEXTO DEL EXPEDIENTE:
    {texto_plano[:8000]} 

    Responde ESTRICTAMENTE en este formato JSON:
    {{
        "resumen": "Análisis detallado de hechos, derecho y pretensión...",
        "postura": "Análisis minucioso de la defensa y contrapropuesta...",
        "puntos_controvertidos": ["punto fáctico 1", "punto jurídico 2", "punto económico 3"]
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "mistral",
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.1,   # <--- CLAVE 1: Cercano a 0 para que no varíe entre pruebas
                "num_ctx": 8192,      # <--- CLAVE 2: Amplía la memoria para leer expedientes largos
                "top_p": 0.9,
                "repeat_penalty": 1.2 # <--- Evita que la IA se repita y la obliga a buscar palabras nuevas
            }
        }
        
        response = requests.post(url, json=payload, timeout=90)
        response.raise_for_status()
        
        analisis_json = json.loads(response.json().get("response", "{}"))
        
        return {
            "resumen": analisis_json.get("resumen", "Error en síntesis detallada."),
            "postura": analisis_json.get("postura", "Error en análisis de defensa."),
            "puntos_controvertidos": analisis_json.get("puntos_controvertidos", [])
        }

    except Exception as e:
        print(f"Error crítico en RAG: {e}")
        return {"resumen": "Error de conexión.", "postura": "Error.", "puntos_controvertidos": []}

# --- ENDPOINTS (API) ---

@app.post("/api/v1/analyze-document")
async def analizar_expediente(file: UploadFile = File(...)):
    """
    Endpoint principal. Recibe un PDF y devuelve el JSON completo del análisis.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se admiten expedientes en formato digital PDF.")

    try:
        # 1. Lectura del archivo (Ingesta)
        contenido = await file.read()
        
        # 2. Pipeline de Análisis
        texto_extraido = modulo_ocr_tesseract(contenido)
        entidades_ner = modulo_ner_spacy(texto_extraido)
        monto_p = float(entidades_ner.get("monto_solicitado", 0) or 0)
        analisis_llm = modulo_rag_mistral(texto_extraido, entidades_ner)
        analisis_plazos = modulo_extraccion_plazos(texto_extraido)
        analisis_admisibilidad = modulo_verificacion_admisibilidad(texto_extraido)
        analisis_financiero = modulo_auditoria_financiera(texto_extraido, monto_p)
        
        # 3. Ensamblar la respuesta JSON para el frontend
        respuesta = {
            "status": "success",
            "texto_completo": texto_extraido,
            "metadata": {
                "archivo": file.filename,
                "juzgado": "Familia",
            },
            "resultados": {
                "sujetos_procesales": entidades_ner,
                "sintesis_rag": analisis_llm["resumen"],
                "postura_defensa": analisis_llm["postura"],
                "puntos_sugeridos": analisis_llm["puntos_controvertidos"],
                # Mocks temporales para llenar el dashboard

                "plazos": analisis_plazos,

                "admisibilidad": analisis_admisibilidad,
                "revision_financiera": analisis_financiero
            }
        }
        return respuesta
        
    except Exception as e:
        import traceback
        traceback.print_exc() # Esto hará que el error salga en tu consola de Python
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/chat")
async def chat_expediente(request: ChatRequest):
    if not request.texto_expediente:
        raise HTTPException(status_code=400, detail="El texto del expediente es requerido.")

    prompt_conversacion = ""
    if request.historial:
        for msg in request.historial[-4:]:
            prefijo = "Abogado: " if msg.rol == "user" else "SIPLAN: "
            prompt_conversacion += f"{prefijo}{msg.contenido}\n"

    # Extraemos los nombres del diccionario que nos mandará React
    dem_nombre = request.datos_extraidos.get("demandante", {}).get("nombre", "Desconocido")
    demdo_nombre = request.datos_extraidos.get("demandado", {}).get("nombre", "Desconocido")

    # Prompt evolucionado con inyección de contexto estructurado
    prompt_sistema = f"""
    Eres 'SIPLAN-Chat', un asistente legal de inteligencia artificial para los Juzgados del Callao.
    
    DATOS CLAVE YA VERIFICADOS (Úsalos como guía absoluta):
    - Parte Demandante (quien pide alimentos): {dem_nombre}
    - Parte Demandada (a quien se le pide): {demdo_nombre}
    
    REGLAS ESTRICTAS:
    1. Distingue claramente a los sujetos procesales (Demandante/Demandado) del personal judicial (Jueces, Especialistas Legales, Abogados).
    2. Lee cuidadosamente el primer párrafo y el encabezado para identificar al Juez a cargo.
    3. Si la respuesta NO está en el texto, di: "No hay información sobre esto en el documento analizado."
    4. Sé conciso y directo.

    TEXTO DEL EXPEDIENTE (Contexto bruto):
    {request.texto_expediente[:8000]}

    HISTORIAL RECIENTE:
    {prompt_conversacion}

    Abogado: {request.query}
    SIPLAN:
    """
    
    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "mistral",
            "prompt": prompt_sistema,
            "stream": False,
            "options": {
                "temperature": 0.1, 
                "num_ctx": 8192
            }
        }
        
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        return {"respuesta": data.get("response", "").strip()}
        
    except Exception as e:
        print(f"Error en Chat IA: {e}")
        raise HTTPException(status_code=500, detail="Error de comunicación con LLM.")

# Punto de entrada para levantar el servidor localmente
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)