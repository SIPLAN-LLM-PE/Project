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

## Activar IA local luego

Solo cuando uses una instancia con RAM suficiente:

```bash
docker compose --profile ai up -d ollama
docker compose exec ollama ollama pull mistral
docker compose exec ollama ollama pull mistral-nemo
docker compose restart backend
```

## Escalamiento sugerido

1. Validacion gratis: una instancia Free Tier elegible, sin Ollama activo.
2. Prueba funcional con IA: instancia con 8 GB o mas de RAM.
3. Produccion inicial: separar PostgreSQL a RDS o aumentar EBS/snapshots; agregar dominio, HTTPS y backups.
