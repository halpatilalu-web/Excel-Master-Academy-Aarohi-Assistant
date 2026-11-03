"""Generic per-user JSON document store.

    GET    /api/c/{col}?sort=-updated&limit=200   list
    POST   /api/c/{col}                            create (id assigned if absent) → 201
    GET    /api/c/{col}/{id}
    PUT    /api/c/{col}/{id}                       full replace of the body
    DELETE /api/c/{col}/{id}                       → 204
    GET    /api/export                             every collection of the signed-in user

Every route requires a signed-in user and only ever touches that user's rows.
Documents are free-form JSON objects; `id`, `_created`, `_updated` are managed
by the server and returned on every document.

Collection names starting with ``_`` are RESERVED for the platform services
(``_uploads``, ``_payments``, …): their rows are written only by server code
(``services/*.py``) and read through those services' own routes. /api/c refuses
them outright — a hand-written ``_uploads`` row could point at another user's
storage key, a hand-written ``_payments`` row could pose as a paid order.
/api/export still includes the signed-in user's own reserved rows (read-only).
"""

from __future__ import annotations

import json
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from auth import current_user
from db import db, now

router = APIRouter(prefix="/api")

_MAX_BODY_CHARS = 64_000
_COL_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_SORTABLE = {"updated", "created"}
_MANAGED = ("id", "_created", "_updated")


def _check_col(col: str) -> None:
    if not _COL_RE.match(col):
        raise HTTPException(400, "collection name: letters, digits, _ and - only")
    if col.startswith("_"):
        raise HTTPException(400, "collection names starting with _ are reserved")


def _dump(body: dict[str, Any]) -> str:
    for k in _MANAGED:
        body.pop(k, None)
    s = json.dumps(body, separators=(",", ":"), default=str)
    if len(s) > _MAX_BODY_CHARS:
        raise HTTPException(413, "document too large")
    return s


def _doc(row) -> dict[str, Any]:
    d = json.loads(row["body"])
    d["id"] = row["id"]
    d["_created"] = row["created"]
    d["_updated"] = row["updated"]
    return d


def _get(conn, user: dict, col: str, doc_id: str):
    row = conn.execute(
        "SELECT * FROM docs WHERE owner = ? AND col = ? AND id = ?",
        (user["id"], col, doc_id),
    ).fetchone()
    if row is None:
        raise HTTPException(404, "not found")
    return row


@router.get("/c/{col}")
def list_docs(
    col: str,
    sort: str = "-updated",
    limit: int = Query(200, ge=1, le=1000),
    user: dict = Depends(current_user),
) -> list[dict[str, Any]]:
    _check_col(col)
    desc = sort.startswith("-")
    field = sort.lstrip("-")
    if field not in _SORTABLE:
        raise HTTPException(400, f"sort must be one of {sorted(_SORTABLE)} (prefix - for descending)")
    with db() as conn:
        rows = conn.execute(
            f"SELECT * FROM docs WHERE owner = ? AND col = ? "
            f"ORDER BY {field} {'DESC' if desc else 'ASC'}, rowid {'DESC' if desc else 'ASC'} LIMIT ?",
            (user["id"], col, limit),
        ).fetchall()
    return [_doc(r) for r in rows]


@router.post("/c/{col}", status_code=201)
def create_doc(col: str, body: dict[str, Any], user: dict = Depends(current_user)) -> dict[str, Any]:
    _check_col(col)
    doc_id = str(body.get("id") or uuid.uuid4().hex)
    payload = _dump(dict(body))
    t = now()
    with db() as conn:
        if conn.execute(
            "SELECT 1 FROM docs WHERE owner = ? AND col = ? AND id = ?", (user["id"], col, doc_id)
        ).fetchone():
            raise HTTPException(409, "a document with that id already exists")
        conn.execute(
            "INSERT INTO docs (col, id, owner, body, created, updated) VALUES (?,?,?,?,?,?)",
            (col, doc_id, user["id"], payload, t, t),
        )
        row = _get(conn, user, col, doc_id)
    return _doc(row)


@router.get("/c/{col}/{doc_id}")
def get_doc(col: str, doc_id: str, user: dict = Depends(current_user)) -> dict[str, Any]:
    _check_col(col)
    with db() as conn:
        return _doc(_get(conn, user, col, doc_id))


@router.put("/c/{col}/{doc_id}")
def put_doc(col: str, doc_id: str, body: dict[str, Any], user: dict = Depends(current_user)) -> dict[str, Any]:
    _check_col(col)
    payload = _dump(dict(body))
    with db() as conn:
        cur = conn.execute(
            "UPDATE docs SET body = ?, updated = ? WHERE owner = ? AND col = ? AND id = ?",
            (payload, now(), user["id"], col, doc_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "not found")
        return _doc(_get(conn, user, col, doc_id))


@router.delete("/c/{col}/{doc_id}", status_code=204)
def delete_doc(col: str, doc_id: str, user: dict = Depends(current_user)) -> Response:
    _check_col(col)
    with db() as conn:
        cur = conn.execute(
            "DELETE FROM docs WHERE owner = ? AND col = ? AND id = ?", (user["id"], col, doc_id)
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "not found")
    return Response(status_code=204)


@router.get("/export")
def export_all(user: dict = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM docs WHERE owner = ? ORDER BY col, created, rowid", (user["id"],)
        ).fetchall()
    collections: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        collections.setdefault(r["col"], []).append(_doc(r))
    return {"exported": now(), "user": user["email"], "collections": collections}
