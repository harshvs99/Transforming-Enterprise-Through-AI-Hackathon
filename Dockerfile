# Stage 1: Build frontend (produces a Node server via output: 'standalone')
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend .
# Remove any local env files to ensure Docker uses relative URLs (nginx proxies /api/*)
RUN rm -f .env.local .env.*.local
RUN npm run build

# Stage 2: Runtime — Python + Node + nginx in one container
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and Node.js early (before Python deps)
# so layer caching works: changes to requirements.txt don't invalidate Node
RUN apt-get update \
 && apt-get install -y nginx curl ca-certificates gnupg gettext-base \
 && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
 && apt-get install -y nodejs \
 && rm -rf /var/lib/apt/lists/*

# Python deps (comes after Node so Node layer can cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY backend ./backend

# Next.js standalone server + its static assets and public/ folder.
# The standalone output bundles only the deps the server needs.
COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend
COPY --from=frontend-builder /app/frontend/.next/static    /app/frontend/.next/static
COPY --from=frontend-builder /app/frontend/public          /app/frontend/public

# Nginx config and entrypoint
COPY docker/nginx.conf.tpl /etc/nginx/nginx.conf.tpl
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Pre-bake the database at build time so cold-start skips all init work.
# The entrypoint checks for the metric_definitions table and .data_generated
# flag — both will be present in the image, so startup is near-instant.
RUN python -c "from backend.app import database, models; models.Base.metadata.create_all(bind=database.engine)" \
 && python -m backend.app.seed_metrics \
 && python -m backend.app.generate_data \
 && touch /app/.data_generated

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
