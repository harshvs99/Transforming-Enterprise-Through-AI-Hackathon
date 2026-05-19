#!/bin/bash
set -e

echo "Starting Thinking Machines application..."

# Start Nginx first so the container is listening on $PORT immediately
# (Cloud Run's startup probe times out otherwise). Nginx returns 502
# for /api/* until uvicorn comes up a few seconds later.
echo "Starting Nginx on 8080..."
nginx -g "daemon off;" &

# Initialize database (idempotent; safe to skip on failure)
cd /app
python -m backend.app.seed_metrics || true
python -m backend.app.generate_data || true

# Start backend API (foreground)
echo "Starting FastAPI backend on port 8000..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
