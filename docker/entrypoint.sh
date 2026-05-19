#!/bin/bash
set -e

# Cloud Run sets PORT; default to 8080 for local dev
export PORT=${PORT:-8080}
export NEXT_PORT=3000
export BACKEND_PORT=8000

echo "Starting Thinking Machines (nginx + next + uvicorn)..."
echo "Public port: $PORT, Next.js: $NEXT_PORT, Backend: $BACKEND_PORT"

# Start Next.js standalone server in background
echo "Starting Next.js on port $NEXT_PORT..."
( cd /app/frontend && PORT=$NEXT_PORT HOSTNAME=0.0.0.0 node server.js ) &
NEXT_PID=$!
echo "✓ Next.js started (PID: $NEXT_PID)"

# Generate nginx config with the correct PORT before starting
echo "Generating nginx config for port $PORT..."
if command -v envsubst &> /dev/null; then
  envsubst '$PORT' < /etc/nginx/nginx.conf.tpl > /etc/nginx/nginx.conf
else
  sed "s/listen.*8080/listen $PORT/g" /etc/nginx/nginx.conf.tpl > /etc/nginx/nginx.conf
fi

# Start nginx on the PORT Cloud Run assigns
echo "Starting Nginx on port $PORT..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "✓ Nginx started (PID: $NGINX_PID)"

sleep 1

cd /app

# DB init BEFORE backend (blocking, must complete before uvicorn starts)
# Only run if tables don't exist yet; skip redundant migrations on restart
echo "Checking database state..."

tables_exist=$(python -c "
from backend.app import database
import sqlite3
try:
  conn = sqlite3.connect('thinking_machines.db')
  cursor = conn.cursor()
  cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name='metric_definitions'\")
  exists = cursor.fetchone() is not None
  conn.close()
  print('yes' if exists else 'no')
except:
  print('no')
" 2>/dev/null || echo "no")

if [ "$tables_exist" = "no" ]; then
  echo "Creating database tables..."
  python -c "from backend.app import database, models; models.Base.metadata.create_all(bind=database.engine)" || true
  echo "✓ Database tables created"

  echo "Seeding metrics..."
  python -m backend.app.seed_metrics || true
  echo "✓ Metrics seeded"
else
  echo "✓ Database already initialized"
fi

# Generate test data (required for /funnel endpoint to work)
if [ ! -f /app/.data_generated ]; then
  echo "Generating test data..."
  python -m backend.app.generate_data || true
  touch /app/.data_generated
  echo "✓ Test data generated"
else
  echo "✓ Test data already generated"
fi

# Backend in foreground (PID 1 of the container)
echo "Starting FastAPI backend on port $BACKEND_PORT..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port $BACKEND_PORT
