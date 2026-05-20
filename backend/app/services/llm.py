"""Thin Gemini wrapper used wherever an LLM is needed.

Reads GEMINI_API_KEY (and optional GEMINI_MODEL) from the environment. If the
key is missing or the SDK call fails, returns None so callers can fall back to
the existing deterministic heuristic — keeping the demo functional offline.
"""
from __future__ import annotations

import os
import logging
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

log = logging.getLogger(__name__)

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        _client = genai
        return _client
    except Exception as e:
        log.warning("Gemini SDK init failed: %s", e)
        return None


def is_enabled() -> bool:
    return _get_client() is not None


def generate(prompt: str, model: str = DEFAULT_MODEL, temperature: float = 0.2) -> Optional[str]:
    client = _get_client()
    if client is None:
        return None
    try:
        m = client.GenerativeModel(model)
        resp = m.generate_content(
            prompt,
            generation_config={"temperature": temperature, "max_output_tokens": 2048},
        )
        return (resp.text or "").strip() or None
    except Exception as e:
        log.warning("Gemini generation failed: %s", e)
        return None


def model_name() -> str:
    return DEFAULT_MODEL if is_enabled() else "deterministic-fallback"
