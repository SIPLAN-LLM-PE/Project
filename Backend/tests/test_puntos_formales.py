"""CP050 (Mantis 3013): los puntos controvertidos sugeridos deben tener redacción formal:
verbo en infinitivo, una sola oración completa y mención de la parte procesal.

Los textos de entrada son sugerencias reales de la IA guardadas en los expedientes del corpus
(0001, 0005, 0006, 0007), que empiezan con "Es necesario…", "Es importante…" o "Es fundamental…"
y siguen con recomendaciones ("Se sugiere…", "Se recomienda…")."""
import re

import pytest

SUGERENCIAS_IA = [
    # (texto original de la IA, inicio esperado del punto formal)
    ("Es necesario establecer un monto de pensión alimenticia que sea razonable y suficiente para cubrir las necesidades de las menores, "
     "sin sobrecargar al obligado. Se sugiere revisar los ingresos reales del demandante y el costo de vida en Tarapoto para establecer una pensión adecuada.",
     "Establecer un monto de pensión alimenticia"),
    ("Es importante considerar la capacidad económica real del demandante para establecer una pensión justa. "
     "Se sugiere analizar los ingresos y gastos del demandante, así como cualquier otra fuente de ingreso o activo que pueda tener, para determinar su capacidad de pago.",
     "Considerar la capacidad económica real del demandante"),
    ("Es necesario determinar las necesidades económicas de las hijas para establecer la cantidad adecuada de pensión alimenticia. "
     "La demandante debe presentar pruebas documentales que avalen dichas necesidades.",
     "Determinar las necesidades económicas de las hijas"),
    ("Es fundamental que se valore adecuadamente todos los medios probatorios presentados en el proceso, incluyendo el informe psicológico emitido cuando la menor tenía corta edad. "
     "Se recomienda analizar conjuntamente los diferentes medios de prueba para establecer una decisión justa y fundada.",
     "Verificar que se valore adecuadamente todos los medios probatorios"),
    ("Es necesario determinar si el plazo establecido en el artículo 400 del Código Civil es aplicable en este caso, considerando que el demandante desconoció "
     "la existencia del hijo y que la aplicación automática de dicho plazo podría afectar el derecho constitucional a la identidad del menor.",
     "Determinar si el plazo establecido en el artículo 400 del Código Civil"),
]

INFINITIVO = re.compile(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:ar|er|ir)\b")
PARTE_PROCESAL = re.compile(r"\b(?:demandante|demandada|demandado|alimentista|alimentante|obligado|menor|menores)\b", re.I)


def _formalizar(main, original):
    resultado = main.formalizar_puntos_controvertidos([{"sugerencia": original, "tema": "x"}])
    assert len(resultado) == 1
    return resultado[0]


@pytest.mark.parametrize("original, inicio", SUGERENCIAS_IA)
def test_no_antepone_determinar_a_una_oracion_valorativa(main, original, inicio):
    punto = _formalizar(main, original)["sugerencia"]
    assert not re.match(r"^Determinar\s+(?:es|resulta|ser[ií]a)\b", punto, re.I), f"redacción defectuosa: {punto[:90]}"
    assert punto.startswith(inicio), f"se esperaba que empezara con «{inicio}», quedó: {punto[:100]}"


@pytest.mark.parametrize("original, inicio", SUGERENCIAS_IA)
def test_el_punto_es_una_oracion_con_infinitivo_y_parte_procesal(main, original, inicio):
    punto = _formalizar(main, original)["sugerencia"]
    assert INFINITIVO.match(punto), f"debe empezar con un verbo en infinitivo: {punto[:90]}"
    assert punto.endswith(".")
    assert not re.search(r"[.;]\s+[A-ZÁÉÍÓÚÑ]", punto[:-1]), f"debe ser una sola oración: {punto}"
    assert not re.search(r"\bSe (?:sugiere|recomienda)\b", punto), f"las recomendaciones no son parte del punto: {punto}"
    assert PARTE_PROCESAL.search(punto), f"debe mencionar a la parte procesal: {punto}"


@pytest.mark.parametrize("original, inicio", [
    # sugerencias reales de la IA en expedientes de prueba de QA (0122) que empezaban con "Se debe …"
    ("Se debe determinar cuáles son las necesidades económicas reales del alimentista para establecer el monto adecuado de la pensión alimenticia.",
     "Determinar cuáles son las necesidades económicas reales del alimentista"),
    ("Se debe verificar si las partes convivieron o no para establecer si existe una relación de alimentos entre ellas.",
     "Verificar si las partes convivieron o no"),
    ("Corresponde establecer cuánto gana realmente el demandado para fijar la pensión.", "Establecer cuánto gana realmente el demandado"),
])
def test_no_duplica_el_verbo_cuando_la_ia_escribe_se_debe(main, original, inicio):
    punto = _formalizar(main, original)["sugerencia"]
    assert punto.startswith(inicio), f"quedó: {punto[:110]}"
    assert not re.match(r"^Determinar\s+(?:se|debe|corresponde)\b", punto, re.I)
    assert INFINITIVO.match(punto) and punto.endswith(".")
    assert PARTE_PROCESAL.search(punto)


def test_no_repite_verificar_que_se_verifique(main):
    original = ("Es necesario que se verifique si el demandado ha cumplido con su obligación alimentaria, entregando S/ 300.00 mensuales "
                "hasta diciembre de 2025, tal como afirma en su contestación de demanda.")
    punto = _formalizar(main, original)["sugerencia"]
    assert punto.startswith("Verificar si el demandado ha cumplido"), punto
    assert "se verifique" not in punto


def test_conserva_la_redaccion_original_para_revision(main):
    original = SUGERENCIAS_IA[0][0]
    item = _formalizar(main, original)
    assert item["redaccion_original"] == original
    assert item["redaccion_formalizada"] is True


def test_los_puntos_del_acta_ya_formales_no_cambian(main):
    punto = "Determinar si corresponde reconocer la tenencia de los menores a favor de la madre demandante"
    item = _formalizar(main, punto)
    assert item["sugerencia"] == punto + "."


def test_no_toca_los_puntos_revisados_por_una_persona(main):
    revisado = {"sugerencia": "Es necesario algo que decidió el juez", "estado_revision": "edited"}
    assert main.formalizar_puntos_controvertidos([revisado]) == [revisado]


def test_es_idempotente(main):
    una = _formalizar(main, SUGERENCIAS_IA[1][0])
    dos = main.formalizar_puntos_controvertidos([una])[0]
    assert dos["sugerencia"] == una["sugerencia"]
