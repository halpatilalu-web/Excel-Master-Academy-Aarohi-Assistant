"""Demo-grade auth, stdlib only.

* Passwords: scrypt (n=2^14, r=8, p=1) with a 16-byte random salt.
* Sessions: random token sent to the client; only its SHA-256 hash is stored
  in the `sessions` table. It is sent as an HttpOnly,
  SameSite=Lax cookie (`Secure` when the request arrived over https). 30 days.
  The same token is also returned in the sign-in body and accepted as
  `Authorization: Bearer <token>` — that is how a mobile client (a different
  origin and no cookie jar on web) authenticates.
* Login throttle: 5 failed attempts per (IP, email) per minute, plus a per-IP
  cap on account creation. Counters are cleared on success, pruned as they age
  and capped in size, so one shared classroom IP cannot lock everybody out and
  the process cannot grow without bound.
* Every document route depends on `current_user`, so data is per-user.

* Guest mode: `POST /api/auth/guest` mints an anonymous account (provider
  'guest', unusable password) + session, so an app can skip the sign-in
  screen entirely and still keep per-user data on the server. The guest can
  later `POST /api/auth/upgrade {email, password}` to turn it into a real
  account without losing anything.

What this is NOT: email verification, password reset, roles/admin, OAuth
(the optional `google_auth` service lives in services/oauth.py).
Tell users so — the README does.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time
import uuid
from collections import defaultdict, deque

from db import db, now
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth")

COOKIE = "sid"
SESSION_TTL_S = 30 * 24 * 3600
MIN_PASSWORD = 8
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_SCRYPT = {"n": 2**14, "r": 8, "p": 1, "dklen": 32}

# Sliding-window buckets: key -> timestamps of recent failures/hits.
_MAX_FAILS, _FAIL_WINDOW_S = 5, 60           # per (ip, email) login failures
_MAX_SIGNUPS, _SIGNUP_WINDOW_S = 5, 60       # per ip, real accounts
_MAX_GUESTS, _GUEST_WINDOW_S = 10, 60        # per ip, anonymous accounts
_MAX_PW_CHECKS, _PW_WINDOW_S = 5, 60         # per user, /password attempts
_MAX_BUCKETS = 20_000                        # hard cap on tracked keys
_buckets: dict[str, deque[float]] = defaultdict(deque)


class Credentials(BaseModel):
    email: str
    password: str


class PasswordChange(BaseModel):
    current: str
    new: str


class ExternalAccountExists(Exception):
    """The external identity's email already belongs to a password account."""


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, **_SCRYPT)


def _norm_email(raw: str) -> str:
    email = raw.strip().lower()
    if len(email) > 254 or not _EMAIL_RE.match(email):
        raise HTTPException(400, "invalid email")
    return email


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _check_password(pw: str) -> None:
    if len(pw) < MIN_PASSWORD:
        raise HTTPException(400, f"password must be at least {MIN_PASSWORD} characters")
    if len(pw) > 200:
        raise HTTPException(400, "password is too long")


def _prune_buckets(t: float, window: float, q: deque[float]) -> None:
    while q and t - q[0] > window:
        q.popleft()


def _limit(key: str, *, max_hits: int, window_s: float, message: str) -> None:
    """Consume one hit for `key`; raise 429 (with Retry-After) when over budget."""
    t = time.monotonic()
    q = _buckets[key]
    _prune_buckets(t, window_s, q)
    if len(q) >= max_hits:
        retry = max(1, int(window_s - (t - q[0])))
        raise HTTPException(429, message, headers={"Retry-After": str(retry)})
    q.append(t)
    if len(_buckets) > _MAX_BUCKETS:
        # Drop whatever has aged out; never let the map grow without bound.
        for k in [k for k, v in _buckets.items() if not v]:
            _buckets.pop(k, None)


def _limit_peek(key: str, *, max_hits: int, window_s: float, message: str) -> None:
    """Like `_limit` but does not consume a hit (used before a password is checked)."""
    t = time.monotonic()
    q = _buckets[key]
    _prune_buckets(t, window_s, q)
    if len(q) >= max_hits:
        retry = max(1, int(window_s - (t - q[0])))
        raise HTTPException(429, message, headers={"Retry-After": str(retry)})


def client_ip(request: Request) -> str:
    # Behind Render/Cloudflare the socket peer is the proxy; prefer the
    # forwarded chain's first hop (browsers cannot spoof it to the proxy).
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip() or "?"
    return request.client.host if request.client else "?"


def create_user(conn, email: str, password: str) -> str:
    """Insert a user; returns its id. Caller handles the UNIQUE(email) case."""
    salt = secrets.token_bytes(16)
    uid = uuid.uuid4().hex
    conn.execute(
        "INSERT INTO users (id, email, pw_hash, salt, created) VALUES (?,?,?,?,?)",
        (uid, email, _hash(password, salt), salt, now()),
    )
    return uid


def _new_session(conn, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    t = now()
    conn.execute(
        "INSERT INTO sessions (token, user_id, created, expires) VALUES (?,?,?,?)",
        (_token_hash(token), user_id, t, t + SESSION_TTL_S),
    )
    return token


def purge_expired_sessions() -> int:
    """Delete sessions past their expiry. Called on startup."""
    with db() as conn:
        cur = conn.execute("DELETE FROM sessions WHERE expires < ?", (now(),))
        return cur.rowcount or 0


def _set_cookie(response: Response, request: Request, token: str) -> None:
    # Over https the cookie is SameSite=None + Secure so sign-in also works when
    # the app is shown inside a preview iframe, which is a different site from
    # the app's own domain (a Lax cookie is silently dropped there and every
    # request after login comes back 401). Because that means the cookie rides
    # along on cross-site requests, main.py rejects cross-origin mutations by
    # checking Origin/Referer — see `_safety_headers_and_csrf` there.
    https = request.headers.get("x-forwarded-proto", "").lower() == "https" or request.url.scheme == "https"
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="none" if https else "lax", secure=https,
        max_age=SESSION_TTL_S, path="/",
    )


def login_external(conn, email: str, name: str, provider: str, picture: str = "") -> str:
    """Find-or-create the local user for an identity verified by an external
    provider (Google login).

    Linked by email ONLY if that user was created by the same provider. An
    existing email/password account is never silently attached to an external
    identity: the password holder would otherwise lose control of their account
    to whoever signed in with Google first (and vice versa — pre-registering
    someone's email with a password would hand the attacker a login on the
    victim's Google sign-in). Raises `ExternalAccountExists` instead.
    """
    email = _norm_email(email)
    row = conn.execute("SELECT id, provider FROM users WHERE email = ?", (email,)).fetchone()
    if row is not None:
        if (row["provider"] or "password") != provider:
            raise ExternalAccountExists(email)
        conn.execute(
            "UPDATE users SET name = COALESCE(NULLIF(?, ''), name), picture = COALESCE(NULLIF(?, ''), picture) WHERE id = ?",
            (name or "", picture or "", row["id"]),
        )
        return row["id"]
    salt = secrets.token_bytes(16)
    uid = uuid.uuid4().hex
    conn.execute(
        "INSERT INTO users (id, email, pw_hash, salt, created, name, provider, picture) VALUES (?,?,?,?,?,?,?,?)",
        (uid, email, _hash(secrets.token_urlsafe(32), salt), salt, now(), name or "", provider, picture or ""),
    )
    return uid


def start_session(conn, response: Response, request: Request, user_id: str) -> str:
    """Issue the session cookie for `user_id` (used after an external login)."""
    token = _new_session(conn, user_id)
    _set_cookie(response, request, token)
    return token


def session_token(request: Request) -> str:
    """The caller's session token: `Authorization: Bearer …` when sent (an
    explicit choice by the client), else the session cookie."""
    auth = request.headers.get("authorization", "")
    if auth[:7].lower() == "bearer " and auth[7:].strip():
        return auth[7:].strip()
    return request.cookies.get(COOKIE, "")


def current_user(request: Request) -> dict:
    """FastAPI dependency: the signed-in user or 401."""
    token = session_token(request)
    if not token:
        raise HTTPException(401, "not signed in")
    token_hash = _token_hash(token)
    with db() as conn:
        row = conn.execute(
            "SELECT u.id, u.email, u.name, u.provider, u.picture, s.expires FROM sessions s "
            "JOIN users u ON u.id = s.user_id WHERE s.token = ?",
            (token_hash,),
        ).fetchone()
    if row is None:
        raise HTTPException(401, "not signed in")
    if row["expires"] < now():
        # Commit the cleanup on its own: raising inside `with db()` would roll
        # the DELETE back, so expired rows were never actually removed.
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token_hash,))
        raise HTTPException(401, "session expired")
    return {
        "id": row["id"], "email": row["email"], "name": row["name"] or "",
        "provider": row["provider"] or "password", "picture": row["picture"] or "",
    }


@router.post("/signup", status_code=201)
def signup(body: Credentials, request: Request, response: Response) -> dict:
    _limit(f"signup|{client_ip(request)}", max_hits=_MAX_SIGNUPS,
           window_s=_SIGNUP_WINDOW_S, message="too many new accounts — wait a minute")
    email = _norm_email(body.email)
    _check_password(body.password)
    with db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(409, "email already registered")
        uid = create_user(conn, email, body.password)
        token = _new_session(conn, uid)
    _set_cookie(response, request, token)
    return {"id": uid, "email": email, "token": token}


@router.post("/login")
def login(body: Credentials, request: Request, response: Response) -> dict:
    ip = client_ip(request)
    email = _norm_email(body.email)
    bucket = f"login|{ip}|{email}"
    _limit_peek(bucket, max_hits=_MAX_FAILS, window_s=_FAIL_WINDOW_S,
                message="too many attempts — wait a minute")
    with db() as conn:
        row = conn.execute("SELECT id, pw_hash, salt FROM users WHERE email = ?", (email,)).fetchone()
        ok = row is not None and hmac.compare_digest(_hash(body.password, row["salt"]), row["pw_hash"])
        if not ok:
            _limit(bucket, max_hits=_MAX_FAILS, window_s=_FAIL_WINDOW_S,
                   message="too many attempts — wait a minute")
            raise HTTPException(401, "wrong email or password")
        _buckets.pop(bucket, None)  # a good sign-in clears this email's failures
        token = _new_session(conn, row["id"])
    _set_cookie(response, request, token)
    return {"id": row["id"], "email": email, "token": token}


@router.post("/guest", status_code=201)
def guest(request: Request, response: Response) -> dict:
    """Anonymous account for apps that run without a sign-in screen (AUTH_MODE
    guest). One per device/browser: the client calls this only when it holds no
    session, and keeps the returned token. The email is a placeholder that can
    never receive mail or be signed into; `upgrade` replaces it."""
    _limit(f"guest|{client_ip(request)}", max_hits=_MAX_GUESTS,
           window_s=_GUEST_WINDOW_S, message="too many guest sessions — wait a minute")
    with db() as conn:
        email = ""
        for _ in range(5):
            candidate = f"guest-{secrets.token_hex(6)}@guest.local"
            if conn.execute("SELECT 1 FROM users WHERE email = ?", (candidate,)).fetchone() is None:
                email = candidate
                break
        if not email:  # pragma: no cover - needs 5 collisions in a row
            raise HTTPException(503, "could not allocate a guest account — try again")
        salt = secrets.token_bytes(16)
        uid = uuid.uuid4().hex
        conn.execute(
            "INSERT INTO users (id, email, pw_hash, salt, created, name, provider) VALUES (?,?,?,?,?,?,?)",
            (uid, email, _hash(secrets.token_urlsafe(32), salt), salt, now(), "", "guest"),
        )
        token = _new_session(conn, uid)
    _set_cookie(response, request, token)
    return {"id": uid, "email": email, "name": "", "provider": "guest", "picture": "", "token": token}


@router.post("/upgrade")
def upgrade(body: Credentials, request: Request, user: dict = Depends(current_user)) -> dict:
    """Turn the signed-in GUEST into a real email/password account, keeping its
    data and its current session. 409 when the email is taken; 400 for a
    non-guest (they already have credentials — use /password).

    The email is not verified (no mail is sent). That is why `login_external`
    refuses to attach a Google identity to an existing password account."""
    if user.get("provider") != "guest":
        raise HTTPException(400, "this account already has a login")
    _limit(f"upgrade|{client_ip(request)}", max_hits=_MAX_SIGNUPS,
           window_s=_SIGNUP_WINDOW_S, message="too many new accounts — wait a minute")
    email = _norm_email(body.email)
    _check_password(body.password)
    with db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ? AND id <> ?", (email, user["id"])).fetchone():
            raise HTTPException(409, "email already registered")
        salt = secrets.token_bytes(16)
        conn.execute(
            "UPDATE users SET email = ?, pw_hash = ?, salt = ?, provider = 'password' WHERE id = ?",
            (email, _hash(body.password, salt), salt, user["id"]),
        )
    return {**user, "email": email, "provider": "password"}


@router.post("/logout")
def logout(request: Request, response: Response) -> dict:
    token = session_token(request)
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (_token_hash(token),))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    return user


@router.delete("/account", status_code=204)
def delete_account(request: Request, response: Response, user: dict = Depends(current_user)) -> Response:
    """Delete the signed-in account and everything it owns, then sign out.

    Documents (including reserved `_uploads`/`_payments` rows), sessions and the
    user row go in one transaction. There is no undo — the app offers a JSON
    export on the Account page for anyone who wants a copy first."""
    with db() as conn:
        conn.execute("DELETE FROM docs WHERE owner = ?", (user["id"],))
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))
        conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    response.delete_cookie(COOKIE, path="/")
    return Response(status_code=204)


@router.post("/password")
def change_password(body: PasswordChange, request: Request, user: dict = Depends(current_user)) -> dict:
    _check_password(body.new)
    bucket = f"password|{user['id']}"
    _limit_peek(bucket, max_hits=_MAX_PW_CHECKS, window_s=_PW_WINDOW_S,
                message="too many password attempts — wait a minute")
    with db() as conn:
        row = conn.execute("SELECT pw_hash, salt FROM users WHERE id = ?", (user["id"],)).fetchone()
        if row is None:
            raise HTTPException(401, "not signed in")
        if not hmac.compare_digest(_hash(body.current, row["salt"]), row["pw_hash"]):
            _limit(bucket, max_hits=_MAX_PW_CHECKS, window_s=_PW_WINDOW_S,
                   message="too many password attempts — wait a minute")
            raise HTTPException(401, "current password is wrong")
        salt = secrets.token_bytes(16)
        conn.execute(
            "UPDATE users SET pw_hash = ?, salt = ? WHERE id = ?",
            (_hash(body.new, salt), salt, user["id"]),
        )
        # Sign out every other device; keep this session.
        conn.execute(
            "DELETE FROM sessions WHERE user_id = ? AND token != ?",
            (user["id"], _token_hash(session_token(request))),
        )
    return {"ok": True}
