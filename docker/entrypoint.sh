#!/bin/bash
set -e

echo "Starting Thinking Machines (nginx + next + uvicorn)..."

# Start Next.js standalone server in background on :3000
echo "Starting Next.js on port 3000..."
( cd /app/frontend && PORT=3000 HOSTNAME=0.0.0.0 node server.js ) &
NEXT_PID=$!
echo "✓ Next.js started (PID: $NEXT_PID)"

# Start nginx so Cloud Run's startup probe on :8080 passes immediately.
# Nginx will return 502 for / until Next is up, and 502 for /api/* until
# uvicorn is up — both come up within a few seconds.
echo "Starting Nginx on 8080..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "✓ Nginx started (PID: $NGINX_PID)"

sleep 1

cd /app

# DB init in background (does not block backend startup)
# Only run if tables don't exist yet; skip redundant migrations on restart
echo "Checking database state..."
{
  # Check if tables exist
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

  # Optional: generate test data (disabled by default, enable with GENERATE_TEST_DATA=true)
  if [ "${GENERATE_TEST_DATA}" = "true" ]; then
    echo "Generating test data..."
    python -m backend.app.generate_data || true
    echo "✓ Test data generated"
  fi
} &

# Backend in foreground (PID 1 of the container)
echo "Starting FastAPI backend on port 8000..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
