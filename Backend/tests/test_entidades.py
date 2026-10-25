"""Nombres de las partes: el nombre que el texto escribe junto al DNI manda sobre lo que invente o pierda el modelo."""
import pytest


@pytest.mark.parametrize("rol", ["demandante", "demandado"])
def test_el_nombre_se_lee_junto_al_dni(main, exp, rol):
    _, esperado, texto = exp
    parte = esperado["partes"][rol]
    encontrado = main._nombre_junto_al_dni(texto, parte["dni"])
    assert encontrado is not None
    assert main._normalizar_texto_busqueda_pdf(encontrado) == main._normalizar_texto_busqueda_pdf(parte["nombre"])


@pytest.mark.parametrize("nombre", [
    "TE ANONIMIZADO N.° 81**67**4",   # caso real: tomó el CUI enmascarado del menor como nombre
    "No detectado",
    "NO DETECTADO",
    "ANDREA",
    "Juan Pérez Gómez",               # plausible pero no figura en el expediente: invención
])
def test_un_nombre_no_confiable_se_rechaza(main, texto_exp, nombre):
    assert main._nombre_confiable(nombre, texto_exp("EXP_0003")) is False


def test_un_nombre_real_se_acepta(main, exp):
    _, esperado, texto = exp
    for rol in ("demandante", "demandado"):
        assert main._nombre_confiable(esperado["partes"][rol]["nombre"], texto) is True


def test_no_se_confunde_el_dni_del_menor_con_el_de_un_adulto(main, texto_exp):
    """El CUI enmascarado del menor no es un DNI: no debe producir un nombre."""
    assert main._nombre_junto_al_dni(texto_exp("EXP_0003"), "81000067") is None
