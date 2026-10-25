"""Partes leídas por la IA: solo se aceptan si el texto las confirma; si no, queda lo de las reglas y se marca 'revisar'.

La IA se reemplaza por una respuesta fingida: se prueba el verificador, que es lo que no debe depender del modelo."""
import re

import pytest


@pytest.fixture
def fingir_ia(ns):
    """Fija lo que 'respondería' la IA (None = sin IA). Restituye la función real al terminar."""
    original = ns["_extraer_partes_con_ia"]

    def fijar(datos):
        ns["_extraer_partes_con_ia"] = lambda texto: (datos, ns["_texto_para_partes"](texto))
    yield fijar
    ns["_extraer_partes_con_ia"] = original


def _cita(main, texto, dni, ancho=140):
    """Frase real del expediente que rodea a ese DNI (lo que la IA debe copiar literalmente)."""
    fragmento = main._texto_para_partes(texto)
    i = fragmento.index(dni)
    return re.sub(r'\s+', ' ', fragmento[max(0, i - ancho): i + 20]).strip()


def _respuesta(main, esperado, texto):
    return {rol: {"nombre": esperado["partes"][rol]["nombre"].title(), "dni": esperado["partes"][rol]["dni"],
                  "cita": _cita(main, texto, esperado["partes"][rol]["dni"])} for rol in ("demandante", "demandado")}


def _entidades(**partes):
    base = {"demandante": {"nombre": "No detectado", "dni": "No detectado"},
            "demandado": {"nombre": "No detectado", "dni": "No detectado"}}
    for rol, (nombre, dni) in partes.items():
        base[rol] = {"nombre": nombre, "dni": dni}
    return base


def test_la_ia_verificada_corrige_a_las_reglas_que_invirtieron_los_roles(main, exp, fingir_ia):
    """Caso real del corpus: las reglas dejaron al demandante como demandado y viceversa."""
    _, esperado, texto = exp
    fingir_ia(_respuesta(main, esperado, texto))
    d, o = esperado["partes"]["demandante"], esperado["partes"]["demandado"]
    entidades = _entidades(demandante=(o["nombre"], o["dni"]), demandado=(d["nombre"], d["dni"]))
    resultado = main._aplicar_partes_ia(entidades, texto)
    for rol in ("demandante", "demandado"):
        assert resultado[rol]["dni"] == esperado["partes"][rol]["dni"]
        assert resultado[rol]["nombre"] == esperado["partes"][rol]["nombre"].upper()
        assert resultado[rol]["verificacion"] == {"estado": "verificada", "motivos": []}


def test_un_nombre_inventado_no_se_acepta(main, texto_exp, fingir_ia):
    texto = texto_exp("EXP_0002")
    dni = "No detectado"
    inventada = {"demandante": {"nombre": "Juan Pérez Gómez", "dni": "12345678", "cita": "Juan Pérez Gómez interpone la demanda de alimentos"},
                 "demandado": {"nombre": "", "dni": "", "cita": ""}}
    fingir_ia(inventada)
    resultado = main._aplicar_partes_ia(_entidades(demandante=("ANA SOTO VEGA", "11111111")), texto)
    assert resultado["demandante"]["nombre"] == "ANA SOTO VEGA" and resultado["demandante"]["dni"] == "11111111"
    assert resultado["demandante"]["verificacion"]["estado"] == "revisar"
    assert "el nombre no está en el texto" in resultado["demandante"]["verificacion"]["motivos"]
    assert resultado["demandado"]["dni"] == dni and resultado["demandado"]["verificacion"]["estado"] == "revisar"


def test_un_dni_que_no_figura_en_el_texto_no_se_acepta(main, exp, fingir_ia):
    _, esperado, texto = exp
    respuesta = _respuesta(main, esperado, texto)
    respuesta["demandante"]["dni"] = "99999999"
    fingir_ia(respuesta)
    motivos = main._aplicar_partes_ia(_entidades(), texto)["demandante"]["verificacion"]["motivos"]
    assert "el DNI no está en el texto" in motivos


def test_un_dni_que_esta_lejos_del_nombre_no_se_acepta(main):
    """La IA une el nombre de una persona con el DNI de otra que figura mucho más abajo."""
    relleno = " texto del expediente sin relación con nadie." * 20
    base = main._sin_puntuacion(f"Ana Soto Vega, identificada con DNI 11111111. {relleno} Luis Ruiz Paz con DNI 22222222.")
    cita = "Ana Soto Vega, identificada con DNI 11111111"
    assert main._verificar_parte_ia({"nombre": "Ana Soto Vega", "dni": "11111111", "cita": cita}, base) == []
    assert main._verificar_parte_ia({"nombre": "Ana Soto Vega", "dni": "22222222", "cita": cita}, base) == ["el DNI no está junto al nombre"]


def test_la_cita_inventada_deja_la_parte_en_revision(main, exp, fingir_ia):
    _, esperado, texto = exp
    respuesta = _respuesta(main, esperado, texto)
    respuesta["demandado"]["cita"] = "El demandado reconoció ante el juez que debe tres años de pensión atrasada"
    fingir_ia(respuesta)
    resultado = main._aplicar_partes_ia(_entidades(), texto)
    assert resultado["demandado"]["verificacion"] == {"estado": "revisar", "motivos": ["la cita no figura en el texto"]}
    assert resultado["demandante"]["verificacion"]["estado"] == "verificada"


def test_si_la_ia_y_las_reglas_coinciden_en_el_dni_no_hace_falta_revisar(main, exp, fingir_ia):
    _, esperado, texto = exp
    respuesta = _respuesta(main, esperado, texto)
    respuesta["demandado"]["cita"] = "frase que no está en el expediente para nada de nada"
    fingir_ia(respuesta)
    d, o = esperado["partes"]["demandante"], esperado["partes"]["demandado"]
    entidades = _entidades(demandante=(d["nombre"], d["dni"]), demandado=("OTRO NOMBRE REGLAS", o["dni"]))
    resultado = main._aplicar_partes_ia(entidades, texto)
    assert resultado["demandado"]["verificacion"]["estado"] == "verificada"
    assert resultado["demandado"]["nombre"] == "OTRO NOMBRE REGLAS"          # no se toca lo que no se verificó


def test_ambas_partes_con_el_mismo_dni_se_rechazan(main, exp, fingir_ia):
    _, esperado, texto = exp
    respuesta = _respuesta(main, esperado, texto)
    respuesta["demandado"]["dni"] = respuesta["demandante"]["dni"]
    fingir_ia(respuesta)
    resultado = main._aplicar_partes_ia(_entidades(), texto)
    for rol in ("demandante", "demandado"):
        assert "ambas partes tienen el mismo DNI" in resultado[rol]["verificacion"]["motivos"]


def test_sin_ia_se_conservan_las_reglas_y_se_avisa(main, texto_exp, fingir_ia):
    fingir_ia(None)
    entidades = _entidades(demandante=("ANA SOTO VEGA", "11111111"), demandado=("LUIS RUIZ PAZ", "22222222"))
    resultado = main._aplicar_partes_ia(entidades, texto_exp("EXP_0001"))
    assert resultado["demandante"]["nombre"] == "ANA SOTO VEGA" and resultado["demandado"]["dni"] == "22222222"
    assert resultado["demandante"]["verificacion"]["estado"] == "sin_ia"


def test_un_dni_confirmado_en_una_parte_se_quita_de_la_otra(main, exp, fingir_ia):
    _, esperado, texto = exp
    respuesta = _respuesta(main, esperado, texto)
    respuesta["demandado"]["cita"] = ""                                    # el demandado no se pudo verificar
    fingir_ia(respuesta)
    d = esperado["partes"]["demandante"]
    entidades = _entidades(demandante=("OTRA PERSONA", "55555555"), demandado=(d["nombre"], d["dni"]))
    resultado = main._aplicar_partes_ia(entidades, texto)
    assert resultado["demandante"]["dni"] == d["dni"]
    assert resultado["demandado"]["dni"] == "No detectado"
    assert resultado["demandado"]["verificacion"]["estado"] == "revisar"


def test_una_cita_con_pequenas_diferencias_se_acepta_pero_una_ajena_no(main, texto_exp):
    texto = texto_exp("EXP_0002")
    base = main._sin_puntuacion(texto)
    original = re.sub(r'\s+', ' ', texto[600:760]).strip()
    palabras = original.split()
    con_omision = " ".join(palabras[:6] + palabras[7:])                    # falta una palabra al copiar
    assert main._cita_respaldada(original, base) is True
    assert main._cita_respaldada(con_omision, base) is True
    assert main._cita_respaldada("el demandado debe pagar todo lo que quedó pendiente desde el año pasado", base) is False
    assert main._cita_respaldada("demandante de alimentos", base) is False   # demasiado corta para respaldar nada


def test_texto_para_partes_toma_el_inicio_de_los_primeros_documentos(main):
    texto = "".join(f"\n\n--- [DOCUMENTO {i}: doc{i}.pdf] ---\n\n" + f"contenido{i} " * 800 for i in range(1, 6))
    fragmento = main._texto_para_partes(texto.strip())
    assert "[doc1.pdf]" in fragmento and "[doc3.pdf]" in fragmento and "[doc4.pdf]" not in fragmento
    assert len(fragmento) < 3 * 3100
    assert main._texto_para_partes("texto sin marcas " * 1000) == ("texto sin marcas " * 1000)[:9000]
