"""Montos, gastos, ingresos, cargas y pensión ordenada."""
import pytest


@pytest.mark.parametrize("texto,esperado", [
    ("S/. 1490.00", 1490.0),    # antes se leía 149
    ("S/. 2640.00,", 2640.0),   # antes 264
    ("S/. 2100.00", 2100.0),    # antes 210
    ("S/ 12000.00", 12000.0),   # antes 120
    ("S/ 1,490.00", 1490.0),
    ("S/. 1.490,00", 1490.0),
    ("S/ 900", 900.0),
    ("S/. 480.00.", 480.0),
    ("S/. 310.00 y", 310.0),
])
def test_los_montos_de_cuatro_digitos_no_se_truncan(main, texto, esperado):
    assert main._extraer_montos_reales(texto) == [esperado]


def test_petitorio_y_gastos_de_la_demanda(main, exp):
    _, esperado, texto = exp
    demanda, _ = main._obtener_bloques_demanda_contestacion(texto)
    montos = main._extraer_montos_reales(texto)
    petitorio = float(main._extraer_petitorio_demanda_info(texto).get("monto") or 0)
    assert petitorio == esperado["petitorio"]
    gastos = {g["concepto"]: g["monto"] for g in main._extraer_gastos_nativos(demanda or texto, montos, petitorio)}
    assert gastos == esperado["gastos"]


def test_ingresos_cargas_y_pension_ordenada(main, exp, sin_llm):
    _, esperado, texto = exp
    cap = main.modulo_capacidad_cargas(texto)
    assert cap["total_ingresos"] == esperado["ingreso_base"]
    assert [d["monto_carga"] for d in cap["dependientes"] if d.get("monto_carga")] == esperado["cargas"]
    assert [cap["pension_ordenada"]["tipo"], cap["pension_ordenada"]["valor"]] == esperado["pension"]


def test_una_oferta_no_se_lista_como_ingreso(main, exp, sin_llm):
    """Regresión real (captura del usuario): 'declara ingresos y gastos, y ofrece S/ 450' salía como ingreso."""
    _, esperado, texto = exp
    montos = [i["monto"] for i in main.modulo_capacidad_cargas(texto)["ingresos"]]
    ofertas = {esperado["postura"]["oferta"], esperado["postura"]["demandante_reduce"], esperado["postura"]["demandado_eleva"]}
    assert esperado["ingreso_base"] in montos
    assert not (set(montos) & ofertas), f"ofertas listadas como ingreso: {set(montos) & ofertas}"


def test_un_monto_ligado_a_otro_concepto_se_rechaza(main, texto_exp):
    """Regresión: la IA devolvía 'Educación 310' cuando 310 es de alimentación (educación es 190)."""
    texto = texto_exp("EXP_0002")
    assert main._concepto_contradice_texto(texto, "Educación", 310.0) is True
    assert main._concepto_contradice_texto(texto, "Educación", 190.0) is False
    assert main._concepto_contradice_texto(texto, "Alimentación", 310.0) is False
    assert main._concepto_contradice_texto(texto, "Otro", 310.0) is False  # sin categoría conocida: no se toca


@pytest.mark.parametrize("expediente,concepto,monto,petitorio,esperado", [
    ("EXP_0002", "Alimentación", 310.0, 900.0, True),
    ("EXP_0002", "Educación", 190.0, 900.0, True),
    ("EXP_0002", "Educación", 310.0, 900.0, False),   # 310 es de alimentación
    ("EXP_0002", "Otro", 1490.0, 900.0, False),       # es el total de necesidades, no un gasto
    ("EXP_0003", "Educación", 150.0, 750.0, True),
    ("EXP_0003", "Educación", 220.0, 750.0, False),   # carga del demandado: solo figura en la contestación
    ("EXP_0005", "Otro", 1080.0, 680.0, False),       # total de necesidades
])
def test_un_gasto_de_la_ia_solo_vale_si_es_una_necesidad_del_menor(main, texto_exp, expediente, concepto, monto, petitorio, esperado):
    """Regresión real: la IA sumaba el total de necesidades y las cargas del demandado como gastos (brecha 0)."""
    assert main._gasto_ia_aceptable(texto_exp(expediente), concepto, monto, petitorio)[0] is esperado


def test_el_total_de_necesidades_no_se_atribuye_a_un_concepto(main):
    """El monto debe estar junto al concepto: 1490 (total) no es 'salud' aunque aparezca después."""
    texto = "Necesita salud preventiva, útiles y actividades formativas. La estimación integral asciende a S/. 1490.00."
    assert main._montos_ligados_a_categoria(texto, dict(main._CATEGORIAS_GASTO)["Salud"]) == []


# --- Un gasto de la IA debe ser una necesidad del menor que el texto liga a su categoría ---

TEXTO_GASTOS = ("--- [DOCUMENTO 1: 01_DEMANDA.pdf] ---\n\nDEMANDA DE ALIMENTOS\nLima, 10 de marzo de 2026.\n"
                "He venido otorgando una pensión mensual variable entre S/ 2,000.00 y S/ 3,000.00, además de gastos escolares. "
                "Realicé depósitos de S/ 3,500.00 en enero. Monto propuesto S/ 1,800.00 mensuales. "
                "Los gastos del menor son: alimentación por S/ 600.00 y movilidad del menor por S/ 150.00.")


@pytest.mark.parametrize("concepto,monto,esperado", [
    ("Alimentación", 600.0, True),        # el texto la liga a su categoría
    ("Movilidad del menor", 150.0, True),
    ("Alimentación", 2000.0, False),      # es lo que el padre venía otorgando: un pago, no una necesidad
    ("Alimentación", 3500.0, False),      # un depósito ya hecho
    ("Alimentación", 1800.0, False),      # igual al monto que se pide como pensión
])
def test_un_gasto_de_la_ia_debe_estar_ligado_a_su_categoria_y_no_ser_un_pago(main, concepto, monto, esperado):
    assert main._gasto_ia_aceptable(TEXTO_GASTOS, concepto, monto, 1800.0)[0] is esperado
