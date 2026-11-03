"""``ai_image`` service — AI image generation for the signed-in user.

    POST /api/images/generate   {prompt, aspect_ratio?, size?, quality?, reference_images?, request_id?}
                                → the upload record (+ "url", "expires_in")
    POST /api/images/check      liveness for verify-site.py (generates nothing, spends nothing)

Orvis picks the model, makes the image and stores it in this app's file space;
each image is billed to the owner's Orvis credits. The result is recorded in
the SAME ``_uploads`` collection as file uploads (``source: "ai_image"``), so
``listUploads`` / ``uploadUrl(id)`` / ``deleteUpload(id)`` in
``src/lib/orvis.ts`` cover generated images too — those routes are mounted
whenever ``ai_image`` is, even without the ``storage`` service.

From your own route (e.g. a product image made from the product name)::

    from services.images import generate
    rec = generate(user["id"], f"studio photo of {name}", aspect_ratio="1:1")
"""

from __future__ import annotations

import re
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import current_user
from db import db
from orvis import OrvisError, orvis
from services.uploads import _put

router = APIRouter(prefix="/api/images")

MAX_PROMPT = 4000
MAX_REFERENCES = 2
_REQ_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}


class GenerateIn(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = None
    size: Optional[str] = None
    quality: Optional[str] = None
    # `data:image/...;base64,...` URIs (≤ 2) — e.g. from `fileToDataUrl` in the browser.
    reference_images: list[str] = []
    # Optional client id for this click; a retry with the same id returns the same image, billed once.
    request_id: Optional[str] = None


def _friendly(exc: OrvisError) -> str:
    if exc.code in ("prompt_too_long", "too_many_references", "reference_too_large", "invalid_image",
                    "unsupported_image", "references_unsupported", "invalid_request"):
        return exc.detail or "That request could not be used."
    if exc.code == "image_blocked":
        return "No image was made — the request may have been blocked by a safety filter. Try rewording it."
    if exc.code in ("daily_image_cap", "daily_budget_exhausted"):
        return "This app has reached its image limit for today. Try again tomorrow."
    if exc.code == "rate_limited":
        return "Too many images at once — wait a moment and try again."
    if exc.code == "image_model_unavailable":
        return "Image generation is not available right now."
    if exc.status == 402:
        return "Image generation is paused: the app owner is out of Orvis credits."
    if exc.status in (401, 403):
        return "Image generation is not configured for this app."
    if exc.status == 0:
        return "The image service could not be reached."
    return "The image could not be generated. Please try again."


def _http_error(exc: OrvisError) -> HTTPException:
    status = exc.status if exc.status in (400, 402, 413, 422, 429) else 502
    return HTTPException(status, _friendly(exc))


def generate(user_id: str, prompt: str, *, aspect_ratio: Optional[str] = None, size: Optional[str] = None,
             quality: Optional[str] = None, reference_images: Optional[list] = None,
             request_id: Optional[str] = None) -> dict[str, Any]:
    """Generate one image owned by ``user_id`` and record it in ``_uploads``.

    Returns ``{"id", key, filename, content_type, size, visibility, status, source, prompt, model, "url", "expires_in"}``.
    Raises ``OrvisError``; call from your own routes.
    """
    if "ai_image" not in orvis.enabled:
        raise OrvisError(503, "service_not_enabled", "ai_image is not enabled for this app")
    idem = f"u{user_id}:{request_id}" if request_id else None
    out = orvis.ai.image(prompt, aspect_ratio=aspect_ratio, size=size, quality=quality,
                         reference_images=reference_images or None, idempotency_key=idem)
    ctype = out.get("content_type") or "image/png"
    key = out.get("key") or ""
    doc_id = uuid.uuid5(uuid.NAMESPACE_URL, f"{user_id}:{key}").hex   # same image → same record
    record = {
        "key": key, "filename": f"ai-image-{doc_id[:8]}.{_EXT.get(ctype, 'png')}",
        "content_type": ctype, "size": int(out.get("size_bytes") or 0), "visibility": "private",
        "status": "ready", "source": "ai_image", "prompt": prompt[:500], "model": out.get("model") or "",
    }
    with db() as conn:
        exists = conn.execute("SELECT 1 FROM docs WHERE col = '_uploads' AND id = ? AND owner = ?",
                              (doc_id, user_id)).fetchone()
        if not exists:
            _put(conn, user_id, doc_id, record, insert=True)
    return {"id": doc_id, **record, "url": out.get("url"), "expires_in": out.get("expires_in")}


@router.post("/generate")
def generate_route(body: GenerateIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    if "ai_image" not in orvis.enabled:
        raise HTTPException(503, "image generation is not enabled for this app")
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(400, "describe the image you want")
    if len(prompt) > MAX_PROMPT:
        raise HTTPException(400, f"the description must be at most {MAX_PROMPT} characters")
    if len(body.reference_images) > MAX_REFERENCES:
        raise HTTPException(400, f"at most {MAX_REFERENCES} reference images")
    if any(not str(r).startswith("data:image/") for r in body.reference_images):
        raise HTTPException(400, "reference images must be data:image/… URIs")
    if body.request_id is not None and not _REQ_RE.match(body.request_id):
        raise HTTPException(400, "request_id: letters, digits, _ and - only")
    try:
        return generate(user["id"], prompt, aspect_ratio=body.aspect_ratio, size=body.size, quality=body.quality,
                        reference_images=body.reference_images, request_id=body.request_id)
    except OrvisError as exc:
        raise _http_error(exc)


@router.post("/check")
def check(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Configuration probe: env present + platform reachable + service enabled for this app. Generates nothing."""
    out: dict[str, Any] = {"enabled": "ai_image" in orvis.enabled, "configured": orvis.configured}
    if not out["enabled"]:
        raise HTTPException(503, "ai_image not in ORVIS_SERVICES — run provision-service.py --service ai_image")
    if not out["configured"]:
        raise HTTPException(503, "ORVIS_API_URL / ORVIS_APP_ID / ORVIS_SECRET_KEY missing in server/.env")
    try:
        health = orvis.health()
    except OrvisError as exc:
        raise HTTPException(502, f"Orvis platform unreachable: {exc.detail}")
    if "ai_image" not in (health.get("services") or []):
        raise HTTPException(503, "the Orvis 'ai_image' service is disabled on the platform")
    try:
        # Signing a key that does not exist proves the key works and the service is on
        # for this app (404 object_missing) without generating — or spending — anything.
        orvis.ai.image_url("ai-images/000000000000.png")
    except OrvisError as exc:
        if exc.code != "object_missing":
            raise HTTPException(502 if exc.status in (0, 401) or exc.status >= 500 else 503,
                                f"Orvis ai_image error: {exc.detail}")
    return out
