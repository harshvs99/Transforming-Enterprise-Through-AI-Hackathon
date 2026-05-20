## 2025-05-22 - [Environment-aware CORS]
**Vulnerability:** Permissive CORS policy (`allow_origins=["*"]`) allowed any domain to interact with the API, increasing the risk of cross-site request forgery and unauthorized data access if session tokens were present (though `allow_credentials` was `False`).
**Learning:** Development-friendly defaults often compromise security in production environments.
**Prevention:** Use environment variables to strictly define allowed origins and default to a restrictive policy.
