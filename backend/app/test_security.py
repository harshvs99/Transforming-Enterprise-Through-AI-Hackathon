import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_cors_policy(self):
        # Testing if wildcard origin is used with credentials
        response = self.client.options(
            "/query",
            headers={
                "Origin": "https://evil.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        # If it's insecure, it might return "*" or "https://evil.com" even if not allowed
        # But specifically, allow_origins=["*"] with allow_credentials=True is the concern
        # In current state, it returns Access-Control-Allow-Origin: *
        origin = response.headers.get("Access-Control-Allow-Origin")
        credentials = response.headers.get("Access-Control-Allow-Credentials")

        # We want to ensure that if credentials are true, origin is not *
        if credentials == "true":
            self.assertNotEqual(origin, "*", "CORS policy should not allow wildcard origin with credentials")

    def test_security_headers(self):
        response = self.client.get("/tools")
        self.assertIn("X-Frame-Options", response.headers)
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertIn("X-Content-Type-Options", response.headers)
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertIn("Strict-Transport-Security", response.headers)

    def test_input_validation_length(self):
        # Test very long question to see if it's rejected (DoS protection)
        long_question = "a" * 10001
        response = self.client.post("/query", json={"question": long_question})
        self.assertEqual(response.status_code, 422, "Long queries should be rejected with 422 Unprocessable Entity")

if __name__ == "__main__":
    unittest.main()
