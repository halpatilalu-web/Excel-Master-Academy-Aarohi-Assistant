"""First-start seeding.

* Optional demo account: created only when DEMO_ENABLED=1 and a strong
  DEMO_PASSWORD is supplied by the operator. There is no default password.
* If server/seed.json exists, its documents are inserted for the demo account:

    {"collections": {"transactions": [{"amount": 250, "note": "Books"}, ...]}}

  A collection is seeded only while it is empty for that user, so restarts
  don't duplicate rows. Documents without `id` get seed-1, seed-2, ...
"""

from __future__ import annotations

import hmac
import json
import os
import secrets
from pathlib import Path

from auth import _hash, create_user
from db import db, now

SEED_PATH = Path(os.environ.get("APP_SEED_PATH") or Path(__file__).resolve().parent / "seed.json")


def _demo_enabled() -> bool:
    return os.environ.get("DEMO_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}


def _rotate_legacy_demo_password(report: dict) -> None:
    """Neutralise the old publicly-known demo credential in existing databases."""
    report["legacy_demo_password_rotated"] = False
    demo_email = os.environ.get("DEMO_EMAIL", "demo@example.com").strip().lower()
    with db() as conn:
        row = conn.execute(
            "SELECT id, pw_hash, salt FROM users WHERE email = ?", (demo_email,)
        ).fetchone()
        if row is None or not row["pw_hash"]:
            return
        if not hmac.compare_digest(_hash("demo1234", bytes(row["salt"])), bytes(row["pw_hash"])):
            return
        salt = secrets.token_bytes(16)
        conn.execute(
            "UPDATE users SET pw_hash = ?, salt = ? WHERE id = ?",
            (_hash(secrets.token_urlsafe(32), salt), salt, row["id"]),
        )
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (row["id"],))
        report["legacy_demo_password_rotated"] = True


def seed() -> dict:
    report: dict = {"demo_user_created": False, "collections_seeded": []}
    if not _demo_enabled():
        _rotate_legacy_demo_password(report)
        report["demo"] = "disabled"
        return report

    demo_email = os.environ.get("DEMO_EMAIL", "demo@example.com").strip().lower()
    demo_password = os.environ.get("DEMO_PASSWORD", "")
    if len(demo_password) < 8:
        report["seed_error"] = "DEMO_ENABLED=1 requires DEMO_PASSWORD with at least 8 characters"
        return report

    with db() as conn:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (demo_email,)).fetchone()
        if row is not None:
            uid = row["id"]
        elif conn.execute("SELECT 1 FROM users LIMIT 1").fetchone() is None:
            uid = create_user(conn, demo_email, demo_password)
            report["demo_user_created"] = True
        else:
            return report  # real users exist and no demo account — leave it that way

        if not SEED_PATH.exists():
            return report
        try:
            data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            report["seed_error"] = f"seed.json is not valid JSON: {exc}"
            return report

        for col, docs in (data.get("collections") or {}).items():
            if not isinstance(docs, list):
                continue
            if conn.execute(
                "SELECT 1 FROM docs WHERE owner = ? AND col = ? LIMIT 1", (uid, col)
            ).fetchone():
                continue
            t = now()
            for i, doc in enumerate(docs, start=1):
                if not isinstance(doc, dict):
                    continue
                doc = dict(doc)
                doc_id = str(doc.pop("id", "") or f"seed-{i}")
                for k in ("_created", "_updated"):
                    doc.pop(k, None)
                # Stagger timestamps by 1ms so `sort=created` returns seed order.
                ts = t + i / 1000.0
                conn.execute(
                    "INSERT OR IGNORE INTO docs (col, id, owner, body, created, updated) "
                    "VALUES (?,?,?,?,?,?)",
                    (col, doc_id, uid, json.dumps(doc, default=str), ts, ts),
                )
            report["collections_seeded"].append(col)
    return report
