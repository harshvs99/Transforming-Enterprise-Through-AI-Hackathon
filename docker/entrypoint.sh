#!/bin/bash
set -e

echo "Starting Thinking Machines application..."

# Verify frontend files exist
if [ ! -f "/var/www/html/index.html" ]; then
  echo "ERROR: Frontend index.html not found in /var/www/html"
  ls -la /var/www/html 2>/dev/null || echo "Directory does not exist"
  exit 1
fi
echo "✓ Frontend files found in /var/www/html"

# Start Nginx first so the container is listening on $PORT immediately
# (Cloud Run's startup probe times out otherwise). Nginx returns 502
# for /api/* until uvicorn comes up a few seconds later.
echo "Starting Nginx on 8080..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "✓ Nginx started (PID: $NGINX_PID)"

# Give nginx a moment to start
sleep 1

# Create database tables before seed/generate scripts
cd /app
echo "Creating database tables..."
python -c "from backend.app import database, models; models.Base.metadata.create_all(bind=database.engine)" || true
echo "✓ Database tables created/verified"

# Initialize database (idempotent; safe to skip on failure)
echo "Seeding metrics..."
python -m backend.app.seed_metrics || true
echo "✓ Metrics seeded"

echo "Generating test data..."
python -m backend.app.generate_data || true
echo "✓ Test data generated"

# Start backend API (foreground)
echo "Starting FastAPI backend on port 8000..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
