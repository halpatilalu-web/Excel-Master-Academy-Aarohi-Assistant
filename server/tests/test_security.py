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


def test_security_headers_are_set(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "same-origin"
    assert response.headers["Cache-Control"] == "no-store"
