"""Variantes de FORMATO de un expediente (mismos hechos, otra presentación). Sirven para comprobar que la
extracción no depende de cómo se llamen los archivos ni de cómo se escriban las fechas y los montos."""
import re

MESES = {m: i for i, m in enumerate(
    "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(), 1)}


def nombres_opacos(texto: str) -> str:
    """Como suben los usuarios de verdad: scan_001.pdf, sin el tipo de documento en el nombre."""
    n = iter(range(1, 100))
    return re.sub(r"(--- \[DOCUMENTO \d+: )[^\]]+(\] ---)",
                  lambda m: f"{m.group(1)}scan_{next(n):03d}.pdf{m.group(2)}", texto)


def fechas_numericas(texto: str) -> str:
    def cambiar(m):
        mes = MESES.get(m.group(2).lower())
        return f"{int(m.group(1)):02d}/{mes:02d}/{m.group(3)}" if mes else m.group(0)
    return re.sub(r"(?<!\d)(\d{1,2})\s+de\s+([A-Za-záéíóúñ]+)\s+d(?:e|el)\s+(\d{4})(?!\d)", cambiar, texto)


def montos_alternativos(texto: str) -> str:
    def cambiar(m):
        entero, dec = int(m.group(1)), m.group(2)
        return f"S/ {entero:,}.{dec}" if entero >= 1000 else f"S/ {entero}.{dec}"
    return re.sub(r"S/\.\s*(\d+)\.(\d{2})", cambiar, texto)


VARIANTES = {
    "nombres_opacos": [nombres_opacos],
    "fechas_numericas": [fechas_numericas],
    "montos_alternativos": [montos_alternativos],
    "todo_junto": [nombres_opacos, fechas_numericas, montos_alternativos],
}


def aplicar(texto: str, nombre: str) -> str:
    for funcion in VARIANTES[nombre]:
        texto = funcion(texto)
    return texto
