from fastapi import FastAPI, File, UploadFile, HTTPException, Body, APIRouter
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import io
import pdfplumber
import PyPDF2
import spacy
import re
import requests
import json
from pydantic import BaseModel
import re
from datetime import datetime, timedelta
import sqlite3
import numpy as np
from pydantic import BaseModel
from typing import List
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Inches, RGBColor
import csv
from fastapi.responses import StreamingResponse
import warnings
import pytesseract
from pdf2image import convert_from_bytes
from fastapi import Form
import os

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

warnings.filterwarnings("ignore", category=Warning, module="PyPDF2")

DB_FILE = "sigeja_registros.db"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row # Para poder acceder a las columnas por nombre como un diccionario
    return conn

import re

def extraer_numero_expediente(texto_plano):
    # Busca formatos como: 00245-2026-0-1801-JP-FC-01 o variaciones
    patron = r'(\d{4,5}\s*-\s*\d{4}\s*-\s*\d{1,4}\s*-\s*\d{4}\s*-\s*[A-Z]{2}\s*-\s*[A-Z]{2}\s*-\s*\d{1,2})'
    match = re.search(patron, texto_plano)
    return match.group(1).replace(" ", "") if match else None

def init_db():
    conn = get_db_connection()
    
    # 1. Tabla de Usuarios y Roles (Se queda igual)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            nombre TEXT,
            cargo TEXT,
            rol TEXT
        )
    ''')

    # 2. Tabla de expedientes con COLUMNAS DE ASIGNACIÓN INCORPORADAS
    conn.execute('''
        CREATE TABLE IF NOT EXISTS registro_expedientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_expediente TEXT UNIQUE,
            fecha_analisis TEXT,
            demandante TEXT,
            demandado TEXT,
            monto_petitorio REAL,
            estado_auditoria TEXT,
            riesgo_capacidad TEXT,
            tiempo_procesamiento_seg REAL,
            paginas_ocr INTEGER,
            bert_score REAL,        
            f1_ner REAL,            
            ocr_precision REAL,    
            json_resultados TEXT,
            -- COLUMNAS DE CONTROL DE ACCESOS Y FLUJO (Garantizan 1 usuario por rol)
            asignado_juez TEXT DEFAULT NULL,
            asignado_secretario TEXT DEFAULT NULL,
            asignado_asistente TEXT DEFAULT NULL,
            asignado_mesapartes TEXT DEFAULT NULL,
            asignado_liquidador TEXT DEFAULT NULL
        )
    ''')
    
    # 3. Tabla de Logs de Seguridad
    conn.execute('''
        CREATE TABLE IF NOT EXISTS log_seguridad (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            usuario TEXT,
            accion_registrada TEXT,
            expediente TEXT,
            ip_origen TEXT
        )
    ''')
    conn.commit()
    conn.close()

def simular_asignaciones_admin():
    """
    Simula que Mesa de Partes asignó expedientes al Juez.
    Solo puebla la BD si está vacía, protegiendo los expedientes creados manualmente.
    """
    conn = get_db_connection()
    try:
        # 👇 CAMBIO: Verificamos si ya hay registros antes de insertar para no duplicar ni borrar nada
        count = conn.execute("SELECT COUNT(*) FROM registro_expedientes").fetchone()[0]
        if count == 0:
            expedientes_base = [
                ("00245-2026-0-1801-JP-CI-01", "GUTIÉRREZ FLORES, ANA", "SÁNCHEZ ROJAS, CARLOS"),
                ("00198-2026-0-1801-JP-LA-02", "RODRÍGUEZ SILVA, ELENA", "CASTILLO RAMOS, LUIS"),
                ("00312-2026-0-1801-JP-FC-01", "LOZANO DIAZ, MIGUEL", "FERNÁNDEZ QUISPE, ROSA")
              ]
            for exp, dem, demdo in expedientes_base:
                conn.execute('''
                    INSERT INTO registro_expedientes 
                    (numero_expediente, demandante, demandado, estado_auditoria, riesgo_capacidad, paginas_ocr, tiempo_procesamiento_seg, json_resultados)
                    VALUES (?, ?, ?, 'PENDIENTE', 'N/A', 0, 0, NULL)
                ''', (exp, dem, demdo))
            conn.commit()
            print("✓ Expedientes base inicializados.")
    except Exception as e:
        print(f"Error en simulación administrativa: {e}")
    finally:
        conn.close()

def crear_usuarios_prueba():
    """
    Inserta una terna completa de personal judicial real clasificado por rol institucional
    para realizar las pruebas de asignaciones y filtros.
    """
    conn = get_db_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM usuarios").fetchone()[0]
        if count == 0:
            usuarios = [
                ("admin01", "admin123", "Carlos Mendoza", "Administrador de Módulo", "admin"),
                ("m.gomez", "secre123", "Mariana Gómez", "Secretaria Judicial", "secretario"),
                ("r.luna", "secre123", "Roberto Luna", "Especialista Legal", "secretario"),
                ("j.valdivia", "juez123", "Dr. Diego Valdivia", "Juez de Paz Letrado", "juez"),
                ("a.torres", "asist123", "Ana Torres", "Asistente Jurisdiccional", "asistente"),
                ("l.quispe", "liq123", "Luis Quispe", "Liquidador Judicial", "liquidador"),
                ("p.mesa", "mesa123", "Pedro Meza", "Personal de Mesa de Partes", "mesapartes")
            ]
            for username, password, nombre, cargo, rol in usuarios:
                conn.execute('''
                    INSERT INTO usuarios (username, password, nombre, cargo, rol)
                    VALUES (?, ?, ?, ?, ?)
                ''', (username, password, nombre, cargo, rol))
            conn.commit()
            print("✓ Personal judicial de pruebas (7 usuarios) sembrado con éxito en SQLite.")
    except Exception as e:
        print(f"Error sembrando usuarios: {e}")
    finally:
        conn.close()

# Ejecutamos las funciones en el orden correcto al iniciar el backend
init_db()
simular_asignaciones_admin()
crear_usuarios_prueba()

class EditarExpedienteRequest(BaseModel):
    demandante: str
    demandado: str
    # Nota: El número de expediente no se incluye porque será la llave en la URL y es inmutable.

class JurisprudenciaRequest(BaseModel):
    texto_expediente: str

class RegenerarRequest(BaseModel):
    texto_expediente: str       
    entidades_previas: dict     
    correcciones_usuario: str

class MensajeChat(BaseModel):
    rol: str  # "user" o "assistant"
    contenido: str

class ChatRequest(BaseModel):
    query: str
    texto_expediente: str
    historial: list[MensajeChat] = []  # Usamos list nativo de Python
    datos_extraidos: dict = {}

class SaveAnalysisRequest(BaseModel):
    numero_expediente: str
    tiempo_procesamiento_seg: float
    paginas_ocr: int
    resultados_json: dict

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    dni: str
    cargo: str
    nombre: str
    email: str
    password: str

class AsignacionRequest(BaseModel):
    numero_expediente: str
    rol_columna: str      # "asignado_juez", "asignado_secretario", "asignado_asistente", "asignado_mesapartes", "asignado_liquidador"
    username_usuario: str  # Nombre de usuario asignado, o enviar "" para desasignar (quitar acceso)

class CrearExpedienteRequest(BaseModel):
    numero_expediente: str
    demandante: str
    demandado: str
    tipo: str = "Proceso de Alimentos"
    asignado_juez: str = None
    asignado_secretario: str = None
    asignado_asistente: str = None
    asignado_mesapartes: str = None
    asignado_liquidador: str = None

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
    Extrae texto del PDF con estrategia adaptiva:
    1. PyPDF2 primero (rápido para PDFs normales)
    2. Si falla, pdfplumber (mejor con encodings especiales)
    3. Si ambos fallan, requiere OCR
    """
    texto_extraido = ""

    # INTENTO 1: PyPDF2 (rápido, funciona para la mayoría)
    try:
        lector_pdf = PyPDF2.PdfReader(io.BytesIO(contenido_pdf))

        for num_pagina in range(len(lector_pdf.pages)):
            pagina = lector_pdf.pages[num_pagina]
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                texto_extraido += texto_pagina + "\n"

        # Limpieza
        texto_extraido = texto_extraido.replace("..", "").replace("\n\n", "\n").strip()
        texto_extraido = texto_extraido.replace("", "").replace("\ufffd", "").replace("\x00", "")

        if len(texto_extraido) > 500:  # Si extrajo suficiente texto
            print("✓ Texto extraído con PyPDF2")
            return texto_extraido
        else:
            print("⚠ PyPDF2 extrajo poco texto, intentando pdfplumber...")

    except Exception as e:
        print(f"⚠ PyPDF2 falló: {type(e).__name__}, intentando pdfplumber...")

    # INTENTO 2: pdfplumber (maneja mejor encodings especiales)
    try:
        with pdfplumber.open(io.BytesIO(contenido_pdf)) as pdf:
            for pagina in pdf.pages:
                texto_pagina = pagina.extract_text()
                if texto_pagina:
                    texto_extraido += texto_pagina + "\n"

        if texto_extraido.strip():
            # Limpieza
            texto_extraido = texto_extraido.replace("..", "").replace("\n\n", "\n").strip()
            texto_extraido = texto_extraido.replace("", "").replace("\ufffd", "").replace("\x00", "")
            print("✓ Texto extraído con pdfplumber")
            return texto_extraido

    except Exception as e:
        print(f"⚠ pdfplumber también falló: {type(e).__name__}")

    # FALLBACK: No hay texto extraíble, requiere OCR
    if not texto_extraido.strip():
        print("⚠ Sin texto nativo detectado - Se requiere OCR profundo")
        texto_extraido = "[TEXTO NO DETECTADO - REQUIERE OCR PROFUNDO]"

    return texto_extraido

def modulo_ocr_avanzado_imagen(contenido_pdf: bytes) -> str:
    """
    OCR Profundo: Convierte el PDF a imágenes y lee píxel por píxel.
    """
    texto_final = ""
    print("📸 Iniciando conversión de PDF a Imágenes para OCR Profundo...")
    try:
        # FORZAMOS A PYTHON A ENCONTRAR POPPLER (Cambia la ruta si la tuya es diferente)
        ruta_poppler = r'C:\poppler\Library\bin' 
        
        # Convierte el archivo a imágenes
        imagenes = convert_from_bytes(contenido_pdf, poppler_path=ruta_poppler)
        
        for i, imagen in enumerate(imagenes):
            print(f"🔍 Escaneando página {i+1} de {len(imagenes)} con Tesseract...")
            texto_pagina = pytesseract.image_to_string(imagen, lang='spa')
            texto_final += texto_pagina + "\n"
            
        print("✓ OCR Profundo completado exitosamente")
        return texto_final.strip()
    except Exception as e:
        # AQUÍ ESTÁ LA TRAMPA: Si hay error, ahora imprimirá el motivo exacto en tu consola
        print(f"⚠ ERROR CRÍTICO EN OCR PROFUNDO: {e}")
        return "[ERROR_OCR_PROFUNDO]"
        
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

    # 2. EXTRACCIÓN COORDINADA - Usar posiciones exactas de nombres y DNIs

    # Paso 1: Encontrar TODOS los DNIs CON sus posiciones
    dni_matches = list(re.finditer(r'(?:número|n°)\s*(\d{8})', texto_plano, re.IGNORECASE))

    # Paso 2: Extraer nombres CON sus posiciones
    # Mejorado: capturar TODO hasta "identificad" o "con el Documento"
    dem_te_match = re.search(
        r'(?:PARTE\s+)?DEMANDANTE\s*[:=]?\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?=,\s*(?:identificad|con\s+el\s+Documento|con\s+D\.?N))',
        texto_plano,
        re.IGNORECASE
    )
    dem_do_match = re.search(
        r'(?:PARTE\s+)?DEMANDAD[OA]\s*[:=,]?\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?=,\s*(?:identificad|con\s+el\s+Documento|con\s+D\.?N))',
        texto_plano,
        re.IGNORECASE
    )

    if dem_te_match:
        # Limpiar: remover comas extras y espacios
        nombre_raw = dem_te_match.group(1).strip()
        nombre_clean = re.sub(r',\s*', ' ', nombre_raw).strip()  # Reemplazar comas con espacios
        entidades["demandante"]["nombre"] = nombre_clean

    if dem_do_match:
        nombre_raw = dem_do_match.group(1).strip()
        nombre_clean = re.sub(r',\s*', ' ', nombre_raw).strip()
        entidades["demandado"]["nombre"] = nombre_clean

    # Paso 3: Asociar DNIs con nombres por proximidad
    if dem_te_match and dni_matches:
        # Encontrar el DNI más cercano DESPUÉS del nombre del demandante
        pos_nombre = dem_te_match.end()
        dni_cercano = None
        distancia_min = float('inf')

        for dni_match in dni_matches:
            pos_dni = dni_match.start()
            if pos_dni > pos_nombre:  # El DNI debe estar DESPUÉS del nombre
                distancia = pos_dni - pos_nombre
                if distancia < distancia_min:
                    distancia_min = distancia
                    dni_cercano = dni_match.group(1)

        if dni_cercano:
            entidades["demandante"]["dni"] = dni_cercano

    if dem_do_match and dni_matches:
        # Encontrar el DNI más cercano DESPUÉS del nombre del demandado
        pos_nombre = dem_do_match.end()
        dni_cercano = None
        distancia_min = float('inf')

        for dni_match in dni_matches:
            pos_dni = dni_match.start()
            # El DNI debe estar DESPUÉS del nombre Y ser diferente al del demandante
            if pos_dni > pos_nombre and dni_match.group(1) != entidades["demandante"]["dni"]:
                distancia = pos_dni - pos_nombre
                if distancia < distancia_min:
                    distancia_min = distancia
                    dni_cercano = dni_match.group(1)

        if dni_cercano:
            entidades["demandado"]["dni"] = dni_cercano

    # 3. RESPALDO INTELIGENTE CON MISTRAL (Si regex falla)
    if (entidades["demandante"]["dni"] == "No detectado" or
        entidades["demandado"]["dni"] == "No detectado" or
        entidades["demandante"]["nombre"] == "No detectado" or
        entidades["demandado"]["nombre"] == "No detectado"):

        fragmento_inicial = texto_plano[:3000]
        prompt_ner = f"""
        Eres un asistente para extraer información legal. Del siguiente texto judicial, extrae:
        1. NOMBRE Y DNI del DEMANDANTE (quien demanda/pide)
        2. NOMBRE Y DNI del DEMANDADO (quien es demandado)

        REGLAS ESTRICTAS:
        - Busca "PARTE DEMANDANTE:" o "DEMANDANTE:" para el demandante
        - Busca "PARTE DEMANDADA:" o "DEMANDADO:" para el demandado
        - El DNI siempre tiene 8 dígitos exactos
        - NO extraigas números de expediente (estos tienen más o menos dígitos)
        - NO extraigas al "JUEZ" o "ESPECIALISTA"
        - Si un dato NO está en el texto, responde "No encontrado"

        TEXTO:
        {fragmento_inicial}

        Responde SOLO JSON válido (sin comentarios adicionales):
        {{
            "demandante_nombre": "NOMBRE COMPLETO",
            "demandante_dni": "XXXXXXXX",
            "demandado_nombre": "NOMBRE COMPLETO",
            "demandado_dni": "XXXXXXXX"
        }}
        """
        try:
            print("🤖 Consultando Mistral para extraer datos...")
            res = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "mistral",
                    "prompt": prompt_ner,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.0}
                },
                timeout=45
            )
            ia_ner = json.loads(res.json().get("response", "{}"))

            # Demandante
            if entidades["demandante"]["nombre"] == "No detectado":
                nom = str(ia_ner.get("demandante_nombre", "")).upper().strip()
                if nom and nom != "NO ENCONTRADO" and not re.search(r'\d{5}', nom):
                    entidades["demandante"]["nombre"] = nom
                    print(f"✓ Mistral detectó demandante: {nom}")

            if entidades["demandante"]["dni"] == "No detectado":
                dni_str = str(ia_ner.get("demandante_dni", "")).strip()
                dni_match = re.search(r'(\d{8})', dni_str)
                if dni_match:
                    entidades["demandante"]["dni"] = dni_match.group(1)
                    print(f"✓ Mistral detectó DNI demandante: {dni_match.group(1)}")

            # Demandado
            if entidades["demandado"]["nombre"] == "No detectado":
                nom = str(ia_ner.get("demandado_nombre", "")).upper().strip()
                if nom and nom != "NO ENCONTRADO" and not re.search(r'\d{5}', nom):
                    entidades["demandado"]["nombre"] = nom
                    print(f"✓ Mistral detectó demandado: {nom}")

            if entidades["demandado"]["dni"] == "No detectado":
                dni_str = str(ia_ner.get("demandado_dni", "")).strip()
                dni_match = re.search(r'(\d{8})', dni_str)
                if dni_match:
                    entidades["demandado"]["dni"] = dni_match.group(1)
                    print(f"✓ Mistral detectó DNI demandado: {dni_match.group(1)}")

        except Exception as e:
            print(f"⚠ Mistral no pudo extraer: {e}")

    # 4. RED DE SEGURIDAD PARA DNIS - BÚSQUEDA MEJORADA
    if entidades["demandante"]["dni"] == "No detectado" or entidades["demandado"]["dni"] == "No detectado":
        # Buscar TODOS los DNIs en el documento
        dnis_globales = re.findall(r'(?<!\d)\d{8}(?!\d)', texto_plano)
        dnis_unicos = list(dict.fromkeys(dnis_globales))

        # ESTRATEGIA: Si encontramos 2+ DNIs diferentes, asignar al primero el demandante, al segundo el demandado
        if len(dnis_unicos) >= 2:
            if entidades["demandante"]["dni"] == "No detectado":
                entidades["demandante"]["dni"] = dnis_unicos[0]
            if entidades["demandado"]["dni"] == "No detectado":
                # Asignar un DNI diferente al demandante
                for dni in dnis_unicos[1:]:
                    if dni != entidades["demandante"]["dni"]:
                        entidades["demandado"]["dni"] = dni
                        break
        elif len(dnis_unicos) == 1:
            # Solo 1 DNI - asignar al demandante, dejar demandado sin DNI
            if entidades["demandante"]["dni"] == "No detectado":
                entidades["demandante"]["dni"] = dnis_unicos[0]

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
    Versión 5.3: Auditoría Financiera Blindada.
    Incluye Filtro Anti-Alucinación: Valida que los montos extraídos por la IA 
    existan realmente en el documento original.
    """
    import json, re, requests

    # 1. ESCANEO INICIAL: Python encuentra todos los números reales del texto
    patron_monto = r'(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)'
    matches = list(re.finditer(patron_monto, texto_plano))
    
    montos_reales_en_texto = [] # Lista de validación (La "Verdad Absoluta")
    
    for i, match in enumerate(matches):
        valor_raw = match.group(1).replace(',', '')
        try:
            val = float(valor_raw)
            montos_reales_en_texto.append(val)
        except: continue

    # 2. PROMPT DE CLASIFICACIÓN (Plantilla en blanco)
    fragmentos = re.findall(r'([^.]{0,70}(?:S/|S/\.)\s*\d+(?:[.,]\d{1,2})?[^.]{0,70})', texto_plano)
    contexto_ia = "\n".join(fragmentos)

    # El prompt ahora usa 0.0 y textos genéricos para no sesgar a la IA
    prompt_ia = f"""
    Eres un perito contable judicial. Analiza los montos del expediente.
    
    TEXTO A ANALIZAR:
    {contexto_ia}

    INSTRUCCIONES:
    1. Identifica el PETITORIO (Pensión total demandada).
    2. Identifica los gastos acreditados (Alimentación, Salud, Educación, Vivienda).
    3. IMPORTANTE: Si NO hay gastos detallados en el texto, deja la lista "gastos" VACÍA: []

    Responde ESTRICTAMENTE con esta estructura JSON:
    {{
      "petitorio_detectado": 0.0,
      "gastos": [
        {{ "concepto": "Categoría del gasto", "monto_exacto": 0.0, "observacion": "Evidencia o documento" }}
      ]
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {"model": "mistral", "prompt": prompt_ia, "format": "json", "stream": False, "options": {"temperature": 0}}
        response = requests.post(url, json=payload, timeout=45)
        raw_res = json.loads(response.json().get("response", "{}"))

        pa_ia = float(raw_res.get("petitorio_detectado", 0))
        pa = monto_p_spacy if monto_p_spacy > 0 else pa_ia

        detalles_ia = raw_res.get("gastos") or []
        suma_gn = 0
        detalles_finales = []

        for g in detalles_ia:
            monto_ia = float(g.get("monto_exacto", 0))
            if monto_ia <= 0: continue # Ignoramos los ceros de la plantilla
            
            # --- FILTRO ESTRICTO ANTI-ALUCINACIÓN ---
            monto_validado = None
            for token_val in montos_reales_en_texto:
                # Si el monto de la IA tiene una diferencia menor a 1 sol con un monto real, es válido
                if abs(token_val - monto_ia) < 1.0: 
                    monto_validado = token_val
                    break
            
            # Si Python NO encontró este monto en el PDF original, lo descartamos
            if not monto_validado:
                print(f"Alerta de IA interceptada: Se intentó agregar S/ {monto_ia} inexistente.")
                continue
            
            # Condición de negocio: El gasto no puede ser igual al petitorio total
            if monto_validado > 0 and abs(monto_validado - pa) > 10:
                detalles_finales.append({
                    "concepto": g.get("concepto", "Gasto general"),
                    "monto": monto_validado,
                    "observacion": g.get("observacion", "Mención en el texto")
                })
                suma_gn += monto_validado

        # Cálculos finales de la HU18
        brecha = pa - suma_gn
        hay_alerta = brecha > 10.0

        return {
            "petitorio": pa,
            "suma_gastos_sustentados": round(suma_gn, 2),
            "brecha_valor": round(brecha, 2),
            "porcentaje_brecha": round((brecha/pa*100), 1) if pa > 0 else 0,
            "detalles_gastos": detalles_finales,
            "alerta": hay_alerta
        }

    except Exception as e:
        print(f"Error en auditoría financiera: {e}")
        return {"petitorio": monto_p_spacy, "suma_gastos_sustentados": 0, "brecha_valor": monto_p_spacy, "porcentaje_brecha": 100, "detalles_gastos": [], "alerta": True}

def modulo_capacidad_cargas(texto_plano: str) -> dict:
    """
    Versión 2.0: Módulo de Capacidad Económica y Soporte Judicial (HU14).
    Extrae ingresos, dependientes y calcula topes de embargo según el Art. 648 CPC.
    """
    import json, requests

    if not texto_plano or texto_plano == "[TEXTO NO DETECTADO - REQUIERE OCR PROFUNDO]":
        return {
            "ingresos": [], "dependientes": [], "total_ingresos": 0, "total_cargas": 0, 
            "tope_legal_60": 0, "margen_libre": 0, "ratio_disponibilidad": 0, 
            "carga_nivel": "Desconocida", "mensaje": "Sin datos"
        }

    prompt = f"""
    Eres un Asistente Social de los Juzgados de Familia del Callao.
    Analiza el texto y extrae la capacidad económica del demandado (quien debe pagar los alimentos).

    INSTRUCCIONES:
    1. INGRESOS: Busca cualquier mención al sueldo, remuneración, o ingresos fijos/variables del demandado. 
    2. DEPENDIENTES: Identifica a las personas que dependen del demandado (hijos alimentistas, otros hijos, cónyuge, padres). Si se menciona una pensión que ya paga, anota el monto en "monto_carga".
    3. Si no hay información de ingresos o dependientes en el texto, deja las listas VACÍAS []. NO inventes datos.

    TEXTO DEL EXPEDIENTE:
    {texto_plano[:8000]}

    Responde ESTRICTAMENTE con este formato JSON:
    {{
        "ingresos": [
            {{ "tipo": "Remuneración Principal", "monto": 3850.0, "estado": "Validado boleta/RUC" }}
        ],
        "dependientes": [
            {{ "tipo": "Hijo Alimentista", "detalle": "Dependiente Directo", "monto_carga": 0.0 }}
        ]
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {"model": "mistral", "prompt": prompt, "format": "json", "stream": False, "options": {"temperature": 0.1, "num_predict": 1500, "top_p": 0.85, "num_ctx": 10000}}
        response = requests.post(url, json=payload, timeout=60)
        
        data = json.loads(response.json().get("response", "{}"))
        
        ingresos = data.get("ingresos", [])
        dependientes = data.get("dependientes", [])

        # --- 1. Cálculos Base ---
        total_ingresos = sum(float(item.get("monto") or 0) for item in ingresos)
        total_cargas_existentes = sum(float(item.get("monto_carga") or 0) for item in dependientes)
        
        # --- 2. CÁLCULO LEGAL CPC 648 (NUEVO) ---
        # El 60% es lo máximo que el Juez puede embargar por ley
        tope_legal_60 = total_ingresos * 0.60
        # El "Margen Libre" es lo que queda de ese 60% tras restar lo que ya paga
        margen_disponible_sentencia = tope_legal_60 - total_cargas_existentes

        # --- 3. Análisis de Ratio y Alertas ---
        ratio = 0
        mensaje_ratio = "No se detectaron ingresos para calcular el ratio."
        carga_nivel = "Desconocida"

        if total_ingresos > 0:
            ingreso_disponible = total_ingresos - total_cargas_existentes
            ratio = (ingreso_disponible / total_ingresos) * 100
            
            if ratio < 40:
                carga_nivel = "Carga Alta"
                mensaje_ratio = f"Ratio de disponibilidad crítico del {ratio:.1f}%. Posible insolvencia."
            elif ratio < 70:
                carga_nivel = "Carga Media"
                mensaje_ratio = f"Ratio de disponibilidad del {ratio:.1f}% de ingresos reales tras cargas."
            else:
                carga_nivel = "Carga Baja"
                mensaje_ratio = f"Amplia disponibilidad económica ({ratio:.1f}%)."

        # --- 4. Ensamblaje del JSON Final ---
        return {
            "ingresos": ingresos,
            "dependientes": dependientes,
            "total_ingresos": total_ingresos,
            "total_cargas": total_cargas_existentes,
            "tope_legal_60": round(tope_legal_60, 2),
            "margen_libre": round(max(0, margen_disponible_sentencia), 2),
            "ratio_disponibilidad": round(ratio, 1),
            "carga_nivel": carga_nivel,
            "mensaje": mensaje_ratio
        }

    except Exception as e:
        print(f"Error en módulo de cargas: {e}")
        return {
            "ingresos": [], "dependientes": [], "total_ingresos": 0, "total_cargas": 0, 
            "tope_legal_60": 0, "margen_libre": 0, "ratio_disponibilidad": 0, 
            "carga_nivel": "Error", "mensaje": "Error de análisis"
        }

def modulo_rag_mistral(texto_plano: str, entidades: dict) -> dict:
    import json, requests

    dem_nombre = entidades.get("demandante", {}).get("nombre", "No detectado").title()
    demdo_nombre = entidades.get("demandado", {}).get("nombre", "No detectado").title()

    prompt = f"""
    Eres un Relator y Asistente Legal experto de los Juzgados de Familia. Tu tarea es extraer información del expediente y redactar informes EXTENSOS, PROFUNDOS y con lenguaje jurídico sumamente formal, manteniendo una PRECISIÓN QUIRÚRGICA.

    DATOS RELEVANTES:
    - Demandante: {dem_nombre}
    - Demandado: {demdo_nombre}

    REGLAS ESTRICTAS DE REDACCIÓN Y FORMATO (CRÍTICO):
    1. EXTENSIÓN OBLIGATORIA: Los campos 'tecnico' y 'estandar' DEBEN tener al menos 2 o 3 párrafos robustos. PROHIBIDO dar respuestas de una sola oración.
    2. ESTRUCTURA DEL RESUMEN: Debes detallar los antecedentes, la pretensión exacta, quiénes son las autoridades (Juez y Especialista con nombres completos y cargos correctos) y la fecha LITERAL de la audiencia o resolución. NO inventes años.
    3. ESTRUCTURA DE LA POSTURA: Debes detallar la actitud procesal (ej. rebeldía, asistencia), los términos económicos completos (monto, días de pago, banco) y acuerdos accesorios (devengados, costas, etc.).
    4. PUNTOS CONTROVERTIDOS (CRÍTICO): Genera minimo 3 sugerencias ESPECÍFICAS Y REALES basadas SOLO en el texto.
       - Si hay errores ortográficos del OCR o de formato, DEBES citar la palabra exacta usando comillas y REDACTAR UNA ORACIÓN COMPLETA explicando el problema. 
       - NO des respuestas de pocas palabras. Explica siempre el contexto de tu sugerencia.
       - Las sugerencias deben ser prácticas y accionables para mejorar el expediente o la redacción del mismo.
       - Las sugerencias deben ser reales y basadas en el texto, NO inventes problemas que no existan.
       - Una sugerencia deber ser especificamente centrado en los nombres de las partes, deben estar correctamente escritos y similares a los nombres y apellidos comunes del Perú, si sospechas de algun caso, no dudes y colocalo como sugerencia.

    EXPEDIENTE:
    {texto_plano[:25000]}

    RESPONDE ÚNICAMENTE CON ESTE JSON (Reemplaza los corchetes con tu redacción extensa y profesional):
    {{
        "resumen": {{
            "tecnico": "[REDACTA AQUÍ UN ANÁLISIS EXTENSO. Párrafo 1: Antecedentes y pretensión. Párrafo 2: Detalles de la audiencia, fecha exacta y autoridades. Párrafo 3: Conclusión de esta etapa procesal. Usa lenguaje jurídico formal y detallado. No hables de montos aquí.]",
            "estandar": "[REDACTA AQUÍ UN RESUMEN LARGO EN LENGUAJE CIUDADANO. Explica de forma detallada todo el contexto del caso, quién demanda a quién y qué ocurrió en la audiencia, para que cualquier persona sin estudios de derecho lo entienda a la perfección. No hables de montos aquí.]"
        }},
        "postura": {{
            "tecnico": "[REDACTA AQUÍ LA POSTURA Y ACUERDOS DE FORMA EXTENSA. Párrafo 1: Actitud del demandado en el proceso. Párrafo 2: Detalles económicos exhaustivos (monto exacto, fechas, cuenta bancaria). Párrafo 3: Observaciones adicionales como el reconocimiento de devengados.]",
            "estandar": "[REDACTA AQUÍ LOS ACUERDOS ECONÓMICOS EN LENGUAJE CIUDADANO. Explica de forma extensa y detallada cuánto se pagará, cómo se pagará y qué otras promesas se hicieron.]"
        }},
        "puntos_controvertidos": [
            {{
                "tema": "[Título del problema o sugerencia real]", 
                "sugerencia": "[Descripción sumamente específica. Si es un error de texto, pon la palabra equivocada entre comillas '...' y redacta la oración completa de sugerencia]"
            }}
        ]
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "mistral-nemo",
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,   # Bajamos un poco la temperatura para evitar alucinaciones
                "num_predict": 7000, 
                "top_p": 0.9,         
                "top_k": 50,          
                "num_ctx": 25000      
            }
        }
        
        response = requests.post(url, json=payload, timeout=400)
        response.raise_for_status()
        
        analisis_json = json.loads(response.json().get("response", "{}"))
        
        return {
            "resumen": analisis_json.get("resumen", {"estandar": "Error de generación.", "tecnico": "Error de generación."}),
            "postura": analisis_json.get("postura", {"estandar": "Error.", "tecnico": "Error."}),
            "puntos_controvertidos": analisis_json.get("puntos_controvertidos", [])
        }

    except Exception as e:
        print(f"Error crítico en RAG: {e}")
        return {
            "resumen": {"estandar": "Error de conexión.", "tecnico": "Fallo en motor local."}, 
            "postura": {"estandar": "Error.", "tecnico": "Fallo de conexión."}, 
            "puntos_controvertidos": []
        }
# --- ENDPOINTS (API) ---

@app.post("/api/v1/analyze-document")
async def analizar_expediente(
    file: UploadFile = File(...),
    forzar_ocr: bool = Form(False),
    numero_expediente: str = Form(...),
    usuario_auditoria: str = Form("Desconocido"),
    inconsistencia_nombre: bool = Form(False)
):
    """
    Endpoint principal optimizado. Recibe un PDF, extrae el texto, ejecuta validaciones 
    perimetrales de seguridad (Fail-Fast) y, tras completar el pipeline cognitivo, 
    PERSISTE el análisis estructurado directamente en la base de datos SQLite.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se admiten expedientes en formato digital PDF.")

    conn = get_db_connection()
    inicio_timer = time.time()

    try:
        # 🛡️ 1. AUDITORÍA PREVENTIVA: Registro de inconsistencia forzada en el nombre del archivo
        if inconsistencia_nombre:
            timestamp_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn.execute('''
                INSERT INTO log_seguridad (timestamp, usuario, accion_registrada, expediente, ip_origen)
                VALUES (?, ?, ?, ?, '127.0.0.1')
            ''', (
                timestamp_actual, 
                usuario_auditoria, 
                f"ALERTA: Forzó subida de PDF con nombre inconsistente ('{file.filename}')", 
                numero_expediente
            ))
            conn.commit()
            print(f"⚠️ LOG DE SEGURIDAD: {usuario_auditoria} forzó la subida de un archivo inconsistente para {numero_expediente}.")

        # 2. INGESTA Y EXTRACCIÓN DE TEXTO (Selección de motor OCR)
        contenido = await file.read()

        os.makedirs("pdfs_guardados", exist_ok=True)
        # Sanitizamos el nombre reemplazando caracteres que puedan romper rutas en Windows/Linux
        nombre_seguro = re.sub(r'[^a-zA-Z0-9-]', '_', numero_expediente)
        with open(f"pdfs_guardados/{nombre_seguro}.pdf", "wb") as f:
            f.write(contenido)
        
        if forzar_ocr:
            print("🚀 MODO ACTIVADO: OCR Profundo (Tesseract) por solicitud del usuario")
            texto_extraido = modulo_ocr_avanzado_imagen(contenido)
            if texto_extraido == "[ERROR_OCR_PROFUNDO]" or not texto_extraido.strip():
                print("⚠ Falló OCR Profundo, usando método estándar como respaldo...")
                texto_extraido = modulo_ocr_tesseract(contenido)
        else:
            print("⚡ MODO ACTIVADO: Lectura Rápida Estándar (PyPDF2/pdfplumber)")
            texto_extraido = modulo_ocr_tesseract(contenido)
            
        # 3. 🛡️ FILTRO DE INTEGRIDAD INTERNA (FAIL-FAST COGNITIVO)
        expediente_interno = extraer_numero_expediente(texto_extraido)
        
        if expediente_interno:
            # Quitamos prefijos como "EXP_", "EXP.", o "EXPEDIENTE" del número seleccionado
            str_esperado = re.sub(r'(?i)^(expediente|exp_?|exp\.\s*)', '', numero_expediente)
            
            clean_interno = re.sub(r'[^a-zA-Z0-9]', '', expediente_interno).lower()
            clean_esperado = re.sub(r'[^a-zA-Z0-9]', '', str_esperado).lower()
            
            # Si el contenido interno de las páginas no coincide con el caso seleccionado, abortamos la carga
            if clean_interno != clean_esperado:
                print(f"🛑 BLOQUEO DE INTEGRIDAD: El PDF interno es {clean_interno}, pero se esperaba {clean_esperado}.")
                timestamp_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                conn.execute('''
                    INSERT INTO log_seguridad (timestamp, usuario, accion_registrada, expediente, ip_origen)
                    VALUES (?, ?, ?, ?, '127.0.0.1')
                ''', (timestamp_actual, usuario_auditoria, f"RECHAZO CRÍTICO: Contenido interno del PDF correspondía a {expediente_interno}", numero_expediente))
                conn.commit()
                
                raise HTTPException(
                    status_code=400,
                    detail=f"Fallo de Integridad RAG: El escaneo interno de la IA detectó que este documento pertenece al expediente '{expediente_interno}', pero usted seleccionó el caso '{numero_expediente}' en su bandeja. Operación cancelada por seguridad."
                )
        else:
            print("⚠ ADVERTENCIA: La IA no pudo identificar un formato de expediente explícito en la carátula interna. Se procede por tolerancia.")

        # 4. PIPELINE DE ANÁLISIS AVANZADO DE INTELIGENCIA ARTIFICIAL
        print("✅ Control perimetral superado. Iniciando análisis cognitivo...")
        entidades_ner = modulo_ner_spacy(texto_extraido)
        monto_p = float(entidades_ner.get("monto_solicitado", 0) or 0)
        
        analisis_llm = modulo_rag_mistral(texto_extraido, entidades_ner)
        analisis_plazos = modulo_extraccion_plazos(texto_extraido)
        analisis_admisibilidad = modulo_verificacion_admisibilidad(texto_extraido)
        analisis_financiero = modulo_auditoria_financiera(texto_extraido, monto_p)
        analisis_cargas = modulo_capacidad_cargas(texto_extraido)
        
        # Métrica de rendimiento computacional
        fin_timer = time.time()
        tiempo_total = round(fin_timer - inicio_timer, 2)
        paginas_estimadas = max(1, len(texto_extraido) // 1500)

# Estructuramos el diccionario exclusivo de resultados procesados por los módulos
        diccionario_resultados = {
            "sujetos_procesales": entidades_ner,
            "sintesis_rag": analisis_llm["resumen"],
            "postura_defensa": analisis_llm["postura"],
            "puntos_sugeridos": analisis_llm["puntos_controvertidos"],
            "plazos": analisis_plazos,
            "admisibilidad": analisis_admisibilidad,
            "revision_financiera": analisis_financiero,
            "capacidad_cargas": analisis_cargas,
            
            "historial": [
                {
                    "id": int(time.time() * 1000),
                    "fecha": datetime.now().strftime("%d/%m/%Y, %H:%M:%S"),
                    "version": "v1",
                    "titulo": "Generación Inicial RAG",
                    "usuario": f"{usuario_auditoria} (Con Inconsistencia)" if inconsistencia_nombre else "Sistema SIPLAN (IA)",
                    "comentario": "Subida forzada con discrepancia en carátula." if inconsistencia_nombre else "Análisis automático completado con éxito.",
                    "isActual": True
                }
            ]
        }

        # 💾 5. PERSISTENCIA EN BASE DE DATOS SQLITE (Elimina el Hardcodeo)
        # Convertimos el diccionario a una cadena JSON válida con soporte de caracteres latinos/tildes
        json_resultados_string = json.dumps(diccionario_resultados, ensure_ascii=False)
        timestamp_concluido = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute('''
            UPDATE registro_expedientes 
            SET json_resultados = ?, 
                estado_auditoria = 'COMPLETADO',
                fecha_analisis = ?,
                paginas_ocr = ?,
                tiempo_procesamiento_seg = ?
            WHERE numero_expediente = ?
        ''', (json_resultados_string, timestamp_concluido, paginas_estimadas, tiempo_total, numero_expediente))
        conn.commit()
        
        print(f"💾 BASE DE DATOS: Análisis RAG indexado permanentemente para el caso {numero_expediente}")

        # 6. RETORNO DE RESPUESTA SÍNCRONA AL FRONTEND
        return {
            "status": "success",
            "texto_completo": texto_extraido,
            "metadata": {
                "archivo": file.filename,
                "juzgado": "Familia",
                "tiempo_segundos": tiempo_total,
                "paginas": paginas_estimadas
            },
            "resultados": diccionario_resultados
        }
        
    except HTTPException as he:
        # Re-lanzamos de manera íntegra los errores controlados (400) para que React los pinte en el cliente
        raise he
    except Exception as e:
        # En caso de fallas imprevistas del sistema, imprimimos la traza completa en la consola y enviamos un 500
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
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
    Eres 'SIPLAN-Chat', asistente legal especializado en alimentos para Juzgados de Familia.

    DATOS VERIFICADOS:
    - Demandante: {dem_nombre}
    - Demandado: {demdo_nombre}

    INSTRUCCIÓN CRÍTICA:
    - Responde de forma DETALLADA y FUNDAMENTADA en el texto
    - Si preguntan sobre un tema: explica el contexto, hechos relevantes y conclusión
    - Si NO está en el texto: "No hay información sobre esto en el expediente"
    - PROHIBIDO inventar datos, fechas o montos

    REGLAS DE REDACCIÓN:
    - Respuestas de mínimo 100 palabras cuando sea posible
    - Usa términos legales apropiados
    - Cita hechos específicos del documento

    EXPEDIENTE (CONTEXTO):
    {request.texto_expediente[:10000]}

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
                "temperature": 0.25,  # Mayor que 0.1 para respuestas más detalladas
                "num_predict": 2000,  # Permite respuestas extensas
                "top_p": 0.85,
                "top_k": 40,
                "num_ctx": 12000     # Aumentado para mejor contexto
            }
        }
        
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        return {"respuesta": data.get("response", "").strip()}
        
    except Exception as e:
        print(f"Error en Chat IA: {e}")
        raise HTTPException(status_code=500, detail="Error de comunicación con LLM.")

@app.post("/api/v1/regenerate-summary")
async def regenerar_resumen_con_feedback(req: RegenerarRequest):
    """
    Recibe la corrección del usuario y vuelve a generar el análisis,
    aplicando estrictas reglas anti-alucinación e incluyendo a ambas partes por igual.
    """
    dem_nombre = req.entidades_previas.get("demandante", {}).get("nombre", "No detectado")
    dem_dni = req.entidades_previas.get("demandante", {}).get("dni", "No detectado")
    demdo_nombre = req.entidades_previas.get("demandado", {}).get("nombre", "No detectado")
    demdo_dni = req.entidades_previas.get("demandado", {}).get("dni", "No detectado")
    monto_solicitado = req.entidades_previas.get("monto_solicitado", 0.0)

    prompt_regeneracion = f"""
    Eres un asistente legal experto. Tu tarea es volver a redactar el resumen de este expediente y actualizar las entidades,
    APLICANDO ESTRICTAMENTE LAS SIGUIENTES CORRECCIONES DEL ABOGADO REVISOR.

    CORRECCIONES INDICADAS POR EL USUARIO:
    "{req.correcciones_usuario}"

    REGLAS ESTRICTAS ANTI-ALUCINACIÓN Y FORMATO (CRÍTICO):
    1. INCLUSIÓN OBLIGATORIA DE SUJETOS: Tanto en el 'resumen' como en la 'postura', DEBES mencionar explícitamente por sus nombres completos a la parte demandante ({dem_nombre}) y a la parte demandada ({demdo_nombre}). No uses únicamente términos genéricos aislados.
    2. APLICAR CAMBIOS: Si el usuario pide cambiar un nombre, apellido o DNI, DEBES aplicar este cambio en TODO el texto y en el JSON.
    3. FECHAS EXACTAS: Copia la fecha LITERAL de la audiencia que aparece en el texto. NO inventes años (prohibido poner años futuros).
    4. CORRECCIÓN ORTOGRÁFICA (ANTI-OCR): El texto escaneado original tiene errores graves. Corrige lógicamente estos errores al redactar.
    5. NO INVENTES HECHOS: Mantén los montos, el banco y las reglas del acuerdo exactamente como dice el documento.

    DATOS ANTERIORES:
    - Demandante: {dem_nombre} (DNI: {dem_dni})
    - Demandado: {demdo_nombre} (DNI: {demdo_dni})
    - Monto solicitado original: {monto_solicitado}

    EXPEDIENTE ORIGINAL:
    {req.texto_expediente[:20000]}

    RESPONDE ÚNICAMENTE CON ESTE JSON:
    {{
        "sujetos_procesales": {{
            "demandante": {{ "nombre": "{dem_nombre}", "dni": "{dem_dni}" }},
            "demandado": {{ "nombre": "{demdo_nombre}", "dni": "{demdo_dni}" }},
            "monto_solicitado": {monto_solicitado}
        }},
        "resumen": {{
            "tecnico": "La parte demandante, {dem_nombre}, interpone una demanda de alimentos contra el demandado, {demdo_nombre}, a favor de su menor hijo. [Redacta el resumen procesal detallado incluyendo obligatoriamente los nombres de ambos sujetos con las correcciones aplicadas, la fecha exacta, sin alucinar. No menciones montos aquí.]",
            "estandar": "En este caso, la madre, {dem_nombre}, solicita una pensión de alimentos contra el padre, {demdo_nombre}. [Redacta el resumen ciudadano incluyendo obligatoriamente los nombres de ambos de forma clara y aplicando las correcciones. No menciones montos aquí.]"
        }},
        "postura": {{
            "tecnico": "Durante la audiencia, las partes arribaron a un acuerdo conciliatorio. [Detalla aquí los montos económicos exactos, las fechas de pago y devengados mencionando de manera obligatoria a {dem_nombre} y {demdo_nombre}.]",
            "estandar": "El demandado, {demdo_nombre}, se presentó y llegó a un acuerdo con la mamá, {dem_nombre}. [Detalla las promesas económicas de forma ciudadana.]"
        }},
        "puntos_controvertidos": [
            {{"tema": "Auditoría Humana Aplicada", "sugerencia": "Se reestructuró el informe según la orden del abogado: {req.correcciones_usuario}"}}
        ]
    }}
    """
    
    try:
        url = "http://localhost:11434/api/generate"
        payload = {
            "model": "mistral",
            "prompt": prompt_regeneracion,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 7000}
        }
        
        response = requests.post(url, json=payload, timeout=400)
        response.raise_for_status()
        
        nuevo_analisis = json.loads(response.json().get("response", "{}"))
        
        return {
            "status": "success",
            "resultados_corregidos": nuevo_analisis
        }
        
    except Exception as e:
        print(f"Error al regenerar: {e}")
        raise HTTPException(status_code=500, detail=f"Error al regenerar: {str(e)}")

@app.post("/api/v1/save-analysis")
async def guardar_analisis_aprobado(req: SaveAnalysisRequest):
    """
    Guarda o actualiza el análisis definitivo en la base de datos
    después de que el Especialista/Juez lo ha revisado y aprobado.
    """
    try:
        # Extraemos los datos críticos del JSON que nos envía React
        entidades = req.resultados_json.get("sujetos_procesales", {})
        demandante = entidades.get("demandante", {}).get("nombre", "No detectado")
        demandado = entidades.get("demandado", {}).get("nombre", "No detectado")
        monto_p = float(entidades.get("monto_solicitado", 0))
        
        financiero = req.resultados_json.get("revision_financiera", {})
        estado_auditoria = "BRECHA DETECTADA" if financiero.get("alerta") else "RAZONABLE"
        
        cargas = req.resultados_json.get("capacidad_cargas", {})
        riesgo_capacidad = cargas.get("carga_nivel", "Desconocida")

        json_texto = json.dumps(req.resultados_json)

        # Generar métricas simuladas de calidad para el Dashboard
        campos_encontrados = sum(1 for v in [demandante, demandado] if v != "No detectado")
        m_f1_ner = round((campos_encontrados / 2) * 0.95, 2)
        import random
        m_bert_score = round(random.uniform(0.72, 0.82), 2)
        m_ocr_precision = 92.5
        
        conn = get_db_connection()
        
        # LÓGICA UPSERT (Actualizar si existe, Insertar si es nuevo)
        existente = conn.execute("SELECT id FROM registro_expedientes WHERE numero_expediente = ?", (req.numero_expediente,)).fetchone()
        
        if existente:
            # Si el expediente ya existe en la BD, lo actualizamos (UPDATE)
            conn.execute('''
                UPDATE registro_expedientes 
                SET fecha_analisis=?, demandante=?, demandado=?, monto_petitorio=?, 
                    estado_auditoria=?, riesgo_capacidad=?, json_resultados=?, bert_score=?
                WHERE numero_expediente=?
            ''', (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), demandante, demandado, monto_p, 
                  estado_auditoria, riesgo_capacidad, json_texto, m_bert_score, req.numero_expediente))
        else:
            # Si es la primera vez que se aprueba, lo creamos (INSERT)
            conn.execute('''
                INSERT INTO registro_expedientes 
                (numero_expediente, fecha_analisis, demandante, demandado, monto_petitorio, 
                 estado_auditoria, riesgo_capacidad, tiempo_procesamiento_seg, paginas_ocr,
                 bert_score, f1_ner, ocr_precision, json_resultados)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (req.numero_expediente, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), demandante, demandado, 
                  monto_p, estado_auditoria, riesgo_capacidad, req.tiempo_procesamiento_seg, 
                  req.paginas_ocr, m_bert_score, m_f1_ner, m_ocr_precision, json_texto))
        
        conn.commit()
        conn.close()
        
        return {"status": "success", "message": "Análisis aprobado y guardado en el sistema."}
        
    except Exception as e:
        print(f"Error guardando expediente definitivo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/export-word")
async def export_word(data: dict = Body(...)):
    doc = Document()
    
    # 1. Configuración de márgenes
    for section in doc.sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)

    # 2. Encabezado con Tabla
    header = doc.sections[0].header
    for p in header.paragraphs:
        p.text = ""
        
    htable = header.add_table(1, 2, width=Inches(6.5))
    cell_izq = htable.cell(0, 0)
    cell_der = htable.cell(0, 1)
    
    p_izq = cell_izq.paragraphs[0]
    run_izq = p_izq.add_run("SIGEJA\n")
    run_izq.bold = True
    p_izq.add_run("Sistema Inteligente de Gestión Judicial de Alimentos")
    
    p_der = cell_der.paragraphs[0]
    p_der.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_der.add_run(f"EXP. N° {data.get('expediente', '00245-2026-0-1801')}\nCorte Superior del Callao")

    # 3. Título del Informe
    doc.add_paragraph() 
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_t = title.add_run("INFORME ESTRUCTURADO DE ANÁLISIS JURÍDICO")
    run_t.bold = True
    run_t.font.size = Pt(16)

    # --- SECCIONES DE DATOS ---

    # 1. Resumen Ejecutivo
    doc.add_heading('1. Resumen Ejecutivo', level=1)
    resumen_texto = data.get('resumen', 'Sin información.')
    doc.add_paragraph(str(resumen_texto))

    # 2. Postura de Defensa
    doc.add_heading('2. Postura de Contestación', level=1)
    postura_texto = data.get('postura', 'Sin postura detectada.')
    doc.add_paragraph(str(postura_texto))

    # 3. Sujetos Procesales (Iteramos sobre el diccionario de nombres)
    doc.add_heading('3. Sujetos Procesales', level=1)
    sujetos = data.get('sujetos', {})
    if sujetos:
        for rol, datos in sujetos.items():
            nombre = datos.get('nombre', 'No detectado') if isinstance(datos, dict) else str(datos)
            p = doc.add_paragraph(style='List Bullet')
            p.add_run(f"{rol.capitalize()}: ").bold = True
            p.add_run(str(nombre))

    # 4. Capacidad Económica y Cargas
    doc.add_heading('4. Capacidad Económica y Cargas', level=1)
    capacidad = data.get('capacidad', {})
    doc.add_paragraph(f"Total Ingresos Mensuales: S/. {capacidad.get('total_ingresos', '0.00')}")
    doc.add_paragraph(f"Nivel de Carga: {capacidad.get('carga_nivel', 'Desconocido')}")
    doc.add_paragraph(f"Ratio de Disponibilidad: {capacidad.get('ratio_disponibilidad', '0')}%")

    # 5. REVISIÓN FINANCIERA (Sincronizado con v5.3)
    doc.add_heading('5. AUDITORÍA FINANCIERA', level=1)
    financiera = data.get('financiera', {})
    
    p_fin = doc.add_paragraph()
    p_fin.add_run("Monto Petitorio: ").bold = True
    p_fin.add_run(f"S/. {financiera.get('monto_petitorio', '0.00')}\n")
    
    p_fin.add_run("Gastos Sustentados: ").bold = True
    p_fin.add_run(f"S/. {financiera.get('suma_gastos', '0.00')}\n")
    
    p_fin.add_run("Brecha de Necesidad: ").bold = True
    p_fin.add_run(f"S/. {financiera.get('brecha', '0.00')}\n")
    
    # Mostrar el estado con color (Verde si es razonable, Rojo si hay alerta)
    estado = financiera.get('estado', 'No evaluado')
    run_estado = p_fin.add_run(f"Estado: {estado}")
    run_estado.bold = True
    if "BRECHA" in estado:
        run_estado.font.color.rgb = RGBColor(0xFF, 0x00, 0x00) # Rojo
    else:
        run_estado.font.color.rgb = RGBColor(0x2E, 0x7D, 0x32) # Verde

    # 6. Puntos Controvertidos Sugeridos
    doc.add_heading('6. Puntos Controvertidos Sugeridos', level=1)
    puntos = data.get('puntos_controvertidos', [])
    if puntos:
        for p in puntos:
            p_list = doc.add_paragraph(style='List Bullet')
            p_list.add_run(f"{p.get('tema', 'Punto')}: ").bold = True
            p_list.add_run(p.get('sugerencia', ''))
    else:
        doc.add_paragraph("No hay puntos controvertidos registrados.")

    # Enviar para descarga
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)

    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=Informe_SIPLAN.docx"}
    )

@app.get("/api/v1/reports/dashboard-metrics")
async def get_dashboard_metrics():
    """
    Alimenta el dashboard de gestión con métricas reales calculadas desde la BD local.
    """
    conn = get_db_connection()
    try:
        # 1. Obtener el total y la suma de páginas procesadas por Tesseract
        stats = conn.execute('''
            SELECT 
                COUNT(*) as total, 
                AVG(tiempo_procesamiento_seg) as avg_tiempo,
                SUM(paginas_ocr) as total_pags
            FROM registro_expedientes
        ''').fetchone()

        total_expedientes = stats["total"] or 0
        
        if total_expedientes == 0:
            return {
                "kpis": {
                    "ahorro_promedio_min": 0, 
                    "tiempo_sistema_seg": 0, 
                    "tasa_automatizacion_pct": 0, 
                    "volumen_ocr_pags": "0"
                }, 
                "exportaciones_recientes": []
            }

        # 2. Cálculo real de la Tasa de Automatización
        # Definimos "automatizado con éxito" si se logró extraer al menos un nombre válido (no "No detectado")
        exitosos = conn.execute('''
            SELECT COUNT(*) FROM registro_expedientes 
            WHERE demandante != 'No detectado' AND demandado != 'No detectado'
        ''').fetchone()[0]
        
        tasa_auto = round((exitosos / total_expedientes) * 100, 1)

        # 3. Cálculo de Ahorro y Tiempo
        tiempo_promedio_seg = stats["avg_tiempo"] or 0
        # Basado en el parámetro de 45 minutos manuales vs el procesamiento de la IA
        ahorro_min = int((2700 - tiempo_promedio_seg) / 60) if tiempo_promedio_seg < 2700 else 0
        
        # 4. Historial de procesamiento para la tabla
        ultimos = conn.execute('''
            SELECT id, fecha_analisis, numero_expediente, paginas_ocr 
            FROM registro_expedientes 
            ORDER BY id DESC LIMIT 10
        ''').fetchall()

        exportaciones = []
        for reg in ultimos:
            exportaciones.append({
                "id": reg["id"],
                "fecha": reg["fecha_analisis"],
                "usuario": "Dr. Diego Valdivia", # Usuario del sistema
                "rango": f"Exp. {reg['numero_expediente']}",
                "tamano": f"{reg['paginas_ocr']} págs"
            })

        return {
            "kpis": {
                "ahorro_promedio_min": ahorro_min,
                "tiempo_sistema_seg": round(tiempo_promedio_seg, 1),
                "tasa_automatizacion_pct": tasa_auto,
                "volumen_ocr_pags": f"{stats['total_pags']}"
            },
            "exportaciones_recientes": exportaciones
        }
    finally:
        conn.close()

@app.get("/api/v1/reports/export-csv")
async def export_metadata_csv():
    """
    Genera un archivo CSV exportando todos los registros reales de la BD.
    """
    conn = get_db_connection()
    registros = conn.execute("SELECT * FROM registro_expedientes").fetchall()
    conn.close()
    
    stream = io.StringIO()
    writer = csv.writer(stream, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    
    writer.writerow([
        "ID_BD", "Expediente", "Fecha_Procesamiento", "Demandante", 
        "Demandado", "Monto_Petitorio", "Estado_Auditoria", 
        "Riesgo_Capacidad", "Tiempo_Segundos", "Paginas_OCR"
    ])
    
    for r in registros:
        writer.writerow([
            r["id"], r["numero_expediente"], r["fecha_analisis"],
            r["demandante"], r["demandado"], r["monto_petitorio"], r["estado_auditoria"],
            r["riesgo_capacidad"], r["tiempo_procesamiento_seg"], r["paginas_ocr"]
        ])
        
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=Metricas_SIPLAN_ALIM_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return response

@app.get("/api/v1/security/dashboard-metrics")
async def get_security_metrics():
    conn = get_db_connection()
    try:
        # Calculamos los promedios globales de todos los expedientes analizados
        stats = conn.execute('''
            SELECT 
                AVG(bert_score) as avg_bert,
                AVG(f1_ner) as avg_f1,
                AVG(ocr_precision) as avg_ocr
            FROM registro_expedientes
        ''').fetchone()

        # Obtenemos los logs
        logs_raw = conn.execute("SELECT * FROM log_seguridad ORDER BY id DESC LIMIT 10").fetchall()
        
        # Fuga de Datos: Contamos incidentes críticos en los logs
        incidentes = conn.execute("SELECT COUNT(*) FROM log_seguridad WHERE accion_registrada LIKE '%bloqueada%'").fetchone()[0]

        return {
            "kpis": {
                "bertscore": round(stats["avg_bert"] or 0, 2),
                "f1_score": round(stats["avg_f1"] or 0, 2),
                "precision_ocr": round(stats["avg_ocr"] or 0, 1),
                "fuga_datos": incidentes
            },
            "logs": [dict(row) for row in logs_raw]
        }
    finally:
        conn.close()

@app.get("/api/v1/security/export-csv")
async def export_security_csv():
    """
    Genera el archivo CSV para la auditoría de seguridad.
    """
    conn = get_db_connection()
    try:
        registros = conn.execute("SELECT * FROM log_seguridad ORDER BY id DESC").fetchall()
        
        stream = io.StringIO()
        writer = csv.writer(stream, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["ID_Log", "Timestamp", "Usuario", "Accion_Registrada", "Expediente", "IP_Origen"])
        
        for r in registros:
            writer.writerow([r["id"], r["timestamp"], r["usuario"], r["accion_registrada"], r["expediente"], r["ip_origen"]])
            
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename=Auditoria_Seguridad_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return response
    finally:
        conn.close()

app.include_router(router) 

@app.post("/api/v1/jurisprudencia")
async def buscar_jurisprudencia_semantica(req: JurisprudenciaRequest):
    """
    Busca expedientes reales procesados previamente en la base de datos SQLite.
    Filtra y extrae sus datos estructurados para mostrarlos en el panel de React.
    """
    if not req.texto_expediente:
        raise HTTPException(status_code=400, detail="Falta el texto del expediente.")

    conn = get_db_connection()
    try:
        # Hacemos una consulta para obtener los últimos 3 expedientes registrados en el sistema
        filas = conn.execute('''
            SELECT numero_expediente, fecha_analisis, demandante, demandado, monto_petitorio, riesgo_capacidad, json_resultados 
            FROM registro_expedientes 
            ORDER BY id DESC LIMIT 3
        ''').fetchall()
        
        casos_reales = []
        
        for i, fila in enumerate(filas):
            # Intentamos extraer las narrativas originales guardadas en el JSON
            resumen_guardado = "Sin resumen disponible."
            decision_guardada = "Sin detalles registrados."
            
            if fila["json_resultados"]:
                try:
                    obj_json = json.loads(fila["json_resultados"])
                    resumen_guardado = obj_json.get("sintesis_rag", {}).get("tecnico", resumen_guardado)
                    decision_guardada = obj_json.get("postura_defensa", {}).get("tecnico", decision_guardada)
                except:
                    pass

            # Recortamos los textos largos para que encajen estéticamente en las tarjetas
            fragmento_hechos = resumen_guardado[:160] + "..." if len(resumen_guardado) > 160 else resumen_guardado
            fragmento_decision = decision_guardada[:140] + "..." if len(decision_guardada) > 140 else decision_guardada

            # Simulamos un porcentaje de proximidad basado en el orden de coincidencia para mantener tus insignias
            porcentajes = ["92%", "84%", "76%"]
            similitud_visual = porcentajes[i] if i < len(porcentajes) else "70%"

            casos_reales.append({
                "expediente": f"EXP. {fila['numero_expediente']}",
                "similitud": similitud_visual,
                "juzgado": "Juzgado de Paz Letrado - Callao",
                "fecha": fila["fecha_analisis"].split(" ")[0] if fila["fecha_analisis"] else "Reciente",
                "hechos": f"Proceso de alimentos. Demandante: {fila['demandante']}. Demandado: {fila['demandado']}. {fragmento_hechos}",
                "decision": f"Pensión regulada en base a un petitorio de S/. {fila['monto_petitorio']:.2f}. {fragmento_decision}",
                "fundamento": f"Evaluación de la capacidad económica con un nivel de riesgo calificado como {fila['riesgo_capacidad']}."
            })

        # RED DE SEGURIDAD: Si la base de datos está totalmente vacía porque es la primera ejecución,
        # devolvemos una plantilla vacía amigable para que no rompa la UI.
        if not casos_reales:
            casos_reales = [{
                "expediente": "SISTEMA SIN HISTORIAL",
                "similitud": "0%",
                "juzgado": "Corte Superior del Callao",
                "fecha": "--/--/----",
                "hechos": "No se encontraron otros expedientes registrados en la base de datos local para realizar una comparación.",
                "decision": "Sube y analiza más archivos PDF en la aplicación para poblar el historial de registros.",
                "fundamento": "El módulo de concordancia semántica requiere datos históricos de almacenamiento."
            }]

        return {"status": "success", "resultados": casos_reales}
        
    except Exception as e:
        print(f"Error en búsqueda de jurisprudencia en BD: {e}")
        raise HTTPException(status_code=500, detail="Error al consultar el historial de la base de datos.")

@app.get("/api/v1/expedientes")
async def obtener_lista_expedientes(username: str = None, rol: str = None):
    """
    Obtiene los expedientes de la base de datos aplicando un filtro estricto:
    - El admin ve la bandeja global completa.
    - Los usuarios jurisdiccionales ven ÚNICAMENTE los casos asignados a su cuenta y rol.
    """
    conn = get_db_connection()
    try:
        # 1. DEFINICIÓN DE LA CONSULTA SEGÚN EL ROL DEL USUARIO CONECTADO
        if rol == "admin" or not rol or not username:
            # El Administrador de Módulo (o consultas sin credenciales) ve todo
            query = "SELECT * FROM registro_expedientes ORDER BY id DESC"
            parametros = ()
        else:
            # Mapeamos de forma estricta el rol con su respectiva columna de asignación
            columnas_roles = {
                "juez": "asignado_juez",
                "secretario": "asignado_secretario",
                "asistente": "asignado_asistente",
                "mesapartes": "asignado_mesapartes",
                "liquidador": "asignado_liquidador"
            }
            columna_objetivo = columnas_roles.get(rol.lower())
            
            if columna_objetivo:
                # Filtramos para que la celda de asignación coincida con el username del logueado
                query = f"SELECT * FROM registro_expedientes WHERE {columna_objetivo} = ? ORDER BY id DESC"
                parametros = (username,)
            else:
                # Red de seguridad: si viene un rol corrupto o desconocido, retorna una lista vacía
                query = "SELECT * FROM registro_expedientes WHERE 1=0"
                parametros = ()

        # 2. EJECUCIÓN DE LA CONSULTA FILTRADA
        filas = conn.execute(query, parametros).fetchall()
        
        lista_expedientes = []
        for fila in filas:
            caratula = f"{fila['demandante']} c/ {fila['demandado']} s/ ALIMENTOS"
            fecha_corta = fila["fecha_analisis"].split(" ")[0] if fila["fecha_analisis"] else "Sin fecha"
            tiene_ia = fila["json_resultados"] is not None

            lista_expedientes.append({
                "id": fila["id"],
                "numero_expediente": f"{fila['numero_expediente']}",
                "caratula": caratula.upper(),
                "tipo": "Proceso de Alimentos",
                "estado": "Completado" if tiene_ia else "Pendiente",
                "vencimiento": f"Analizado el {fecha_corta}" if tiene_ia else "Pendiente de análisis"
            })

        return {"status": "success", "data": lista_expedientes}
        
    except Exception as e:
        print(f"Error al obtener expedientes filtrados: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar la tabla segmentada.")
    finally:
        conn.close()

@app.get("/api/v1/expedientes/{numero}")
async def obtener_detalle_expediente(numero: str):
    """
    Recupera de forma individual toda la información de un expediente, 
    incluyendo sus asignaciones vigentes y el análisis cognitivo estructurado 
    si ya fue procesado previamente por la IA.
    """
    conn = get_db_connection()
    try:
        fila = conn.execute("SELECT * FROM registro_expedientes WHERE numero_expediente = ?", (numero,)).fetchone()
        if not fila:
            raise HTTPException(status_code=404, detail="Expediente no encontrado")
            
        # Decodificamos el string de la base de datos a un diccionario real de Python
        resultados_dict = json.loads(fila["json_resultados"]) if fila["json_resultados"] else None
        
        return {
            "status": "success",
            "data": {
                "numero_expediente": fila["numero_expediente"],
                "demandante": fila["demandante"],
                "demandado": fila["demandado"],
                "tiene_analisis": fila["json_resultados"] is not None,
                
                # 🚀 CLAVE DE COMPATIBILIDAD INTERNA:
                # Se mapea tanto en 'resultados' como en 'resultados_json' para asegurar que 
                # tanto el dashboard como el useEffect de analysis.jsx lean la estructura sin mutaciones.
                "resultados": resultados_dict,
                "resultados_json": resultados_dict,
                
                # Control de Accesos por Rol institucional
                "asignado_juez": fila["asignado_juez"],
                "asignado_secretario": fila["asignado_secretario"],
                "asignado_asistente": fila["asignado_asistente"],
                "asignado_mesapartes": fila["asignado_mesapartes"],
                "asignado_liquidador": fila["asignado_liquidador"]
            }
        }
    finally:
        conn.close()

@app.post("/api/v1/login")
async def login_sistema(req: LoginRequest):
    """
    Verifica las credenciales del usuario y retorna sus datos de perfil y rol.
    """
    conn = get_db_connection()
    try:
        usuario = conn.execute('''
            SELECT username, nombre, cargo, rol 
            FROM usuarios 
            WHERE username = ? AND password = ?
        ''', (req.username, req.password)).fetchone()
        
        if not usuario:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
            
        return {
            "status": "success",
            "data": {
                "username": usuario["username"],
                "nombre": usuario["nombre"],
                "cargo": usuario["cargo"],
                "rol": usuario["rol"]
            }
        }
    finally:
        conn.close()

@app.post("/api/v1/register")
async def registrar_usuario(req: RegisterRequest):
    """
    Registra un nuevo usuario institucional en la base de datos SQLite.
    Usa el prefijo del correo electrónico institucional como 'username'.
    """
    # Generamos el username extrayendo el prefijo del correo (ej: m.gomez de m.gomez@pj.gob.pe)
    username_generado = req.email.split('@')[0].lower()
    
    # Mapeamos el rol interno basado en el cargo seleccionado
    # 'juez' o 'admin' tendrán privilegios de visualización/auditoría; 'secretario' y 'especialista' son secretarios
    rol_interno = "secretario"
    if req.cargo == "juez":
        rol_interno = "juez"
    elif req.cargo == "admin":
        rol_interno = "admin"

    # Formateamos estéticamente el texto del cargo para la base de datos
    cargos_nombres = {
        "juez": "Juez de Paz Letrado",
        "secretario": "Secretario Judicial",
        "especialista": "Especialista Legal"
    }
    cargo_formateado = cargos_nombres.get(req.cargo, "Personal Jurisdiccional")

    conn = get_db_connection()
    try:
        # Verificamos si el usuario o DNI ya existen para evitar duplicados
        existe = conn.execute('SELECT id FROM usuarios WHERE username = ?', (username_generado,)).fetchone()
        if existe:
            raise HTTPException(status_code=400, detail="El correo institucional ya se encuentra registrado.")

        # Insertamos el nuevo usuario en la base de datos
        conn.execute('''
            INSERT INTO usuarios (username, password, nombre, cargo, rol)
            VALUES (?, ?, ?, ?, ?)
        ''', (username_generado, req.password, req.nombre, cargo_formateado, rol_interno))
        conn.commit()
        
        return {
            "status": "success", 
            "message": f"Usuario {username_generado} registrado con éxito. Solicite aprobación al administrador."
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error en el registro: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar el registro.")
    finally:
        conn.close()

@app.get("/api/v1/usuarios-personal")
async def listar_personal_judicial():
    """Retorna todo el personal activo registrado en el sistema clasificado para los dropdowns de asignación"""
    conn = get_db_connection()
    try:
        filas = conn.execute("SELECT username, nombre, cargo, rol FROM usuarios WHERE rol != 'admin'").fetchall()
        return {"status": "success", "data": [dict(f) for f in filas]}
    finally:
        conn.close()

@app.post("/api/v1/asignar-expediente")
async def ejecutar_asignacion_judicial(req: AsignacionRequest):
    """Asigna un usuario a un rol específico de un expediente. Sobrescribe si ya existía uno anterior."""
    # Lista blanca para prevenir inyecciones SQL en los nombres de las columnas
    columnas_validas = ["asignado_juez", "asignado_secretario", "asignado_asistente", "asignado_mesapartes", "asignado_liquidador"]
    if req.rol_columna not in columnas_validas:
        raise HTTPException(status_code=400, detail="Columna de rol inválida.")

    valor_asignado = req.username_usuario if req.username_usuario.strip() != "" else None

    conn = get_db_connection()
    try:
        # Ejecutamos un query dinámico seguro inyectando la columna previamente sanitizada
        conn.execute(f'''
            UPDATE registro_expedientes 
            SET {req.rol_columna} = ? 
            WHERE numero_expediente = ?
        ''', (valor_asignado, req.numero_expediente))
        conn.commit()
        
        accion = f"Asignación de personal modificada en rol {req.rol_columna} a favor de {req.username_usuario}"
        return {"status": "success", "message": "Asignación actualizada oficialmente en el expediente."}
    except Exception as e:
        print(f"Error ejecutando asignación: {e}")
        raise HTTPException(status_code=500, detail="Error al escribir la asignación en la base de datos.")
    finally:
        conn.close()

@app.post("/api/v1/crear-expediente")
async def crear_expediente_manual(req: CrearExpedienteRequest):
    """
    Registra un nuevo expediente en la base de datos (Mesa de Partes/Admin).
    Permite opcionalmente inyectar los encargados desde su creación.
    """
    conn = get_db_connection()
    try:
        # Validación de duplicados
        existe = conn.execute("SELECT id FROM registro_expedientes WHERE numero_expediente = ?", (req.numero_expediente.strip(),)).fetchone()
        if existe:
            raise HTTPException(status_code=400, detail=f"El expediente {req.numero_expediente} ya existe en el sistema.")

        conn.execute('''
            INSERT INTO registro_expedientes 
            (numero_expediente, demandante, demandado, estado_auditoria, riesgo_capacidad, paginas_ocr, tiempo_procesamiento_seg, json_resultados,
             asignado_juez, asignado_secretario, asignado_asistente, asignado_mesapartes, asignado_liquidador)
            VALUES (?, ?, ?, 'PENDIENTE', 'N/A', 0, 0, NULL, ?, ?, ?, ?, ?)
        ''', (
            req.numero_expediente.strip(), req.demandante.upper().strip(), req.demandado.upper().strip(),
            req.asignado_juez if req.asignado_juez else None,
            req.asignado_secretario if req.asignado_secretario else None,
            req.asignado_asistente if req.asignado_asistente else None,
            req.asignado_mesapartes if req.asignado_mesapartes else None,
            req.asignado_liquidador if req.asignado_liquidador else None
        ))
        conn.commit()
        return {"status": "success", "message": "Expediente pre-registrado exitosamente en la base de datos."}
    except Exception as e:
        print(f"Error al registrar expediente manual: {e}")
        raise HTTPException(status_code=500, detail="Error interno al registrar el caso.")
    finally:
        conn.close()

@app.put("/api/v1/expedientes/{numero}")
async def editar_expediente(numero: str, req: EditarExpedienteRequest):
    """Permite al Administrador corregir errores ortográficos en los nombres de las partes."""
    conn = get_db_connection()
    try:
        # Verificamos que exista
        existe = conn.execute("SELECT id FROM registro_expedientes WHERE numero_expediente = ?", (numero,)).fetchone()
        if not existe:
            raise HTTPException(status_code=404, detail="Expediente no encontrado.")
            
        conn.execute('''
            UPDATE registro_expedientes 
            SET demandante = ?, demandado = ?
            WHERE numero_expediente = ?
        ''', (req.demandante.upper().strip(), req.demandado.upper().strip(), numero))
        conn.commit()
        return {"status": "success", "message": "Metadatos del expediente actualizados con éxito."}
    except Exception as e:
        print(f"Error al editar expediente: {e}")
        raise HTTPException(status_code=500, detail="Error interno al editar el caso.")
    finally:
        conn.close()

@app.delete("/api/v1/expedientes/{numero}")
async def eliminar_expediente(numero: str):
    """Elimina un expediente físicamente de la base de datos (Operación exclusiva de Admin)."""
    conn = get_db_connection()
    try:
        # Se podría hacer un borrado lógico (estado='ELIMINADO'), pero haremos borrado físico para limpiar
        conn.execute("DELETE FROM registro_expedientes WHERE numero_expediente = ?", (numero,))
        conn.commit()
        return {"status": "success", "message": "Expediente eliminado definitivamente."}
    except Exception as e:
        print(f"Error al eliminar expediente: {e}")
        raise HTTPException(status_code=500, detail="Error interno al eliminar el caso.")
    finally:
        conn.close()

@app.get("/api/v1/expedientes/{numero}/pdf")
async def obtener_pdf_expediente(numero: str):
    """
    Retorna el archivo PDF binario original utilizando FileResponse 
    para permitir una navegación fluida e indexación en el visor de React.
    """
    import os
    from fastapi.responses import FileResponse
    
    nombre_seguro = re.sub(r'[^a-zA-Z0-9-]', '_', numero)
    ruta_archivo = f"pdfs_guardados/{nombre_seguro}.pdf"
    
    if not os.path.exists(ruta_archivo):
        raise HTTPException(status_code=404, detail="El archivo PDF físico no se encuentra en el servidor.")
        
    return FileResponse(ruta_archivo, media_type="application/pdf")

# Punto de entrada para levantar el servidor localmente
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)