## 2025-05-15 - [API Security Hardening]
**Vulnerability:** Permissive CORS with credentials and missing security headers.
**Learning:** Even modern frameworks like FastAPI require manual configuration of basic security headers (HSTS, CSP, X-Frame-Options) and careful CORS setup to prevent cross-origin attacks when credentials are enabled. Wildcard origins with credentials are a common but dangerous misconfiguration.
**Prevention:** Always use a restricted whitelist for `allow_origins` when `allow_credentials=True` is used. Implement a global middleware to ensure all responses carry standard security headers.
