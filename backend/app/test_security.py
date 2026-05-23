from fastapi.testclient import TestClient
from backend.app.main import app
import pytest

client = TestClient(app)

def test_cors_header():
    # Test allowed origin
    response = client.options(
        "/query",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # Test disallowed origin
    response = client.options(
        "/query",
        headers={
            "Origin": "http://malicious.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # FastAPI/Starlette CORSMiddleware returns 200 but without the CORS headers if origin not allowed
    assert response.headers.get("access-control-allow-origin") is None

def test_input_length_validation():
    # Test valid length
    # We need to mock dependencies if we want to run the full pipeline,
    # but here we just want to see if Pydantic validation kicks in.
    # Actually, process_query will fail later due to DB, but validation happens first.

    long_question = "a" * 501
    response = client.post("/query", json={"question": long_question})
    assert response.status_code == 422
    assert "length" in response.text.lower()

    valid_question = "What is CAC?"
    # This might still fail with 500 or 404 because of DB, but it shouldn't be a 422 for length
    response = client.post("/query", json={"question": valid_question})
    assert response.status_code != 422
