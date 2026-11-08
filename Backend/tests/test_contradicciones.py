"""CP049 (Mantis 3012): los puntos controvertidos propuestos por contradicción fáctica entre demanda y contestación
solo se conservan si traen citas LITERALES de ambos escritos; las citas inventadas y los marcadores de la plantilla se descartan."""
import pytest

DEMANDA = ("DEMANDA DE ALIMENTOS\nHecho 1: el demandado trabaja como chofer y percibe S/ 3,000.00 mensuales.\n"
           "Hecho 2: el demandado nunca ha entregado dinero para los gastos de la alimentista.")
CONTESTACION = ("ESCRITO DE CONTESTACION DE DEMANDA\nHecho 1: es falso, el demandado es trabajador independiente y sus ingresos no superan S/ 1,200.00 mensuales.\n"
                "Hecho 2: es falso, el demandado entrego S/ 300.00 mensuales hasta diciembre de 2025.")
TEXTO = (f"--- [DOCUMENTO 1: 01_DEMANDA_ALIMENTOS.pdf] ---\n{DEMANDA}\n\n"
         f"--- [DOCUMENTO 2: 03_CONTESTACION_DEMANDA.pdf] ---\n{CONTESTACION}\n")


def _punto(**extra):
    base = {"tema": "Ingresos del demandado", "sugerencia": "Determinar si el demandado percibe S/ 3,000.00 o menos de S/ 1,200.00 mensuales, "
            "hecho afirmado por la parte demandante y negado por la parte demandada."}
    return {**base, **extra}


def test_conserva_la_contradiccion_con_citas_literales(main):
    punto = _punto(fuente="contradiccion",
                   evidencia_demanda="el demandado trabaja como chofer y percibe S/ 3,000.00 mensuales",
                   evidencia_contestacion="el demandado es trabajador independiente y sus ingresos no superan S/ 1,200.00 mensuales")
    salida = main.combinar_puntos_controvertidos([], [punto], TEXTO)
    assert len(salida) == 1
    assert salida[0]["fuente"] == "contradiccion"
    assert salida[0]["evidencia_demanda"].startswith("el demandado trabaja como chofer")
    assert salida[0]["evidencia_contestacion"].startswith("el demandado es trabajador independiente")


def test_descarta_la_contradiccion_con_citas_inventadas(main):
    punto = _punto(fuente="contradiccion",
                   evidencia_demanda="el demandado posee tres camiones de carga pesada y una empresa",
                   evidencia_contestacion="el demandado es trabajador independiente y sus ingresos no superan S/ 1,200.00 mensuales")
    assert main.combinar_puntos_controvertidos([], [punto], TEXTO) == []


def test_descarta_la_contradiccion_con_citas_demasiado_cortas(main):
    punto = _punto(fuente="contradiccion", evidencia_demanda="trabaja como chofer", evidencia_contestacion="es falso")
    assert main.combinar_puntos_controvertidos([], [punto], TEXTO) == []


@pytest.mark.parametrize("campo", ["tema", "sugerencia"])
def test_descarta_el_marcador_de_la_plantilla_copiado_por_el_modelo(main, campo):
    punto = _punto(**{campo: "[Hecho en disputa entre demanda y contestación. Incluye este elemento SOLO si existe una contradicción fáctica]"})
    assert main.combinar_puntos_controvertidos([], [punto], TEXTO) == []
