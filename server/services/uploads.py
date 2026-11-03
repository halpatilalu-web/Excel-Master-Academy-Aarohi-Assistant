"""``storage`` service — file uploads that persist (Orvis-brokered S3).

    POST   /api/uploads/presign        {filename, content_type, size, visibility?} → {id, key, url, method, headers, expires_in}
    POST   /api/uploads/confirm        {id}                                        → the upload record (status "ready")
    GET    /api/uploads                 the signed-in user's uploads (newest first)
    GET    /api/uploads/{id}/url        a time-limited download URL (owner only)
    DELETE /api/uploads/{id}            removes the file and the record (owner only)
    POST   /api/uploads/check           liveness for verify-site.py

Generated images (service ``ai_image``, ``services/images.py``) are records here
too, with ``source: "ai_image"``; their links and deletes go through that service,
so these routes also mount for apps that have ``ai_image`` but not ``storage``.

Records live in the ``_uploads`` collection, owned by the signed-in user like
everything else here; keys are ``u/<user_id>/<random>-<safe filename>`` so one
user can never read or delete another's file. Every route that hands a key to the
platform (confirm, url, delete) re-checks that the record's key is the caller's
(``_owned``) and answers 404 otherwise, so a stray or forged row can never sign,
publish or delete someone else's object. The browser uses ``uploadFile``
from ``src/lib/orvis.ts``, which does presign → PUT → confirm.
"""

from __future__ import annotations

import json
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import current_user
from db import db, now
from orvis import OrvisError, orvis

router = APIRouter(prefix="/api/uploads")

COLLECTION = "_uploads"
_SAFE = re.compile(r"[^A-Za-z0-9._-]+")
# One path segment after the user's prefix — what `presign` writes (`<id12>-<safe filename>`).
_SEGMENT = re.compile(r"^[A-Za-z0-9._-]{1,200}$")
# What the platform returns for a generated image (orvis_platform/services/ai_image.py `_KEY_RE`).
_AI_KEY = re.compile(r"^ai-images/[a-f0-9]{12}\.(png|jpg|webp|gif|bmp)$")


class PresignIn(BaseModel):
    filename: str
    content_type: str
    size: int
    visibility: str = "private"


class ConfirmIn(BaseModel):
    id: str


def _require_enabled(rec: dict[str, Any] | None = None) -> None:
    # Generated images (service `ai_image`) are records here too; they only need that service.
    if rec is not None and rec.get("source") == "ai_image" and "ai_image" in orvis.enabled:
        return
    if "storage" not in orvis.enabled:
        raise HTTPException(503, "storage is not enabled for this app")


def _friendly(exc: OrvisError) -> str:
    if exc.code in ("file_too_large", "storage_quota_exceeded", "invalid_key", "unsupported_image"):
        return exc.detail or "That file could not be stored."
    if exc.code == "byo_credential_missing":
        return "Uploads are waiting for the storage keys — the app owner adds them under Settings → My Apps."
    if exc.status == 402:
        return "Uploads are paused: the app owner is out of Orvis credits."
    if exc.status in (401, 403):
        return "Uploads are not configured for this app."
    if exc.status == 0:
        return "The storage service could not be reached."
    return "The upload could not be started. Please try again."


def _owned(user_id: str, doc_id: str, rec: dict[str, Any]) -> bool:
    """Does this record's key belong to ``user_id``?

    * file uploads: ``u/<user_id>/<one safe segment>`` — exactly what ``presign`` writes;
    * generated images (``source: "ai_image"``): the platform key is app-wide
      (``ai-images/<hex12>.<ext>``), so ownership is the record id ``images.generate``
      derives from the user and the key: ``uuid5(NAMESPACE_URL, f"{user_id}:{key}")``.
    """
    key = rec.get("key")
    if not isinstance(key, str) or not key:
        return False
    if rec.get("source") == "ai_image":
        return bool(_AI_KEY.match(key)) and doc_id == uuid.uuid5(uuid.NAMESPACE_URL, f"{user_id}:{key}").hex
    prefix = f"u/{user_id}/"
    rest = key[len(prefix):]
    return key.startswith(prefix) and bool(_SEGMENT.match(rest)) and rest not in (".", "..")


def _get(conn, owner: str, doc_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT body FROM docs WHERE col = ? AND id = ? AND owner = ?", (COLLECTION, doc_id, owner)).fetchone()
    return json.loads(row["body"]) if row else None


def _put(conn, owner: str, doc_id: str, body: dict[str, Any], *, insert: bool) -> None:
    t = now()
    if insert:
        conn.execute("INSERT INTO docs (col, id, owner, body, created, updated) VALUES (?,?,?,?,?,?)",
                     (COLLECTION, doc_id, owner, json.dumps(body, ensure_ascii=False), t, t))
    else:
        conn.execute("UPDATE docs SET body = ?, updated = ? WHERE col = ? AND id = ? AND owner = ?",
                     (json.dumps(body, ensure_ascii=False), t, COLLECTION, doc_id, owner))


@router.post("/presign")
def presign(body: PresignIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    _require_enabled()
    if body.size <= 0:
        raise HTTPException(400, "size must be greater than zero")
    safe = _SAFE.sub("_", body.filename.strip())[-120:] or "file"
    doc_id = uuid.uuid4().hex
    key = f"u/{user['id']}/{doc_id[:12]}-{safe}"
    try:
        grant = orvis.storage.presign_upload(key, content_type=body.content_type, size=body.size, visibility=body.visibility)
    except OrvisError as exc:
        raise HTTPException(502 if exc.status >= 500 or exc.status == 0 else exc.status, _friendly(exc))
    record = {"key": key, "filename": body.filename, "content_type": body.content_type, "size": body.size,
              "visibility": body.visibility, "status": "pending"}
    with db() as conn:
        _put(conn, user["id"], doc_id, record, insert=True)
    return {"id": doc_id, **record, "url": grant.get("url"), "method": grant.get("method", "PUT"),
            "headers": grant.get("headers", {}), "expires_in": grant.get("expires_in")}


@router.post("/confirm")
def confirm(body: ConfirmIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    _require_enabled()
    with db() as conn:
        rec = _get(conn, user["id"], body.id)
    if rec is None or rec.get("source") == "ai_image" or not _owned(user["id"], body.id, rec):
        raise HTTPException(404, "no such upload")
    try:
        meta = orvis.storage.confirm(rec["key"], visibility=rec.get("visibility", "private"))
    except OrvisError as exc:
        if exc.code == "object_missing":
            raise HTTPException(409, "the file was not uploaded yet")
        raise HTTPException(502 if exc.status >= 500 or exc.status == 0 else exc.status, _friendly(exc))
    rec.update({"status": "ready", "size": meta.get("size_bytes", rec["size"]),
                "content_type": meta.get("content_type") or rec["content_type"]})
    with db() as conn:
        _put(conn, user["id"], body.id, rec, insert=False)
    return {"id": body.id, **rec}


@router.get("")
def list_uploads(user: dict = Depends(current_user)) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute("SELECT id, body, created FROM docs WHERE owner = ? AND col = ? ORDER BY created DESC LIMIT 200",
                            (user["id"], COLLECTION)).fetchall()
    out = []
    for r in rows:
        d = json.loads(r["body"]); d["id"], d["created"] = r["id"], r["created"]
        out.append(d)
    return out


@router.get("/{doc_id}/url")
def download_url(doc_id: str, user: dict = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        rec = _get(conn, user["id"], doc_id)
    if rec is None or rec.get("status") != "ready" or not _owned(user["id"], doc_id, rec):
        raise HTTPException(404, "no such upload")
    _require_enabled(rec)
    try:
        if rec.get("source") == "ai_image":
            signed = orvis.ai.image_url(rec["key"])
        else:
            signed = orvis.storage.sign(rec["key"], filename=rec.get("filename"))
    except OrvisError as exc:
        raise HTTPException(502, _friendly(exc))
    return {"id": doc_id, "url": signed.get("url"), "expires_in": signed.get("expires_in"), "filename": rec.get("filename")}


@router.delete("/{doc_id}", status_code=204)
def delete_upload(doc_id: str, user: dict = Depends(current_user)) -> None:
    with db() as conn:
        rec = _get(conn, user["id"], doc_id)
    if rec is None or not _owned(user["id"], doc_id, rec):
        raise HTTPException(404, "no such upload")
    _require_enabled(rec)
    if rec.get("status") == "ready":
        try:
            if rec.get("source") == "ai_image":
                orvis.ai.delete_image(rec["key"])
            else:
                orvis.storage.delete(rec["key"])
        except OrvisError as exc:
            if exc.code != "object_missing":
                raise HTTPException(502, _friendly(exc))
    with db() as conn:
        conn.execute("DELETE FROM docs WHERE col = ? AND id = ? AND owner = ?", (COLLECTION, doc_id, user["id"]))


@router.post("/check")
def check(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Configuration probe: env present + platform reachable + service enabled. Uploads nothing."""
    out: dict[str, Any] = {"enabled": "storage" in orvis.enabled, "configured": orvis.configured}
    if not out["enabled"]:
        raise HTTPException(503, "storage not in ORVIS_SERVICES — run provision-service.py --service storage")
    if not out["configured"]:
        raise HTTPException(503, "ORVIS_API_URL / ORVIS_APP_ID / ORVIS_SECRET_KEY missing in server/.env")
    try:
        health = orvis.health()
    except OrvisError as exc:
        raise HTTPException(502, f"Orvis platform unreachable: {exc.detail}")
    if "storage" not in (health.get("services") or []):
        raise HTTPException(503, "the Orvis 'storage' service is disabled on the platform")
    try:
        orvis.storage.list(limit=1)
    except OrvisError as exc:
        if exc.code == "byo_credential_missing":
            raise HTTPException(503, "storage keys not added yet — the owner adds them under Settings → My Apps → File storage")
        raise HTTPException(502, f"Orvis storage error: {exc.detail}")
    return out
