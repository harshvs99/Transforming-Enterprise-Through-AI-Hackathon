user www-data;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                  '$status $body_bytes_sent "$http_referer" '
                  '"$http_user_agent" "$http_x_forwarded_for"';

  access_log /var/log/nginx/access.log main;

  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;
  client_max_body_size 20M;

  upstream backend  { server localhost:8000; }
  upstream frontend { server localhost:3000; }

  server {
    listen ${PORT} default_server;
    listen [::]:${PORT} default_server;
    server_name _;

    # SSE stream — must not buffer
    location /api/funnel/stream {
      proxy_pass http://backend/funnel/stream;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 3600s;
      add_header X-Accel-Buffering no always;
    }

    # API → FastAPI. Trailing slash on proxy_pass strips the /api/ prefix:
    #   /api/funnel  →  http://localhost:8000/funnel
    location /api/ {
      proxy_pass http://backend/;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_buffering off;
      proxy_read_timeout 300s;
      proxy_connect_timeout 300s;
      proxy_send_timeout 300s;
    }

    # Everything else → Next.js. Next owns routing, _next/*, static assets,
    # and 404. Do NOT add try_files or .html rules here.
    location / {
      proxy_pass http://frontend;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_read_timeout 60s;
    }
  }
}
