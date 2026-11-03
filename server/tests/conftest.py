from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

_TMP = tempfile.mkdtemp(prefix="excel-master-tests-")
os.environ["APP_DB_PATH"] = str(Path(_TMP) / "test.db")
os.environ["DEMO_ENABLED"] = "0"
os.environ.pop("LLM_API_KEY", None)
os.environ.pop("ORVIS_SERVICES", None)

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def guest_client() -> TestClient:
    """A TestClient with its own guest cookie. Caller should use it as a context manager."""
    return TestClient(app)
