"""Plazos y eventos procesales: cada fecha debe leerse dentro de SU documento."""


def test_plazo_de_contestacion(main, exp):
    _, esperado, texto = exp
    p = main.modulo_extraccion_plazos(texto)
    e = esperado["plazo"]
    assert p["fecha_notificacion"] == e["notificacion"]
    assert p["fecha_presentacion"] == e["presentacion"]
    assert (p["estado"], p["dias_transcurridos"]) == (e["estado"], e["dias"])


def test_eventos_procesales(main, exp):
    _, esperado, texto = exp
    p = main.modulo_extraccion_plazos(texto)
    eventos = {k: v["fecha"] for k, v in p["auditoria_temporal"]["eventos_procesales"].items()}
    for tipo, fecha in esperado["eventos"].items():
        assert eventos.get(tipo) == fecha, f"evento '{tipo}'"


def test_sin_alertas_criticas_falsas(main, exp):
    _, _, texto = exp
    hallazgos = main.modulo_extraccion_plazos(texto)["auditoria_temporal"]["hallazgos"]
    assert [h["tipo"] for h in hallazgos if h["severidad"] == "CRITICO"] == []


def test_el_encabezado_del_archivo_siguiente_no_clasifica_la_fecha(main):
    """Regresión: la fecha de la contestación salía como 'audiencia' por el nombre del archivo siguiente."""
    texto = (
        "--- [DOCUMENTO 1: 04_CONTESTACION_X.pdf] ---\nLima, 30 de marzo de 2026\n"
        "--- [DOCUMENTO 2: 05_ACTA_AUDIENCIA_UNICA_X.pdf] ---\nsiendo las 10:00 horas del 20 de abril de 2026\n"
    )
    eventos = main._auditar_fechas_temporales(texto)["eventos_procesales"]
    assert eventos["contestacion"]["fecha"] == "30/03/2026"
    assert eventos["audiencia"]["fecha"] == "20/04/2026"


def test_acto_de_fecha_liga_la_fecha_a_ese_acto(main):
    """'la sentencia de fecha X quedó consentida el Y': X es la sentencia, Y el consentimiento."""
    texto = (
        "--- [DOCUMENTO 1: 07_OFICIO_RETENCION_X.pdf] ---\nLima, 15 de mayo de 2026\n"
        "la sentencia de fecha 27 de abril de 2026 quedó consentida el 12 de mayo de 2026"
    )
    eventos = main._auditar_fechas_temporales(texto)["eventos_procesales"]
    assert eventos["oficio"]["fecha"] == "15/05/2026"
    assert eventos["sentencia"]["fecha"] == "27/04/2026"
    assert eventos["consentimiento"]["fecha"] == "12/05/2026"


def test_una_fecha_del_relato_no_es_la_fecha_del_documento(main):
    """Regresión: la carta del 03/02 citada en la demanda no es la fecha de la demanda (09/02)."""
    texto = (
        "--- [DOCUMENTO 1: 01_DEMANDA_X.pdf] ---\n"
        "El 03 de febrero de 2026 la demandante remitió una comunicación extrajudicial.\n"
        "Puerto Claro, Callao, 09 de febrero de 2026.\n"
    )
    assert main._auditar_fechas_temporales(texto)["eventos_procesales"]["demanda"]["fecha"] == "09/02/2026"


# --- Fechas escritas con letras y fechas de emisión (generalización a otras redacciones) ---

def test_los_anios_en_letras_se_leen_todos(main):
    """Regresión: solo se entendían 2019 a 2030; 'dos mil quince' (y cualquier año anterior) quedaba sin fecha."""
    assert main._anio_es_a_int("dos mil quince") == 2015
    assert main._anio_es_a_int("dos mil veintiuno") == 2021
    assert main._anio_es_a_int("dos mil treinta y uno") == 2031
    assert main._anio_es_a_int("dos mil") == 2000
    assert main._anio_es_a_int("2024") == 2024
    assert main._anio_es_a_int("dos mil hola") is None


def test_fecha_en_letras_con_dias_del_mes(main):
    fecha = main._parse_fecha_literal("veinte dias del mes de octubre de dos mil veintitres")
    assert (fecha.day, fecha.month, fecha.year) == (20, 10, 2023)
    fecha = main._parse_fecha_literal("dieciocho de marzo de dos mil quince")
    assert (fecha.day, fecha.month, fecha.year) == (18, 3, 2015)


def test_la_fecha_del_documento_escrita_en_letras_gana_a_una_numerica_del_relato(main):
    """Regresión: la sentencia fechada 'Trujillo, uno de diciembre de dos mil veintiuno' salía con la fecha de un matrimonio de 1961."""
    texto = (
        "--- [DOCUMENTO 1: 05_SENTENCIA_PRIMERA_INSTANCIA.pdf] ---\n"
        "SENTENCIA DE PRIMERA INSTANCIA\nTrujillo, uno de diciembre de dos mil veintiuno.\n"
        "VISTOS: Las partes contrajeron matrimonio el 30 de noviembre de 1961 y se separaron de hecho.\n"
    )
    assert main._auditar_fechas_temporales(texto)["eventos_procesales"]["sentencia"]["fecha"] == "01/12/2021"


def test_una_cita_de_otra_sentencia_no_es_la_fecha_de_la_sentencia(main):
    """Regresión: 'Sentencia de 31 de agosto de 2011' (caso citado) empataba con la fecha real y ganaba por ser más antigua."""
    texto = (
        "--- [DOCUMENTO 1: 07_SENTENCIA_X.pdf] ---\n"
        "SENTENCIA DE PRIMERA INSTANCIA\nResolución N.° 50 Fecha 02/06/2025\nVISTOS: el proceso de filiación.\n"
        "Corte Interamericana de Derechos Humanos. (2011). Caso Contreras. Sentencia de 31 de agosto de 2011.\n"
    )
    assert main._auditar_fechas_temporales(texto)["eventos_procesales"]["sentencia"]["fecha"] == "02/06/2025"


def test_la_fecha_etiquetada_del_acto_manda_sobre_la_primera_fecha_de_una_tabla(main):
    """Regresión: la admisoria traía 'Fecha de demanda 15/03/2021 / Fecha de admisión 29/03/2021' y se tomaba la primera."""
    texto = (
        "--- [DOCUMENTO 1: 02_RESOLUCION_ADMISORIA.pdf] ---\nRESOLUCIÓN ADMISORIA\nResolución N.° 01\n"
        "Se califica la demanda y se admite a trámite.\nDato procesal Valor\n"
        "Fecha de demanda 15/03/2021\nFecha de admisión 29/03/2021\nMateria Variación de tenencia\n"
    )
    plazos = main.modulo_extraccion_plazos(texto)["auditoria_temporal"]["eventos_procesales"]
    assert plazos["admision"]["fecha"] == "29/03/2021"
    assert plazos["demanda"]["fecha"] == "15/03/2021"


def test_la_demanda_presentada_el_no_es_la_fecha_de_la_admision(main):
    """Regresión: 'Por recibida la demanda presentada el 18/08/2016' fechaba la admisión con la fecha de la demanda."""
    texto = (
        "--- [DOCUMENTO 1: 02_RESOLUCION_ADMISORIA.pdf] ---\nRESOLUCIÓN ADMISORIA\n"
        "Por recibida la demanda presentada el 18/08/2016, y verificándose el cumplimiento de los requisitos, se admite a trámite.\n"
    )
    eventos = main.modulo_extraccion_plazos(texto)["auditoria_temporal"]["eventos_procesales"]
    assert eventos["demanda"]["fecha"] == "18/08/2016"
    assert "admision" not in eventos


# --- Plazo de contestación: no se calcula sin la fecha de notificación de la demanda ---

def test_sin_cedula_de_notificacion_el_plazo_no_se_inventa(main):
    """Regresión: '03_CONTESTACION...' se tomaba como la notificación (en otras plantillas el 03 era la cédula) y salía
    'Dentro del plazo, 0 días' sin que nadie hubiera notificado nada."""
    texto = (
        "--- [DOCUMENTO 1: 01_DEMANDA_ALIMENTOS.pdf] ---\n\nDEMANDA DE ALIMENTOS\nLima, 10 de marzo de 2026.\nSolicito una pensión de S/ 900.00.\n\n"
        "--- [DOCUMENTO 2: 02_RESOLUCION_ADMISORIA.pdf] ---\n\nRESOLUCIÓN ADMISORIA\nLima, 20 de marzo de 2026.\nSe admite la demanda; notifíquese a la parte emplazada.\n\n"
        "--- [DOCUMENTO 3: 03_CONTESTACION_DEMANDA.pdf] ---\n\nCONTESTACIÓN DE DEMANDA\nLima, 15 de abril de 2026.\nEl demandado, emplazado, contesta la demanda.")
    plazos = main.modulo_extraccion_plazos(texto)
    assert plazos["fecha_notificacion"] == "No detectado"
    assert plazos["estado"] == "No calculado"
    assert "notificacion" not in plazos["auditoria_temporal"]["eventos_procesales"]


def test_una_mencion_suelta_de_cedulas_no_es_la_notificacion_de_la_demanda(main):
    texto = (
        "--- [DOCUMENTO 1: 07_SENTENCIA_DE_VISTA.pdf] ---\n\nSENTENCIA DE VISTA\nLima, 5 de mayo de 2026.\n"
        "Consta en el cargo de cedulas de notificación de fojas 480 que se publicó en el diario oficial el 26 de octubre de 2022.")
    assert main.modulo_extraccion_plazos(texto)["fecha_notificacion"] == "No detectado"
