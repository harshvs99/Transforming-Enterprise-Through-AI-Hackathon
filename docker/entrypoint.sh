#!/bin/bash
set -e

# Cloud Run sets PORT; default to 8080 for local dev
export PORT=${PORT:-8080}
export NEXT_PORT=3000
export BACKEND_PORT=8000

echo "Starting Thinking Machines (nginx + next + uvicorn)..."
echo "Public port: $PORT, Next.js: $NEXT_PORT, Backend: $BACKEND_PORT"

cd /app

# DB init (blocking — must finish before uvicorn starts)
echo "Checking database state..."
tables_exist=$(python -c "
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

if [ ! -f /app/.data_generated ]; then
  echo "Generating test data..."
  python -m backend.app.generate_data || true
  touch /app/.data_generated
  echo "✓ Test data generated"
else
  echo "✓ Test data already generated"
fi

# Start Next.js in background
echo "Starting Next.js on port $NEXT_PORT..."
( cd /app/frontend && PORT=$NEXT_PORT HOSTNAME=0.0.0.0 node server.js ) &
NEXT_PID=$!

# Start uvicorn in background
echo "Starting FastAPI backend on port $BACKEND_PORT..."
uvicorn backend.app.main:app --host 0.0.0.0 --port $BACKEND_PORT &
UVICORN_PID=$!

# Wait until both upstream services are ready before opening nginx (port $PORT).
# Cloud Run's startup probe targets port $PORT — delaying nginx here means the
# probe cannot succeed until both upstreams are ready, eliminating cold-start 502s.
echo "Waiting for backend to be ready..."
until curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; do
  kill -0 $UVICORN_PID 2>/dev/null || { echo "uvicorn process died — aborting"; exit 1; }
  sleep 0.5
done
echo "✓ Backend ready"

echo "Waiting for Next.js to be ready..."
until curl -sf http://localhost:$NEXT_PORT > /dev/null 2>&1; do
  kill -0 $NEXT_PID 2>/dev/null || { echo "Next.js process died — aborting"; exit 1; }
  sleep 0.5
done
echo "✓ Next.js ready"

# Generate nginx config and start — port $PORT opens HERE
echo "Generating nginx config for port $PORT..."
if command -v envsubst &> /dev/null; then
  envsubst '$PORT' < /etc/nginx/nginx.conf.tpl > /etc/nginx/nginx.conf
else
  sed "s/listen.*8080/listen $PORT/g" /etc/nginx/nginx.conf.tpl > /etc/nginx/nginx.conf
fi

echo "Starting Nginx on port $PORT..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "✓ Nginx started (PID: $NGINX_PID)"

# Monitor both services. If either exits, kill everything so Cloud Run restarts the container.
# Watching only uvicorn (the old approach) meant a crashed Next.js would leave the container
# alive but serving permanent 502s on all frontend routes.
while true; do
  if ! kill -0 $UVICORN_PID 2>/dev/null; then
    echo "uvicorn exited — shutting down container"
    kill $NGINX_PID $NEXT_PID 2>/dev/null
    exit 1
  fi
  if ! kill -0 $NEXT_PID 2>/dev/null; then
    echo "Next.js exited — shutting down container"
    kill $NGINX_PID $UVICORN_PID 2>/dev/null
    exit 1
  fi
  sleep 5
done
