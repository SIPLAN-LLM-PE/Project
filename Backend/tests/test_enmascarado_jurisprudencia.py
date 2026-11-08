"""CP056 (Mantis 3163): el enmascarado de datos personales en la jurisprudencia debe tapar los nombres
de las personas, no las frases jurídicas.

Los datos de entrada reproducen la estructura de un caso del corpus (con nombres ficticios): la lista
`entidades_detectadas.nombres` del análisis trae títulos y encabezados en mayúsculas ("SENTENCIA DE PRIMERA
INSTANCIA", "ACTA DE AUDIENCIA ÚNICA", "DE SEPARACIÓN DE HECHO"…) junto con los nombres de los jueces."""
import re

import pytest

NOMBRES_DETECTADOS = [
    "ACTA DE AUDIENCIA ÚNICA", "ACTUACIÓN PROBATORIA", "AUTO ADMISORIO", "CASACIÓN EXCEPCIONAL",
    "CONTESTACIÓN DE DEMANDA", "CORTE SUPERIOR DE JUSTICIA DE", "DE HUAURA", "DE LA SALA CIVIL PERMANENTE",
    "DE SEPARACIÓN DE HECHO", "DEMANDA DE DIVORCIO POR CAUSAL", "FUNDADA EN PARTE", "FUNDAMENTOS DE HECHO",
    "LA REPÚBLICA", "MEDIOS PROBATORIOS", "PATRIA POTESTAD", "RECURSO DE CASACIÓN INTERPUESTO POR",
    "RESOLUCIÓN NÚMERO CINCUENTA", "SE RESUELVE", "SENTENCIA DE PRIMERA INSTANCIA", "SENTENCIA DE VISTA",
    # nombres de personas (jueces; ficticios) que sí deben enmascararse
    "LOZANO RIVAS", "CHÁVEZ ARIAS", "SALAZAR BORJA", "TORRES NAVARRO",
]
DEMANDANTE, DEMANDADO = "MARCOS ELÍAS QUISPE VARGAS", "ROSA LUCÍA MENDOZA PAREDES"

FRASES_JURIDICAS = ["SENTENCIA DE PRIMERA INSTANCIA", "SEPARACIÓN DE HECHO", "Riesgo de Capacidad", "Sala Civil", "Alimentos"]


@pytest.fixture
def caso(main):
    resultado = {
        "numero_expediente": "0099-2026-0-0701-JP-FC-03",
        "hechos": f"Demandante: {DEMANDANTE}. Demandado: {DEMANDADO}. El expediente cuenta con una SENTENCIA DE PRIMERA INSTANCIA emitida el 28 de marzo de 2025, "
                  "en la que se declara fundado el divorcio por causal de SEPARACIÓN DE HECHO y se fija una pensión de S/ 2,800.00. El voto del señor LOZANO RIVAS fue discrepante.",
        "decision": f"Petitorio: No detectado. La SENTENCIA DE PRIMERA INSTANCIA ORDENÓ el pago de S/ 2,800.00. La Sala Civil de Arequipa confirmó. {DEMANDADO} apeló.",
        "fundamento": "Riesgo de Capacidad: Requiere revisión.",
        "puntos_comparables": ["Determinar los alimentos de las menores."],
    }
    datos = {
        "sujetos_procesales": {"demandante": DEMANDANTE, "demandado": DEMANDADO},
        "extraccion_documentos": [{"entidades_detectadas": {"nombres": NOMBRES_DETECTADOS}}],
    }
    fila = {"demandante": DEMANDANTE, "demandado": DEMANDADO}
    return main.enmascarar_resultado_jurisprudencia(resultado, datos, fila)


def test_los_nombres_de_las_partes_quedan_enmascarados(caso):
    todo = " ".join(str(v) for v in caso.values())
    for apellido in ("QUISPE", "VARGAS", "MENDOZA", "PAREDES", "MARCOS", "ROSA"):
        assert apellido not in todo, f"sin enmascarar: {apellido}"
    assert re.search(r"MA\*+ EL\*+ QU\*+ VA\*+", caso["hechos"]), caso["hechos"][:80]


def test_los_nombres_de_jueces_detectados_en_el_texto_quedan_enmascarados(caso):
    assert "LOZANO" not in caso["hechos"] and "RIVAS" not in caso["hechos"]
    assert "LO***" in caso["hechos"]


@pytest.mark.parametrize("frase", FRASES_JURIDICAS)
def test_las_frases_juridicas_no_se_enmascaran(caso, frase):
    todo = " ".join(str(v) for v in caso.values())
    if frase == "Alimentos":
        todo = " ".join(caso["puntos_comparables"]).replace("alimentos", "Alimentos")
    assert frase in todo, f"se enmascaró una frase jurídica: «{frase}» — {todo[:230]}"


def test_montos_y_fechas_siguen_visibles(caso):
    assert "S/ 2,800.00" in caso["hechos"]
    assert "28 de marzo de 2025" in caso["hechos"]


def test_la_copia_marca_que_los_datos_estan_enmascarados(caso):
    assert caso["datos_enmascarados"] is True
