"""Petitorio: el monto que PIDE la demanda, leído de la frase que lo solicita.

No es lo que luego ordene la sentencia, ni una indemnización, ni la pensión anterior cuyo cese se pide, ni un aporte ya hecho."""
import pytest


def _demanda(cuerpo, archivo="01_DEMANDA_ALIMENTOS.pdf"):
    return f"--- [DOCUMENTO 1: {archivo}] ---\n\nDEMANDA DE ALIMENTOS\nLima, 10 de marzo de 2026.\n{cuerpo}"


@pytest.mark.parametrize("cuerpo,esperado", [
    ("I. PETITORIO\nSolicito que se fije a favor del menor una pensión alimenticia mensual de S/ 900.00, pagadera por adelantado.", 900.0),
    ("Interpone demanda de alimentos contra Luis Ruiz, solicitando que se ordene el pago de una pensión mensual adelantada de S/. 850.00.", 850.0),
    ("Solicito que se ordene al demandado acudir con una pensión mensual de S/ 4,200.00, en proporción de S/ 1,400.00 para cada menor.", 4200.0),
    ("Campo Dato\nDNI demandante 07843192\nPension solicitada S/ 10,000.00\nIndemnizacion solicitada US$ 50,000.00", 10000.0),
    ("Monto propuesto S/ 2,000.00 mensuales en favor de sus hijas alimentistas", 2000.0),
    ("Como pretensión accesoria solicito una pensión de S/ 900.00 mensuales, atendiendo a que el demandado percibe S/ 5,100.00.", 900.0),
])
def test_el_monto_que_pide_la_demanda(main, cuerpo, esperado):
    assert main._extraer_petitorio_demanda_info(_demanda(cuerpo))["monto"] == esperado


@pytest.mark.parametrize("cuerpo", [
    "Solicito indemnización por daño moral por S/ 80,000.00.",                                                           # indemnización
    "Solicito el cese de la pensión alimenticia fijada por conciliación en el Expediente N.° 1610-1996 por S/ 300.00.",  # cese de una pensión anterior
    "He cumplido con entregar una pensión alimenticia mensual aproximada de S/ 2,800.00 a mis hijas.",                   # aporte ya hecho
    "El demandado percibe una remuneración mensual fija referencial de S/ 3,304.00. Solicita que la pensión sea fijada en porcentaje.",  # ingreso
    "La relación de necesidades del menor suma S/ 1,380.00 mensuales.",                                                  # gasto
])
def test_lo_que_no_es_una_peticion_de_pension_no_es_el_petitorio(main, cuerpo):
    assert main._extraer_petitorio_demanda_info(_demanda(cuerpo))["monto"] == 0.0


def test_la_pension_que_ordena_la_sentencia_no_es_lo_que_pidio_la_demanda(main):
    """Regresión: salía como 'monto solicitado' el que fijaba el fallo (S/ 3,300) en lugar del pedido (S/ 4,200)."""
    texto = (_demanda("Solicito que el demandado acuda con una pensión mensual ascendente a S/ 4,200.00.")
             + "\n\n--- [DOCUMENTO 2: 06_SENTENCIA.pdf] ---\n\nSENTENCIA\nLima, 12 de mayo de 2026.\n"
               "FALLO: ORDENO que el demandado acuda con una pensión alimenticia de S/ 3,300.00 mensuales.")
    assert main._extraer_petitorio_demanda_info(texto)["monto"] == 4200.0


def test_si_la_demanda_no_pide_un_monto_la_sentencia_no_lo_inventa(main):
    texto = (_demanda("Solicito que la pensión se calcule como porcentaje de los haberes del demandado.")
             + "\n\n--- [DOCUMENTO 2: 06_SENTENCIA.pdf] ---\n\nSENTENCIA\nLima, 12 de mayo de 2026.\nFALLO: ORDENO una pensión alimenticia de S/ 650.00.")
    assert main._extraer_petitorio_demanda_info(texto)["monto"] == 0.0


def test_un_escrito_de_apelacion_no_es_la_demanda(main):
    """Algunos recursos se clasifican como 'demanda' por su redacción: su petición no es el petitorio de la demanda."""
    texto = _demanda("Sin monto.") + (
        "\n\n--- [DOCUMENTO 2: 06_RECURSO_DE_APELACION.pdf] ---\n\nDEMANDA DE ALIMENTOS\nSolicito que se revoque y se fije una pensión de S/ 1,500.00.")
    assert main._extraer_petitorio_demanda_info(texto)["monto"] == 0.0
