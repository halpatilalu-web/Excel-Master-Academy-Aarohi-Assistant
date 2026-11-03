"""FastAPI entrypoint — one port serves /api/* and (after `pnpm build`) the SPA.

Dev:  `pnpm dev:all` runs Vite (public) + this server (127.0.0.1 only); Vite
      proxies /api here, so the browser sees a single origin and cookies flow.
Prod: `pnpm build && pnpm start` — this process serves dist/ and /api/*.

On startup: create tables, then seed the demo account (+ server/seed.json).
"""

from __future__ import annotations

import html as _html
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from orvis import load_env

load_env()  # server/.env (written by provision-service.py) before anything reads ORVIS_*

from auth import router as auth_router
from crud import router as crud_router
from assistant import router as assistant_router
from db import init_db
from seed import seed
from services import include_enabled

_PROJECT = Path(__file__).resolve().parent.parent
_DIST = _PROJECT / "dist"


def _expo_app_name() -> str:
    """The app's name when this server belongs to an Expo project, else "".

    A phone app never builds a `dist/`: its screens run in Metro and on the
    device, and this process is only the API behind them. Telling its reader
    to run `pnpm build` points at a build that will never exist.
    """
    try:
        data = json.loads((_PROJECT / "app.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return ""
    expo = data.get("expo") if isinstance(data, dict) else None
    if not isinstance(expo, dict):
        return ""
    return str(expo.get("name") or "").strip() or "This app"


_API_PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{name}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         background:#f7f7f8; color:#18181b; padding:24px; }}
  @media (prefers-color-scheme: dark) {{ body {{ background:#131316; color:#f4f4f5; }} }}
  main {{ max-width:26rem; text-align:center; }}
  h1 {{ font-size:1.25rem; margin:0 0 .5rem; }}
  p {{ margin:0; opacity:.7; font-size:.94rem; }}
</style></head>
<body><main>
  <h1>{name}</h1>
  <p>This address is the app&rsquo;s backend. The app itself runs on your phone.</p>
</main></body></html>
"""


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    init_db()
    print(f"[server] db ready; seed: {seed()}", flush=True)
    yield


app = FastAPI(title="app-server", lifespan=_lifespan, docs_url=None, redoc_url=None)

# The web template is same-origin (Vite proxies /api; in prod this process
# serves the SPA), so CORS never applies to it. The mobile template (Expo) runs
# on another origin in the browser preview and on a phone: it authenticates
# with `Authorization: Bearer` (see auth.py), never a cookie, so a wildcard
# origin WITHOUT credentials is safe — the browser will not attach the session
# cookie cross-site, and a bearer token has to be added on purpose.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _safety_headers_and_csrf(request, call_next):
    # Cookie-authenticated mutations must not be triggered cross-site.
    # Bearer clients (mobile) and signed webhooks carry no session cookie.
    if (
        request.method not in ("GET", "HEAD", "OPTIONS")
        and request.url.path.startswith("/api/")
        and request.cookies.get("sid")
        and not request.headers.get("authorization")
        and request.headers.get("sec-fetch-site") == "cross-site"
    ):
        return JSONResponse({"detail": "cross-site request blocked"}, status_code=403)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "same-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
    return response


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Store listings need a public privacy-policy URL. `store-kit.py` (mobile-builder)
# writes <project>/store/privacy-policy.html; this serves it at /privacy on the
# app's own public host, so the URL pasted into Play Console / App Store Connect
# is the app's, not Orvis's. 404 until the kit exists.
_STORE_DIR = Path(__file__).resolve().parent.parent / "store"


@app.get("/privacy")
def privacy_policy():
    page = _STORE_DIR / "privacy-policy.html"
    if page.is_file():
        return FileResponse(page, media_type="text/html")
    return JSONResponse({"detail": "no privacy policy published yet"}, status_code=404)


app.include_router(auth_router)
app.include_router(crud_router)
app.include_router(assistant_router)
# Platform services (AI chat, …): routers mount only for names in ORVIS_SERVICES.
include_enabled(app)

if (_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=_DIST / "assets"), name="assets")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """Serve dist/index.html for any non-/api route so client-side routing works."""
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "not found"}, status_code=404)
    if full_path:
        dist = _DIST.resolve()
        candidate = (dist / full_path).resolve()
        # Never serve files outside dist/ (e.g. ../server/.env or data.db).
        if candidate.is_relative_to(dist) and candidate.is_file():
            return FileResponse(candidate)
    index = _DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    name = _expo_app_name()
    if name:
        return HTMLResponse(
            _API_PAGE.format(name=_html.escape(name)),
            status_code=200 if not full_path else 404,
        )
    return JSONResponse(
        {"detail": "frontend not built — run `pnpm build`, or use `pnpm dev:all` in development"},
        status_code=404,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=int(os.environ.get("BACKEND_PORT", "8000")), reload=True)
