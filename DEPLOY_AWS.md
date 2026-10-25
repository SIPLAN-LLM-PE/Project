# Despliegue SIGEJA en una sola instancia EC2

## Objetivo de la primera etapa

Validar conectividad real del sistema en AWS con el menor costo posible:

- React servido por Nginx en el puerto 80.
- FastAPI interno en el puerto 8000, sin exponerlo directamente.
- PostgreSQL + pgvector interno en Docker.
- PDFs persistidos en volumen Docker.
- Ollama/RAG preparado, pero opcional en la etapa gratis.

> Nota: la IA local con modelos tipo Mistral suele necesitar bastante RAM. Para la etapa gratis valida login, dashboards, subida básica, PostgreSQL, pgvector y rutas. Para RAG/Ollama estable conviene pasar luego a una instancia con más memoria.

## Instancia recomendada para validar

- AMI: Ubuntu Server LTS.
- Tipo: una instancia Free Tier elegible disponible en tu cuenta/región.
- Disco EBS: 20 a 30 GB gp3.
- Security Group:
  - SSH 22 solo desde tu IP.
  - HTTP 80 desde internet.
  - No abrir 5432, 8000 ni 11434.

## Preparar la instancia

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Cierra sesión SSH y vuelve a entrar para que el grupo `docker` aplique.

## Subir el proyecto

Opción simple con Git:

```bash
git clone <URL_DEL_REPOSITORIO> sigeja
cd sigeja
```

Opción manual:

```bash
scp -r ./Proyecto ubuntu@<IP_PUBLICA_EC2>:/home/ubuntu/sigeja
cd /home/ubuntu/sigeja
```

No subas `.env`, bases SQLite, PDFs reales ni llaves `.pem`.

## Configurar secretos

```bash
cp .env.example .env
nano .env
```

Cambia como mínimo:

```env
POSTGRES_PASSWORD=una_password_segura
JWT_SECRET=un_secreto_largo_aleatorio
```

## Levantar el sistema

```bash
docker compose up -d --build
docker compose ps
```

Ver logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

Abrir en navegador:

```text
http://<IP_PUBLICA_EC2>
```

## Qué esperar sin Ollama

El sistema funciona, pero con menos calidad: la lectura de PDF, los montos, las fechas, los plazos y la capacidad
económica salen de reglas. Las partes (demandante y demandado) salen solo de reglas y quedan marcadas "sin IA";
el resumen y la postura de la defensa son genéricos ("modo extractivo").

## Activar IA local luego

Solo cuando uses una instancia con RAM suficiente. Requisitos:

- **RAM:** 16 GB o más. `mistral` ocupa 4.4 GB y `mistral-nemo` 7.1 GB; con 8 GB no queda margen para PostgreSQL,
  el backend y el contexto largo del modelo.
- **GPU:** el servicio `ollama` de `docker-compose.yml` trae `gpus: all`, que exige una GPU NVIDIA con sus
  controladores y el NVIDIA Container Toolkit. En una instancia solo con CPU, comenta esa línea o el servicio no arranca.
  Sin GPU el análisis tarda varios minutos: sube `SIGEJA_PARTES_IA_TIMEOUT` (y `SIGEJA_OLLAMA_RAG_TIMEOUT`) en `.env`.

```bash
docker compose --profile ai up -d ollama
docker compose exec ollama ollama pull mistral
docker compose exec ollama ollama pull mistral-nemo
docker compose restart backend
```

`nomic-embed-text` (274 MB) es **opcional**: solo lo usa la búsqueda de casos similares ("Jurisprudencia", HU19) y el
vector que se guarda con cada expediente. El análisis no lo necesita. Si quieres esa búsqueda:

```bash
docker compose exec ollama ollama pull nomic-embed-text
```

Los expedientes guardados antes de descargarlo no tendrán vector: vuelve a guardarlos para que aparezcan en esa búsqueda.

### Comprobar que son los mismos modelos

```bash
docker compose exec ollama ollama list
```

Los resultados medidos en desarrollo (junio de 2026) se obtuvieron con estos IDs; si los de AWS difieren, la salida
puede variar ligeramente y conviene repetir la prueba:

| Modelo | ID |
|---|---|
| mistral | 6577803aa9a0 |
| mistral-nemo | e7e06d107c6c |
| nomic-embed-text | 0a109f422b47 |

## Escalamiento sugerido

1. Validacion gratis: una instancia Free Tier elegible, sin Ollama activo.
2. Prueba funcional con IA: instancia con 16 GB o mas de RAM (con GPU si quieres tiempos razonables).
3. Produccion inicial: separar PostgreSQL a RDS o aumentar EBS/snapshots; agregar dominio, HTTPS y backups.
