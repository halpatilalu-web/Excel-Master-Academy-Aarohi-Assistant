"""SQLite storage for the template server — users, sessions and a generic
per-user document store. Stdlib only.

DB file: server/data.db (override with APP_DB_PATH, e.g. in tests). WAL mode
so the dev server and a seed/inspection script can read concurrently.
"""

from __future__ import annotations

import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id       TEXT PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  pw_hash  BLOB NOT NULL,
  salt     BLOB NOT NULL,
  created  REAL NOT NULL,
  name     TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'password',
  picture  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sessions (
  token    TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL,
  created  REAL NOT NULL,
  expires  REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
-- One row per document. Keyed per owner so two users can reuse the same
-- client-side id without colliding or learning of each other's documents.
CREATE TABLE IF NOT EXISTS docs (
  col      TEXT NOT NULL,
  id       TEXT NOT NULL,
  owner    TEXT NOT NULL,
  body     TEXT NOT NULL,
  created  REAL NOT NULL,
  updated  REAL NOT NULL,
  PRIMARY KEY (owner, col, id)
);
"""


def db_path() -> Path:
    return Path(os.environ.get("APP_DB_PATH") or Path(__file__).resolve().parent / "data.db")


def now() -> float:
    return time.time()


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    """One connection per request; commit on success, roll back on error."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create tables if missing. Idempotent; called on every startup."""
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript(_SCHEMA)
        # Databases created before Google login existed lack these two columns.
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
        if "name" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        if "provider" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'password'")
        if "picture" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN picture TEXT NOT NULL DEFAULT ''")
