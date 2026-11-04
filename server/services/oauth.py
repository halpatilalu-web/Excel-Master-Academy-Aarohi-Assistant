"""``google_auth`` service — "Sign in with Google" for this app's users.

    GET /api/auth/oauth/start?origin=<https://app-host>&return_to=/    → 302 to Orvis, which sends the user to Google
    GET /api/auth/oauth/callback?orvis_code=…&state=…                  → exchange, link/create local user, set `sid` cookie, 302 return_to
                                 ?orvis_error=…                        → 302 /?auth=error&reason=…

The browser passes its own `origin` because the dev proxy rewrites Host; Orvis
only accepts origins that belong to this app. Google's consent screen is
Orvis's (or the owner's own client, if configured in Settings → My Apps).
"""

from __future__ import annotations

import secrets
from urllib.parse import quote, urlencode, urlparse

import auth as auth_mod
from db import db
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from orvis import OrvisError, orvis

router = APIRouter(prefix="/api/auth/oauth")

STATE_COOKIE = "oauth_state"
_STATE_TTL_S = 600


def _origin_ok(origin: str) -> bool:
    try:
        u = urlparse(origin)
    except Exception:
        return False
    if u.scheme not in ("http", "https") or not u.netloc or u.path not in ("", "/"):
        return False
    return u.scheme == "https" or (u.hostname or "") in ("localhost", "127.0.0.1")


@router.get("/start")
def start(origin: str, return_to: str = "/"):
    if "google_auth" not in orvis.enabled:
        raise HTTPException(503, "Google login is not enabled for this app")
    origin = origin.rstrip("/")
    if not _origin_ok(origin):
        raise HTTPException(400, "origin must be this app's https URL")
    if not return_to.startswith("/") or return_to.startswith("//"):
        return_to = "/"
    state = secrets.token_urlsafe(24)
    q = {"app_id": orvis.app_id, "redirect_uri": f"{origin}/api/auth/oauth/callback", "state": state}
    resp = RedirectResponse(f"{orvis.public_api_url}/api/v1/platform/auth/google/start?{urlencode(q)}", status_code=302)
    https = origin.startswith("https://")
    resp.set_cookie(STATE_COOKIE, f"{state}|{return_to}", httponly=True, secure=https,
                    samesite="none" if https else "lax", max_age=_STATE_TTL_S, path="/api/auth/oauth")
    return resp


@router.get("/callback")
def callback(request: Request, orvis_code: str = "", state: str = "", orvis_error: str = ""):
    raw = request.cookies.get(STATE_COOKIE, "")
    expected, _, return_to = raw.partition("|")
    return_to = return_to if return_to.startswith("/") and not return_to.startswith("//") else "/"
    def fail(reason: str):
        r = RedirectResponse(f"/?auth=error&reason={quote(reason)}", status_code=302)
        r.delete_cookie(STATE_COOKIE, path="/api/auth/oauth")
        return r
    if orvis_error:
        return fail(orvis_error)
    if not orvis_code or not state or not expected or state != expected:
        return fail("state_mismatch")
    try:
        user = orvis.auth.exchange(orvis_code)
    except OrvisError as exc:
        return fail(exc.code or "exchange_failed")
    email = str(user.get("email") or "").strip().lower()
    if not email:
        return fail("no_email")
    # Accounts are linked by email, so only a claim that says "verified" counts.
    # (`is False` used to let a provider that omits the flag through.)
    if user.get("email_verified") is not True:
        return fail("email_not_verified")
    resp = RedirectResponse(return_to, status_code=302)
    try:
        with db() as conn:
            uid = auth_mod.login_external(conn, email, str(user.get("name") or ""), "google", str(user.get("picture") or ""))
            auth_mod.start_session(conn, resp, request, uid)
    except auth_mod.ExternalAccountExists:
        # An email/password account already owns this address. Linking silently
        # would hand one side control of the other's data.
        return fail("account_exists")
    resp.delete_cookie(STATE_COOKIE, path="/api/auth/oauth")
    return resp
