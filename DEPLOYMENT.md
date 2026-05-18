# Deployment Guide

## Docker Container

This project is packaged as a single Docker container with:
- **Backend**: FastAPI running on internal port 8000
- **Frontend**: Next.js static site served by Nginx on port 80
- **API Proxy**: Nginx routes `/api/*` requests to the FastAPI backend

### Build the Docker Image

```bash
docker build -t thinking-machines:latest .
```

### Run the Container Locally

```bash
docker run -p 8000:80 thinking-machines:latest
```

Then visit `http://localhost:8000` in your browser.

### Run on a Server

1. **Push to Docker registry** (Docker Hub, ECR, etc.):
   ```bash
   docker tag thinking-machines:latest myregistry/thinking-machines:latest
   docker push myregistry/thinking-machines:latest
   ```

2. **Pull and run on server**:
   ```bash
   docker pull myregistry/thinking-machines:latest
   docker run -d -p 80:80 --name thinking-machines myregistry/thinking-machines:latest
   ```

3. **Access**: Visit `http://<server-ip>` in your browser

### With Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    image: thinking-machines:latest
    ports:
      - "80:80"
    environment:
      # Add any environment variables needed
      - DATABASE_URL=sqlite:///./thinking_machines.db
    volumes:
      # Optional: persist database across container restarts
      - ./data:/app/data
```

Then run:
```bash
docker-compose up -d
```

### How It Works

1. **Frontend** (`/var/www/html`) is served by Nginx on port 80
2. **Backend API** runs on localhost:8000 inside the container
3. **Nginx** proxies `/api/*` requests to the backend
4. **Frontend code** makes API calls to relative paths (`/api/...`) which work through the proxy

### Database Persistence

The SQLite database is created at `/app/thinking_machines.db` inside the container. To persist it across restarts:

```bash
docker run -d -p 80:80 \
  -v $(pwd)/data:/app \
  --name thinking-machines \
  thinking-machines:latest
```

This mounts a local `./data` directory to `/app` inside the container.

### Logs

View container logs:
```bash
docker logs thinking-machines
```

View specific service logs:
```bash
# Nginx logs
docker exec thinking-machines tail -f /var/log/nginx/access.log

# FastAPI logs (in container stdout)
docker logs -f thinking-machines
```

### Health Check

The container exposes port 80. Check it's running:
```bash
curl http://localhost/api/metrics
```

Should return a JSON array of metric definitions.
