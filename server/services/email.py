"""``email`` service — send mail from the app (receipts, notifications, contact forms).

    POST /api/email/send-me   {subject, html?, text?}   → sends to the SIGNED-IN user only
    POST /api/email/check     liveness for verify-site.py (sends nothing)

For anything else (a receipt after payment, an admin alert, a contact form that
reaches the owner) call ``send()`` from a route you write — it is the only way to
address someone other than the current user, so keep it behind your own checks:

    from services.email import send
    send(user["email"], "Your order", html=f"<p>Thanks, order {order_id} is paid.</p>",
         idempotency_key=f"receipt:{order_id}")

Never let the browser choose the recipient: that turns the app into a spam relay
and gets the owner's sending blocked.
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import current_user
from orvis import OrvisError, orvis

router = APIRouter(prefix="/api/email")

MAX_SUBJECT = 200


class SendMeIn(BaseModel):
    subject: str
    html: str = ""
    text: str = ""


def _friendly(exc: OrvisError) -> str:
    if exc.code == "byo_credential_missing":
        return "Email is waiting for the SMTP settings — the app owner adds them under Settings → My Apps."
    if exc.code == "daily_email_cap":
        return "This app has reached its daily email limit. Try again tomorrow."
    if exc.code == "recipient_blocked":
        return "Email to that address is not allowed."
    if exc.status == 402:
        return "Email is paused: the app owner is out of Orvis credits."
    if exc.status in (401, 403):
        return "Email is not configured for this app."
    if exc.status == 0:
        return "The email service could not be reached."
    return "The email could not be sent. Please try again."


def send(to: str, subject: str, *, html: str = "", text: str = "", idempotency_key: Optional[str] = None,
         reply_to: Optional[str] = None) -> dict[str, Any]:
    """Send one email through Orvis. Raises ``OrvisError``; call from your own routes."""
    if "email" not in orvis.enabled:
        raise OrvisError(503, "service_not_enabled", "email is not enabled for this app")
    return orvis.email.send(to, subject[:MAX_SUBJECT], html=html, text=text,
                            reply_to=reply_to, idempotency_key=idempotency_key)


@router.post("/send-me")
def send_me(body: SendMeIn, user: dict = Depends(current_user)) -> dict[str, Any]:
    """The one open endpoint: recipient is forced to the signed-in user."""
    if "email" not in orvis.enabled:
        raise HTTPException(503, "email is not enabled for this app")
    if not body.subject.strip() or not (body.html or body.text):
        raise HTTPException(400, "subject and html or text are required")
    try:
        out = send(user["email"], body.subject.strip(), html=body.html, text=body.text)
    except OrvisError as exc:
        raise HTTPException(502 if exc.status >= 500 or exc.status == 0 else exc.status, _friendly(exc))
    return {"sent": not out.get("deduped"), "id": out.get("id"), "to": user["email"]}


@router.post("/check")
def check(user: dict = Depends(current_user)) -> dict[str, Any]:
    """Configuration probe: env present + platform reachable + service enabled. Sends nothing."""
    out: dict[str, Any] = {"enabled": "email" in orvis.enabled, "configured": orvis.configured}
    if not out["enabled"]:
        raise HTTPException(503, "email not in ORVIS_SERVICES — run provision-service.py --service email")
    if not out["configured"]:
        raise HTTPException(503, "ORVIS_API_URL / ORVIS_APP_ID / ORVIS_SECRET_KEY missing in server/.env")
    try:
        health = orvis.health()
    except OrvisError as exc:
        raise HTTPException(502, f"Orvis platform unreachable: {exc.detail}")
    if "email" not in (health.get("services") or []):
        raise HTTPException(503, "the Orvis 'email' service is disabled on the platform")
    return out
