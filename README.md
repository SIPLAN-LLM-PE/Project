# SIGEJA – Sistema Inteligente de Gestión Judicial de Alimentos

Analiza expedientes de alimentos (PDF): extrae partes, domicilios, fechas, plazos, montos y capacidad
económica, genera síntesis con IA local (Ollama) y permite validar y aprobar el análisis.

- **Backend:** FastAPI + PostgreSQL (pgvector) en [Backend/](Backend/)
- **Frontend:** React + Vite + Tailwind en [frontend/](frontend/)
- **IA:** Ollama local (`mistral` y `mistral-nemo`; `nomic-embed-text` solo para la búsqueda de casos similares)

## Cómo se extrae y se verifica la información

La IA lee el texto del PDF, pero **nada que ella diga se muestra como seguro si el expediente no lo confirma**:

1. Las reglas y la IA proponen cada dato con la frase del documento que lo respalda.
2. Un verificador comprueba esa frase contra el texto: que el nombre y el DNI estén juntos, que el monto sea de ese concepto
   (no una indemnización, un aporte ya hecho o lo que luego fijó la sentencia), que la fecha sea la de emisión del propio documento.
3. Lo confirmado se marca **Verificado**; lo que no se puede confirmar queda **Revisar**, con el motivo al pasar el cursor.
4. La narrativa (síntesis y postura de la defensa) pierde toda oración con un monto, fecha o porcentaje que no figure en los documentos.

Sin Ollama el sistema usa solo las reglas (más lentas en acertar nombres y sin resumen redactado), y lo indica.

## Requisitos

| Herramienta | Notas |
|---|---|
| Python 3.11+ | Docker usa 3.12 |
| Node.js 20+ | probado con 24 |
| Docker Desktop | para PostgreSQL con pgvector |
| Tesseract OCR (idioma `spa`) y Poppler | rutas por defecto en Windows: `C:\Program Files\Tesseract-OCR\tesseract.exe` y `C:\poppler\Library\bin`; se pueden cambiar con `TESSERACT_CMD` y `POPPLER_PATH` |
| Ollama | `ollama pull mistral`, `ollama pull mistral-nemo`, `ollama pull nomic-embed-text` (opcional: sin Ollama funcionan login, listas y datos extraídos, pero no la síntesis con IA) |

## Ejecutar en local

**1. Base de datos** (puerto 5433, contraseña `123`: son los valores por defecto del backend)

```powershell
docker run -d --name sigeja-db -p 5433:5432 -e POSTGRES_PASSWORD=123 -e POSTGRES_DB=sigeja_db pgvector/pgvector:pg16
Get-Content Backend\schema.sql | docker exec -i sigeja-db psql -U postgres -d sigeja_db
```

Si el contenedor ya existe: `docker start sigeja-db`.

**2. Backend** (terminal 1)

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Al arrancar por primera vez siembra usuarios de prueba (`admin01` / `admin123`, `j.valdivia` / `juez123`, …).
Documentación de la API: <http://localhost:8000/docs>.

**3. Frontend** (terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Abrir <http://localhost:5173>. Vite redirige `/api` al backend (puerto 8000).

## Ejecutar con Docker Compose

```powershell
copy .env.example .env      # y cambiar POSTGRES_PASSWORD y JWT_SECRET
docker compose up -d --build
# con IA local en contenedor (requiere GPU NVIDIA): docker compose --profile ai up -d
```

La primera vez que se crea el volumen de PostgreSQL se aplica `Backend/schema.sql` automáticamente.
Despliegue en AWS: [DEPLOY_AWS.md](DEPLOY_AWS.md).

## Pruebas y calidad de la extracción

```powershell
cd Backend
pip install -r requirements-dev.txt
pytest                                   # 5 expedientes simulados + pruebas con textos cortos de cada regla (sin Ollama ni base de datos)
python tests/reporte_precision.py        # precisión por campo; sale con 1 si baja del mínimo
```

- `python tests/reporte_precision.py --fixtures reescritos --minimo 0` mide la **generalización a otra redacción**
  (mismos hechos reescritos con otras palabras). Hoy ronda el 61 %: es la cifra a mejorar, no una compuerta.
  Un caso que falle ahí no se arregla con una regla para ese texto (ver `Backend/tests/fixtures_reescritos/LEEME.md`).
- Los valores esperados están en `Backend/tests/expected.json` y se leyeron **a mano de los PDFs**; si
  cambias uno, justifícalo contra el documento.
- Un error corregido debe quedar como prueba. Un defecto conocido sin corregir se marca con `xfail`.
- GitHub Actions ejecuta ambas cosas en cada push ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Variables de entorno principales

| Variable | Por defecto | Uso |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:123@localhost:5433/sigeja_db` | conexión a PostgreSQL |
| `SIGEJA_JWT_SECRET` (o `JWT_SECRET`) | valor de desarrollo | **cambiar en producción** |
| `TESSERACT_CMD`, `POPPLER_PATH` | rutas de Windows / PATH en Linux | OCR |
| `OLLAMA_BASE_URL` | `http://localhost:11434` en local | IA |
| `SIGEJA_RAG_ANALYZE_MODE` | `fast` | `full` usa más contexto y tarda más |
| `SIGEJA_PARTES_IA` | `true` | `false` desactiva la lectura de las partes con IA (queda solo la de reglas); útil para comparar |
| `SIGEJA_PARTES_IA_TIMEOUT` | `120` | segundos; en una instancia sin GPU conviene subirlo |

## Problemas frecuentes

- **`Failed to resolve import "pdfjs-dist…"`**: `node_modules` desactualizado. `npm install` y reiniciar con `npm run dev -- --force`.
- **El backend no conecta a la base**: ver que `sigeja-db` esté corriendo (`docker ps`) y el puerto 5433 libre.
- **El análisis con IA tarda o falla**: comprobar que Ollama esté en ejecución y tenga los modelos descargados.

## Pendientes conocidos

Ver el plan de mejora acordado: dividir `Backend/main.py` en módulos, registro de errores con `logging`,
extender el estado "Verificado / Revisar" a los campos que aún no lo tienen (fechas, puntos controvertidos, domicilios),
cola de revisión humana, endurecimiento de seguridad (contraseñas de prueba, CORS, secreto JWT obligatorio) y limpiar los
errores de lint del frontend. Sin medir todavía: PDF escaneados (OCR) y expedientes reales; el corpus de evaluación es simulado.
