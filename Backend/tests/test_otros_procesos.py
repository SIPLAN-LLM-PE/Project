"""Un proceso distinto a los de primera instancia: filiación + alimentos con apelación, sentencia de vista y casación.

Fixture anonimizado (nombres y números ficticios) de un caso real que falló en la aplicación: pensión pedida y
ordenada como PORCENTAJE de los haberes, obligaciones previas del demandado también en porcentaje, sin petitorio en
soles, sin fechas de notificación ni de contestación, y un auto supremo (casación improcedente) como último acto."""
import pytest

PROCESO = "apelacion_casacion"


def test_la_pension_en_porcentaje_de_haberes_se_detecta(main, texto_proceso):
    """Regresión: solo se reconocía '% de sus ingresos/remuneración', no 'haberes' -> la calculadora usaba el tope legal."""
    texto = texto_proceso(PROCESO)
    pension = main._extraer_pension_ordenada_sentencia(main._texto_documento(texto, "sentencia") or texto)
    assert (pension["tipo"], pension["valor"]) == ("porcentaje", 15.0)


def test_no_se_inventa_un_petitorio_en_soles(main_con_nlp, sin_llm, texto_proceso):
    """Regresión: 'remuneración mensual fija referencial de S/ 3,304' (el ingreso del demandado) salía como petitorio."""
    entidades = main_con_nlp.modulo_ner_spacy(texto_proceso(PROCESO))
    assert entidades["monto_solicitado"] == 0
    assert entidades["demandante"]["nombre"] == "ELENA VARGAS RÍOS" and entidades["demandante"]["dni"] == "40123456"
    assert entidades["demandado"]["nombre"] == "MARIO SOTO PEÑA" and entidades["demandado"]["dni"] == "41234567"


def test_capacidad_con_obligaciones_previas_en_porcentaje(main, sin_llm, texto_proceso):
    """Regresión: 'Carga Baja 100 %' cuando el demandado ya compromete el 65 % de sus haberes en otras pensiones."""
    cap = main.modulo_capacidad_cargas(texto_proceso(PROCESO))
    assert cap["total_ingresos"] == 3304.0
    previas = [d for d in cap["dependientes"] if d.get("porcentaje_haber")]
    assert [d["porcentaje_haber"] for d in previas] == [25.0, 10.0, 15.0, 15.0]
    assert [d["monto_carga"] for d in previas] == [826.0, 330.4, 495.6, 495.6]
    assert cap["total_cargas"] == pytest.approx(2147.6)
    assert (cap["ratio_disponibilidad"], cap["carga_nivel"]) == (35.0, "Carga Crítica")
    assert cap["alerta_revision_hu14"] is True, "65 % + 15 % de la pensión supera el 60 % embargable"
    assert cap["monto_pension_ordenada_estimado"] == pytest.approx(495.6)


def test_un_pago_o_consignacion_no_es_un_ingreso(main, sin_llm, texto_proceso):
    """Regresión: 'venía abonando S/ 200.00' se listaba como 'ingreso detectado en texto'."""
    montos = [i["monto"] for i in main.modulo_capacidad_cargas(texto_proceso(PROCESO))["ingresos"]]
    assert montos == [3304.0]


def test_el_empleador_puede_ser_una_institucion_publica(main, sin_llm, texto_proceso):
    empleador = main.modulo_capacidad_cargas(texto_proceso(PROCESO))["contexto_social"]["empleador"]["nombre"]
    assert empleador == "POLICÍA NACIONAL DEL PERÚ"


def test_los_puntos_controvertidos_sin_numerar_se_separan(main, texto_proceso):
    """Regresión: el acta dice 'se fijaron como puntos controvertidos: a; b; c; y d' (sin numerar)."""
    puntos = main._extraer_puntos_controvertidos_acta(texto_proceso(PROCESO))
    assert len(puntos) == 4
    assert puntos[0]["sugerencia"].startswith("determinar la filiación paterna")
    assert puntos[3]["sugerencia"].startswith("definir si corresponde fijar la pensión")


def test_la_postura_recoge_lo_central_de_la_contestacion(main, texto_proceso):
    """Regresión: la postura solo decía la oferta y omitía que el demandado ya compromete el 65 % de sus haberes."""
    texto = texto_proceso(PROCESO)
    hechos = main._hechos_contestacion_y_audiencia(texto)
    assert hechos["reconoce"] is True                     # "no desconoce su deber de asistencia familiar"
    assert hechos["cargas_previas_pct"] == {"total": 65.0, "n": 4}
    assert hechos["oferta"] == 200.0
    postura = main._integrar_oferta_contestacion({"tecnico": "La sentencia ordenó el 15%.", "estandar": "Se ordenó el 15%."}, texto)
    assert "65% de sus haberes" in postura["tecnico"] and "S/ 200.00" in postura["tecnico"]


def test_un_petitorio_no_se_rechaza_por_el_ingreso_de_otra_cláusula(main):
    """'... percibe S/ 2100, solicito una pensión de S/ 900': el 900 es el petitorio; el 2100, no."""
    texto = "El demandado percibe una remuneración de S/ 2100.00, solicito una pensión de S/ 900.00 mensuales."
    assert main._monto_precedido_de_ingreso(texto, texto.index("2100")) is True
    assert main._monto_precedido_de_ingreso(texto, texto.index("900")) is False


def test_la_alimentista_no_es_una_carga_del_demandado(main, texto_proceso):
    nombre = main._nombre_alimentista(texto_proceso(PROCESO))
    assert nombre == "lucia soto vargas"
    assert main._es_el_alimentista({"tipo": "hija", "detalle": "Lucía Soto Vargas"}, nombre) is True
    assert main._es_el_alimentista({"tipo": "Obligación alimentaria previa", "detalle": "Hija Marta Soto"}, nombre) is False


def test_sin_fechas_de_notificacion_y_contestacion_el_plazo_no_se_inventa(main, texto_proceso):
    plazos = main.modulo_extraccion_plazos(texto_proceso(PROCESO))
    assert plazos["estado"] == "No calculado"
    eventos = {k: v["fecha"] for k, v in plazos["auditoria_temporal"]["eventos_procesales"].items()}
    assert eventos["demanda"] == "15/09/2020" and eventos["admision"] == "29/09/2020"
    assert eventos["audiencia"] == "19/04/2021" and eventos["sentencia"] == "31/05/2021"


def test_se_eliminan_las_afirmaciones_procesales_que_ningun_documento_respalda(main, texto_proceso):
    """Regresión: la IA decía 'consentida' y 'etapa de EJECUCIÓN' sin que el expediente lo diga."""
    narrativa = ("El demandado interpuso recurso de casación. Actualmente el proceso se encuentra en etapa de EJECUCIÓN, "
                 "habiendo quedado consentida la sentencia. La pensión es del 15% de los haberes.")
    depurada = main._depurar_estado_procesal(narrativa, texto_proceso(PROCESO))
    assert "EJECUCIÓN" not in depurada and "consentida" not in depurada
    assert "La pensión es del 15%" in depurada and "recurso de casación" in depurada


def test_las_afirmaciones_respaldadas_se_conservan(main, texto_exp):
    """En EXP_0002 sí consta la sentencia consentida y el oficio de retención: no se toca nada."""
    narrativa = "La sentencia quedó consentida. Actualmente el proceso se encuentra en etapa de ejecución."
    assert main._depurar_estado_procesal(narrativa, texto_exp("EXP_0002")) == narrativa


def test_el_recorrido_posterior_a_la_sentencia_se_toma_del_expediente(main, texto_proceso, texto_exp):
    """Regresión: la IA decía que la APELACIÓN fue declarada improcedente; lo improcedente fue la casación."""
    cierre = main._cierre_procesal_verificado(texto_proceso(PROCESO))
    assert "sentencia de vista del 27 de enero de 2022 la confirmó" in cierre
    assert "casación fue declarado improcedente" in cierre and "10 de octubre de 2024" in cierre
    assert main._cierre_procesal_verificado(texto_exp("EXP_0002")) is None


def test_la_sintesis_reemplaza_el_recorrido_confuso_de_la_ia(main, texto_proceso):
    resultado = {"resumen": {"tecnico": ("Se demandó filiación y alimentos. El demandado interpuso recurso de apelación y luego "
                                         "de casación, los cuales fueron declarados improcedentes. Se fijó el 15% de los haberes."),
                             "estandar": ""}, "postura": {"tecnico": "", "estandar": ""}}
    texto = main._aplicar_estado_verificado(resultado, texto_proceso(PROCESO))["resumen"]["tecnico"]
    assert "declarados improcedentes" not in texto
    assert "Se fijó el 15% de los haberes." in texto and "sentencia de vista del 27 de enero de 2022" in texto
