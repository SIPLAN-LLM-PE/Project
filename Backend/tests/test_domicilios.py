"""Domicilios de las partes: cada dirección en su titular y sin texto sobrante."""
import pytest


def test_domicilios_de_cada_parte(main, exp):
    _, esperado, texto = exp
    esperado = esperado["domicilios"]
    dom = main.extraer_domicilios_judiciales(texto)
    assert dom["demandante"]["real"].startswith(esperado["demandante_real"])
    assert dom["demandado"]["real"].startswith(esperado["demandado_real"])
    # El domicilio laboral es del demandado; la demandante no tiene, y ninguno tiene procesal del demandado.
    assert dom["demandante"]["laboral"] == "No detectado"
    assert dom["demandado"]["procesal"] == "No detectado"


def test_domicilio_laboral_sin_texto_sobrante(main, exp):
    _, esperado, texto = exp
    if "demandado_laboral" not in esperado["domicilios"]:
        pytest.skip("este expediente no tiene valor de referencia verificado para el laboral")
    laboral = main.extraer_domicilios_judiciales(texto)["demandado"]["laboral"]
    assert laboral.startswith(esperado["domicilios"]["demandado_laboral"])
    for sobrante in ("declarado", "referenciado", "empleador", "actividad económica"):
        assert sobrante not in laboral.lower()


def test_el_texto_que_nombra_a_otra_parte_no_se_registra(main):
    """Regresión: 'Domicilio real de la demandante ...' no puede quedar como domicilio del demandado."""
    resultado = {
        "demandante": {"real": "No detectado", "procesal": "No detectado", "laboral": "No detectado"},
        "demandado": {"real": "No detectado", "procesal": "No detectado", "laboral": "No detectado"},
        "otros": [],
    }
    main._registrar_domicilio_resultado(
        resultado, "demandado", "real", "de la demandante Jr. Los Cedros N.° 184, interior 302, Callao"
    )
    assert resultado["demandado"]["real"] == "No detectado"
    assert resultado["otros"] == []


@pytest.mark.xfail(strict=True, reason=(
    "Defecto conocido: en EXP_0001 el domicilio laboral del demandado arrastra 'sería <empresa> -' "
    "delante de la dirección. Quitar este xfail cuando se corrija."
))
def test_domicilio_laboral_de_exp0001_sin_prefijo(main, texto_exp):
    laboral = main.extraer_domicilios_judiciales(texto_exp("EXP_0001"))["demandado"]["laboral"]
    assert not laboral.lower().startswith("sería")


# --- Domicilios anclados al DNI de cada parte ---

TEXTO_DOMICILIOS = (
    "--- [DOCUMENTO 1: 01_DEMANDA.pdf] ---\n\nDEMANDA DE ALIMENTOS\nSEÑOR JUEZ DEL JUZGADO DE FAMILIA DE TARAPOTO\n"
    "Riter Ramírez Rengifo, identificado con DNI N.° 42157896, con domicilio real en Jr. Progreso N.° 218, distrito de Tarapoto, "
    "y señalando domicilio procesal en Casilla Judicial N.° 148 de esta ciudad; a usted digo:\nI. PETITORIO\n"
    "La presente demanda se dirige contra Katty Arteaga Vela, identificada con DNI N.° 43721984, con domicilio real en Jr. Guepi N.° 571, "
    "distrito de Morales, provincia y departamento de San Martín. III. FUNDAMENTOS DE HECHO\n1. Con fecha 23 de enero de 2009, las partes...")


def test_cada_domicilio_se_toma_junto_al_dni_de_su_titular(main):
    dte = main._domicilios_del_titular(TEXTO_DOMICILIOS, "42157896")
    ddo = main._domicilios_del_titular(TEXTO_DOMICILIOS, "43721984")
    assert dte == {"real": "Jr. Progreso N.° 218, distrito de Tarapoto", "procesal": "Casilla Judicial N.° 148 de esta ciudad"}
    assert ddo == {"real": "Jr. Guepi N.° 571, distrito de Morales, provincia y departamento de San Martín"}


def test_la_direccion_termina_donde_acaba_y_no_arrastra_el_resto_de_la_oracion(main):
    """Regresión: salía 'en Jr. X N.° 149, Ticlacayan, Pasco, interpone demanda de impugnación... contra ...' o '..., a usted digo: I.'"""
    assert main._recortar_domicilio("en Av. Los Proceres N. 1485, distrito de San Juan de Miraflores, Lima Sur, a usted respetuosamente digo: I.") \
        == "Av. Los Proceres N. 1485, distrito de San Juan de Miraflores, Lima Sur"
    assert main._recortar_domicilio("en Jr. Rimay Marka 149, Ticlacayan, Pasco, interpone demanda de impugnacion contra Ursula Calzada") \
        == "Jr. Rimay Marka 149, Ticlacayan, Pasco"
    assert main._recortar_domicilio("en Av. Industrial N.° 214, distrito de Chimbote, y señalando domicilio procesal en Casilla 315") \
        == "Av. Industrial N.° 214, distrito de Chimbote"


def test_las_abreviaturas_de_una_direccion_no_cortan_la_direccion(main):
    assert main._recortar_domicilio("Jr. Saphy N. 214, Urb. Los Cedros Mz. B Lt. 4, Cusco.") == "Jr. Saphy N. 214, Urb. Los Cedros Mz. B Lt. 4, Cusco"


def test_el_domicilio_de_una_parte_no_se_atribuye_a_la_otra(main):
    assert main._domicilios_del_titular(TEXTO_DOMICILIOS, "99999999") == {}
    assert main._domicilios_del_titular(TEXTO_DOMICILIOS, "No detectado") == {}


def test_un_domicilio_sin_la_palabra_real_es_el_real_no_el_laboral(main):
    texto = ("--- [DOCUMENTO 1: 01_DEMANDA.pdf] ---\n\nDEMANDA\nAna Soto, identificada con DNI N. 47619852, con domicilio real en Jr. Saphy N. 214, Cusco, "
             "interpone demanda contra Edefin Acevedo, identificado con DNI N. 41028763, con domicilio en Av. La Cultura N. 1290, Wanchaq.")
    assert main._domicilios_del_titular(texto, "41028763")["real"] == "Av. La Cultura N. 1290, Wanchaq"
