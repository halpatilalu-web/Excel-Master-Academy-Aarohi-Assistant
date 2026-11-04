"""FastAPI entrypoint — one port serves /api/* and (after `pnpm build`) the SPA.

Dev:  `pnpm dev:all` runs Vite (public) + this server (127.0.0.1 only); Vite
      proxies /api here, so the browser sees a single origin and cookies flow.
Prod: `pnpm build && pnpm start` — this process serves dist/ and /api/*.

On startup: migrate/create tables, purge dead sessions, then seed the demo
account (+ server/seed.json).
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from orvis import load_env

load_env()  # server/.env (written by provision-service.py) before anything reads ORVIS_*

from assistant import router as assistant_router
from auth import purge_expired_sessions
from auth import router as auth_router
from crud import router as crud_router
from db import db, init_db
from seed import seed
from services import include_enabled

_PROJECT = Path(__file__).resolve().parent.parent
_DIST = _PROJECT / "dist"

# Extra origins allowed to send cookie-authenticated mutations, for deployments
# that serve the SPA from another host (e.g. a CDN) — comma separated, full
# origins, e.g. APP_ALLOWED_ORIGINS=https://excel.example.com
_EXTRA_ORIGINS = {
    o.strip().rstrip("/")
    for o in os.environ.get("APP_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
}

_LOOPBACK = {"localhost", "127.0.0.1", "::1", "[::1]"}


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    init_db()
    purged = purge_expired_sessions()
    print(f"[server] db ready; seed: {seed()}; purged {purged} expired session(s)", flush=True)
    yield


app = FastAPI(title="app-server", lifespan=_lifespan, docs_url=None, redoc_url=None)

# The web app is same-origin (Vite proxies /api; in prod this process serves the
# SPA), so CORS never applies to it. A mobile client runs on another origin and
# authenticates with `Authorization: Bearer`, never a cookie, so a wildcard
# origin WITHOUT credentials is safe — the browser will not attach the session
# cookie cross-site, and a bearer token has to be added on purpose.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _origin_of(value: str) -> str:
    """`scheme://host:port` for an Origin/Referer value, or "" when malformed."""
    try:
        parts = urlsplit(value)
    except ValueError:
        return ""
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return ""
    return f"{parts.scheme}://{parts.netloc}".lower()


def _same_origin(request, candidate: str) -> bool:
    """Is `candidate` this app's own origin (the one the browser used)?

    Only the **host[:port]** is compared, not the scheme. TLS normally ends at a
    proxy in front of us (Render, a tunnel, the Vite dev proxy), so this process
    sees `http` even though the browser used `https` — and adding
    `x-forwarded-proto` to the comparison silently 403'd every dev write made
    through an https preview URL. The security property that matters is "the
    page that sent this is served from our own host"; whoever controls the
    scheme of our hostname already controls the deployment.
    """
    if not candidate:
        return False
    if candidate in _EXTRA_ORIGINS:
        return True
    parts = urlsplit(candidate)
    if parts.netloc and parts.netloc.lower() == (request.headers.get("host") or "").lower():
        return True
    # Proxied dev servers rewrite Host; a loopback origin is still same-machine.
    return parts.scheme == "http" and (parts.hostname or "") in _LOOPBACK


def _csrf_blocked(request) -> bool:
    """Cookie-authenticated mutations must come from this app's own origin.

    Three layers, because the session cookie is SameSite=None over https:
      1. `Sec-Fetch-Site: cross-site` → always reject (covers any browser that
         does not send Origin).
      2. An `Origin` that is not ours → reject (this is what stops "same-site"
         attackers: another app on *.onrender.com, a sibling subdomain, a
         subdomain takeover).
      3. No Origin but a foreign `Referer` → reject.
    Non-browser clients (curl, tests, mobile) send neither header and remain
    able to use the cookie or a bearer token.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return False
    if not request.url.path.startswith("/api/"):
        return False
    if not request.cookies.get("sid"):
        return False
    if request.headers.get("authorization"):
        return False  # explicit bearer auth, added by the client on purpose
    if request.headers.get("sec-fetch-site", "").lower() == "cross-site":
        return True
    origin = request.headers.get("origin")
    if origin:
        return not _same_origin(request, _origin_of(origin))
    referer = request.headers.get("referer")
    if referer:
        return not _same_origin(request, _origin_of(referer))
    return False


@app.middleware("http")
async def _safety_headers_and_csrf(request, call_next):
    if _csrf_blocked(request):
        return JSONResponse({"detail": "cross-origin request blocked"}, status_code=403)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
    if request.url.path.startswith("/api/"):
        # Per-user data: never let a proxy or the bfcache replay it.
        response.headers.setdefault("Cache-Control", "no-store")
    if request.url.scheme == "https" or request.headers.get("x-forwarded-proto", "").lower() == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.get("/api/health")
def health() -> Response:
    """Liveness + a real database probe (Docker/Render health checks use this)."""
    try:
        with db() as conn:
            conn.execute("SELECT 1 FROM docs LIMIT 1").fetchone()
    except Exception as exc:  # pragma: no cover - only on a broken/unwritable db
        return JSONResponse({"status": "error", "detail": type(exc).__name__}, status_code=503)
    return JSONResponse({"status": "ok"})


app.include_router(auth_router)
app.include_router(crud_router)
app.include_router(assistant_router)
# Platform services (AI chat, …): routers mount only for names in ORVIS_SERVICES.
include_enabled(app)

if (_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
def spa_fallback(full_path: str):
    """Serve dist/index.html for any non-/api route so client-side routing works.

    `index.html` gets a Content-Security-Policy that matches what the built app
    actually loads (self, Google Fonts, and the Razorpay checkout script used by
    the optional payments service). No `frame-ancestors`, so the app can still
    be embedded in a preview iframe.
    """
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "not found"}, status_code=404)
    if full_path:
        dist = _DIST.resolve()
        candidate = (dist / full_path).resolve()
        # Never serve files outside dist/ (e.g. ../server/.env or data.db).
        if candidate.is_relative_to(dist) and candidate.is_file():
            return FileResponse(candidate)
        # A missing *file* is a 404, not the SPA. Returning index.html for a
        # stale /assets/chunk-abc.js makes the browser report "Unexpected token
        # '<'" and hides the real cause (an old tab after a deploy).
        if Path(full_path).suffix:
            return JSONResponse({"detail": "not found"}, status_code=404)
    index = _DIST / "index.html"
    if index.is_file():
        return FileResponse(
            index,
            headers={
                "Content-Security-Policy": (
                    "default-src 'self'; "
                    "script-src 'self' https://checkout.razorpay.com; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: blob:; "
                    "connect-src 'self' https://checkout.razorpay.com; "
                    "frame-src https://api.razorpay.com https://checkout.razorpay.com; "
                    "object-src 'none'; base-uri 'self'; form-action 'self'"
                )
            },
        )
    return JSONResponse(
        {"detail": "frontend not built — run `pnpm build`, or use `pnpm dev:all` in development"},
        status_code=404,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("BACKEND_PORT", "8000")), reload=True)
