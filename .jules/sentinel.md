# Sentinel Security Journal 🛡️

This journal tracks critical security learnings, discovered vulnerability patterns, and architectural security gaps in the Thinking Machines project.

## 2025-05-19 - [Permissive CORS and Missing Input Validation]
**Vulnerability:** The API was configured with `allow_origins=["*"]` and lacked input length constraints on query endpoints, posing CSRF and DoS risks.
**Learning:** Prototype applications often prioritize developer experience (DX) over security by opening CORS and omitting validation, but these can easily persist into production-like environments (Docker/Cloud Run).
**Prevention:** Always use environment-aware CORS configurations and enforce Pydantic `Field` constraints on all user-facing request models.
