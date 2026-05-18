// Centralized API base URL. In production (Docker/nginx) the frontend is served
// from the same origin as the backend proxy under `/api/*`. For local `next dev`
// without nginx, set NEXT_PUBLIC_API_URL=http://localhost:8000 to call FastAPI
// directly (CORS is open on the backend).
const RAW = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (RAW) {
    // Strip a leading /api when pointing directly at FastAPI (no nginx).
    return `${RAW}${p.replace(/^\/api/, "")}`;
  }
  return p; // relative — nginx proxies /api/* to backend
}
