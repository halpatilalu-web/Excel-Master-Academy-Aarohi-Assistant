"""Regression tests for the security-sensitive parts of the app server."""

from __future__ import annotations

import hashlib
import os
import sqlite3

from auth import create_user
from db import db
from fastapi.testclient import TestClient
from seed import seed


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_reports_a_broken_database(client: TestClient, tmp_path, monkeypatch) -> None:
    # Point the app at a directory: opening it as a SQLite file fails.
    monkeypatch.setenv("APP_DB_PATH", str(tmp_path))
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json()["status"] == "error"


def test_guest_progress_is_scoped_to_its_owner(client: TestClient) -> None:
    with TestClient(client.app) as second_client:
        assert client.post("/api/auth/guest").status_code == 201
        assert second_client.post("/api/auth/guest").status_code == 201

        assert client.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1}).status_code == 201

        assert [item["chapter"] for item in client.get("/api/c/progress").json()] == [1]
        assert second_client.get("/api/c/progress").json() == []


def test_assistant_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/assistant",
        json={"messages": [{"role": "user", "content": "VLOOKUP samjhao"}]},
    )
    assert response.status_code == 401


def test_assistant_rejects_oversized_conversation(guest: TestClient) -> None:
    response = guest.post(
        "/api/assistant",
        json={"messages": [{"role": "user", "content": "hello"}] * 21},
    )
    assert response.status_code == 422


def test_assistant_errors_do_not_leak_internals(guest: TestClient) -> None:
    response = guest.post("/api/assistant", json={"messages": [{"role": "user", "content": "hi"}]})
    assert response.status_code == 502
    detail = response.json()["detail"]
    assert "Error" not in detail and "Orvis" not in detail
    assert "Aarohi" in detail


def test_spa_fallback_does_not_serve_server_files(client: TestClient) -> None:
    response = client.get("/%2e%2e/server/auth.py")
    assert "Demo-grade auth" not in response.text
    assert "MIN_PASSWORD" not in response.text


def test_demo_account_is_not_created_by_default(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@example.com", "password": "demo1234"},
    )
    assert response.status_code == 401


def test_legacy_default_demo_password_is_rotated(client: TestClient) -> None:
    with db() as conn:
        create_user(conn, "demo@example.com", "demo1234")

    report = seed()
    assert report["legacy_demo_password_rotated"] is True

    response = client.post(
        "/api/auth/login",
        json={"email": "demo@example.com", "password": "demo1234"},
    )
    assert response.status_code == 401


def test_weak_password_and_invalid_email_are_rejected(client: TestClient) -> None:
    weak = client.post(
        "/api/auth/signup",
        json={"email": "student@example.com", "password": "short"},
    )
    assert weak.status_code == 400

    invalid = client.post(
        "/api/auth/signup",
        json={"email": "not-an-email", "password": "long-enough-password"},
    )
    assert invalid.status_code == 400


def test_session_token_is_hashed_at_rest(guest: TestClient) -> None:
    raw_token = guest.cookies.get("sid")
    assert raw_token

    conn = sqlite3.connect(os.environ["APP_DB_PATH"])
    try:
        stored = {row[0] for row in conn.execute("SELECT token FROM sessions")}
    finally:
        conn.close()

    assert raw_token not in stored
    assert hashlib.sha256(raw_token.encode()).hexdigest() in stored


def test_assistant_builtin_bilingual_reply(guest: TestClient) -> None:
    response = guest.post(
        "/api/assistant",
        json={"messages": [{"role": "user", "content": "XLOOKUP samjhao"}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "XLOOKUP" in body["reply"]
    assert body["source"] == "builtin"


def test_assistant_uses_gemini_when_a_key_is_configured(guest: TestClient, monkeypatch) -> None:
    """With GEMINI_API_KEY set, the reply must come from Gemini — and the request
    must look like Gemini's API, not OpenAI's. No real network call is made."""
    import json as _json

    import assistant as assistant_module

    seen: dict = {}

    class _Response:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self):
            return _json.dumps(
                {"candidates": [{"content": {"parts": [{"text": "Gemini ka jawab: =XLOOKUP(...)"}]}}]}
            ).encode()

    def fake_urlopen(request, timeout=0):
        seen["url"] = request.full_url
        seen["headers"] = dict(request.header_items())
        seen["body"] = _json.loads(request.data)
        return _Response()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(assistant_module.urllib.request, "urlopen", fake_urlopen)

    response = guest.post(
        "/api/assistant",
        json={
            "messages": [
                {"role": "user", "content": "VLOOKUP samjhao"},
                {"role": "assistant", "content": "Ye raha…"},
                {"role": "user", "content": "iska #N/A kyun aaya"},
            ]
        },
    )

    assert response.status_code == 200
    assert response.json() == {"reply": "Gemini ka jawab: =XLOOKUP(...)", "source": "gemini"}
    assert "generateContent" in seen["url"]
    assert "test-key" in str(seen["headers"])
    # The system prompt is sent as instructions, and the transcript keeps order.
    assert "Aarohi" in seen["body"]["systemInstruction"]["parts"][0]["text"]
    assert [c["role"] for c in seen["body"]["contents"]] == ["user", "model", "user"]


def test_assistant_falls_back_to_builtin_when_gemini_fails(guest: TestClient, monkeypatch) -> None:
    """A provider outage must not empty the chat: the built-in tutor answers."""
    import assistant as assistant_module

    def boom(*_args, **_kwargs):
        raise OSError("network down")

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(assistant_module.urllib.request, "urlopen", boom)

    response = guest.post("/api/assistant", json={"messages": [{"role": "user", "content": "XLOOKUP samjhao"}]})
    assert response.status_code == 200
    assert response.json()["source"] == "builtin"
    assert "XLOOKUP" in response.json()["reply"]


def test_security_headers_are_set(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "same-origin"
    assert response.headers["Cache-Control"] == "no-store"
