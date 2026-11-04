"""Auth lifecycle: signup, login, sessions, guest upgrade, password change,
account deletion and the throttles that protect them."""

from __future__ import annotations

from auth import COOKIE
from db import db, now
from fastapi.testclient import TestClient

STRONG = "long-enough-password"


def test_signup_login_me_logout(client: TestClient) -> None:
    created = client.post("/api/auth/signup", json={"email": "Student@Example.com", "password": STRONG})
    assert created.status_code == 201
    assert created.json()["email"] == "student@example.com"  # normalised
    assert created.json()["token"]

    assert client.get("/api/auth/me").json()["email"] == "student@example.com"
    assert client.post("/api/auth/logout").status_code == 200
    assert client.cookies.get(COOKIE) in (None, "")
    assert client.get("/api/auth/me").status_code == 401


def test_signup_rejects_duplicate_email(client: TestClient) -> None:
    assert client.post("/api/auth/signup", json={"email": "dup@example.com", "password": STRONG}).status_code == 201
    duplicate = client.post("/api/auth/signup", json={"email": "dup@example.com", "password": STRONG})
    assert duplicate.status_code == 409


def test_login_rejects_wrong_password(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "pw@example.com", "password": STRONG})
    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"email": "pw@example.com", "password": "nope-nope-nope"}).status_code == 401


def test_bearer_token_is_accepted(client: TestClient) -> None:
    token = client.post("/api/auth/signup", json={"email": "bearer@example.com", "password": STRONG}).json()["token"]
    client.cookies.clear()
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "bearer@example.com"


def test_expired_session_is_rejected_and_purged(client: TestClient) -> None:
    client.post("/api/auth/guest")
    with db() as conn:
        conn.execute("UPDATE sessions SET expires = ?", (now() - 1,))
        token_hash = conn.execute("SELECT token FROM sessions").fetchone()["token"]
    assert client.get("/api/auth/me").status_code == 401
    with db() as conn:
        assert conn.execute("SELECT 1 FROM sessions WHERE token = ?", (token_hash,)).fetchone() is None


def test_guest_can_upgrade_without_losing_data(guest: TestClient) -> None:
    assert guest.post("/api/c/progress", json={"id": "chapter-3", "chapter": 3}).status_code == 201

    upgraded = guest.post("/api/auth/upgrade", json={"email": "upgraded@example.com", "password": STRONG})
    assert upgraded.status_code == 200
    assert upgraded.json()["provider"] == "password"

    # Same session, same rows.
    assert guest.get("/api/auth/me").json()["email"] == "upgraded@example.com"
    assert [d["chapter"] for d in guest.get("/api/c/progress").json()] == [3]

    # And the new credentials work in a fresh session.
    guest.post("/api/auth/logout")
    assert guest.post("/api/auth/login", json={"email": "upgraded@example.com", "password": STRONG}).status_code == 200


def test_upgrade_rejects_taken_email_and_non_guests(guest: TestClient) -> None:
    existing = TestClient(guest.app)
    assert existing.post("/api/auth/signup", json={"email": "taken@example.com", "password": STRONG}).status_code == 201
    assert guest.post("/api/auth/upgrade", json={"email": "taken@example.com", "password": STRONG}).status_code == 409

    # A real (non-guest) account has nothing to upgrade.
    again = existing.post("/api/auth/upgrade", json={"email": "new@example.com", "password": STRONG})
    assert again.status_code == 400


def test_password_change_revokes_other_sessions(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "rotate@example.com", "password": STRONG})
    other = TestClient(client.app)
    assert other.post("/api/auth/login", json={"email": "rotate@example.com", "password": STRONG}).status_code == 200

    wrong = client.post("/api/auth/password", json={"current": "wrong-password", "new": "brand-new-password"})
    assert wrong.status_code == 401

    ok = client.post("/api/auth/password", json={"current": STRONG, "new": "brand-new-password"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200      # this session survives
    assert other.get("/api/auth/me").status_code == 401       # the other one does not


def test_account_deletion_removes_data_and_sessions(guest: TestClient) -> None:
    guest.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1})
    assert guest.delete("/api/auth/account").status_code == 204
    assert guest.get("/api/auth/me").status_code == 401
    with db() as conn:
        assert conn.execute("SELECT COUNT(*) AS n FROM docs").fetchone()["n"] == 0
        assert conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"] == 0


def test_login_throttle_blocks_after_five_failures(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "throttle@example.com", "password": STRONG})
    client.post("/api/auth/logout")
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": "throttle@example.com", "password": "bad-password"}).status_code == 401
    blocked = client.post("/api/auth/login", json={"email": "throttle@example.com", "password": STRONG})
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"].isdigit()


def test_login_throttle_is_per_email_not_per_network(client: TestClient) -> None:
    """A classroom behind one NAT IP must not lock out other students."""
    client.post("/api/auth/signup", json={"email": "first@example.com", "password": STRONG})
    for _ in range(5):
        client.post("/api/auth/login", json={"email": "first@example.com", "password": "bad-password"})
    assert client.post("/api/auth/login", json={"email": "first@example.com", "password": STRONG}).status_code == 429

    other_student = TestClient(client.app)
    assert other_student.post("/api/auth/login", json={"email": "second@example.com", "password": "bad-password"}).status_code == 401
    assert other_student.post("/api/auth/login", json={"email": "second@example.com", "password": STRONG}).status_code == 401


def test_successful_login_clears_the_failure_bucket(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"email": "clears@example.com", "password": STRONG})
    client.post("/api/auth/logout")
    for _ in range(4):
        client.post("/api/auth/login", json={"email": "clears@example.com", "password": "bad-password"})
    assert client.post("/api/auth/login", json={"email": "clears@example.com", "password": STRONG}).status_code == 200
    client.post("/api/auth/logout")
    # Five more failures are allowed again because the bucket was reset.
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": "clears@example.com", "password": "bad-password"}).status_code == 401


def test_guest_and_signup_are_rate_limited_per_ip(client: TestClient) -> None:
    for _ in range(10):
        assert client.post("/api/auth/guest").status_code == 201
    assert client.post("/api/auth/guest").status_code == 429

    for index in range(5):
        response = client.post("/api/auth/signup", json={"email": f"bulk{index}@example.com", "password": STRONG})
        assert response.status_code == 201
    assert client.post("/api/auth/signup", json={"email": "bulk-final@example.com", "password": STRONG}).status_code == 429


def test_password_change_is_rate_limited(guest: TestClient) -> None:
    guest.post("/api/auth/upgrade", json={"email": "limited@example.com", "password": STRONG})
    for _ in range(5):
        assert guest.post("/api/auth/password", json={"current": "wrong-password", "new": "another-password"}).status_code == 401
    assert guest.post("/api/auth/password", json={"current": STRONG, "new": "another-password"}).status_code == 429
