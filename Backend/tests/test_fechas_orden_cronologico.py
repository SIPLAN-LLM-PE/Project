"""CP030 (Mantis 3189): la revisión manual de fechas procesales (HU10) debe detectar contradicciones de orden
entre eventos, además de las fechas imposibles, futuras y anteriores a 1990 que ya detecta por separado.

Cadena que se valida: demanda ≤ admisión ≤ contestación ≤ sentencia ≤ consentimiento. Las audiencias, las
notificaciones, los oficios y los vencimientos no se comparan porque pueden ocurrir en cualquier punto de la cadena."""
import pytest


def _f(tipo, literal, main):
    return {"tipo": tipo, "fecha": literal, "fecha_iso": main.normalizar_fecha_procesal(literal)}


def _contradicciones(main, *pares):
    fechas = [_f(t, l, main) for t, l in pares]
    return main.validar_orden_cronologico_fechas(fechas)


def test_sentencia_anterior_a_la_demanda_es_contradiccion(main):
    hallazgos = _contradicciones(main, ("demanda", "10/03/2026"), ("sentencia", "01/01/2025"))
    assert [h["tipo"] for h in hallazgos] == ["CONTRADICCION_TEMPORAL"]
    h = hallazgos[0]
    assert h["evento"] == "sentencia" and h["indice"] == 1 and h["fecha"] == "01/01/2025"
    assert "demanda" in h["detalle"].lower() and "sentencia" in h["detalle"].lower()


def test_contestacion_anterior_a_la_demanda(main):
    hallazgos = _contradicciones(main, ("contestacion", "01/02/2026"), ("demanda", "10/03/2026"))
    assert len(hallazgos) == 1 and hallazgos[0]["evento"] == "contestacion"


def test_el_orden_correcto_no_genera_hallazgos(main):
    assert _contradicciones(main, ("demanda", "10/03/2026"), ("admision", "20/03/2026"), ("contestacion", "15/04/2026"), ("sentencia", "01/06/2026")) == []


def test_fechas_iguales_son_validas(main):
    assert _contradicciones(main, ("demanda", "10/03/2026"), ("admision", "10/03/2026")) == []


def test_el_orden_no_depende_de_como_se_ingresaron_las_filas(main):
    assert len(_contradicciones(main, ("sentencia", "01/01/2025"), ("demanda", "10/03/2026"))) == 1


def test_eventos_fuera_de_la_cadena_no_se_comparan(main):
    assert _contradicciones(main, ("sentencia", "01/01/2026"), ("audiencia", "20/05/2027"), ("notificacion", "15/12/2027"), ("oficio", "01/02/2025")) == []


def test_las_fechas_no_normalizadas_se_ignoran(main):
    assert _contradicciones(main, ("demanda", "30/02/2026"), ("sentencia", "01/01/2025")) == []


def test_con_eventos_repetidos_se_senala_solo_la_fila_que_contradice(main):
    hallazgos = _contradicciones(main, ("demanda", "10/03/2026"), ("sentencia", "01/06/2026"), ("sentencia", "03/12/2024"))
    assert [(h["evento"], h["indice"]) for h in hallazgos] == [("sentencia", 2)]
    hallazgos = _contradicciones(main, ("demanda", "10/03/2026"), ("sentencia", "03/12/2024"), ("sentencia", "01/06/2026"))
    assert [(h["evento"], h["indice"]) for h in hallazgos] == [("sentencia", 1)]


def test_cada_fila_que_contradice_genera_un_solo_hallazgo(main):
    hallazgos = _contradicciones(main, ("demanda", "10/03/2026"), ("admision", "20/03/2026"), ("sentencia", "01/01/2025"))
    assert len(hallazgos) == 1 and hallazgos[0]["indice"] == 2


def test_validar_fecha_evento_sigue_igual(main):
    """La validación por fecha individual no cambia."""
    tipos = [h["tipo"] for h in main.validar_fecha_evento_procesal("sentencia", "01/01/1989")]
    assert tipos == ["FECHA_ATIPICA"]
    assert [h["tipo"] for h in main.validar_fecha_evento_procesal("demanda", "30/02/2026")] == ["FECHA_IMPOSIBLE"]
