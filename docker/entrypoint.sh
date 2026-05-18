#!/bin/bash
set -e

echo "Starting Thinking Machines application..."

# Initialize database (if needed)
cd /app
python -m backend.app.seed_metrics || true
python -m backend.app.generate_data || true

# Start Nginx in the background
echo "Starting Nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Start backend API
echo "Starting FastAPI backend on port 8000..."
cd /app
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
