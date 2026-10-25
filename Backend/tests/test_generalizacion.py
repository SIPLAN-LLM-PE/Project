"""La extracción no debe depender del formato superficial: nombres de archivo, formato de fechas y de montos.

Regresión real: con nombres de archivo opacos (scan_001.pdf) la precisión caía de 100 % a 73 % porque varias
funciones deducían el tipo de documento por el nombre. Ahora se deduce del título y el contenido."""
import pytest

from reporte_precision import evaluar
from variantes import VARIANTES, aplicar


@pytest.mark.parametrize("variante", list(VARIANTES))
def test_la_extraccion_no_depende_del_formato(ns, sin_llm, exp, variante):
    clave, _, texto = exp
    fallos = [campo for campo, ok in evaluar(ns, clave, aplicar(texto, variante)).items() if not ok]
    assert fallos == [], f"{clave} con '{variante}' falla en: {fallos}"


def test_el_tipo_de_documento_se_reconoce_sin_el_nombre_del_archivo(main, exp):
    _, _, texto = exp
    con_nombre = [main._tipo_canonico_documento(s["archivo"], s["texto"]) for s in main._secciones_documentales(texto)]
    sin_nombre = [main._tipo_canonico_documento("scan.pdf", s["texto"]) for s in main._secciones_documentales(texto)]
    assert sin_nombre == con_nombre
    assert None not in sin_nombre
