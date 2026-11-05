"""CSRF hardening: cookie-authenticated mutations must come from this app.

The session cookie is SameSite=None over https, so the app has to do this check
itself. These tests pin the three layers described in main._csrf_blocked.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _post(client: TestClient, headers: dict[str, str]) -> int:
    return client.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1}, headers=headers).status_code


def test_cross_site_request_is_blocked(guest: TestClient) -> None:
    assert _post(guest, {"Sec-Fetch-Site": "cross-site", "Origin": "https://evil.example"}) == 403


def test_foreign_origin_is_blocked_even_when_same_site(guest: TestClient) -> None:
    # Another app on the same platform domain is "same-site", not same-origin.
    assert _post(guest, {"Sec-Fetch-Site": "same-site", "Origin": "https://other-app.onrender.com"}) == 403


def test_foreign_origin_without_sec_fetch_site_is_blocked(guest: TestClient) -> None:
    assert _post(guest, {"Origin": "https://evil.example"}) == 403


def test_foreign_referer_is_blocked(guest: TestClient) -> None:
    assert _post(guest, {"Referer": "https://evil.example/page"}) == 403


def test_own_origin_is_allowed(guest: TestClient) -> None:
    assert _post(guest, {"Sec-Fetch-Site": "same-origin", "Origin": "http://testserver"}) == 201


def test_loopback_origin_is_allowed_for_the_dev_proxy(guest: TestClient) -> None:
    # Vite proxies /api and rewrites Host, so a loopback Origin must still work.
    assert _post(guest, {"Sec-Fetch-Site": "same-origin", "Origin": "http://localhost:5173"}) == 201


def test_https_origin_behind_a_tls_proxy_is_allowed(guest: TestClient) -> None:
    # Regression: TLS ends at Render/a tunnel/the Vite proxy, so the app sees
    # `http` while the browser sends `https`. Comparing schemes 403'd every
    # write made through an https preview URL.
    assert _post(guest, {"Sec-Fetch-Site": "same-origin", "Origin": "https://testserver"}) == 201


def test_preview_host_origin_is_allowed(guest: TestClient) -> None:
    headers = {
        "Host": "5173-abc123.e2b.app",
        "Origin": "https://5173-abc123.e2b.app",
        "Sec-Fetch-Site": "same-origin",
    }
    assert _post(guest, headers) == 201


def test_sibling_subdomain_is_still_blocked_with_the_host_only_check(guest: TestClient) -> None:
    # Only the host is compared now — make sure that did not widen to the domain.
    headers = {"Host": "excel.example.com", "Origin": "https://other.example.com", "Sec-Fetch-Site": "same-site"}
    assert _post(guest, headers) == 403


def test_configured_extra_origin_is_allowed(monkeypatch) -> None:
    import main

    monkeypatch.setattr(main, "_EXTRA_ORIGINS", {"https://cdn.example.com"})

    class _Request:  # only what _same_origin reads
        headers = {"host": "api.example.com"}

    assert main._same_origin(_Request(), "https://cdn.example.com") is True
    assert main._same_origin(_Request(), "https://cdn.evil.com") is False


def test_bearer_clients_are_not_subject_to_the_cookie_check(client: TestClient) -> None:
    token = client.post("/api/auth/guest").json()["token"]
    client.cookies.clear()
    response = client.post(
        "/api/c/progress",
        json={"id": "chapter-2", "chapter": 2},
        headers={"Authorization": f"Bearer {token}", "Origin": "https://app.example"},
    )
    assert response.status_code == 201


def test_reads_are_not_blocked(client: TestClient) -> None:
    assert client.get("/api/health", headers={"Origin": "https://evil.example"}).status_code == 200


def test_unauthenticated_cross_site_post_is_not_a_csrf_target(client: TestClient) -> None:
    # No session cookie: nothing to forge. It must fail as 401, not 403.
    response = client.post(
        "/api/c/progress",
        json={"id": "chapter-1", "chapter": 1},
        headers={"Origin": "https://evil.example"},
    )
    assert response.status_code == 401
