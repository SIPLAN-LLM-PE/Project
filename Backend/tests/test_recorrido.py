"""Recorrido posterior a la sentencia (vista, recurso de casación, resolución suprema): cada acto con SU fecha y su desenlace."""
from datetime import datetime


def _expediente(*docs):
    return "".join(f"\n\n--- [DOCUMENTO {i}: {nombre}] ---\n\n{texto}" for i, (nombre, texto) in enumerate(docs, 1)).strip()


def _f(fecha):
    return fecha.strftime("%d/%m/%Y") if isinstance(fecha, datetime) else fecha


VISTA = ("07_SENTENCIA_DE_VISTA.pdf",
         "SENTENCIA DE VISTA\nResolucion de fecha: 28/05/2024\nSe revisa la sentencia de fecha 06/11/2020 que declaró fundada en parte la demanda.\n"
         "I. DECISION\nSe CONFIRMA la sentencia apelada de fecha 06/11/2020.")
RECURSO = ("08_RECURSO_DE_CASACION.pdf",
           "RECURSO DE CASACIÓN\nSEÑOR PRESIDENTE DE LA SALA CIVIL. María Pérez interpone recurso de casación contra la sentencia de vista "
           "de fecha 28 de mayo de 2024. Causales: infracción normativa.\nArequipa, 9 de enero de 2025.")
SUPREMO = ("09_AUTO_CALIFICATORIO_CASACION_100_2025.pdf",
           "AUTO CALIFICATORIO DEL RECURSO DE CASACIÓN N.° 100-2025\nLima, veinte de enero de dos mil veintiséis.\n"
           "VISTOS: El 26 de enero de 2023 se creó la Sala Civil Transitoria. Se resuelve: declararon IMPROCEDENTE el recurso de casación "
           "interpuesto el 9 de enero de 2025 por María Pérez.")


def test_cada_acto_toma_su_propia_fecha_y_no_la_de_otro_acto_citado(main):
    r = main._recorrido_procesal(_expediente(VISTA, RECURSO, SUPREMO))
    assert _f(r["sentencia_vista"]["fecha"]) == "28/05/2024"       # no la del 06/11/2020 que revisa
    assert _f(r["recurso_casacion"]["fecha"]) == "09/01/2025"      # no la de la vista que cita ("de fecha 28 de mayo de 2024")
    assert _f(r["casacion_resolucion"]["fecha"]) == "20/01/2026"   # no el 26 de enero de 2023 en que se creó la Sala


def test_el_auto_que_califica_el_recurso_no_es_el_recurso(main):
    """Regresión: 'AUTO CALIFICATORIO DEL RECURSO DE CASACIÓN' se clasificaba como el recurso, por contener esas palabras."""
    r = main._recorrido_procesal(_expediente(RECURSO, SUPREMO))
    assert r["recurso_casacion"]["archivo"] == "08_RECURSO_DE_CASACION.pdf"
    assert r["casacion_resolucion"]["archivo"].startswith("09_AUTO_CALIFICATORIO")


def test_los_desenlaces_se_leen_de_la_parte_dispositiva(main):
    r = main._recorrido_procesal(_expediente(VISTA, SUPREMO))
    assert r["sentencia_vista"]["resultado"] == "confirma"
    assert r["casacion_resolucion"]["resultado"] == "improcedente"


def test_una_vista_que_revoca_no_se_cuenta_como_confirmatoria(main):
    vista = ("07_SENTENCIA_DE_VISTA.pdf",
             "SENTENCIA DE VISTA\nResolución N. 30 - 17/05/2022\nVISTOS: la apelación.\nSE RESUELVE: REVOCAR la sentencia en el extremo alimentario y FIJAR la pensión.")
    r = main._recorrido_procesal(_expediente(vista))
    assert (r["sentencia_vista"]["resultado"], _f(r["sentencia_vista"]["fecha"])) == ("revoca", "17/05/2022")


def test_un_fundado_de_los_considerandos_no_es_el_desenlace_del_recurso(main):
    """El desenlace es el del RECURSO de casación; 'fundada la demanda' en los considerandos no cuenta."""
    suprema = ("09_AUTO_SUPREMO.pdf", "AUTO SUPREMO\nLima, 3 de marzo de 2026.\nLa sentencia declaró fundada la demanda. "
               "SE RESUELVE: declararon INFUNDADO el recurso de casación interpuesto por el demandado.")
    assert main._recorrido_procesal(_expediente(suprema))["casacion_resolucion"]["resultado"] == "infundado"


def test_el_cierre_procesal_cuenta_lo_que_consta_con_sus_fechas(main):
    cierre = main._cierre_procesal_verificado(_expediente(VISTA, RECURSO, SUPREMO))
    assert "sentencia de vista del 28/05/2024 la confirmó" in cierre
    assert "recurso de casación del 9 de enero de 2025" in cierre
    assert "declarado improcedente mediante resolución del veinte de enero de dos mil veintiséis" in cierre
    assert "pensión" not in cierre          # no se afirma qué pasó con la pensión: eso no consta en ese acto
    assert main._cierre_procesal_verificado(_expediente(("01_DEMANDA.pdf", "DEMANDA DE ALIMENTOS\nLima, 10 de marzo de 2026."))) is None
