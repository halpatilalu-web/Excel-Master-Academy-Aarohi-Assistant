from __future__ import annotations

import hashlib
import os
import sqlite3

from fastapi.testclient import TestClient

from auth import create_user
from conftest import guest_client
from db import db
from main import app
from seed import seed


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_guest_progress_is_scoped_to_its_owner() -> None:
    with guest_client() as first, guest_client() as second:
        assert first.post("/api/auth/guest").status_code == 201
        assert second.post("/api/auth/guest").status_code == 201

        created = first.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1})
        assert created.status_code == 201

        first_items = first.get("/api/c/progress")
        second_items = second.get("/api/c/progress")
        assert first_items.status_code == 200
        assert second_items.status_code == 200
        assert [item["chapter"] for item in first_items.json()] == [1]
        assert second_items.json() == []


def test_assistant_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/assistant",
        json={"messages": [{"role": "user", "content": "VLOOKUP samjhao"}]},
    )
    assert response.status_code == 401


def test_assistant_rejects_oversized_conversation() -> None:
    with guest_client() as guest:
        assert guest.post("/api/auth/guest").status_code == 201
        response = guest.post(
            "/api/assistant",
            json={"messages": [{"role": "user", "content": "hello"}] * 21},
        )
        assert response.status_code == 422


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


def test_session_token_is_hashed_at_rest() -> None:
    with guest_client() as guest:
        assert guest.post("/api/auth/guest").status_code == 201
        raw_token = guest.cookies.get("sid")
        assert raw_token

        conn = sqlite3.connect(os.environ["APP_DB_PATH"])
        try:
            stored = {row[0] for row in conn.execute("SELECT token FROM sessions")}
        finally:
            conn.close()

        assert raw_token not in stored
        assert hashlib.sha256(raw_token.encode()).hexdigest() in stored


def test_assistant_builtin_bilingual_reply() -> None:
    with guest_client() as guest:
        assert guest.post("/api/auth/guest").status_code == 201
        response = guest.post(
            "/api/assistant",
            json={"messages": [{"role": "user", "content": "XLOOKUP samjhao"}]},
        )
        assert response.status_code == 200
        body = response.json()
        assert "XLOOKUP" in body["reply"]
        assert body["source"] == "builtin"

