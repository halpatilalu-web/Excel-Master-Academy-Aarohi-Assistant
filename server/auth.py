"""Demo-grade auth, stdlib only.

* Passwords: scrypt (n=2^14, r=8, p=1) with a 16-byte random salt.
* Sessions: random token sent to the client; only its SHA-256 hash is stored
  in the `sessions` table. It is sent as an HttpOnly,
  SameSite=Lax cookie (`Secure` when the request arrived over https). 30 days.
  The same token is also returned in the sign-in body and accepted as
  `Authorization: Bearer <token>` — that is how the mobile template (Expo,
  a different origin and no cookie jar on web) authenticates.
* Login throttle: 5 failed attempts per IP per minute (in-memory).
* Every document route depends on `current_user`, so data is per-user.

* Guest mode: `POST /api/auth/guest` mints an anonymous account (provider
  'guest', unusable password) + session, so an app can skip the sign-in
  screen entirely and still keep per-user data on the server. The guest can
  later `POST /api/auth/upgrade {email, password}` to turn it into a real
  account without losing anything.

What this is NOT: email verification, password reset, roles/admin, OAuth.
Tell users so — the web-builder summary template does.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time
import uuid
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from db import db, now

router = APIRouter(prefix="/api/auth")

COOKIE = "sid"
SESSION_TTL_S = 30 * 24 * 3600
MIN_PASSWORD = 8
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_SCRYPT = dict(n=2**14, r=8, p=1, dklen=32)
_MAX_FAILS, _FAIL_WINDOW_S = 5, 60
_fails: dict[str, deque] = defaultdict(deque)


class Credentials(BaseModel):
    email: str
    password: str


class PasswordChange(BaseModel):
    current: str
    new: str


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


def _set_cookie(response: Response, request: Request, token: str) -> None:
    # Over https the cookie is SameSite=None + Secure so sign-in also works when
    # the app is shown inside the Orvis chat's preview iframe, which is a
    # different site from the app's own domain (a Lax cookie is silently dropped
    # there and every request after login comes back 401). Over plain http
    # (local dev on localhost) browsers reject SameSite=None, so fall back to Lax.
    https = request.headers.get("x-forwarded-proto", "").lower() == "https" or request.url.scheme == "https"
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="none" if https else "lax", secure=https,
        max_age=SESSION_TTL_S, path="/",
    )


def login_external(conn, email: str, name: str, provider: str, picture: str = "") -> str:
    """Find-or-create the local user for an identity verified by Orvis (Google
    login). Linked by email; a brand-new user gets an unusable random password
    hash, so email/password login keeps working for everyone else."""
    email = _norm_email(email)
    row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if row is not None:
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


def _throttle(ip: str) -> None:
    q = _fails[ip]
    t = time.monotonic()
    while q and t - q[0] > _FAIL_WINDOW_S:
        q.popleft()
    if len(q) >= _MAX_FAILS:
        raise HTTPException(429, "too many attempts — wait a minute")


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
            conn.execute("DELETE FROM sessions WHERE token = ?", (token_hash,))
            raise HTTPException(401, "session expired")
    return {
        "id": row["id"], "email": row["email"], "name": row["name"] or "",
        "provider": row["provider"] or "password", "picture": row["picture"] or "",
    }


@router.post("/signup", status_code=201)
def signup(body: Credentials, request: Request, response: Response) -> dict:
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
    ip = request.client.host if request.client else "?"
    _throttle(ip)
    email = _norm_email(body.email)
    with db() as conn:
        row = conn.execute("SELECT id, pw_hash, salt FROM users WHERE email = ?", (email,)).fetchone()
        ok = row is not None and hmac.compare_digest(_hash(body.password, row["salt"]), row["pw_hash"])
        if not ok:
            _fails[ip].append(time.monotonic())
            raise HTTPException(401, "wrong email or password")
        token = _new_session(conn, row["id"])
    _set_cookie(response, request, token)
    return {"id": row["id"], "email": email, "token": token}


@router.post("/guest", status_code=201)
def guest(request: Request, response: Response) -> dict:
    """Anonymous account for apps that run without a sign-in screen (AUTH_MODE
    guest). One per device/browser: the client calls this only when it holds no
    session, and keeps the returned token. The email is a placeholder that can
    never receive mail or be signed into; `upgrade` replaces it."""
    with db() as conn:
        for _ in range(5):
            email = f"guest-{secrets.token_hex(6)}@guest.local"
            if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone() is None:
                break
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
    non-guest (they already have credentials — use /password)."""
    if user.get("provider") != "guest":
        raise HTTPException(400, "this account already has a login")
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


@router.post("/password")
def change_password(body: PasswordChange, request: Request, user: dict = Depends(current_user)) -> dict:
    _check_password(body.new)
    with db() as conn:
        row = conn.execute("SELECT pw_hash, salt FROM users WHERE id = ?", (user["id"],)).fetchone()
        if row is None:
            raise HTTPException(401, "not signed in")
        if not hmac.compare_digest(_hash(body.current, row["salt"]), row["pw_hash"]):
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
