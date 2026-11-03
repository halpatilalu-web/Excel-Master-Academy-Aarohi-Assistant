"""``payments`` service — Razorpay checkout, on the app owner's own account.

    GET  /api/payments/config            {key_id, currency, max_amount_minor}
    POST /api/payments/orders            {amount_minor, currency?, label?, notes?} → {id, order_id, key_id, …}
    POST /api/payments/verify            {order_id, payment_id, signature}         → {paid, status}
    GET  /api/payments/orders            the signed-in user's orders
    POST /api/payments/webhook           ← Orvis (signed); marks the order paid
    POST /api/payments/check             liveness for verify-site.py

Orders are ordinary documents in the ``_payments`` collection, owned by the
signed-in user like everything else in this server. Only this module writes them
(``/api/c`` refuses ``_``-prefixed collections), and ``verify`` only ever touches
the caller's own order. The key SECRET never
reaches this process — Orvis holds it and talks to Razorpay.

⚠️ **Price on the server, not in the browser.** ``amount_minor`` arrives from
the client here, which is fine for a donation or a "pay what you want" box. For
real products look the price up server-side (a dict, a table, your own
collection) and ignore whatever the browser sent, or anyone can pay ₹1 for
anything. See ``svc-payments.md``.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from auth import current_user
from db import db, now
from orvis import OrvisError, orvis

router = APIRouter(prefix="/api/payments")

COLLECTION = "_payments"
MAX_LABEL_CHARS = 120


class OrderIn(BaseModel):
    amount_minor: int
    currency: str | None = None
    label: str | None = None
    notes: dict[str, str] | None = None


class VerifyIn(BaseModel):
    order_id: str
    payment_id: str
    signature: str


def _require_enabled() -> None:
    if "payments" not in orvis.enabled:
        raise HTTPException(503, "payments is not enabled for this app")


def _save(conn, owner: str, doc_id: str, body: dict[str, Any]) -> None:
    t = now()
    conn.execute(
        "INSERT INTO docs (col, id, owner, body, created, updated) VALUES (?,?,?,?,?,?)",
        (COLLECTION, doc_id, owner, json.dumps(body, ensure_ascii=False), t, t),
    )


def _update(conn, doc_id: str, body: dict[str, Any]) -> None:
    conn.execute(
        "UPDATE docs SET body = ?, updated = ? WHERE col = ? AND id = ?",
        (json.dumps(body, ensure_ascii=False), now(), COLLECTION, doc_id),
    )


def _find_by_order(conn, order_id: str, owner: str | None = None) -> tuple[str, dict[str, Any]] | None:
    """The order document for a Razorpay order id.

    ``owner=None`` searches every owner — only for the webhook, which is
    unauthenticated but signed by Orvis. Signed-in routes pass the caller's id.
    """
    if owner is None:
        rows = conn.execute(
            "SELECT id, body FROM docs WHERE col = ? ORDER BY created DESC LIMIT 500", (COLLECTION,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, body FROM docs WHERE col = ? AND owner = ? ORDER BY created DESC LIMIT 500",
            (COLLECTION, owner),
        ).fetchall()
    for r in rows:
        body = json.loads(r["body"])
        if body.get("order_id") == order_id:
            return r["id"], body
    return None


def _friendly(exc: OrvisError) -> str:
    if exc.code == "byo_credential_missing":
        return "Payments are waiting for the Razorpay keys — the app owner adds them under Settings → My Apps."
    if exc.code == "platform_mode_unavailable":
        return "Payments need the owner's own Razorpay account for now."
    if exc.code == "amount_too_large":
        return "That amount is above the limit set for this app."
    if exc.status == 429:
        return "Too many payment attempts right now — try again in a moment."
    if exc.status in (401, 403):
        return "Payments are not configured for this app."
    if exc.status == 0:
        return "The payment service could not be reached."
    return "The payment could not be started. Please try again."


@router.get("/config")
def config(user: dict = Depends(current_user)) -> dict[str, Any]:
    _require_enabled()
    try:
        cfg = orvis.payments.config()
    except OrvisError as exc:
        raise HTTPException(502, _friendly(exc))
    return {
        "key_id": cfg.get("key_id", ""),
        "currency": cfg.get("currency", "INR"),
        "max_amount_minor": cfg.get("max_amount_minor"),
        "configured": bool(cfg.get("configured")),
    }


@router.post("/orders")
def create_order(body: OrderIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    _require_enabled()
    if body.amount_minor <= 0:
        raise HTTPException(400, "amount_minor must be greater than zero")
    doc_id = uuid.uuid4().hex
    try:
        order = orvis.payments.create_order(
            body.amount_minor,
            currency=body.currency,
            receipt=f"orvis_{doc_id[:20]}",
            notes={**(body.notes or {}), "user": user["id"]},
        )
    except OrvisError as exc:
        raise HTTPException(502, _friendly(exc))

    record = {
        "order_id": order.get("order_id", ""),
        "amount_minor": order.get("amount_minor", body.amount_minor),
        "currency": order.get("currency", "INR"),
        "label": (body.label or "")[:MAX_LABEL_CHARS],
        "status": "created",
        "payment_id": "",
        "user_email": user.get("email", ""),
    }
    with db() as conn:
        _save(conn, user["id"], doc_id, record)
    return {"id": doc_id, "key_id": order.get("key_id", ""), **record}


@router.post("/verify")
def verify(body: VerifyIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    _require_enabled()
    try:
        result = orvis.payments.verify(body.order_id, body.payment_id, body.signature)
    except OrvisError as exc:
        raise HTTPException(502, _friendly(exc))
    verified = bool(result.get("verified"))
    paid = verified and bool(result.get("paid"))
    with db() as conn:
        # The caller's own order only: another user's order id must not let them
        # flip (or downgrade) that order's status.
        found = _find_by_order(conn, body.order_id, owner=user["id"])
        if found is not None:
            doc_id, record = found
            if record.get("status") != "paid":       # a settled order is never downgraded
                record["status"] = "paid" if paid else str(result.get("status") or "failed")
            if verified:
                record["payment_id"] = body.payment_id
            _update(conn, doc_id, record)
    return {"paid": paid, "status": result.get("status", ""), "order_id": body.order_id}


@router.get("/orders")
def list_orders(user: dict = Depends(current_user)) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            "SELECT id, body, created FROM docs WHERE owner = ? AND col = ? ORDER BY created DESC LIMIT 100",
            (user["id"], COLLECTION),
        ).fetchall()
    out = []
    for r in rows:
        d = json.loads(r["body"])
        d["id"], d["created"] = r["id"], r["created"]
        out.append(d)
    return out


@router.post("/webhook")
async def webhook(request: Request) -> dict[str, Any]:
    """Razorpay → Orvis → here. Unauthenticated by design; the signature is the auth.

    This is what makes a payment reliable: the browser may close before
    ``/verify`` runs, but the webhook still arrives and settles the order —
    ``captured`` → ``paid``, anything else (``failed``, ``refunded``) is copied
    through so a dead attempt does not sit at ``created`` forever.
    """
    _require_enabled()
    raw = await request.body()
    if not orvis.payments.verify_webhook(raw, request.headers.get("x-orvis-signature", "")):
        raise HTTPException(401, "bad signature")
    try:
        event = json.loads(raw or b"{}")
    except ValueError:
        raise HTTPException(400, "body is not JSON")

    entity = (((event.get("payload") or {}).get("payment") or {}).get("entity")) or {}
    order_id = str(entity.get("order_id") or "")
    status = str(entity.get("status") or "")
    if not order_id:
        return {"ok": True, "ignored": event.get("event", "")}
    with db() as conn:
        found = _find_by_order(conn, order_id)
        if found is None:
            return {"ok": True, "unknown_order": True}
        doc_id, record = found
        if status == "captured":
            record["status"] = "paid"
        elif status and record.get("status") != "paid":
            record["status"] = status
        record["payment_id"] = str(entity.get("id") or record.get("payment_id", ""))
        _update(conn, doc_id, record)
    return {"ok": True, "order_id": order_id, "status": record["status"]}


@router.post("/check")
def check(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Configuration probe: env present, platform reachable, keys stored."""
    out: dict[str, Any] = {"enabled": "payments" in orvis.enabled, "configured": orvis.configured}
    if not out["enabled"]:
        raise HTTPException(503, "payments not in ORVIS_SERVICES — run provision-service.py --service payments")
    if not out["configured"]:
        raise HTTPException(503, "ORVIS_API_URL / ORVIS_APP_ID / ORVIS_SECRET_KEY missing in server/.env")
    try:
        cfg = orvis.payments.config()
    except OrvisError as exc:
        if exc.code == "byo_credential_missing":
            raise HTTPException(503, "Razorpay keys not added yet — Settings → My Apps → Payments")
        raise HTTPException(502, f"Orvis payments unreachable: {exc.detail}")
    out["keys_ready"] = bool(cfg.get("configured"))
    out["currency"] = cfg.get("currency", "")
    if not out["keys_ready"]:
        # Expected right after provisioning: the app is wired, the owner has not
        # pasted the Razorpay secrets yet. verify-site.py reports this without
        # failing the build (see svc-payments.md).
        raise HTTPException(503, "Razorpay keys not added yet — the owner adds them under Settings → My Apps → Payments")
    return out
