# Banco de generalización: misma información, otra redacción

Cada `EXP_000N.txt` es el expediente de `../fixtures/` **reescrito por una IA local (mistral 7B)** con otra
redacción, otro orden y otros títulos, y con nombres de archivo opacos (`scan_001.pdf`). Los hechos (fechas,
montos, partes, domicilios) se conservaron; se comprobó que las fechas y montos siguen presentes.

- Los valores esperados son los mismos de `../expected.json`.
- Dos documentos (oficio de EXP_0003 y acta de EXP_0004) perdieron datos al reescribirse y se sustituyeron por el original.
- **No es una compuerta de CI**: mide cuánto aguanta la extracción ante redacciones que no conoce.
  Ver el número con `python tests/reporte_precision.py --fixtures reescritos --minimo 0`.
- Un caso que falle aquí NO se arregla agregando una regla para ese texto: se agrega un caso real al conjunto
  principal y se mejora el método.
