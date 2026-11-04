from __future__ import annotations

import os
import sys
import tempfile
from collections.abc import Iterator
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

_TMP = tempfile.mkdtemp(prefix="excel-master-tests-")
os.environ["APP_DB_PATH"] = str(Path(_TMP) / "test.db")
os.environ["DEMO_ENABLED"] = "0"
os.environ.pop("LLM_API_KEY", None)
os.environ.pop("ORVIS_SERVICES", None)

import pytest
from assistant import _requests as _assistant_buckets
from auth import _buckets as _auth_buckets
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Throttles are process-wide buckets; no test should inherit another's hits."""
    _auth_buckets.clear()
    _assistant_buckets.clear()
    yield
    _auth_buckets.clear()
    _assistant_buckets.clear()


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """A TestClient with its OWN database, so tests never share state.

    `db.db_path()` reads APP_DB_PATH on every call, so swapping the env var per
    test is enough; the lifespan re-runs init_db + seed for the new file.
    """
    monkeypatch.setenv("APP_DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("DEMO_ENABLED", "0")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("ORVIS_SERVICES", raising=False)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def guest(client: TestClient) -> TestClient:
    """A client already signed in as a fresh guest account."""
    response = client.post("/api/auth/guest")
    assert response.status_code == 201, response.text
    return client
