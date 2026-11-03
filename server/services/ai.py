"""``ai`` service — a per-user chat backed by Orvis models.

    POST   /api/chat            {message, conversation_id?, images?}  → SSE: data:{"delta"} … data:{"done", id}
    GET    /api/chat/history?conversation_id=default&limit=50
    DELETE /api/chat/history?conversation_id=default
    POST   /api/chat/check      liveness for verify-site.py (no credits spent)

The system prompt / model tier are platform config (set at provisioning,
editable without code). Conversation turns are ordinary documents in the
``chat_messages`` collection, scoped to the signed-in user like everything
else in this server. The browser uses ``streamChat`` from ``src/lib/orvis.ts``.
"""

from __future__ import annotations

import json
import re
import uuid
from typing import Any, Iterator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth import current_user
from db import db, now
from orvis import OrvisError, orvis

router = APIRouter(prefix="/api")

COLLECTION = "chat_messages"
HISTORY_TURNS = 20            # prior turns sent to the model
MAX_MESSAGE_CHARS = 8_000
MAX_IMAGES = 4
MAX_IMAGE_BYTES = 5 * 1024 * 1024
_CONV_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class ChatIn(BaseModel):
    message: str
    conversation_id: str = "default"
    # Optional images the end user attached, each a `data:image/...;base64,...`
    # URI. They are sent with THIS turn only — the transcript keeps a short
    # marker instead of the bytes, so history stays small and is not re-uploaded
    # on every later message.
    images: list[str] = []


def _conv(cid: str) -> str:
    if not _CONV_RE.match(cid or ""):
        raise HTTPException(400, "conversation_id: letters, digits, _ and - only")
    return cid


def _rows(conn, owner: str, cid: str, limit: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT id, body, created FROM docs WHERE owner = ? AND col = ? ORDER BY created DESC, rowid DESC LIMIT ?",
        (owner, COLLECTION, limit * 4),
    ).fetchall()
    out = []
    for r in rows:
        d = json.loads(r["body"])
        if d.get("conversation_id", "default") != cid:
            continue
        d["id"], d["_created"] = r["id"], r["created"]
        out.append(d)
        if len(out) >= limit:
            break
    return list(reversed(out))


def _save(conn, owner: str, cid: str, role: str, content: str) -> str:
    doc_id = uuid.uuid4().hex
    t = now()
    body = json.dumps({"conversation_id": cid, "role": role, "content": content}, ensure_ascii=False)
    conn.execute(
        "INSERT INTO docs (col, id, owner, body, created, updated) VALUES (?,?,?,?,?,?)",
        (COLLECTION, doc_id, owner, body, t, t),
    )
    return doc_id


def _check_images(images: list[str]) -> list[str]:
    """Validate attachments before they cost a round trip to the platform."""
    if not images:
        return []
    if len(images) > MAX_IMAGES:
        raise HTTPException(400, f"at most {MAX_IMAGES} images per message")
    for src in images:
        if not src.startswith("data:image/"):
            raise HTTPException(400, "each image must be a data:image/...;base64 URI")
        if (len(src) * 3) // 4 > MAX_IMAGE_BYTES:
            raise HTTPException(413, f"each image must be under {MAX_IMAGE_BYTES // (1024 * 1024)} MB")
    return list(images)


def _sse(obj: dict[str, Any]) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


@router.post("/chat")
def chat(body: ChatIn, user: dict = Depends(current_user)) -> StreamingResponse:
    cid = _conv(body.conversation_id)
    text = (body.message or "").strip()
    if len(text) > MAX_MESSAGE_CHARS:
        raise HTTPException(413, f"message too long (max {MAX_MESSAGE_CHARS} chars)")
    if "ai" not in orvis.enabled:
        raise HTTPException(503, "AI is not enabled for this app")
    images = _check_images(body.images)
    # A picture on its own is a perfectly good question ("what is this?").
    if not text and not images:
        raise HTTPException(400, "message is empty")

    with db() as conn:
        history = _rows(conn, user["id"], cid, HISTORY_TURNS)
        _save(conn, user["id"], cid, "user", text + (f"\n[{len(images)} image(s) attached]" if images else ""))
    messages = [{"role": m["role"], "content": m["content"]} for m in history if m.get("role") in ("user", "assistant")]
    messages.append(orvis.ai.user_message(text, images=images) if images else {"role": "user", "content": text})

    def gen() -> Iterator[str]:
        parts: list[str] = []
        try:
            for delta in orvis.ai.chat_stream(messages):
                parts.append(delta)
                yield _sse({"delta": delta})
        except OrvisError as exc:
            yield _sse({"error": _friendly(exc), "code": exc.code, "status": exc.status})
            return
        reply = "".join(parts)
        with db() as conn:
            rid = _save(conn, user["id"], cid, "assistant", reply)
        yield _sse({"done": True, "id": rid})

    return StreamingResponse(
        gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _friendly(exc: OrvisError) -> str:
    if exc.status == 402:
        return "The AI assistant is paused: the app owner is out of Orvis credits."
    if exc.status == 429:
        return "The AI assistant is busy right now — please try again in a moment."
    if exc.code == "byo_credential_missing":
        return "The AI assistant is waiting for its API key — the app owner adds it under Settings → My Apps."
    if exc.code in ("too_many_images", "image_too_large", "unsupported_image", "invalid_image"):
        return exc.detail or "That image could not be read. Try a smaller JPEG or PNG."
    if exc.status in (401, 403):
        return "The AI assistant is not configured for this app."
    if exc.status == 0:
        return "The AI service could not be reached."
    return "The AI assistant hit an error. Please try again."


@router.get("/chat/history")
def history(
    conversation_id: str = "default",
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(current_user),
) -> list[dict[str, Any]]:
    cid = _conv(conversation_id)
    with db() as conn:
        return _rows(conn, user["id"], cid, limit)


@router.delete("/chat/history", status_code=204)
def clear_history(conversation_id: str = "default", user: dict = Depends(current_user)) -> None:
    cid = _conv(conversation_id)
    with db() as conn:
        rows = conn.execute(
            "SELECT id, body FROM docs WHERE owner = ? AND col = ?", (user["id"], COLLECTION),
        ).fetchall()
        ids = [r["id"] for r in rows if json.loads(r["body"]).get("conversation_id", "default") == cid]
        for doc_id in ids:
            conn.execute(
                "DELETE FROM docs WHERE owner = ? AND col = ? AND id = ?", (user["id"], COLLECTION, doc_id),
            )


@router.post("/chat/check")
def check(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Configuration probe: env present + platform reachable. Spends no credits."""
    out: dict[str, Any] = {"enabled": "ai" in orvis.enabled, "configured": orvis.configured}
    if not out["enabled"]:
        raise HTTPException(503, "ai not in ORVIS_SERVICES — run provision-service.py --service ai")
    if not out["configured"]:
        raise HTTPException(503, "ORVIS_API_URL / ORVIS_APP_ID / ORVIS_SECRET_KEY missing in server/.env")
    try:
        health = orvis.health()
    except OrvisError as exc:
        raise HTTPException(502, f"Orvis platform unreachable: {exc.detail}")
    out["platform"] = health.get("status")
    if "ai" not in (health.get("services") or []):
        raise HTTPException(503, "the Orvis 'ai' service is disabled on the platform")
    return out
