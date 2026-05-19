# Sentinel Security Journal 🛡️

## 2025-01-24 - API Hardening and Origin Restriction
**Vulnerability:** The API was using wildcard CORS origins (`*`) and lacked basic security headers (X-Frame-Options, HSTS, etc.), alongside missing input length validation on the primary query endpoint.
**Learning:** Default FastAPI configurations are permissive. Hardcoding security settings (like CORS origins) can break environments; using environment variables ensures both security and flexibility. HSTS should be conditional on production to avoid local development friction.
**Prevention:** Always define allowed origins via environment variables and use a standard security header middleware. Use Pydantic's `Field` for all user-facing models to enforce length constraints.
