"""Fixtures compartidas de las pruebas.

main.py hace trabajo al importarse (conexión a la base de datos, sembrado de usuarios), así que las
pruebas cargan SOLO sus funciones, constantes y clases con `ast`, sin ejecutar el arranque ni las rutas.
Cuando main.py se divida en módulos importables sin efectos secundarios, este cargador sobra y se
importa directamente.
"""
import ast
import json
import pathlib

import pytest

DIR_TESTS = pathlib.Path(__file__).resolve().parent
MAIN_PY = DIR_TESTS.parent / "main.py"
FIXTURES = DIR_TESTS / "fixtures"
ESPERADO = json.loads((DIR_TESTS / "expected.json").read_text(encoding="utf-8"))
EXPEDIENTES = [k for k in ESPERADO if not k.startswith("_")]


def cargar_main() -> dict:
    arbol = ast.parse(MAIN_PY.read_text(encoding="utf-8"))
    ns = {"__name__": "main_aislado"}
    for nodo in arbol.body:
        if isinstance(nodo, (ast.Expr, ast.If, ast.Try)):
            continue
        if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)) and nodo.decorator_list:
            continue
        exec(compile(ast.Module(body=[nodo], type_ignores=[]), str(MAIN_PY), "exec"), ns)
    ns["nlp"] = None
    return ns


class _Respuesta:
    def __init__(self, datos):
        self._datos = datos

    def json(self):
        return self._datos


@pytest.fixture(scope="session")
def ns():
    return cargar_main()


@pytest.fixture(scope="session")
def main(ns):
    class Vista:
        def __getattr__(self, nombre):
            return ns[nombre]
    return Vista()


@pytest.fixture
def sin_llm(ns):
    """Reemplaza la llamada a Ollama por una respuesta vacía: prueba solo la lógica determinista."""
    original = ns["post_ollama_generate"]
    ns["post_ollama_generate"] = lambda payload, timeout=0: _Respuesta({"response": "{}"})
    yield
    ns["post_ollama_generate"] = original


@pytest.fixture
def texto_proceso():
    """Texto de un expediente de OTRO tipo de proceso (apelación, casación...), en tests/fixtures_procesos/."""
    return lambda nombre: (FIXTURES.parent / "fixtures_procesos" / f"{nombre}.txt").read_text(encoding="utf-8")


@pytest.fixture
def main_con_nlp(main, ns):
    """El módulo de entidades usa spaCy; se omite la prueba si el modelo no está instalado."""
    spacy = pytest.importorskip("spacy")
    try:
        ns["nlp"] = spacy.load("es_core_news_sm")
    except OSError:
        pytest.skip("modelo es_core_news_sm no instalado")
    yield main
    ns["nlp"] = None


@pytest.fixture
def texto_exp():
    """Devuelve una función clave -> texto del expediente (para pruebas de un caso concreto)."""
    return lambda clave: (FIXTURES / f"{clave}.txt").read_text(encoding="utf-8")


@pytest.fixture(params=EXPEDIENTES)
def exp(request):
    """(id, esperado, texto concatenado tal como lo arma el sistema) de cada expediente de prueba."""
    clave = request.param
    texto = (FIXTURES / f"{clave}.txt").read_text(encoding="utf-8")
    return clave, ESPERADO[clave], texto
