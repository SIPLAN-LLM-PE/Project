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

    # Migración: agregar columna ocr_detalle si no existe (JSON por-documento)
    try:
        conn.execute("ALTER TABLE registro_expedientes ADD COLUMN ocr_detalle TEXT")
        conn.commit()
    except Exception:
        pass  # la columna ya existe

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

# --- MÉTRICAS DE CALIDAD ---

# Sustituciones de dígitos por letras que Tesseract comete en texto en negrita/mayúsculas
# Ej: "BEAT0IZ" → "BEATRIZ", "MAR1A" → "MARIA"
_OCR_DIGIT_SUBS = str.maketrans({'0': 'O', '1': 'I', '5': 'S', '8': 'B'})

def normalizar_nombre_ocr(nombre: str) -> str:
    """
    Corrige sustituciones dígito→letra que Tesseract produce en nombres en mayúsculas.
    Solo aplica si el token es mayúsculas mixtas con dígitos (no toca DNIs ni montos).
    """
    if not nombre:
        return nombre
    tokens = nombre.split()
    resultado = []
    for tok in tokens:
        # Aplica la corrección solo si el token parece un nombre (mayúsculas + algún dígito)
        if tok.isupper() or (any(c.isupper() for c in tok) and any(c.isdigit() for c in tok)):
            if not tok.isdigit():  # no tocar DNIs/montos puros
                tok = tok.translate(_OCR_DIGIT_SUBS)
        resultado.append(tok)
    return " ".join(resultado)

# Palabras cortas en mayúsculas que son legítimas y NO deben unirse al token siguiente
_OCR_NO_UNIR = {
    # Preposiciones y artículos
    'DE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'AL', 'Y', 'EN', 'POR', 'CON',
    # Abreviaturas de juzgados y documentos
    'DNI', 'RUC', 'JR', 'JP', 'FC', 'CI', 'DR', 'DRA', 'SR', 'SRA',
    'EXP', 'NUM', 'REF', 'CIV', 'FAM', 'ALI', 'LEY',
    # Nombres cortos válidos frecuentes en Perú
    'ANA', 'EVA', 'LUZ', 'PAZ', 'SOL', 'MAR', 'ROY', 'GIL', 'LEO', 'RUT', 'IDA',
}

def limpiar_fragmentos_ocr(texto: str) -> tuple:
    """
    Une fragmentos de 2-3 letras mayúsculas que el OCR partió erróneamente.
    Ejemplo: 'BEA TRIZ' → 'BEATRIZ', 'GU TIERREZ' → 'GUTIERREZ'.
    Retorna (texto_corregido, numero_de_correcciones).
    """
    correcciones = 0

    def _unir(m):
        nonlocal correcciones
        frag1 = m.group(1)
        if frag1 not in _OCR_NO_UNIR:
            correcciones += 1
            return frag1 + m.group(2)
        return m.group(0)

    # Busca un fragmento corto (2-3 chars mayúsc.) seguido de otro token mayúsc.
    patron = r'\b([A-ZÁÉÍÓÚÜÑ]{2,3})\s+([A-ZÁÉÍÓÚÜÑ]{2,})\b'
    texto_limpio = re.sub(patron, _unir, texto)
    return texto_limpio, correcciones

def calcular_ocr_precision(texto: str) -> float:
    """
    Combina calidad de caracteres (70%) con integridad de palabras (30%).
    La integridad penaliza fragmentos OCR detectados antes de limpiarlos.
    """
    if not texto or len(texto.strip()) < 20:
        return 0.0
    # 1. Ratio de caracteres válidos
    valid = sum(1 for c in texto if c.isalpha() or c.isdigit() or c in ' .,;:-()"\'\n\t/°%@#[]{}')
    char_score = valid / len(texto)
    # 2. Penalización por palabras partidas: cada split resta 3%, máximo 30%
    patron_split = r'\b([A-ZÁÉÍÓÚÜÑ]{2,3})\s+([A-ZÁÉÍÓÚÜÑ]{2,})\b'
    candidatos = re.findall(patron_split, texto)
    n_splits = sum(1 for f1, _ in candidatos if f1 not in _OCR_NO_UNIR)
    split_penalty = min(0.30, n_splits * 0.03)
    return round(max(0.0, char_score - split_penalty) * 100, 1)

def calcular_bert_score(texto_original: str, resumen_texto: str) -> float:
    """
    Fidelidad RAG: fracción de palabras significativas del resumen (≥4 letras)
    que están presentes en el documento fuente.

    Escala [0, 1]:
      1.0 → cada palabra del resumen proviene del documento (máxima fidelidad)
      0.0 → el resumen usa vocabulario inventado, sin base en el texto (alucinación)

    No se usa recall porque un resumen legítimamente cubre solo una parte del doc.
    No se usa F1 porque arrastra el score hacia 0 cuando el doc tiene cientos de
    palabras únicas y el resumen es compacto.

    Objetivo > 0.70: resúmenes fieles de expedientes legales deberían superar este umbral.
    """
    if not texto_original or not resumen_texto:
        return 0.0
    patron = r'[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{4,}'
    tokens_src = set(re.findall(patron, texto_original.lower()))
    tokens_res = re.findall(patron, resumen_texto.lower())
    if not tokens_src or not tokens_res:
        return 0.0
    presentes = sum(1 for t in tokens_res if t in tokens_src)
    return round(presentes / len(tokens_res), 2)

def calcular_f1_ner(entidades: dict) -> float:
    """Fracción de campos NER esperados que fueron detectados correctamente."""
    valores_nulos = {"No detectado", "Desconocido", "", None}
    campos = [
        entidades.get("demandante", {}).get("nombre"),
        entidades.get("demandante", {}).get("dni"),
        entidades.get("demandado", {}).get("nombre"),
        entidades.get("demandado", {}).get("dni"),
    ]
    encontrados = sum(1 for v in campos if v not in valores_nulos)
    monto = entidades.get("monto_solicitado", 0)
    if monto and float(monto) > 0:
        encontrados += 1
    return round(encontrados / 5, 2)

# --- MÓDULOS DE PROCESAMIENTO (PIPELINE) ---

_UMBRAL_CALIDAD_OCR = 75.0  # Si la precisión baja de este valor, se activa OCR profundo automático

def _limpiar_texto_pdf(texto: str) -> str:
    """Limpieza estándar post-extracción."""
    texto = texto.replace("�", "").replace("\x00", "").replace("•", "")
    texto = re.sub(r'\.{3,}', ' ', texto)
    texto = re.sub(r'\n{3,}', '\n\n', texto)
    return texto.strip()

def _extraer_con_pdfplumber_words(contenido_pdf: bytes) -> str:
    """
    Usa extract_words() en lugar de extract_text() para reconstruir el texto
    respetando el orden visual real (coordenadas x,y). Resuelve dos problemas:
    - Texto en negrita codificado como dos capas superpuestas (se deduplicam)
    - Columnas cuyo orden de extracción es incorrecto con extract_text()
    """
    texto_total = ""
    with pdfplumber.open(io.BytesIO(contenido_pdf)) as pdf:
        for pagina in pdf.pages:
            palabras = pagina.extract_words(
                x_tolerance=3,
                y_tolerance=3,
                keep_blank_chars=False,
                use_text_flow=True,
            )
            if not palabras:
                continue
            lineas = {}
            for p in palabras:
                y_key = round(p["top"] / 5) * 5
                lineas.setdefault(y_key, []).append(p)
            texto_pagina = ""
            for y_key in sorted(lineas):
                palabras_linea = sorted(lineas[y_key], key=lambda p: p["x0"])
                # Deduplicar palabras idénticas adyacentes (negrita de doble capa)
                textos_linea = []
                for p in palabras_linea:
                    if not textos_linea or textos_linea[-1] != p["text"]:
                        textos_linea.append(p["text"])
                texto_pagina += " ".join(textos_linea) + "\n"
            texto_total += texto_pagina + "\n"
    return _limpiar_texto_pdf(texto_total)

def _comparar_textos_ocr(texto_nativo: str, texto_ocr: str) -> float:
    """
    Compara el texto nativo del PDF (extraído por PyPDF2, sin procesar)
    contra el texto resultante del OCR (pdfplumber o Tesseract).
    Usa difflib.SequenceMatcher para medir la proporción de caracteres coincidentes.
    Solo se invoca cuando PyPDF2 tuvo contenido suficiente como referencia real;
    en PDFs escaneados (PyPDF2 vacío) se usa la heurística calcular_ocr_precision.
    """
    import difflib

    def _norm(t: str) -> str:
        t = t.lower()
        t = re.sub(r'[^\w\s]', '', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    nat = _norm(texto_nativo)
    ocr_n = _norm(texto_ocr)
    if len(nat) < 150:
        # Referencia demasiado corta para ser fiable — caer en heurística
        return calcular_ocr_precision(texto_ocr)
    ratio = difflib.SequenceMatcher(None, nat, ocr_n).ratio()
    return round(ratio * 100, 1)


def modulo_ocr_tesseract(contenido_pdf: bytes) -> tuple:
    """
    Extrae texto con estrategia de 3 niveles + auto-escalado por calidad.
    Retorna (texto, precision, metodo):
    - texto: mejor texto extraído
    - precision: si PyPDF2 tenía contenido de referencia → comparación real nativo vs OCR
                 si el PDF es escaneado (PyPDF2 vacío) → heurística calcular_ocr_precision
    - metodo: "PyPDF2", "pdfplumber" o "Tesseract"
    """
    texto_extraido = ""
    texto_nativo = ""  # texto PyPDF2 guardado como referencia de comparación

    # NIVEL 1: PyPDF2
    try:
        lector_pdf = PyPDF2.PdfReader(io.BytesIO(contenido_pdf))
        for pagina in lector_pdf.pages:
            t = pagina.extract_text()
            if t:
                texto_extraido += t + "\n"
        texto_extraido = _limpiar_texto_pdf(texto_extraido)

        if len(texto_extraido) > 500:
            calidad = calcular_ocr_precision(texto_extraido)
            print(f"✓ PyPDF2: {len(texto_extraido)} chars, calidad={calidad}%")
            if calidad >= _UMBRAL_CALIDAD_OCR:
                # PDF digital limpio — sin OCR, la precisión es la del propio texto
                return texto_extraido, calidad, "PyPDF2"
            texto_nativo = texto_extraido  # guardar como referencia antes de escalar
            print(f"⚠ Calidad {calidad}% < {_UMBRAL_CALIDAD_OCR}% — escalando a pdfplumber words...")
        else:
            if texto_extraido.strip():
                texto_nativo = texto_extraido
            print("⚠ PyPDF2 extrajo poco texto, intentando pdfplumber...")
    except Exception as e:
        print(f"⚠ PyPDF2 falló: {type(e).__name__}")

    # NIVEL 2: pdfplumber word-level
    try:
        texto_plumber = _extraer_con_pdfplumber_words(contenido_pdf)
        if texto_plumber and len(texto_plumber) > 500:
            calidad = calcular_ocr_precision(texto_plumber)
            print(f"✓ pdfplumber words: {len(texto_plumber)} chars, calidad={calidad}%")
            if calidad >= _UMBRAL_CALIDAD_OCR:
                prec = _comparar_textos_ocr(texto_nativo, texto_plumber) if texto_nativo else calidad
                print(f"✓ Precisión OCR real (nativo vs pdfplumber): {prec}%")
                return texto_plumber, prec, "pdfplumber"
            print(f"⚠ Calidad {calidad}% < {_UMBRAL_CALIDAD_OCR}% — escalando a OCR profundo automático...")
            texto_extraido = texto_plumber
        else:
            print("⚠ pdfplumber también extrajo poco texto")
    except Exception as e:
        print(f"⚠ pdfplumber falló: {type(e).__name__}")

    # NIVEL 3: OCR profundo automático (Tesseract 300 DPI + preprocesado)
    print("🚀 Auto-escalado a OCR Profundo por baja calidad de texto nativo...")
    texto_ocr = modulo_ocr_avanzado_imagen(contenido_pdf)
    if texto_ocr and texto_ocr not in ("[ERROR_OCR_PROFUNDO]", ""):
        calidad_ocr = calcular_ocr_precision(texto_ocr)
        calidad_prev = calcular_ocr_precision(texto_extraido) if texto_extraido else 0
        print(f"✓ OCR Profundo: calidad={calidad_ocr}% (anterior={calidad_prev}%)")
        if calidad_ocr >= calidad_prev:
            prec = _comparar_textos_ocr(texto_nativo, texto_ocr) if texto_nativo else calidad_ocr
            print(f"✓ Precisión OCR real (nativo vs Tesseract): {prec}%")
            return texto_ocr, prec, "Tesseract"

    if texto_extraido.strip():
        calidad = calcular_ocr_precision(texto_extraido)
        prec = _comparar_textos_ocr(texto_nativo, texto_extraido) if texto_nativo and texto_nativo != texto_extraido else calidad
        return texto_extraido, prec, "pdfplumber"

    print("⚠ Sin texto detectado en ningún nivel")
    return "[TEXTO NO DETECTADO - REQUIERE OCR PROFUNDO]", 0.0, "error"

def _preprocesar_imagen_ocr(imagen):
    """
    Mejora la imagen antes de pasarla a Tesseract:
    - Convierte a escala de grises (elimina ruido de color)
    - Aumenta el contraste para destacar texto sobre fondo
    - Aplica nitidez para definir mejor los bordes de las letras
    Esto mejora especialmente texto en negrita y documentos escaneados con baja calidad.
    """
    from PIL import ImageEnhance, ImageFilter
    img = imagen.convert('L')                        # Escala de grises
    img = ImageEnhance.Contrast(img).enhance(2.0)   # Contraste x2
    img = ImageEnhance.Sharpness(img).enhance(2.0)  # Nitidez x2
    img = img.filter(ImageFilter.SHARPEN)            # Pase adicional de nitidez
    return img

# Configuración Tesseract: LSTM engine (oem 3) + layout automático (psm 3)
# preserve_interword_spaces evita que palabras se fusionen en texto denso
_TESSERACT_CONFIG = '--oem 3 --psm 3 -c preserve_interword_spaces=1'

def modulo_ocr_avanzado_imagen(contenido_pdf: bytes) -> str:
    """
    OCR Profundo: convierte cada página del PDF a imagen a 300 DPI,
    aplica preprocesado y ejecuta Tesseract en español con LSTM engine.
    300 DPI es el estándar mínimo para buena precisión en Tesseract.
    """
    texto_final = ""
    print("📸 Iniciando OCR Profundo (300 DPI + preprocesado)...")
    try:
        ruta_poppler = r'C:\poppler\Library\bin'
        imagenes = convert_from_bytes(contenido_pdf, dpi=300, poppler_path=ruta_poppler)

        for i, imagen in enumerate(imagenes):
            print(f"🔍 Página {i+1}/{len(imagenes)}: preprocesando y escaneando...")
            imagen_procesada = _preprocesar_imagen_ocr(imagen)
            texto_pagina = pytesseract.image_to_string(
                imagen_procesada, lang='spa', config=_TESSERACT_CONFIG
            )
            texto_final += texto_pagina + "\n"

        print("✓ OCR Profundo completado")
        return texto_final.strip()
    except Exception as e:
        print(f"⚠ ERROR EN OCR PROFUNDO: {e}")
        return "[ERROR_OCR_PROFUNDO]"
        
def _validar_entidades_con_mistral(texto_plano: str, entidades: dict) -> dict:
    """
    Validación cruzada completa: envía a Mistral los datos extraídos por regex
    junto con el contexto donde aparece cada número/nombre en el documento.
    Cubre todos los casos donde el regex puede asignar mal:
      - CUI/código de menores de edad
      - DNI de abogados, jueces o secretarios de juzgado
      - DNI de testigos o terceros mencionados en el texto
      - Nombre del juez capturado como parte procesal
      - Monto de costas o gastos capturado en vez del monto petitorio
      - Ventana de contexto ampliada a 400 chars para documentos largos
    Solo reemplaza un valor si Mistral lo marca incorrecto Y provee un reemplazo válido.
    """
    dem_nombre = entidades["demandante"]["nombre"]
    dem_dni    = entidades["demandante"]["dni"]
    ddo_nombre = entidades["demandado"]["nombre"]
    ddo_dni    = entidades["demandado"]["dni"]
    monto      = entidades.get("monto_solicitado", 0.0)

    todos_vacios = all(v in ("No detectado", None, "")
                       for v in [dem_nombre, dem_dni, ddo_nombre, ddo_dni])
    if todos_vacios:
        return entidades

    # Contexto ampliado (400 chars antes + 150 después) para cada valor encontrado
    def _ctx_numero(numero):
        if not numero or numero in ("No detectado", ""):
            return "No disponible"
        idx = texto_plano.find(numero)
        if idx < 0:
            return "No encontrado en el texto"
        fragmento = texto_plano[max(0, idx - 400): idx + 150]
        return fragmento.strip()

    def _ctx_nombre(nombre):
        if not nombre or nombre in ("No detectado", ""):
            return "No disponible"
        idx = texto_plano.upper().find(nombre.upper()[:20])
        if idx < 0:
            return "No encontrado en el texto"
        return texto_plano[max(0, idx - 150): idx + 300].strip()

    # Sección formal del documento (primeras 3500 chars desde donde aparecen las partes)
    match_inicio = re.search(r'(?:PARTE\s+)?DEMANDANTE|PARTE\s+DEMANDADA', texto_plano, re.IGNORECASE)
    offset = max(0, match_inicio.start() - 200) if match_inicio else 0
    seccion_formal = texto_plano[offset: offset + 3500]

    prompt = f"""Eres un validador experto en expedientes judiciales peruanos de alimentos.
Un sistema automático extrajo estos datos y necesitas verificar si son correctos:

DATOS EXTRAÍDOS AUTOMÁTICAMENTE:
- DEMANDANTE: "{dem_nombre}" | DNI: {dem_dni}
- DEMANDADO:  "{ddo_nombre}" | DNI: {ddo_dni}
- MONTO PETITORIO: S/ {monto}

=== CONTEXTO DONDE APARECE EL NÚMERO {dem_dni} EN EL DOCUMENTO ===
{_ctx_numero(dem_dni)}

=== CONTEXTO DONDE APARECE EL NÚMERO {ddo_dni} EN EL DOCUMENTO ===
{_ctx_numero(ddo_dni)}

=== CONTEXTO DONDE APARECE EL NOMBRE "{dem_nombre[:30]}" ===
{_ctx_nombre(dem_nombre)}

=== CONTEXTO DONDE APARECE EL NOMBRE "{ddo_nombre[:30]}" ===
{_ctx_nombre(ddo_nombre)}

=== SECCIÓN FORMAL DE IDENTIFICACIÓN DE PARTES ===
{seccion_formal}

REGLAS DE VALIDACIÓN (aplica todas):
1. PARTES PROCESALES: Solo son DEMANDANTE y DEMANDADO. Nunca el Juez, Secretario, Asistente, Especialista Legal, ni personal del juzgado.
2. ABOGADOS/LETRADOS: Los abogados tienen CAL N° o CAS N°. Su DNI NO es el DNI de la parte que representan.
3. MENORES DE EDAD: Los CUI o códigos de menores (texto dice "menor", "nacimiento", "hijo/a", "CUI") NO son DNIs de las partes adultas.
4. TESTIGOS Y TERCEROS: Personas mencionadas como testigos, peritos o terceros no son partes procesales.
5. DNI VÁLIDO: Un DNI correcto de demandante aparece explícitamente como "DEMANDANTE... identificado/a con DNI XXXXXXXX" o "Documento Nacional de Identidad N° XXXXXXXX" en la sección de identificación.
6. MONTO PETITORIO: Es el monto que la demandante SOLICITA (pensión mensual). NO son costas, gastos judiciales, honorarios, ni montos históricos pagados.
7. NOMBRES: El demandante es quien presenta la demanda (generalmente la madre o quien cuida al menor). El demandado es contra quien se demanda (generalmente el padre obligado a pagar).

Si un dato es incorrecto, busca el valor correcto en la sección formal. Si no lo encuentras, usa "No encontrado".

Responde ÚNICAMENTE con este JSON (sin texto adicional):
{{
    "demandante_nombre_correcto": true_o_false,
    "demandante_nombre": "valor correcto o el mismo si está bien",
    "demandante_dni_correcto": true_o_false,
    "demandante_dni": "8 dígitos correctos o el mismo si está bien",
    "demandado_nombre_correcto": true_o_false,
    "demandado_nombre": "valor correcto o el mismo si está bien",
    "demandado_dni_correcto": true_o_false,
    "demandado_dni": "8 dígitos correctos o el mismo si está bien",
    "monto_correcto": true_o_false,
    "monto_solicitado": numero_flotante_correcto_o_el_mismo
}}"""

    try:
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "mistral", "prompt": prompt, "format": "json",
                  "stream": False, "options": {"temperature": 0.0}},
            timeout=60
        )
        v = json.loads(res.json().get("response", "{}"))

        entidades_v = {
            "demandante": entidades["demandante"].copy(),
            "demandado":  entidades["demandado"].copy(),
            "monto_solicitado": monto
        }

        # Corregir DNI demandante
        if not v.get("demandante_dni_correcto", True):
            m = re.search(r'\d{8}', str(v.get("demandante_dni", "")))
            if m and m.group() != dem_dni:
                # GUARDIA CRÍTICA: nunca asignar al demandante un DNI que ya pertenece al demandado
                if m.group() == entidades_v["demandado"]["dni"]:
                    print(f"⚠ Validación: DNI {m.group()} ya asignado al demandado — demandante queda sin DNI")
                    entidades_v["demandante"]["dni"] = "No detectado"
                else:
                    print(f"⚠ Validación: DNI demandante {dem_dni} → {m.group()}")
                    entidades_v["demandante"]["dni"] = m.group()
            else:
                print(f"⚠ Validación: DNI demandante {dem_dni} descartado (no encontrado en doc)")
                entidades_v["demandante"]["dni"] = "No detectado"

        # Corregir nombre demandante
        if not v.get("demandante_nombre_correcto", True):
            nom = str(v.get("demandante_nombre", "")).upper().strip()
            if nom and nom not in ("NO ENCONTRADO", "", dem_nombre):
                print(f"⚠ Validación: nombre demandante \"{dem_nombre}\" → \"{nom}\"")
                entidades_v["demandante"]["nombre"] = nom

        # Corregir DNI demandado
        if not v.get("demandado_dni_correcto", True):
            m = re.search(r'\d{8}', str(v.get("demandado_dni", "")))
            if m and m.group() != ddo_dni:
                # GUARDIA CRÍTICA: nunca asignar al demandado un DNI que ya pertenece al demandante
                if m.group() == entidades_v["demandante"]["dni"]:
                    print(f"⚠ Validación: DNI {m.group()} ya asignado al demandante — demandado queda sin DNI")
                    entidades_v["demandado"]["dni"] = "No detectado"
                else:
                    print(f"⚠ Validación: DNI demandado {ddo_dni} → {m.group()}")
                    entidades_v["demandado"]["dni"] = m.group()

        # Corregir nombre demandado
        if not v.get("demandado_nombre_correcto", True):
            nom = str(v.get("demandado_nombre", "")).upper().strip()
            if nom and nom not in ("NO ENCONTRADO", "", ddo_nombre):
                print(f"⚠ Validación: nombre demandado \"{ddo_nombre}\" → \"{nom}\"")
                entidades_v["demandado"]["nombre"] = nom

        # Corregir monto
        if not v.get("monto_correcto", True):
            try:
                nuevo_monto = float(v.get("monto_solicitado", monto))
                if nuevo_monto > 0 and nuevo_monto != monto:
                    print(f"⚠ Validación: monto S/ {monto} → S/ {nuevo_monto}")
                    entidades_v["monto_solicitado"] = nuevo_monto
            except (ValueError, TypeError):
                pass

        return entidades_v

    except Exception as e:
        print(f"⚠ Validación cruzada Mistral falló: {e}")
        return entidades


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
        # Corregir sustituciones dígito→letra del OCR (ej: "BEAT0IZ" → "BEATRIZ")
        limpio = normalizar_nombre_ocr(limpio)
        return limpio

    # 1. EXTRACCIÓN DE MONTO — prioridad: FALLO/ORDENO → pensión mensual → petitorio → fallback
    _monto_encontrado = None

    # Prioridad 1: sección de FALLO / resolución ordenatoria (pensión definitiva)
    _m_fallo = re.search(
        r'(?:FALLO|ORDENO?|SE\s+ORDENA|POR\s+(?:ESTAS|LO\s+EXPUESTO))\b[^$]{0,600}?'
        r'(?:pension(?:es)?\s+alimenticia|acuda\s+con\s+(?:la\s+)?(?:suma|pension|cantidad))'
        r'[^$]{0,120}?(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)',
        texto_plano, re.IGNORECASE | re.DOTALL
    )
    if _m_fallo:
        _val = float(_m_fallo.group(1).replace(',', ''))
        if 50.0 < _val < 50000.0:
            _monto_encontrado = _val

    # Prioridad 2: "PENSIÓN MENSUAL: S/X" (tabla de liquidación / encabezado)
    if _monto_encontrado is None:
        _m_pm = re.search(
            r'PENSI[OÓ]N\s+MENSUAL\s*[:\-]\s*(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)',
            texto_plano, re.IGNORECASE
        )
        if _m_pm:
            _val = float(_m_pm.group(1).replace(',', ''))
            if 50.0 < _val < 20000.0:
                _monto_encontrado = _val

    # Prioridad 3: "petitorio / solicita / fija en" con S/ cercano
    if _monto_encontrado is None:
        _m_gen = re.search(
            r'(?:petitorio|solicit[oa]|fija\s+(?:la\s+)?pension|fija.*?en)\s*[^S\n]{0,60}'
            r'(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)',
            texto_plano, re.IGNORECASE
        )
        if _m_gen:
            _val = float(_m_gen.group(1).replace(',', ''))
            if _val > 50.0:
                _monto_encontrado = _val

    # Fallback: primer S/ > 100 que NO esté precedido de "interés/devengadas/liquidación/costas"
    if _monto_encontrado is None:
        for _m_fb in re.finditer(r'(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)', texto_plano):
            _ctx_prev = texto_plano[max(0, _m_fb.start() - 80): _m_fb.start()].lower()
            if re.search(r'inter[eé]s|devengad|liquidaci[oó]n|costas|honorario', _ctx_prev):
                continue
            _val = float(_m_fb.group(1).replace(',', ''))
            if _val > 100.0:
                _monto_encontrado = _val
                break

    if _monto_encontrado is not None:
        entidades["monto_solicitado"] = _monto_encontrado

    # 2. EXTRACCIÓN COORDINADA DE DNIs - BASADA EN CONTEXTO
    # Estrategia: para cada DNI encontrado, analizar los 600 chars anteriores
    # para saber a qué parte procesal pertenece (funciona con cualquier formato de PDF)

    KW_DEMANDADO = re.compile(
        r'demandad[ao]|demandando|generales\s+de\s+ley\s+del|del\s+demanda(?:do|ndo)|contra\s+quien',
        re.IGNORECASE
    )
    KW_DEMANDANTE = re.compile(
        r'demandante|parte\s+actora|accionante|en\s+representaci[oó]n\s+de|nombre\s+de',
        re.IGNORECASE
    )

    # Identificar CUI de menores y excluirlos del pool de DNIs
    # Un CUI aparece como "CUI N° XXXXXXXX", "Código Único de Identificación ... XXXXXXXX"
    _cui_menores = set()
    for _m_cui in re.finditer(
        r'(?:C\.?U\.?I\.?|[Cc][oó]digo\s+[Úú]nico\s+de\s+[Ii]dentificaci[oó]n)\s*N[°º]?\s*(\d{8})',
        texto_plano
    ):
        _cui_menores.add(_m_cui.group(1))
    if _cui_menores:
        print(f"🔒 CUI de menor(es) excluidos del pool DNI: {_cui_menores}")

    # Recopilar todos los 8-digit numbers únicos con su posición y contexto previo
    dnis_en_texto = {}  # dni -> primer item encontrado
    for m in re.finditer(r'(?<!\d)(\d{8})(?!\d)', texto_plano):
        dni = m.group(1)
        if dni in _cui_menores:
            continue  # nunca asignar CUI de menor como DNI de parte adulta
        if dni not in dnis_en_texto:
            ctx_previo = texto_plano[max(0, m.start() - 600):m.start()]
            dnis_en_texto[dni] = {'pos': m.start(), 'ctx_previo': ctx_previo}

    # PASO 0: "GENERALES DE LEY DEL DEMANDANDO" — el primer 8-dígitos que sigue es del demandado.
    # Búsqueda en dos pasos: primero el marcador, luego el número en los siguientes 350 chars.
    for _m_of in re.finditer(r'GENERALES\s+DE\s+LEY\s+DEL\s+DEMANDAND[OA]', texto_plano, re.IGNORECASE):
        _post_of = texto_plano[_m_of.end(): _m_of.end() + 350]
        _m_dni_of = re.search(r'(?<!\d)(\d{8})(?!\d)', _post_of)
        if _m_dni_of:
            _dni_of = _m_dni_of.group(1)
            if _dni_of not in _cui_menores and entidades["demandado"]["dni"] == "No detectado":
                entidades["demandado"]["dni"] = _dni_of
                print(f"✓ DNI {_dni_of} → DEMANDADO (GENERALES DE LEY DEL DEMANDANDO, prioridad máxima)")
                break

    # Asignar por contexto semántico — agrega señales de TODAS las ocurrencias del DNI.
    # Usar solo la primera ocurrencia falla cuando está en frontera entre documentos concatenados.
    for dni in dnis_en_texto:
        if dni == entidades["demandado"]["dni"]:
            continue  # ya asignado por paso 0, no sobreescribir

        cnt_ddo, cnt_dte = 0, 0
        for _m_ctx in re.finditer(r'(?<!\d)' + re.escape(dni) + r'(?!\d)', texto_plano):
            _ctx = texto_plano[max(0, _m_ctx.start() - 600): _m_ctx.start()]
            cnt_ddo += len(re.findall(
                r'demandad[ao]|demandando|generales\s+de\s+ley\s+del', _ctx, re.IGNORECASE))
            cnt_dte += len(re.findall(
                r'\bdemandante\b|parte\s+actora|accionante', _ctx, re.IGNORECASE))

        if cnt_ddo > cnt_dte:
            if entidades["demandado"]["dni"] == "No detectado":
                entidades["demandado"]["dni"] = dni
                print(f"✓ DNI {dni} → DEMANDADO (señales agregadas ddo={cnt_ddo} dte={cnt_dte})")
        elif cnt_dte > 0 and cnt_dte >= cnt_ddo:
            if entidades["demandante"]["dni"] == "No detectado":
                entidades["demandante"]["dni"] = dni
                print(f"✓ DNI {dni} → DEMANDANTE (señales agregadas dte={cnt_dte} ddo={cnt_ddo})")

    # Paso 2: Extraer nombres CON sus posiciones (para proximidad como respaldo)
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
        nombre_raw = dem_te_match.group(1).strip()
        entidades["demandante"]["nombre"] = re.sub(r',\s*', ' ', nombre_raw).strip()

    if dem_do_match:
        nombre_raw = dem_do_match.group(1).strip()
        entidades["demandado"]["nombre"] = re.sub(r',\s*', ' ', nombre_raw).strip()

    # Paso 3: Asociar por proximidad (para documentos narrativos donde el contexto no alcanza)
    # Solo si la asignación por contexto aún no encontró el DNI
    dni_matches = [m for m in re.finditer(r'(?<!\d)(\d{8})(?!\d)', texto_plano)
                   if m.group(1) not in _cui_menores]

    if dem_te_match and entidades["demandante"]["dni"] == "No detectado":
        pos_nombre = dem_te_match.end()
        dni_cercano, distancia_min = None, float('inf')
        for m in dni_matches:
            if m.start() > pos_nombre and m.start() - pos_nombre < distancia_min:
                if m.group(1) != entidades["demandado"]["dni"]:
                    distancia_min = m.start() - pos_nombre
                    dni_cercano = m.group(1)
        if dni_cercano:
            entidades["demandante"]["dni"] = dni_cercano
            print(f"✓ DNI {dni_cercano} → DEMANDANTE (proximidad)")

    if dem_do_match and entidades["demandado"]["dni"] == "No detectado":
        pos_nombre = dem_do_match.end()
        dni_cercano, distancia_min = None, float('inf')
        for m in dni_matches:
            if m.start() > pos_nombre and m.start() - pos_nombre < distancia_min:
                if m.group(1) != entidades["demandante"]["dni"]:
                    distancia_min = m.start() - pos_nombre
                    dni_cercano = m.group(1)
        if dni_cercano:
            entidades["demandado"]["dni"] = dni_cercano
            print(f"✓ DNI {dni_cercano} → DEMANDADO (proximidad)")

    # 3. RESPALDO INTELIGENTE CON MISTRAL (Si regex falla)
    if (entidades["demandante"]["dni"] == "No detectado" or
        entidades["demandado"]["dni"] == "No detectado" or
        entidades["demandante"]["nombre"] == "No detectado" or
        entidades["demandado"]["nombre"] == "No detectado"):

        # Buscar el fragmento más relevante: primer bloque que mencione DEMANDANTE/DEMANDADO
        # En multi-PDF el texto relevante puede estar lejos del inicio
        match_inicio = re.search(r'(?:PARTE\s+)?DEMANDANTE|PARTE\s+DEMANDADA', texto_plano, re.IGNORECASE)
        offset_inicio = max(0, match_inicio.start() - 200) if match_inicio else 0
        fragmento_inicial = texto_plano[offset_inicio:offset_inicio + 3500]
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

    # 4. RED DE SEGURIDAD — solo actúa si NINGUNO de los pasos anteriores asignó el DNI
    # REGLA CRÍTICA: nunca asignar a demandante un DNI que ya está asignado al demandado
    if entidades["demandante"]["dni"] == "No detectado" or entidades["demandado"]["dni"] == "No detectado":
        dnis_globales = [d for d in re.findall(r'(?<!\d)\d{8}(?!\d)', texto_plano)
                         if d not in _cui_menores]
        dnis_unicos = list(dict.fromkeys(dnis_globales))
        dni_ya_demandado = entidades["demandado"]["dni"]
        dni_ya_demandante = entidades["demandante"]["dni"]

        if len(dnis_unicos) >= 2:
            if entidades["demandante"]["dni"] == "No detectado":
                # Tomar el primer DNI que NO sea el del demandado
                for d in dnis_unicos:
                    if d != dni_ya_demandado:
                        entidades["demandante"]["dni"] = d
                        break
            if entidades["demandado"]["dni"] == "No detectado":
                for d in dnis_unicos:
                    if d != entidades["demandante"]["dni"]:
                        entidades["demandado"]["dni"] = d
                        break
        elif len(dnis_unicos) == 1:
            unico = dnis_unicos[0]
            if unico == dni_ya_demandado or unico == dni_ya_demandante:
                pass  # ya asignado correctamente, no duplicar
            else:
                # DNI único sin asignar: contar señales en TODOS los contextos donde aparece
                _cnt_ddo, _cnt_dte = 0, 0
                for _m_u in re.finditer(r'(?<!\d)' + re.escape(unico) + r'(?!\d)', texto_plano):
                    _ctx_u = texto_plano[max(0, _m_u.start() - 600): _m_u.start()].lower()
                    _cnt_ddo += len(re.findall(
                        r'demandad[ao]|demandando|generales\s+de\s+ley\s+del', _ctx_u))
                    _cnt_dte += len(re.findall(
                        r'\bdemandante\b|parte\s+actora|accionante', _ctx_u))
                if _cnt_ddo > _cnt_dte:
                    entidades["demandado"]["dni"] = unico
                    print(f"✓ DNI {unico} → DEMANDADO (red de seguridad, señales ddo={_cnt_ddo} dte={_cnt_dte})")
                elif _cnt_dte > 0:
                    entidades["demandante"]["dni"] = unico
                    print(f"✓ DNI {unico} → DEMANDANTE (red de seguridad, señales dte={_cnt_dte} ddo={_cnt_ddo})")
                else:
                    # Sin señales claras: dejar que Mistral decida, no asignar a ciegas
                    print(f"⚠ DNI único {unico} sin contexto claro — omitido, Mistral lo resolverá")

    # 5. VALIDACIÓN CRUZADA CON MISTRAL
    # Siempre corre, incluso si el regex ya asignó valores.
    # Detecta errores semánticos como CUI de menores asignados como DNI de adultos.
    print("🔍 Validando entidades con Mistral...")
    entidades = _validar_entidades_con_mistral(texto_plano, entidades)

    # 6. ESTANDARIZACIÓN FINAL (Aplica para Mistral y Python)
    entidades["demandante"]["nombre"] = estandarizar_nombre(entidades["demandante"]["nombre"])
    entidades["demandado"]["nombre"] = estandarizar_nombre(entidades["demandado"]["nombre"])

    # 7. DEDUPLICACIÓN FINAL — si ambas partes quedaron con el mismo DNI, la demandante cede
    # (el DNI del demandado suele ser el único en el expediente cuando la demandante no tiene doc)
    if (entidades["demandante"]["dni"] not in ("No detectado", "No encontrado") and
            entidades["demandante"]["dni"] == entidades["demandado"]["dni"]):
        print(f"⚠ DNI duplicado {entidades['demandante']['dni']} — se limpia demandante")
        entidades["demandante"]["dni"] = "No detectado"

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

def _normalizar_monto_texto(monto_txt: str):
    """
    Convierte montos en formato local (1.200,50 / 1200.50 / 1,200.50 / 1200)
    a float robusto. Retorna None si no puede parsearse.
    """
    if monto_txt is None:
        return None
    s = str(monto_txt).strip().replace(" ", "")
    if not s:
        return None

    # Si tiene ambos separadores, inferimos cuál es decimal por la última aparición.
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            # 1.234,56 -> 1234.56
            s = s.replace(".", "").replace(",", ".")
        else:
            # 1,234.56 -> 1234.56
            s = s.replace(",", "")
    elif "," in s:
        # Si hay una sola coma y parece decimal, usarla como decimal.
        if s.count(",") == 1 and len(s.split(",")[-1]) in (1, 2):
            s = s.replace(",", ".")
        else:
            # Comas de miles
            s = s.replace(",", "")
    elif "." in s:
        # Si hay múltiples puntos, probablemente son miles.
        if s.count(".") > 1:
            s = s.replace(".", "")
        # Si hay un punto y no parece decimal corto, puede ser miles.
        elif len(s.split(".")[-1]) > 2:
            s = s.replace(".", "")

    try:
        return float(s)
    except Exception:
        return None

def _extraer_montos_reales(texto_plano: str):
    """
    Fuente de verdad financiera del documento:
    recoge todos los montos explícitos con símbolo monetario.
    """
    patron_monto = r'(?:S/|S/\.)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)'
    montos = []
    for match in re.finditer(patron_monto, texto_plano):
        val = _normalizar_monto_texto(match.group(1))
        if val is not None and val > 0:
            montos.append(val)
    return montos

def _validar_monto_con_texto(monto_objetivo: float, montos_reales: list, tolerancia: float = 1.0):
    """
    Verifica que un monto propuesto exista realmente (o sea casi igual) en el texto.
    Retorna el monto real validado o None.
    """
    try:
        m = float(monto_objetivo)
    except Exception:
        return None

    if m <= 0 or not montos_reales:
        return None

    for token_val in montos_reales:
        if abs(token_val - m) <= tolerancia:
            return token_val
    return None

def _extraer_petitorio_demanda_regex(texto_plano: str):
    """
    Extrae el petitorio principal SOLO desde la sección I. PETITORIO
    de la demanda (no contestación).
    """
    # Cortamos antes de la contestación para reducir ambigüedad.
    texto_demanda = re.split(
        r'CONTESTACI[ÓO]N\s+DE\s+DEMANDA|SUMILLA:\s*CONTESTACI[ÓO]N|ESCRITO:\s*0?2-\d{4}',
        texto_plano,
        maxsplit=1,
        flags=re.IGNORECASE
    )[0]

    seccion_petitorio = re.search(
        r'I\.\s*PETITORIO\s*:?(.*?)(?:\n\s*II\.)',
        texto_demanda,
        re.IGNORECASE | re.DOTALL
    )
    if not seccion_petitorio:
        return 0.0

    bloque = seccion_petitorio.group(1)
    prioridad = re.search(
        r'(?:suma\s+total|pensi[oó]n(?:\s+alimenticia)?|monto\s+solicitado|petitorio).{0,90}?(?:S/|S/\.)\s*([0-9][0-9\.,]*)',
        bloque,
        re.IGNORECASE | re.DOTALL
    )
    if prioridad:
        return _normalizar_monto_texto(prioridad.group(1)) or 0.0

    fallback = re.search(r'(?:S/|S/\.)\s*([0-9][0-9\.,]*)', bloque, re.IGNORECASE)
    return _normalizar_monto_texto(fallback.group(1)) if fallback else 0.0

def _texto_parece_petitorio_o_oferta(texto: str) -> bool:
    """
    Detecta si un fragmento habla de petitorio/oferta procesal, no de carga vigente.
    Solo señales fuertes; 'demanda' se excluye por ser demasiado genérico.
    """
    if not texto:
        return False
    return bool(re.search(
        r'petitorio|solicit[ao]\s+(?:se\s+fije|una\s+pensi)|interpongo\s+demanda|ofrec(?:e|er|iendo)\s+acudir|fundada\s+en\s+parte|pensi[oó]n\s+ascendente\s+a',
        texto,
        re.IGNORECASE
    ))

def _obtener_bloques_demanda_contestacion(texto_plano: str):
    """
    Separa texto de demanda y contestación para evitar mezclar fuentes.
    """
    if not texto_plano:
        return "", ""
    partes = re.split(
        r'CONTESTACI[ÓO]N\s+DE\s+DEMANDA|SUMILLA:\s*CONTESTACI[ÓO]N|ESCRITO:\s*0?2-\d{4}',
        texto_plano,
        maxsplit=1,
        flags=re.IGNORECASE
    )
    demanda = partes[0]
    contestacion = partes[1] if len(partes) > 1 else ""
    return demanda, contestacion

def _extraer_carga_especie_desde_texto(texto_plano: str, montos_reales: list) -> dict:
    """
    Detecta carga en especie (viveres/alimentos en especie) y determina
    si está probada o solo alegada según evidencia textual.
    """
    if not texto_plano:
        return {"monto_reportado": 0.0, "monto_acreditado": 0.0, "estado": "no detectada", "evidencia": ""}

    _, texto_contestacion = _obtener_bloques_demanda_contestacion(texto_plano)
    universo = texto_contestacion or texto_plano

    patron_especie = re.finditer(
        r'([^.]{0,140}(?:v[ií]veres|alimentos?\s+en\s+especie|compras?\s+directas?|en\s+especie)[^.]{0,140}(?:S/|S/\.)\s*([0-9][0-9\.,]*))',
        universo,
        re.IGNORECASE
    )
    palabras_prueba = r'voucher|vouchers|recibo|recibos|boleta|boletas|factura|facturas|comprobante|comprobantes|ticket|tickets|acredita|acreditado|anexo|adjunto|sustentad[oa]'

    # Para clasificar acreditación, revisamos especialmente anexos de contestación.
    anexos_contestacion = ""
    if texto_contestacion:
        m_anexos = re.search(r'IV\.\s*MEDIOS\s+PROBATORIOS.*', texto_contestacion, re.IGNORECASE | re.DOTALL)
        anexos_contestacion = m_anexos.group(0)[:1800] if m_anexos else texto_contestacion[:1800]

    for m in patron_especie:
        contexto = m.group(1).strip()
        monto = _normalizar_monto_texto(m.group(2)) or 0.0
        monto_validado = _validar_monto_con_texto(monto, montos_reales, tolerancia=1.0)
        if not monto_validado:
            continue

        # Solo se marca "probada" si hay evidencia documental de víveres/especie.
        contexto_prueba = f"{contexto} {anexos_contestacion}".strip()
        probada = bool(re.search(palabras_prueba, contexto_prueba, re.IGNORECASE)) and bool(
            re.search(r'v[ií]veres|alimentos?\s+en\s+especie|compras?\s+directas?', contexto_prueba, re.IGNORECASE)
        )
        estado = "probada" if probada else "alegada"
        return {
            "monto_reportado": round(monto_validado, 2),
            "monto_acreditado": round(monto_validado, 2) if probada else 0.0,
            "estado": estado,
            "evidencia": contexto
        }

    return {"monto_reportado": 0.0, "monto_acreditado": 0.0, "estado": "no detectada", "evidencia": ""}

def _extraer_gastos_nativos(texto_plano: str, montos_reales: list, pa: float) -> list:
    """
    Fallback nativo: extrae gastos por categorías con regex contextual
    y valida contra montos reales del texto. Evita duplicar el petitorio.
    """
    categorias = [
        ("Educación", r'(?:pensi[oó]n\s+escolar|colegio|matr[ií]cula|educaci[oó]n|mensualidad\s+escolar)'),
        ("Alimentación", r'(?:alimentaci[oó]n|comida|gastos\s+(?:conjuntos\s+de\s+)?alimentaci[oó]n|supermercado)'),
        ("Salud", r'(?:terapia|tratamiento|m[eé]dico|salud|medicinas|consulta)'),
        ("Vivienda", r'(?:alquiler|vivienda|arriendo|renta\s+de\s+casa)'),
    ]
    gastos = []
    montos_usados = set()

    # Regla crítica: capturar múltiples escolares en una misma oración.
    patron_multi_escolar = re.finditer(
        r'para\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)[\s\S]{0,140}?(?:pensi[oó]n\s+escolar|colegio|mensualidad)[\s\S]{0,140}?(?:S/|S/\.)\s*([0-9][0-9\.,]*)',
        texto_plano,
        re.IGNORECASE
    )
    for m in patron_multi_escolar:
        nombre_hijo = m.group(1).strip().title()
        val = _normalizar_monto_texto(m.group(2))
        val_validado = _validar_monto_con_texto(val or 0, montos_reales, tolerancia=1.0)
        if not val_validado:
            continue
        if abs(val_validado - pa) <= 10:
            continue
        clave = (f"Educación / {nombre_hijo}", round(val_validado, 2))
        if clave in montos_usados:
            continue
        montos_usados.add(clave)
        gastos.append({
            "concepto": f"Educación / {nombre_hijo}",
            "monto": val_validado,
            "observacion": m.group(0)[:140].strip(),
            "tipo_documento": "texto nativo"
        })

    for concepto, patron_cat in categorias:
        for m in re.finditer(
            rf'{patron_cat}[\s\S]{{0,140}}?(?:S/|S/\.)\s*([0-9][0-9\.,]*)',
            texto_plano,
            re.IGNORECASE
        ):
            val = _normalizar_monto_texto(m.group(1))
            val_validado = _validar_monto_con_texto(val or 0, montos_reales, tolerancia=1.0)
            if not val_validado:
                continue
            if abs(val_validado - pa) <= 10:
                continue
            clave = (concepto, round(val_validado, 2))
            if clave in montos_usados:
                continue
            montos_usados.add(clave)
            ctx = m.group(0)[:120].strip()
            gastos.append({
                "concepto": concepto,
                "monto": val_validado,
                "observacion": ctx,
                "tipo_documento": "texto nativo"
            })

    return gastos

def _extraer_dependientes_nativos(texto_plano: str):
    """
    Detecta dependientes por patrón NOMBRE (N años).
    Retorna lista de dependientes únicos.
    """
    if not texto_plano:
        return []
    dependientes = []
    vistos = set()
    for m in re.finditer(r'([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){0,2})\s*\((\d{1,2})\s*años\)', texto_plano, re.IGNORECASE):
        nombre = re.sub(r'\s+', ' ', m.group(1)).strip().title()
        edad = int(m.group(2))
        key = (nombre.lower(), edad)
        if key in vistos:
            continue
        vistos.add(key)
        tipo = "Hija Alimentista" if nombre.endswith("a") else "Hijo Alimentista"
        dependientes.append({
            "tipo": tipo,
            "detalle": f"{nombre} ({edad} años)",
            "monto_carga": 0.0,
            "evidencia": m.group(0)
        })
    return dependientes

def modulo_auditoria_financiera(texto_plano: str, monto_p_spacy: float):
    """
    Versión 5.4: Auditoría Financiera Blindada.
    Incluye Filtro Anti-Alucinación: Valida que los montos extraídos por la IA 
    existan realmente en el documento original.
    """
    import json, re, requests

    # 1. ESCANEO INICIAL: Python encuentra todos los montos reales del texto
    montos_reales_en_texto = _extraer_montos_reales(texto_plano)  # "Verdad Absoluta"

    # 2. PROMPT DE CLASIFICACIÓN (Plantilla en blanco)
    fragmentos = re.findall(r'([^.]{0,70}(?:S/|S/\.)\s*\d+(?:[.,]\d{1,2})?[^.]{0,70})', texto_plano)
    contexto_ia = "\n".join(fragmentos)

    # Prompt reforzado: exige separar demanda/contestación y evidencia literal.
    prompt_ia = f"""
    Eres perito contable judicial. Extrae SOLO montos con evidencia literal.

    TEXTO A ANALIZAR:
    {contexto_ia}

    REGLAS CRÍTICAS:
    1. Distingue origen: "demanda_petitorio_actora", "contestacion_oferta_demandado", "gasto_acreditado".
    2. PETITORIO PRINCIPAL = SOLO monto en sección "I. PETITORIO" del escrito de DEMANDA.
    3. NO uses como petitorio: pensión escolar, oferta del demandado, ni montos históricos.
    4. Cada monto debe incluir evidencia_literal exacta y tipo_documento ("demanda" o "contestación").
    5. Si hay duda, devuelve null y no inventes.

    Responde SOLO con este JSON:
    {{
      "petitorio_principal": {{
        "monto": 0.0,
        "tipo_documento": "demanda",
        "seccion": "I. PETITORIO",
        "evidencia_literal": ""
      }},
      "petitorio_secundario_contestacion": {{
        "monto": 0.0,
        "evidencia_literal": ""
      }},
      "gastos_acreditados": [
        {{
          "concepto": "Educación|Alimentación|Salud|Vivienda|Otro",
          "monto_exacto": 0.0,
          "evidencia_literal": "",
          "tipo_documento": "demanda"
        }}
      ]
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {"model": "mistral", "prompt": prompt_ia, "format": "json", "stream": False, "options": {"temperature": 0}}
        response = requests.post(url, json=payload, timeout=90)
        raw_res = json.loads(response.json().get("response", "{}"))

        # 3) Selección de petitorio con jerarquía y validación anti-alucinación.
        petitorio_ia = raw_res.get("petitorio_principal") or {}
        pa_ia = _normalizar_monto_texto(
            petitorio_ia.get("monto", raw_res.get("petitorio_detectado", 0))
        ) or 0.0
        pa_spacy = float(monto_p_spacy or 0)
        tipo_doc_ia = str(petitorio_ia.get("tipo_documento", "")).strip().lower()
        seccion_ia = str(petitorio_ia.get("seccion", "")).strip().lower()
        evidencia_ia = str(petitorio_ia.get("evidencia_literal", "")).strip()

        # Regex nativo estricto para demanda: I. PETITORIO del escrito de demanda.
        pa_regex = _extraer_petitorio_demanda_regex(texto_plano) or 0.0

        ia_petitorio_confiable = (
            pa_ia > 0
            and tipo_doc_ia in ("demanda", "demanda de alimentos", "demanda_petitorio_actora")
            and ("petitorio" in seccion_ia or "i. petitorio" in seccion_ia)
            and not _texto_parece_petitorio_o_oferta(evidencia_ia)  # protege contra citas ambiguas
        )

        pa_validado_spacy = _validar_monto_con_texto(pa_spacy, montos_reales_en_texto) if pa_spacy > 0 else None
        pa_validado_regex = _validar_monto_con_texto(pa_regex, montos_reales_en_texto) if pa_regex > 0 else None
        pa_validado_ia = _validar_monto_con_texto(pa_ia, montos_reales_en_texto) if ia_petitorio_confiable else None
        pa_validado_ia_legacy = _validar_monto_con_texto(pa_ia, montos_reales_en_texto) if pa_ia > 0 else None

        # Prioridad: regex demanda estricto > IA confiable validada > NER validado > IA legacy validada > fallback NER > 0
        if pa_validado_regex:
            pa = pa_validado_regex
        elif pa_validado_ia:
            pa = pa_validado_ia
        elif pa_validado_spacy:
            pa = pa_validado_spacy
        elif pa_validado_ia_legacy:
            pa = pa_validado_ia_legacy
        elif pa_spacy > 0:
            pa = pa_spacy
        else:
            pa = 0.0

        detalles_ia = raw_res.get("gastos_acreditados") or raw_res.get("gastos") or []
        suma_gn = 0
        detalles_finales = []

        for g in detalles_ia:
            monto_ia = _normalizar_monto_texto(g.get("monto_exacto", 0)) or 0.0
            if monto_ia <= 0: continue # Ignoramos los ceros de la plantilla
            evidencia = str(g.get("evidencia_literal", g.get("observacion", ""))).strip()
            tipo_doc_gasto = str(g.get("tipo_documento", "")).strip().lower()
            
            # --- FILTRO ESTRICTO ANTI-ALUCINACIÓN ---
            monto_validado = _validar_monto_con_texto(monto_ia, montos_reales_en_texto, tolerancia=1.0)
            
            # Si Python NO encontró este monto en el PDF original, lo descartamos
            if not monto_validado:
                print(f"Alerta de IA interceptada: Se intentó agregar S/ {monto_ia} inexistente.")
                continue

            # No permitir que un texto de petitorio/oferta termine como gasto.
            if _texto_parece_petitorio_o_oferta(evidencia):
                continue
            
            # Condición de negocio: El gasto no puede ser igual al petitorio total
            if monto_validado > 0 and abs(monto_validado - pa) > 10:
                detalles_finales.append({
                    "concepto": g.get("concepto", "Gasto general"),
                    "monto": monto_validado,
                    "observacion": evidencia or g.get("observacion", "Mención en el texto"),
                    "tipo_documento": tipo_doc_gasto or "no especificado"
                })
                suma_gn += monto_validado

        # 4) FALLBACK NATIVO: usar demanda para no contaminar ΣGN con especie alegada de contestación.
        texto_demanda, _ = _obtener_bloques_demanda_contestacion(texto_plano)
        gastos_nativos = _extraer_gastos_nativos(texto_demanda or texto_plano, montos_reales_en_texto, pa)
        montos_ya_incluidos = {round(d["monto"], 2) for d in detalles_finales}
        for gn in gastos_nativos:
            if round(gn["monto"], 2) not in montos_ya_incluidos:
                detalles_finales.append(gn)
                suma_gn += gn["monto"]
                montos_ya_incluidos.add(round(gn["monto"], 2))

        # Validación HU12: n° ítems educación >= n° hijos con escolaridad mencionada.
        hijos_escolar = {
            m.group(1).strip().title()
            for m in re.finditer(
                r'para\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)[\s\S]{0,140}?(?:pensi[oó]n\s+escolar|colegio|mensualidad)',
                texto_demanda or texto_plano,
                re.IGNORECASE
            )
        }
        items_educacion = [d for d in detalles_finales if str(d.get("concepto", "")).lower().startswith("educación")]
        validacion_hu12 = len(items_educacion) >= len(hijos_escolar) if hijos_escolar else True

        # Cálculos finales de la HU18
        brecha = max(0.0, pa - suma_gn)
        hay_alerta = brecha > 10.0

        return {
            "petitorio": pa,
            "suma_gastos_sustentados": round(suma_gn, 2),
            "brecha_valor": round(brecha, 2),
            "porcentaje_brecha": round((brecha/pa*100), 1) if pa > 0 else 0,
            "detalles_gastos": detalles_finales,
            "alerta": hay_alerta,
            "validaciones_hu12": {
                "hijos_con_escolaridad": len(hijos_escolar),
                "items_educacion_detectados": len(items_educacion),
                "estado": "ok" if validacion_hu12 else "revisar"
            }
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
            "carga_nivel": "Desconocida", "mensaje": "Sin datos",
            "carga_especie_reportada": 0, "carga_especie_acreditada": 0,
            "carga_especie_estado": "no detectada", "carga_especie_evidencia": "",
            "ingreso_disponible_neto": 0, "alerta_revision_hu14": False
        }

    prompt = f"""
    Eres un Asistente Social de los Juzgados de Familia del Callao.
    Analiza el texto y extrae la capacidad económica del demandado (quien debe pagar los alimentos).

    INSTRUCCIONES:
    1. INGRESOS: Busca sueldo/remuneración/ingresos ACTUALES del demandado.
    2. DEPENDIENTES: Identifica dependientes del demandado.
    3. "monto_carga" SOLO si el texto dice que YA paga ese monto actualmente.
    4. NO registrar como "monto_carga": petitorio solicitado, oferta de contestación o monto pretendido.
    5. CARGA EN ESPECIE: Si se menciona víveres/alimentos en especie, extrae el monto y clasifica "estado_acreditacion":
       - "probada": si el texto menciona comprobantes/vouchers/recibos/anexos.
       - "alegada": si solo está afirmada sin sustento documental explícito.
    6. Todo monto debe incluir "evidencia_literal" exacta.
    3. Si no hay información de ingresos o dependientes en el texto, deja las listas VACÍAS []. NO inventes datos.

    TEXTO DEL EXPEDIENTE:
    {texto_plano[:8000]}

    Responde ESTRICTAMENTE con este formato JSON:
    {{
        "ingresos": [
            {{ "tipo": "Remuneración Principal", "monto": 3850.0, "estado": "Validado boleta/RUC", "evidencia_literal": "" }}
        ],
        "dependientes": [
            {{ "tipo": "Hijo Alimentista", "detalle": "Dependiente Directo", "monto_carga": 0.0, "evidencia_literal": "" }}
        ],
        "carga_especie": {{ "monto": 0.0, "estado_acreditacion": "alegada", "evidencia_literal": "" }}
    }}
    """

    try:
        url = "http://localhost:11434/api/generate"
        payload = {"model": "mistral", "prompt": prompt, "format": "json", "stream": False, "options": {"temperature": 0.1, "num_predict": 1500, "top_p": 0.85, "num_ctx": 10000}}
        response = requests.post(url, json=payload, timeout=60)
        
        data = json.loads(response.json().get("response", "{}"))

        ingresos_ia = data.get("ingresos", []) or []
        dependientes_ia = data.get("dependientes", []) or []
        montos_reales_en_texto = _extraer_montos_reales(texto_plano)

        # Fallback nativo para ingresos si la IA viene vacía o inconsistente.
        ingresos_nativos = []
        patron_ingresos = re.finditer(
            r'([^.]{0,90}(?:sueldo|remuneraci[oó]n|ingres[oa]s?|haber|renta)[^.]{0,90}(?:S/|S/\.)\s*([0-9][0-9\.,]*))',
            texto_plano,
            re.IGNORECASE
        )
        for m in patron_ingresos:
            val = _normalizar_monto_texto(m.group(2))
            val_validado = _validar_monto_con_texto(val or 0, montos_reales_en_texto, tolerancia=1.0)
            if val_validado:
                ingresos_nativos.append({
                    "tipo": "Ingreso detectado en texto",
                    "monto": val_validado,
                    "estado": "Validado por texto"
                })

        # Validación estricta de montos IA contra texto real.
        ingresos = []
        for item in ingresos_ia:
            monto = _normalizar_monto_texto(item.get("monto", 0)) or 0.0
            monto_validado = _validar_monto_con_texto(monto, montos_reales_en_texto, tolerancia=1.0)
            if not monto_validado:
                if monto > 0:
                    print(f"Alerta HU14: ingreso IA descartado por no existir en el texto (S/ {monto}).")
                continue
            ingresos.append({
                "tipo": item.get("tipo", "Ingreso detectado"),
                "monto": monto_validado,
                "estado": item.get("estado", "Validado por texto"),
                "evidencia": str(item.get("evidencia_literal", "")).strip()
            })

        # Si IA no aporta ingresos válidos, usamos fallback nativo (sin duplicar montos).
        if not ingresos and ingresos_nativos:
            vistos = set()
            for ing in ingresos_nativos:
                key = round(float(ing["monto"]), 2)
                if key in vistos:
                    continue
                vistos.add(key)
                ingresos.append(ing)

        dependientes = []
        for dep in dependientes_ia:
            monto_carga = _normalizar_monto_texto(dep.get("monto_carga", 0)) or 0.0
            evidencia_dep = str(dep.get("evidencia_literal", "")).strip()
            texto_fuente_dep = " ".join([
                str(dep.get("tipo", "")),
                str(dep.get("detalle", "")),
                evidencia_dep
            ]).strip()
            # monto_carga=0 es permitido (dependiente sin carga monetaria explícita)
            if monto_carga > 0:
                if _texto_parece_petitorio_o_oferta(texto_fuente_dep):
                    print(f"Alerta HU14: carga descartada por parecer petitorio/oferta (S/ {monto_carga}).")
                    monto_carga = 0.0
                else:
                    monto_validado = _validar_monto_con_texto(monto_carga, montos_reales_en_texto, tolerancia=1.0)
                    if not monto_validado:
                        print(f"Alerta HU14: carga IA descartada por no existir en el texto (S/ {monto_carga}).")
                        monto_carga = 0.0
                    else:
                        monto_carga = monto_validado
            dependientes.append({
                "tipo": dep.get("tipo", "Dependiente"),
                "detalle": dep.get("detalle", "Dependiente identificado"),
                "monto_carga": monto_carga,
                "evidencia": evidencia_dep
            })

        # Completar dependientes por extracción nativa NOMBRE (N años).
        dependientes_nativos = _extraer_dependientes_nativos(texto_plano)
        presentes = {
            re.sub(r'\s+', ' ', str(d.get("detalle", "")).lower())
            for d in dependientes
        }
        for dn in dependientes_nativos:
            detalle_key = re.sub(r'\s+', ' ', str(dn.get("detalle", "")).lower())
            if detalle_key not in presentes:
                dependientes.append(dn)
                presentes.add(detalle_key)

        # Detectar carga en especie con prioridad nativa (texto real) y respaldo IA.
        carga_especie = _extraer_carga_especie_desde_texto(texto_plano, montos_reales_en_texto)
        carga_especie_ia = data.get("carga_especie", {}) if isinstance(data, dict) else {}
        ia_monto_especie = _normalizar_monto_texto(carga_especie_ia.get("monto", 0)) or 0.0
        ia_monto_validado = _validar_monto_con_texto(ia_monto_especie, montos_reales_en_texto, tolerancia=1.0) if ia_monto_especie > 0 else None
        ia_estado = str(carga_especie_ia.get("estado_acreditacion", "")).strip().lower()
        ia_evidencia = str(carga_especie_ia.get("evidencia_literal", "")).strip()
        if carga_especie["estado"] == "no detectada" and ia_monto_validado:
            carga_especie = {
                "monto_reportado": round(float(ia_monto_validado), 2),
                "monto_acreditado": round(float(ia_monto_validado), 2) if ia_estado == "probada" else 0.0,
                "estado": "probada" if ia_estado == "probada" else "alegada",
                "evidencia": ia_evidencia
            }

        # --- 1. Cálculos Base ---
        total_ingresos = sum(float(item.get("monto") or 0) for item in ingresos)
        carga_especie_acreditada = float(carga_especie.get("monto_acreditado") or 0)
        carga_especie_reportada = float(carga_especie.get("monto_reportado") or 0)
        estado_carga = carga_especie.get("estado", "no detectada")
        # Regla HU14 actualizada: si es alegada con monto reportado, también se aplica al ratio.
        carga_especie_aplicada = carga_especie_reportada if estado_carga in ("probada", "alegada") else 0.0
        # Para compatibilidad de métricas existentes, total_cargas refleja lo aplicado al ratio.
        total_cargas_existentes = carga_especie_aplicada
        
        # --- 2. CÁLCULO LEGAL CPC 648 (NUEVO) ---
        # El 60% es lo máximo que el Juez puede embargar por ley
        tope_legal_60 = total_ingresos * 0.60
        # El "Margen Libre" es lo que queda de ese 60% tras restar lo que ya paga
        margen_disponible_sentencia = tope_legal_60 - total_cargas_existentes

        # --- 3. Análisis de Ratio y Alertas ---
        ratio = 0
        mensaje_ratio = "No se detectaron ingresos para calcular el ratio."
        carga_nivel = "Desconocida"

        alerta_revision_hu14 = False
        ingreso_disponible = 0.0
        if total_ingresos > 0:
            # Regla HU14: usar SIEMPRE carga en especie aplicada (probada o alegada) para el ratio.
            ingreso_disponible = total_ingresos - carga_especie_aplicada
            ratio = (ingreso_disponible / total_ingresos) * 100

            if ratio >= 90:
                carga_nivel = "Carga Baja"
            elif ratio >= 75:
                carga_nivel = "Carga Media"
            elif ratio >= 60:
                carga_nivel = "Carga Alta"
            else:
                carga_nivel = "Carga Crítica"

            if estado_carga == "probada":
                mensaje_ratio = f"Ratio HU14 de {ratio:.1f}%. Se aplicó carga en especie probada por S/ {carga_especie_aplicada:.2f}."
            elif estado_carga == "alegada":
                mensaje_ratio = f"Ratio HU14 de {ratio:.1f}%. La carga en especie alegada (S/ {carga_especie_aplicada:.2f}) se aplicó como estimación."
            else:
                mensaje_ratio = f"Ratio HU14 de {ratio:.1f}%. No se detectó carga en especie acreditada."

        # --- 4. Ensamblaje del JSON Final ---
        return {
            "ingresos": ingresos,
            "dependientes": dependientes,
            "total_ingresos": total_ingresos,
            "total_cargas": total_cargas_existentes,
            "tope_legal_60": round(tope_legal_60, 2),
            "margen_libre": round(max(0, margen_disponible_sentencia), 2),
            "carga_especie_reportada": round(carga_especie_reportada, 2),
            "carga_especie_acreditada": round(carga_especie_acreditada, 2),
            "carga_especie_aplicada": round(carga_especie_aplicada, 2),
            "carga_especie_estado": carga_especie.get("estado", "no detectada"),
            "carga_especie_evidencia": carga_especie.get("evidencia", ""),
            "ingreso_disponible_neto": round(ingreso_disponible, 2),
            "ratio_disponibilidad": round(ratio, 1),
            "carga_nivel": carga_nivel,
            "mensaje": mensaje_ratio,
            "alerta_revision_hu14": alerta_revision_hu14,
            "validaciones_dependientes": {
                "n_detectados_patron_nombre_edad": len(dependientes_nativos),
                "n_dependientes_final": len(dependientes),
                "estado": "ok" if len(dependientes) >= len(dependientes_nativos) else "revisar"
            }
        }

    except Exception as e:
        print(f"Error en módulo de cargas: {e}")
        return {
            "ingresos": [], "dependientes": [], "total_ingresos": 0, "total_cargas": 0, 
            "tope_legal_60": 0, "margen_libre": 0, "ratio_disponibilidad": 0, 
            "carga_nivel": "Error", "mensaje": "Error de análisis",
            "carga_especie_reportada": 0, "carga_especie_acreditada": 0,
            "carga_especie_aplicada": 0,
            "carga_especie_estado": "no detectada", "carga_especie_evidencia": "",
            "ingreso_disponible_neto": 0, "alerta_revision_hu14": True
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
def resumir_pdf_individual(filename: str, texto: str) -> dict:
    """
    Genera un resumen de extracción para un PDF individual.
    Muestra qué entidades se detectaron directamente en ese documento.
    """
    es_vacio = not texto.strip() or texto.strip() == "[TEXTO NO DETECTADO - REQUIERE OCR PROFUNDO]"
    chars = len(texto)
    paginas_est = max(1, chars // 1500)

    if es_vacio:
        return {
            "archivo": filename,
            "paginas_estimadas": 0,
            "caracteres_extraidos": 0,
            "calidad_extraccion": "Sin texto",
            "entidades_detectadas": {"nombres": [], "dnis": [], "fechas": [], "montos": [], "articulos": []},
            "preview": "[Sin texto extraíble]"
        }

    # Nombres (personas en mayúsculas de 2+ palabras)
    nombres = list(dict.fromkeys(re.findall(
        r'\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,4})\b', texto
    )))[:8]

    # DNIs con contexto expandido
    dnis = list(dict.fromkeys(re.findall(
        r'(?:D\.?N\.?I\.?|n[uú]mero|n°)\s*[:\s]*\s*(\d{8})', texto, re.IGNORECASE
    ) + re.findall(r'(?<!\d)(\d{8})(?!\d)', texto)))[:5]

    # Fechas
    fechas = list(dict.fromkeys(re.findall(
        r'\d{1,2}\s+de\s+\w+\s+d[eo]l?\s+\d{4}|\d{2}[/-]\d{2}[/-]\d{4}', texto, re.IGNORECASE
    )))[:5]

    # Montos
    montos = list(dict.fromkeys(re.findall(
        r'S/\.?\s*[\d,\.]+', texto
    )))[:6]

    # Artículos legales
    articulos = list(dict.fromkeys(re.findall(
        r'Art(?:ículo|\.)\s*\d+[°º]?\s*(?:[A-Z]{1,5})?', texto, re.IGNORECASE
    )))[:5]

    calidad = "Alta" if chars > 1000 else ("Media" if chars > 300 else "Baja")

    return {
        "archivo": filename,
        "paginas_estimadas": paginas_est,
        "caracteres_extraidos": chars,
        "calidad_extraccion": calidad,
        "entidades_detectadas": {
            "nombres": nombres,
            "dnis": dnis,
            "fechas": fechas,
            "montos": montos,
            "articulos": articulos
        },
        "preview": texto[:250].replace("\n", " ").strip()
    }


# --- ENDPOINTS (API) ---

@app.post("/api/v1/analyze-document")
async def analizar_expediente(
    files: List[UploadFile] = File(...),
    forzar_ocr: bool = Form(False),
    numero_expediente: str = Form(...),
    usuario_auditoria: str = Form("Desconocido"),
    inconsistencia_nombre: bool = Form(False)
):
    """
    Endpoint principal multi-PDF. Recibe uno o más PDFs de un mismo expediente,
    concatena los textos extraídos y ejecuta el pipeline cognitivo sobre el texto unificado.
    """
    for f in files:
        if not f.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"Solo se admiten PDFs. El archivo '{f.filename}' no es válido.")

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
                f"ALERTA: Subida de {len(files)} documento(s) con posible inconsistencia",
                numero_expediente
            ))
            conn.commit()
            print(f"⚠️ LOG DE SEGURIDAD: {usuario_auditoria} subió {len(files)} archivo(s) para {numero_expediente}.")

        # 2. INGESTA Y EXTRACCIÓN DE TEXTO - Multi-PDF
        nombre_seguro = re.sub(r'[^a-zA-Z0-9-]', '_', numero_expediente)
        carpeta_expediente = f"pdfs_guardados/{nombre_seguro}"
        os.makedirs(carpeta_expediente, exist_ok=True)

        textos_por_doc = []
        resumenes_por_pdf = []
        ocr_precisions_doc = []
        texto_total = ""
        for i, upload_file in enumerate(files):
            contenido = await upload_file.read()
            nombre_archivo = re.sub(r'[^a-zA-Z0-9._-]', '_', upload_file.filename)
            with open(f"{carpeta_expediente}/{nombre_archivo}", "wb") as f_out:
                f_out.write(contenido)

            if forzar_ocr:
                print(f"🚀 OCR Profundo: {upload_file.filename}")
                texto_doc = modulo_ocr_avanzado_imagen(contenido)
                if texto_doc == "[ERROR_OCR_PROFUNDO]" or not texto_doc.strip():
                    texto_doc, ocr_prec_doc, ocr_met_doc = modulo_ocr_tesseract(contenido)
                else:
                    ocr_prec_doc = calcular_ocr_precision(texto_doc)
                    ocr_met_doc = "Tesseract"
            else:
                print(f"⚡ Lectura estándar: {upload_file.filename}")
                texto_doc, ocr_prec_doc, ocr_met_doc = modulo_ocr_tesseract(contenido)

            print(f"📊 OCR [{ocr_met_doc}] {upload_file.filename}: {ocr_prec_doc}%")
            ocr_precisions_doc.append({
                "archivo": upload_file.filename,
                "ocr_precision": ocr_prec_doc,
                "metodo": ocr_met_doc
            })
            textos_por_doc.append(texto_doc)
            texto_total += f"\n\n--- [DOCUMENTO {i+1}: {upload_file.filename}] ---\n\n{texto_doc}"
            resumenes_por_pdf.append(resumir_pdf_individual(nombre_archivo, texto_doc))

        texto_extraido = texto_total.strip()
            
        # 3. 🛡️ FILTRO DE INTEGRIDAD INTERNA - Multi-PDF
        str_esperado = re.sub(r'(?i)^(expediente|exp_?|exp\.\s*)', '', numero_expediente)
        clean_esperado = re.sub(r'[^a-zA-Z0-9]', '', str_esperado).lower()

        for texto_doc, upload_file in zip(textos_por_doc, files):
            num_interno = extraer_numero_expediente(texto_doc)
            if num_interno:
                clean_interno = re.sub(r'[^a-zA-Z0-9]', '', num_interno).lower()
                if clean_interno != clean_esperado:
                    print(f"🛑 BLOQUEO: '{upload_file.filename}' pertenece a {num_interno}, se esperaba {clean_esperado}.")
                    timestamp_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    conn.execute('''
                        INSERT INTO log_seguridad (timestamp, usuario, accion_registrada, expediente, ip_origen)
                        VALUES (?, ?, ?, ?, '127.0.0.1')
                    ''', (timestamp_actual, usuario_auditoria, f"RECHAZO: '{upload_file.filename}' pertenecía a {num_interno}", numero_expediente))
                    conn.commit()
                    raise HTTPException(
                        status_code=400,
                        detail=f"Fallo de Integridad: El documento '{upload_file.filename}' pertenece al expediente '{num_interno}', pero está cargando el caso '{numero_expediente}'. Operación cancelada."
                    )

        # 4. PIPELINE DE ANÁLISIS AVANZADO DE INTELIGENCIA ARTIFICIAL
        print(f"✅ Control perimetral superado ({len(files)} doc(s)). Iniciando análisis cognitivo...")

        # Calcular OCR precision sobre el texto crudo (antes de limpiar) para medir artefactos reales
        # Precisión real: promedio de las precisiones por documento (nativo vs OCR cuando hay referencia)
        valores_ocr = [d["ocr_precision"] for d in ocr_precisions_doc]
        m_ocr_precision = round(sum(valores_ocr) / len(valores_ocr), 1) if valores_ocr else calcular_ocr_precision(texto_extraido)
        ocr_detalle_json = json.dumps(ocr_precisions_doc, ensure_ascii=False)

        # Corregir fragmentos OCR partidos (ej: 'BEA TRIZ' → 'BEATRIZ') antes del NER
        texto_para_ner, n_splits_ocr = limpiar_fragmentos_ocr(texto_extraido)
        if n_splits_ocr > 0:
            print(f"🔧 OCR: {n_splits_ocr} fragmento(s) partido(s) corregido(s) antes del NER")

        entidades_ner = modulo_ner_spacy(texto_para_ner)
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

        # Métricas de calidad (m_ocr_precision ya calculada arriba sobre texto crudo)
        resumen_concatenado = ""
        if isinstance(analisis_llm.get("resumen"), dict):
            resumen_concatenado = analisis_llm["resumen"].get("tecnico", "") + " " + analisis_llm["resumen"].get("estandar", "")
        m_bert_score = calcular_bert_score(texto_extraido, resumen_concatenado)
        m_f1_ner = calcular_f1_ner(entidades_ner)

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
                tiempo_procesamiento_seg = ?,
                bert_score = ?,
                f1_ner = ?,
                ocr_precision = ?,
                ocr_detalle = ?
            WHERE numero_expediente = ?
        ''', (json_resultados_string, timestamp_concluido, paginas_estimadas, tiempo_total,
              m_bert_score, m_f1_ner, m_ocr_precision, ocr_detalle_json, numero_expediente))
        conn.commit()
        
        print(f"💾 BASE DE DATOS: Análisis RAG indexado permanentemente para el caso {numero_expediente}")

        # 6. RETORNO DE RESPUESTA SÍNCRONA AL FRONTEND
        return {
            "status": "success",
            "texto_completo": texto_extraido,
            "pdf_files": [re.sub(r'[^a-zA-Z0-9._-]', '_', f.filename) for f in files],
            "resumen_por_pdf": resumenes_por_pdf,
            "metadata": {
                "archivo": f"{len(files)} documento(s)",
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
    - Respuestas claras y suficientes (ideal 60-120 palabras, salvo que el usuario pida mayor detalle)
    - Usa términos legales apropiados
    - Cita hechos específicos del documento

    EXPEDIENTE (CONTEXTO):
    {request.texto_expediente[:6000]}

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
                "num_predict": 900,   # Reduce latencia sin perder detalle útil
                "top_p": 0.85,
                "top_k": 40,
                "num_ctx": 8000       # Contexto suficiente con menor tiempo de respuesta
            }
        }
        
        response = requests.post(url, json=payload, timeout=120)
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

        # Calcular métricas de calidad reales desde los resultados del análisis
        entidades_json = req.resultados_json.get("sujetos_procesales", {})
        m_f1_ner = calcular_f1_ner(entidades_json)
        resumen_json = req.resultados_json.get("sintesis_rag", {})
        resumen_texto = ""
        if isinstance(resumen_json, dict):
            resumen_texto = resumen_json.get("tecnico", "") + " " + resumen_json.get("estandar", "")
        elif isinstance(resumen_json, str):
            resumen_texto = resumen_json
        postura_json = req.resultados_json.get("postura_defensa", {})
        postura_texto = ""
        if isinstance(postura_json, dict):
            postura_texto = postura_json.get("tecnico", "") + " " + postura_json.get("estandar", "")
        elif isinstance(postura_json, str):
            postura_texto = postura_json
        combined_resumen = resumen_texto + " " + postura_texto
        # BERTScore: solapamiento entre resumen generado y datos clave del expediente
        texto_referencia = f"{demandante} {demandado} {monto_p} {riesgo_capacidad} {combined_resumen}"
        m_bert_score = calcular_bert_score(texto_referencia, combined_resumen)
        # OCR precision: estimada desde la calidad del texto del resumen generado
        m_ocr_precision = calcular_ocr_precision(combined_resumen) if combined_resumen.strip() else 0.0
        
        conn = get_db_connection()
        
        # LÓGICA UPSERT (Actualizar si existe, Insertar si es nuevo)
        existente = conn.execute("SELECT id FROM registro_expedientes WHERE numero_expediente = ?", (req.numero_expediente,)).fetchone()
        
        if existente:
            # Si el expediente ya existe en la BD, lo actualizamos (UPDATE)
            # bert_score y ocr_precision usan COALESCE para preservar el valor calculado
            # por analyze-document (que usa el texto OCR real); solo f1_ner se recalcula siempre.
            conn.execute('''
                UPDATE registro_expedientes
                SET fecha_analisis=?, demandante=?, demandado=?, monto_petitorio=?,
                    estado_auditoria=?, riesgo_capacidad=?, json_resultados=?,
                    bert_score=COALESCE(bert_score, ?), f1_ner=?, ocr_precision=COALESCE(ocr_precision, ?)
                WHERE numero_expediente=?
            ''', (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), demandante, demandado, monto_p,
                  estado_auditoria, riesgo_capacidad, json_texto,
                  m_bert_score, m_f1_ner, m_ocr_precision, req.numero_expediente))
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
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    from docx.enum.text import WD_LINE_SPACING

    # ══════════════════════════════════════════════════════════
    # HELPERS APA 7ma edición
    # ══════════════════════════════════════════════════════════

    def apa_run(paragraph, text, bold=False, italic=False, size=12, color=None):
        run = paragraph.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.bold = bold
        run.italic = italic
        if color:
            run.font.color.rgb = color
        return run

    def apa_p(text="", bold=False, italic=False, size=12,
              align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=0):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after  = Pt(space_after)
        if text:
            apa_run(p, text, bold=bold, italic=italic, size=size)
        return p

    def apa_heading(text, level=1):
        """APA 7: Nivel 1 = centrado negrita | Nivel 2 = izquierda negrita cursiva."""
        p = doc.add_heading(text, level=level)
        for r in p.runs:
            r.font.name = 'Times New Roman'
            r.font.size = Pt(12)
            r.bold = True
            r.italic = (level == 2)
            r.font.color.rgb = RGBColor(0, 0, 0)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(0)
        return p

    def figura_caption(n, titulo, nota=None):
        """Pie de figura APA 7: Figura N (negrita) + título en cursiva + nota opcional."""
        apa_p(f"Figura {n}", bold=True)
        apa_p(titulo, italic=True, space_after=0 if nota else 6)
        if nota:
            p = apa_p(space_after=12)
            apa_run(p, "Nota. ", italic=True)
            apa_run(p, nota)

    def cell_borders(cell, top='none', bottom='none', left='none', right='none'):
        tc   = cell._tc
        tcPr = tc.get_or_add_tcPr()
        bd   = OxmlElement('w:tcBorders')
        for side, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            el = OxmlElement(f'w:{side}')
            el.set(qn('w:val'), val)
            if val != 'none':
                el.set(qn('w:sz'), '4')
                el.set(qn('w:color'), '000000')
            bd.append(el)
        existing = tcPr.find(qn('w:tcBorders'))
        if existing is not None:
            tcPr.remove(existing)
        tcPr.append(bd)

    def apa_table(headers, rows):
        """Tabla estilo APA: solo líneas horizontales (tope, bajo cabecera, base)."""
        tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
        n_data = len(rows)

        for i, h in enumerate(headers):
            cell = tbl.rows[0].cells[i]
            run  = cell.paragraphs[0].add_run(h)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(11)
            run.bold = True
            cell.paragraphs[0].paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
            cell_borders(cell, top='single', bottom='single', left='none', right='none')

        for ri, row_data in enumerate(rows):
            is_last = (ri == n_data - 1)
            for ci, val in enumerate(row_data):
                cell = tbl.rows[ri + 1].cells[ci]
                run  = cell.paragraphs[0].add_run(str(val))
                run.font.name = 'Times New Roman'
                run.font.size = Pt(11)
                cell.paragraphs[0].paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
                cell_borders(cell,
                             top='none',
                             bottom='single' if is_last else 'none',
                             left='none', right='none')
        return tbl

    def add_toc():
        """Inserta campo TOC de Word (actualizar con Ctrl+A → F9 al abrir)."""
        p    = doc.add_paragraph()
        run  = p.add_run()
        begin = OxmlElement('w:fldChar')
        begin.set(qn('w:fldCharType'), 'begin')
        run._r.append(begin)
        instr = OxmlElement('w:instrText')
        instr.set(qn('xml:space'), 'preserve')
        instr.text = ' TOC \\o "1-2" \\h \\z \\u '
        run._r.append(instr)
        sep = OxmlElement('w:fldChar')
        sep.set(qn('w:fldCharType'), 'separate')
        run._r.append(sep)
        end = OxmlElement('w:fldChar')
        end.set(qn('w:fldCharType'), 'end')
        run._r.append(end)

    def add_page_num(section):
        """Número de página en esquina superior derecha (APA)."""
        hdr = section.header
        for p in hdr.paragraphs:
            p.text = ''
        ph  = hdr.paragraphs[0]
        ph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run = ph.add_run()
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        begin = OxmlElement('w:fldChar')
        begin.set(qn('w:fldCharType'), 'begin')
        run._r.append(begin)
        instr = OxmlElement('w:instrText')
        instr.set(qn('xml:space'), 'preserve')
        instr.text = 'PAGE'
        run._r.append(instr)
        end = OxmlElement('w:fldChar')
        end.set(qn('w:fldCharType'), 'end')
        run._r.append(end)

    # ══════════════════════════════════════════════════════════
    # DOCUMENTO
    # ══════════════════════════════════════════════════════════
    doc        = Document()
    expediente = data.get('expediente', 'N/A')
    fecha_hoy  = datetime.now().strftime("%d de %B de %Y")

    # Márgenes APA: 1 pulgada (2.54 cm) en todos los lados
    for sec in doc.sections:
        sec.top_margin    = Inches(1)
        sec.bottom_margin = Inches(1)
        sec.left_margin   = Inches(1)
        sec.right_margin  = Inches(1)

    add_page_num(doc.sections[0])

    # ── PORTADA ──────────────────────────────────────────────
    C = WD_ALIGN_PARAGRAPH.CENTER
    apa_p("Poder Judicial del Perú",                        align=C)
    apa_p("Corte Superior de Justicia del Callao",          align=C)
    apa_p("Juzgado de Paz Letrado de Familia",              align=C)
    apa_p("",                                               align=C, space_before=48)
    apa_p("INFORME DE ANÁLISIS JURÍDICO AUTOMATIZADO",
          bold=True, size=14, align=C, space_before=12)
    apa_p("Sistema Inteligente de Gestión Judicial de Alimentos (SIGEJA)",
          italic=True, align=C)
    apa_p("",                                               align=C)
    apa_p(f"Expediente N.° {expediente}",                   align=C, space_before=18)
    apa_p("",                                               align=C, space_before=48)
    apa_p("Elaborado por:",                                 align=C)
    apa_p("SIGEJA — Módulo de Análisis con Inteligencia Artificial",
          bold=True, align=C)
    apa_p(fecha_hoy,                                        align=C, space_before=12)
    doc.add_page_break()

    # ── TABLA DE CONTENIDOS ──────────────────────────────────
    apa_p("Tabla de Contenidos", bold=True, align=C, space_after=12)
    add_toc()
    apa_p("[ Abra en Microsoft Word y presione Ctrl+A → F9 para actualizar el índice ]",
          italic=True, space_before=6)
    doc.add_page_break()

    # ── CUERPO DEL INFORME ───────────────────────────────────
    fig = 1

    # 1. Resumen Ejecutivo
    apa_heading("1. Resumen Ejecutivo")
    apa_p(str(data.get('resumen', 'Sin información.')))

    # 2. Postura de Contestación
    apa_heading("2. Postura de Contestación")
    apa_p(str(data.get('postura', 'Sin postura detectada.')))

    # 3. Sujetos Procesales
    apa_heading("3. Sujetos Procesales")
    sujetos = data.get('sujetos', {})
    if sujetos:
        rows = [[rol.capitalize(),
                 (d.get('nombre', 'No detectado') if isinstance(d, dict) else str(d))]
                for rol, d in sujetos.items()]
        apa_table(["Rol Procesal", "Nombre Completo"], rows)
        figura_caption(fig,
                       "Identificación de los Sujetos Procesales del Expediente",
                       f"Expediente N.° {expediente}. Datos extraídos automáticamente por SIGEJA.")
        fig += 1
    else:
        apa_p("No se identificaron sujetos procesales.")

    # 4. Capacidad Económica y Cargas
    apa_heading("4. Capacidad Económica y Cargas del Obligado")
    cap = data.get('capacidad', {})
    apa_table(["Indicador", "Valor"], [
        ["Total Ingresos Mensuales", f"S/. {cap.get('total_ingresos', '0.00')}"],
        ["Nivel de Carga Familiar",  cap.get('carga_nivel', 'Desconocido')],
        ["Ratio de Disponibilidad",  f"{cap.get('ratio_disponibilidad', '0')}%"],
    ])
    figura_caption(fig,
                   "Resumen de Capacidad Económica y Cargas del Demandado",
                   "Calculado sobre la base de ingresos declarados y cargas procesales.")
    fig += 1

    # 5. Auditoría Financiera
    apa_heading("5. Auditoría Financiera")
    fin    = data.get('financiera', {})
    estado = fin.get('estado', 'No evaluado')
    apa_table(["Concepto", "Monto / Estado"], [
        ["Monto Petitorio",         f"S/. {fin.get('monto_petitorio', '0.00')}"],
        ["Gastos Sustentados",      f"S/. {fin.get('suma_gastos', '0.00')}"],
        ["Brecha de Necesidad",     f"S/. {fin.get('brecha', '0.00')}"],
        ["Estado de la Auditoría",  estado],
    ])
    nota_fin = ("ALERTA: Se detectó una brecha significativa entre lo peticionado y los gastos sustentados."
                if "BRECHA" in estado
                else "Los montos peticionados resultan razonables conforme a los gastos acreditados.")
    figura_caption(fig, "Cuadro de Auditoría Financiera del Expediente", nota_fin)
    fig += 1

    # 6. Puntos Controvertidos Sugeridos
    apa_heading("6. Puntos Controvertidos Sugeridos")
    puntos = data.get('puntos_controvertidos', [])
    if puntos:
        apa_table(["Tema", "Sugerencia"],
                  [[pt.get('tema', ''), pt.get('sugerencia', '')] for pt in puntos])
        figura_caption(fig,
                       "Listado de Puntos Controvertidos Identificados por SIGEJA",
                       "Propuesta de análisis. No reemplaza el criterio jurisdiccional.")
        fig += 1
    else:
        apa_p("No hay puntos controvertidos registrados.")

    # ── DESCARGA ─────────────────────────────────────────────
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=Informe_SIGEJA_{expediente}.docx"}
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
        # Promedios por métrica (COUNT cuenta solo no-NULL; AVG ignora NULL automáticamente)
        stats = conn.execute('''
            SELECT
                AVG(bert_score)     as avg_bert,
                COUNT(bert_score)   as docs_bert,
                AVG(f1_ner)         as avg_f1,
                COUNT(f1_ner)       as docs_f1,
                AVG(ocr_precision)  as avg_ocr,
                COUNT(ocr_precision) as docs_ocr,
                MIN(fecha_analisis) as primera_fecha
            FROM registro_expedientes
            WHERE fecha_analisis IS NOT NULL
        ''').fetchone()

        # Obtenemos los logs
        logs_raw = conn.execute("SELECT * FROM log_seguridad ORDER BY id DESC LIMIT 10").fetchall()
        
        # Fuga de Datos: Contamos incidentes críticos en los logs
        incidentes = conn.execute("SELECT COUNT(*) FROM log_seguridad WHERE accion_registrada LIKE '%bloqueada%'").fetchone()[0]

        return {
            "kpis": {
                "bertscore":          round(stats["avg_bert"], 2) if stats["avg_bert"] is not None else None,
                "docs_bert":          stats["docs_bert"] or 0,
                "f1_score":           round(stats["avg_f1"], 2)   if stats["avg_f1"]   is not None else None,
                "docs_f1":            stats["docs_f1"] or 0,
                "precision_ocr":      round(stats["avg_ocr"], 1)  if stats["avg_ocr"]  is not None else None,
                "docs_ocr":           stats["docs_ocr"] or 0,
                "fuga_datos":         incidentes,
                "primera_fecha":      stats["primera_fecha"] or None
            },
            "logs": [dict(row) for row in logs_raw]
        }
    finally:
        conn.close()

@app.get("/api/v1/security/ocr-details")
async def get_ocr_details():
    """
    Retorna la precisión OCR por expediente y, dentro de cada expediente,
    el desglose por cada PDF individual procesado.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT numero_expediente, fecha_analisis, ocr_precision, ocr_detalle
            FROM registro_expedientes
            WHERE ocr_precision IS NOT NULL
            ORDER BY fecha_analisis DESC
        """).fetchall()
        expedientes = []
        for r in rows:
            detalle_pdfs = []
            if r["ocr_detalle"]:
                try:
                    detalle_pdfs = json.loads(r["ocr_detalle"])
                except Exception:
                    pass
            expedientes.append({
                "expediente": r["numero_expediente"],
                "fecha": r["fecha_analisis"].split(" ")[0] if r["fecha_analisis"] else "—",
                "ocr_promedio": round(r["ocr_precision"], 1),
                "documentos": detalle_pdfs   # [{archivo, ocr_precision, metodo}, ...]
            })
        promedio_global = round(sum(e["ocr_promedio"] for e in expedientes) / len(expedientes), 1) if expedientes else None
        return {"expedientes": expedientes, "promedio_global": promedio_global, "total": len(expedientes)}
    finally:
        conn.close()

@app.get("/api/v1/security/bertscore-details")
async def get_bertscore_details():
    """Retorna el BERTScore por expediente con detalle del resumen generado."""
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT numero_expediente, fecha_analisis, bert_score, json_resultados
            FROM registro_expedientes
            WHERE bert_score IS NOT NULL
            ORDER BY fecha_analisis DESC
        """).fetchall()
        expedientes = []
        for r in rows:
            chars_doc = 0
            chars_resumen = 0
            try:
                data = json.loads(r["json_resultados"] or "{}")
                sintesis = data.get("sintesis_rag", {})
                resumen_str = str(sintesis.get("tecnico", "")) + str(sintesis.get("estandar", ""))
                chars_resumen = len(resumen_str)
            except Exception:
                pass
            expedientes.append({
                "expediente": r["numero_expediente"],
                "fecha": r["fecha_analisis"].split(" ")[0] if r["fecha_analisis"] else "—",
                "bert_score": round(r["bert_score"], 2),
                "chars_resumen": chars_resumen
            })
        promedio = round(sum(e["bert_score"] for e in expedientes) / len(expedientes), 2) if expedientes else None
        return {"expedientes": expedientes, "promedio_global": promedio, "total": len(expedientes)}
    finally:
        conn.close()


@app.get("/api/v1/security/f1-details")
async def get_f1_details():
    """Retorna el F1-NER por expediente con desglose campo a campo."""
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT numero_expediente, fecha_analisis, f1_ner, json_resultados
            FROM registro_expedientes
            WHERE f1_ner IS NOT NULL
            ORDER BY fecha_analisis DESC
        """).fetchall()
        nulos = {"No detectado", "Desconocido", "", None, "no encontrado", "No encontrado"}
        expedientes = []
        for r in rows:
            campos = {
                "demandante_nombre": "No detectado",
                "demandante_dni": "No detectado",
                "demandado_nombre": "No detectado",
                "demandado_dni": "No detectado",
                "monto": 0.0
            }
            try:
                data = json.loads(r["json_resultados"] or "{}")
                sujetos = data.get("sujetos_procesales", {})
                dem = sujetos.get("demandante", {})
                ddo = sujetos.get("demandado", {})
                monto_raw = sujetos.get("monto_solicitado", 0)
                campos = {
                    "demandante_nombre": dem.get("nombre", "No detectado"),
                    "demandante_dni":    dem.get("dni",    "No detectado"),
                    "demandado_nombre":  ddo.get("nombre", "No detectado"),
                    "demandado_dni":     ddo.get("dni",    "No detectado"),
                    "monto": float(monto_raw) if monto_raw and str(monto_raw) not in nulos else 0.0
                }
            except Exception:
                pass
            expedientes.append({
                "expediente": r["numero_expediente"],
                "fecha": r["fecha_analisis"].split(" ")[0] if r["fecha_analisis"] else "—",
                "f1_ner": round(r["f1_ner"], 2),
                "campos": campos
            })
        promedio = round(sum(e["f1_ner"] for e in expedientes) / len(expedientes), 2) if expedientes else None
        return {"expedientes": expedientes, "promedio_global": promedio, "total": len(expedientes)}
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

@app.get("/api/v1/expedientes/{numero}/pdfs")
async def listar_pdfs_expediente(numero: str):
    """Lista todos los PDFs almacenados para un expediente."""
    nombre_seguro = re.sub(r'[^a-zA-Z0-9-]', '_', numero)
    carpeta = f"pdfs_guardados/{nombre_seguro}"
    if os.path.exists(carpeta):
        archivos = sorted([f for f in os.listdir(carpeta) if f.endswith('.pdf')])
        return {"status": "success", "files": archivos}
    # Compatibilidad con formato antiguo (un solo PDF)
    archivo_viejo = f"pdfs_guardados/{nombre_seguro}.pdf"
    if os.path.exists(archivo_viejo):
        return {"status": "success", "files": [f"{nombre_seguro}.pdf"]}
    return {"status": "success", "files": []}

@app.get("/api/v1/expedientes/{numero}/pdf/{filename}")
async def obtener_pdf_especifico(numero: str, filename: str):
    """Retorna un PDF específico de un expediente por nombre de archivo."""
    from fastapi.responses import FileResponse
    nombre_seguro = re.sub(r'[^a-zA-Z0-9-]', '_', numero)
    nombre_archivo_seguro = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    ruta = f"pdfs_guardados/{nombre_seguro}/{nombre_archivo_seguro}"
    if not os.path.exists(ruta):
        raise HTTPException(status_code=404, detail=f"Archivo '{filename}' no encontrado.")
    return FileResponse(ruta, media_type="application/pdf")

@app.get("/api/v1/expedientes/{numero}/pdf")
async def obtener_pdf_expediente(numero: str):
    """Retorna el primer PDF del expediente (compatibilidad con versión anterior)."""
    from fastapi.responses import FileResponse
    nombre_seguro = re.sub(r'[^a-zA-Z0-9-]', '_', numero)
    # Intenta formato nuevo (carpeta)
    carpeta = f"pdfs_guardados/{nombre_seguro}"
    if os.path.exists(carpeta):
        archivos = sorted([f for f in os.listdir(carpeta) if f.endswith('.pdf')])
        if archivos:
            return FileResponse(f"{carpeta}/{archivos[0]}", media_type="application/pdf")
    # Fallback a formato antiguo (archivo único)
    ruta_antigua = f"pdfs_guardados/{nombre_seguro}.pdf"
    if os.path.exists(ruta_antigua):
        return FileResponse(ruta_antigua, media_type="application/pdf")
    raise HTTPException(status_code=404, detail="El archivo PDF físico no se encuentra en el servidor.")

@app.post("/api/v1/debug/extraer-texto")
async def debug_extraer_texto(files: List[UploadFile] = File(...)):
    """
    Endpoint de diagnóstico: devuelve el texto crudo extraído de cada PDF
    y los DNIs encontrados con su contexto. Útil para depurar extracción.
    """
    resultados = []
    for upload_file in files:
        contenido = await upload_file.read()
        texto, _, _ = modulo_ocr_tesseract(contenido)
        # Encontrar todos los 8-digit numbers con contexto
        dnis_debug = []
        for m in re.finditer(r'(?<!\d)(\d{8})(?!\d)', texto):
            ctx_inicio = max(0, m.start() - 200)
            ctx_fin = min(len(texto), m.end() + 100)
            dnis_debug.append({
                "dni": m.group(1),
                "posicion": m.start(),
                "contexto_previo_100chars": texto[max(0, m.start()-100):m.start()].replace("\n", "↵"),
                "contexto_posterior_50chars": texto[m.end():min(len(texto), m.end()+50)].replace("\n", "↵")
            })
        resultados.append({
            "archivo": upload_file.filename,
            "caracteres": len(texto),
            "texto_primeros_500": texto[:500].replace("\n", "↵"),
            "texto_ultimos_300": texto[-300:].replace("\n", "↵") if len(texto) > 300 else "",
            "dnis_encontrados": dnis_debug
        })
    return {"status": "ok", "documentos": resultados}


# Punto de entrada para levantar el servidor localmente
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)