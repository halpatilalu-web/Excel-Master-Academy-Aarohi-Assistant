"""The platform-service helpers that are easy to break: order lookup and
per-conversation chat history. Both are plain SQL against the document store, so
they are tested without an Orvis connection."""

from __future__ import annotations

import json
import uuid

from db import db, now
from services.ai import _rows
from services.payments import _find_by_order

OWNER = "owner-1"


def _insert(conn, col: str, doc_id: str, body: dict, created: float) -> None:
    conn.execute(
        "INSERT INTO docs (col, id, owner, body, created, updated) VALUES (?,?,?,?,?,?)",
        (col, doc_id, OWNER, json.dumps(body), created, created),
    )


def test_order_lookup_finds_orders_beyond_the_500_newest(client) -> None:
    """An order older than the 500 newest rows must still settle (it used to be
    silently ignored by the webhook, leaving a paid order at `created`)."""
    base = now()
    with db() as conn:
        _insert(conn, "_payments", "old-order", {"order_id": "order_old", "status": "created"}, base)
        for index in range(600):
            _insert(conn, "_payments", f"filler-{index}", {"order_id": f"order_{index}", "status": "created"}, base + index / 1000)

    with db() as conn:
        found = _find_by_order(conn, "order_old")
    assert found is not None
    owner, doc_id, record = found
    assert (owner, doc_id) == (OWNER, "old-order")
    assert record["status"] == "created"


def test_order_lookup_is_scoped_to_the_owner_when_asked(client) -> None:
    with db() as conn:
        _insert(conn, "_payments", "doc-1", {"order_id": "order_abc", "status": "created"}, now())
    with db() as conn:
        assert _find_by_order(conn, "order_abc", owner=OWNER) is not None
        assert _find_by_order(conn, "order_abc", owner="someone-else") is None
        assert _find_by_order(conn, "order_missing") is None


def test_chat_history_is_scoped_to_one_conversation(client) -> None:
    """The conversation filter runs in SQL, so a busy account cannot push an
    older conversation out of the model's context window."""
    base = now()
    with db() as conn:
        _insert(conn, "chat_messages", "keep-1", {"conversation_id": "exam-prep", "role": "user", "content": "VLOOKUP batao"}, base)
        _insert(conn, "chat_messages", "keep-2", {"conversation_id": "exam-prep", "role": "assistant", "content": "Ye raha"}, base + 1)
        for index in range(120):
            _insert(conn, "chat_messages", f"other-{index}", {"conversation_id": "other", "role": "user", "content": f"m{index}"}, base + 2 + index)

    with db() as conn:
        messages = _rows(conn, OWNER, "exam-prep", 20)
    assert [m["conversation_id"] for m in messages] == ["exam-prep", "exam-prep"]
    assert [m["role"] for m in messages] == ["user", "assistant"]


def test_chat_history_defaults_to_the_default_conversation(client) -> None:
    with db() as conn:
        _insert(conn, "chat_messages", "legacy", {"role": "user", "content": "old message without a conversation id"}, now())
    with db() as conn:
        assert [m["content"] for m in _rows(conn, OWNER, "default", 10)] == ["old message without a conversation id"]


def test_upload_ownership_check_accepts_only_the_users_prefix(client) -> None:
    from services.uploads import _owned

    own = {"key": f"u/{OWNER}/{uuid.uuid4().hex[:12]}-notes.csv"}
    assert _owned(OWNER, "anything", own) is True
    assert _owned(OWNER, "anything", {"key": f"u/someone-else/{uuid.uuid4().hex[:12]}-notes.csv"}) is False
    assert _owned(OWNER, "anything", {"key": f"u/{OWNER}/../other/file.csv"}) is False
    assert _owned(OWNER, "anything", {"key": ""}) is False
