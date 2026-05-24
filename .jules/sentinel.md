## 2025-05-22 - API Hardening: CORS and Input Validation

**Vulnerability:** The application was using a wildcard `allow_origins=["*"]` for CORS, which is insecure for production as it allows any website to make requests to the API. Additionally, key API endpoints (`/query` and `/investigate`) lacked input length validation, posing a potential Denial of Service (DoS) risk from extremely large payloads.

**Learning:** Protoypes often prioritize "getting it to work" (using wildcards and loose schemas) over security. In FastAPI/Pydantic, it is straightforward to add `max_length` constraints to model fields to enforce basic rate/size limiting at the gateway level.

**Prevention:** Always use environment-aware CORS configurations that default to restricted values. Enforce `max_length` and other structural constraints on all user-facing Pydantic models to ensure the backend only processes reasonably sized inputs.
