"""Precisión por campo sobre los expedientes de prueba (valores de expected.json, leídos de los PDFs).

Uso (desde Backend/):  python tests/reporte_precision.py [--minimo 100]
Imprime una tabla campo x expediente y sale con código 1 si la precisión global baja del mínimo,
para usarlo como compuerta en CI y ver de un vistazo qué campo empeora. Un extractor que falla
(excepción) cuenta como campo incorrecto.
"""
import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from conftest import ESPERADO, EXPEDIENTES, FIXTURES, _Respuesta, cargar_main  # noqa: E402


def intentar(campos: dict, nombres: list, calcular):
    """Ejecuta un bloque de extracción; si falla, todos sus campos quedan como incorrectos."""
    try:
        campos.update(calcular())
    except Exception:  # noqa: BLE001 - un extractor roto debe verse como campo fallido, no abortar el reporte
        campos.update({n: False for n in nombres})


def evaluar(ns, clave: str, texto: str = None) -> dict:
    esperado = ESPERADO[clave]
    if texto is None:
        texto = (FIXTURES / f"{clave}.txt").read_text(encoding="utf-8")
    campos: dict = {}

    def financiero():
        demanda, _ = ns["_obtener_bloques_demanda_contestacion"](texto)
        montos = ns["_extraer_montos_reales"](texto)
        petitorio = float(ns["_extraer_petitorio_demanda_info"](texto).get("monto") or 0)
        gastos = {g["concepto"]: g["monto"] for g in ns["_extraer_gastos_nativos"](demanda or texto, montos, petitorio)}
        return {"petitorio": petitorio == esperado["petitorio"], "gastos": gastos == esperado["gastos"]}

    def capacidad():
        cap = ns["modulo_capacidad_cargas"](texto)
        return {
            "ingreso base": cap["total_ingresos"] == esperado["ingreso_base"],
            "cargas": [d["monto_carga"] for d in cap["dependientes"] if d.get("monto_carga")] == esperado["cargas"],
            "pension ordenada": [cap["pension_ordenada"]["tipo"], cap["pension_ordenada"]["valor"]] == esperado["pension"],
        }

    def plazos():
        plazo = ns["modulo_extraccion_plazos"](texto)
        p = esperado["plazo"]
        eventos = {k: v["fecha"] for k, v in plazo["auditoria_temporal"]["eventos_procesales"].items()}
        return {
            "fecha notificacion": plazo["fecha_notificacion"] == p["notificacion"],
            "fecha contestacion": plazo["fecha_presentacion"] == p["presentacion"],
            "veredicto de plazo": (plazo["estado"], plazo["dias_transcurridos"]) == (p["estado"], p["dias"]),
            "eventos procesales": all(eventos.get(t) == f for t, f in esperado["eventos"].items()),
            "sin alertas falsas": not [h for h in plazo["auditoria_temporal"]["hallazgos"] if h["severidad"] == "CRITICO"],
        }

    def domicilios():
        dom = ns["extraer_domicilios_judiciales"](texto)
        d = esperado["domicilios"]
        salida = {
            "domicilio demandante": dom["demandante"]["real"].startswith(d["demandante_real"]),
            "domicilio demandado": dom["demandado"]["real"].startswith(d["demandado_real"]),
        }
        if "demandado_laboral" in d:
            salida["domicilio laboral"] = dom["demandado"]["laboral"].startswith(d["demandado_laboral"])
        return salida

    def acta_y_postura():
        hechos = ns["_hechos_contestacion_y_audiencia"](texto)
        po = esperado["postura"]
        audiencia = hechos.get("audiencia", {})
        return {
            "puntos del acta": len(ns["_extraer_puntos_controvertidos_acta"](texto)) == esperado["puntos_acta"],
            "postura (ofertas)": (
                hechos.get("oferta") == po["oferta"]
                and audiencia.get("demandante_reduce") == po["demandante_reduce"]
                and audiencia.get("demandado_eleva") == po["demandado_eleva"]
            ),
        }

    intentar(campos, ["petitorio", "gastos"], financiero)
    intentar(campos, ["ingreso base", "cargas", "pension ordenada"], capacidad)
    intentar(campos, ["fecha notificacion", "fecha contestacion", "veredicto de plazo", "eventos procesales",
                      "sin alertas falsas"], plazos)
    intentar(campos, ["domicilio demandante", "domicilio demandado"]
             + (["domicilio laboral"] if "demandado_laboral" in esperado["domicilios"] else []), domicilios)
    intentar(campos, ["puntos del acta", "postura (ofertas)"], acta_y_postura)
    return campos


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimo", type=float, default=100.0, help="precisión global mínima (%%) para salir con 0")
    parser.add_argument("--fixtures", choices=["originales", "reescritos"], default="originales",
                        help="'reescritos' = mismos hechos con otra redacción (mide generalización)")
    args = parser.parse_args()
    minimo = args.minimo
    carpeta = FIXTURES if args.fixtures == "originales" else FIXTURES.parent / "fixtures_reescritos"

    ns = cargar_main()
    ns["post_ollama_generate"] = lambda payload, timeout=0: _Respuesta({"response": "{}"})  # solo lógica determinista
    resultados = {
        clave: evaluar(ns, clave, (carpeta / f"{clave}.txt").read_text(encoding="utf-8")) for clave in EXPEDIENTES
    }

    campos = list(dict.fromkeys(c for r in resultados.values() for c in r))
    ancho = max(len(c) for c in campos)
    print(f"{'campo':<{ancho}}  " + "  ".join(c[-4:] for c in EXPEDIENTES) + "   precision")
    total = aciertos = 0
    for campo in campos:
        fila = [resultados[c].get(campo) for c in EXPEDIENTES]
        validos = [x for x in fila if x is not None]
        total += len(validos)
        aciertos += sum(validos)
        marcas = "  ".join("  - " if x is None else ("  ok" if x else " FAIL") for x in fila)
        print(f"{campo:<{ancho}}  {marcas}   {100 * sum(validos) / len(validos):5.0f}%")
    global_pct = 100 * aciertos / total
    print(f"\nPRECISION GLOBAL: {global_pct:.1f}%  ({aciertos}/{total} campos)  minimo exigido: {minimo:g}%")
    return 0 if global_pct >= minimo else 1


if __name__ == "__main__":
    sys.exit(main())
