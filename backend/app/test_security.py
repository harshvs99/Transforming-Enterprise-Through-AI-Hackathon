
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
import os

client = TestClient(app)

def test_cors_origin_validation():
    # Test disallowed origin
    response = client.options("/query", headers={
        "Origin": "http://evil.com",
        "Access-Control-Request-Method": "POST"
    })
    # If it's disallowed, FastAPI/Starlette CORSMiddleware typically won't return
    # the Access-Control-Allow-Origin header or will return a 400/allowed origins.
    # In Starlette, if origin not in allowed, it just doesn't add the CORS headers.
    assert "access-control-allow-origin" not in response.headers

    # Test allowed origin (default is http://localhost:3000)
    response = client.options("/query", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST"
    })
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

def test_query_input_length_validation():
    # Large input should be rejected (limit is 1000)
    long_question = "a" * 1001
    response = client.post("/query", json={"question": long_question})
    assert response.status_code == 422

    # Normal input should pass
    response = client.post("/query", json={"question": "What is CAC?"})
    assert response.status_code == 200

def test_investigate_input_length_validation():
    # Limit for hypothesis_title is 500
    long_text = "a" * 501
    response = client.post("/investigate", json={
        "hypothesis_id": "1",
        "hypothesis_title": long_text,
        "hypothesis_description": "desc",
        "original_question": "q"
    })
    assert response.status_code == 422

    # Normal input should pass (requires data in DB though, so it might 404 if not seeded)
    # But 422 means validation failed. 200/404 means it passed validation.
    response = client.post("/investigate", json={
        "hypothesis_id": "1",
        "hypothesis_title": "Valid title",
        "hypothesis_description": "Valid description",
        "original_question": "Valid question"
    })
    # If not seeded it returns 404
    assert response.status_code in (200, 404)
