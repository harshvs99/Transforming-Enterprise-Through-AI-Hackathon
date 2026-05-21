## 2025-05-20 - [Environment-Aware CORS Origins]
**Vulnerability:** Use of wildcard origins (`allow_origins=["*"]`) in CORSMiddleware.
**Learning:** Hardcoding `*` allows any domain to make cross-origin requests, which is risky for B2B SaaS platforms.
**Prevention:** Always use an environment variable for allowed origins and default to specific local origins for development.
