# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm ci

COPY frontend .
RUN npm run build

# Stage 2: Python backend with frontend
FROM python:3.11-slim

WORKDIR /app

# Install Nginx for serving static frontend and proxying API
RUN apt-get update && apt-get install -y nginx curl && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/out /var/www/html

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Create database file
RUN mkdir -p /app && touch /app/thinking_machines.db

# Expose ports
EXPOSE 80

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
