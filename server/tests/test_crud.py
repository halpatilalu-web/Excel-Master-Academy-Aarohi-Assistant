"""The generic per-user document store: CRUD, limits, validation, isolation."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_get_update_delete(guest: TestClient) -> None:
    created = guest.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1})
    assert created.status_code == 201
    assert created.json()["chapter"] == 1
    assert created.json()["_created"] and created.json()["_updated"]

    assert guest.get("/api/c/progress/chapter-1").json()["chapter"] == 1

    updated = guest.put("/api/c/progress/chapter-1", json={"id": "chapter-1", "chapter": 2})
    assert updated.status_code == 200
    assert updated.json()["chapter"] == 2
    assert updated.json()["id"] == "chapter-1"

    assert guest.delete("/api/c/progress/chapter-1").status_code == 204
    assert guest.get("/api/c/progress/chapter-1").status_code == 404
    assert guest.delete("/api/c/progress/chapter-1").status_code == 404


def test_server_assigns_an_id_when_absent(guest: TestClient) -> None:
    created = guest.post("/api/c/exams", json={"score": 12})
    assert created.status_code == 201
    assert len(created.json()["id"]) == 32


def test_duplicate_id_is_a_conflict(guest: TestClient) -> None:
    assert guest.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1}).status_code == 201
    assert guest.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1}).status_code == 409


def test_managed_fields_cannot_be_overwritten(guest: TestClient) -> None:
    guest.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1, "_created": 0, "_updated": 0})
    doc = guest.get("/api/c/progress/chapter-1").json()
    assert doc["_created"] != 0 and doc["_updated"] != 0


def test_oversized_document_is_rejected(guest: TestClient) -> None:
    assert guest.post("/api/c/progress", json={"id": "big", "chapter": 1, "blob": "x" * 70_000}).status_code == 413


def test_reserved_and_invalid_collections_are_rejected(guest: TestClient) -> None:
    assert guest.post("/api/c/_uploads", json={"id": "a"}).status_code == 400
    assert guest.post("/api/c/bad name", json={"id": "a"}).status_code == 400
    assert guest.post("/api/c/" + "a" * 65, json={"id": "a"}).status_code == 400


def test_document_ids_are_validated(guest: TestClient) -> None:
    assert guest.post("/api/c/progress", json={"id": "z" * 5000, "chapter": 1}).status_code == 400
    assert guest.post("/api/c/progress", json={"id": "has space", "chapter": 1}).status_code == 400
    assert guest.get("/api/c/progress/bad%20id").status_code == 400


def test_sort_and_limit_are_validated(guest: TestClient) -> None:
    assert guest.get("/api/c/progress?sort=body").status_code == 400
    assert guest.get("/api/c/progress?limit=0").status_code == 422
    assert guest.get("/api/c/progress?limit=5000").status_code == 422
    assert guest.get("/api/c/progress?sort=created&limit=1").status_code == 200


def test_listing_is_newest_first_by_default(guest: TestClient) -> None:
    for chapter in (1, 2, 3):
        assert guest.post("/api/c/progress", json={"id": f"chapter-{chapter}", "chapter": chapter}).status_code == 201
    chapters = [doc["chapter"] for doc in guest.get("/api/c/progress").json()]
    assert chapters == [3, 2, 1]


def test_export_contains_every_collection(guest: TestClient) -> None:
    guest.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1})
    guest.post("/api/c/exams", json={"id": "attempt-1", "pct": 80})
    payload = guest.get("/api/export").json()
    assert set(payload["collections"]) == {"progress", "exams"}
    assert payload["collections"]["exams"][0]["pct"] == 80


def test_documents_are_private_to_their_owner(client: TestClient) -> None:
    owner = TestClient(client.app)
    owner.post("/api/auth/guest")
    stranger = TestClient(client.app)
    stranger.post("/api/auth/guest")

    assert owner.post("/api/c/progress", json={"id": "chapter-1", "chapter": 1}).status_code == 201
    assert stranger.get("/api/c/progress/chapter-1").status_code == 404
    assert stranger.put("/api/c/progress/chapter-1", json={"chapter": 9}).status_code == 404
    assert stranger.delete("/api/c/progress/chapter-1").status_code == 404
    assert stranger.get("/api/c/progress").json() == []


def test_authenticated_routes_reject_anonymous_callers(client: TestClient) -> None:
    assert client.get("/api/c/progress").status_code == 401
    assert client.get("/api/export").status_code == 401
    assert client.post("/api/c/progress", json={"id": "x"}).status_code == 401
