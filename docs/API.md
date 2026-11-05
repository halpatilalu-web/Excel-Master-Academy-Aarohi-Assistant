# API reference

One FastAPI process serves `/api/*` and, after `pnpm build`, the SPA from `dist/`.
Interactive docs are disabled (`docs_url=None`) because the schema is small
enough to keep here — this file is the contract.

Conventions:

- **Auth**: every route marked *auth* requires the session cookie (`sid`) or
  `Authorization: Bearer <token>`. Both come from `/api/auth/*`.
- **Errors**: `{"detail": "message"}` with FastAPI status codes. Messages are
  meant for students, not logs.
- **Mutating cookie requests** must come from the app's own origin, otherwise 403
  (see `server/main.py`). Bearer clients are exempt — they must opt in.
- **`/api/*` responses** are `Cache-Control: no-store`.

## Auth — `server/auth.py`

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/guest` | – | 201. Anonymous account + session. 10/min per IP |
| POST | `/api/auth/signup` | `{email, password}` | 201. 5/min per IP, 409 if taken, 400 weak/invalid |
| POST | `/api/auth/login` | `{email, password}` | 200. 5 failures per (IP, email) per minute → 429 + `Retry-After`; a success clears the bucket |
| POST | `/api/auth/upgrade` | `{email, password}` | 200. Guest → password account, keeps data + session. 400 if not a guest, 409 if taken |
| POST | `/api/auth/password` | `{current, new}` | 200. Signs out every *other* session. 5 attempts/min per user |
| POST | `/api/auth/logout` | – | 200. Deletes the session row and the cookie |
| GET | `/api/auth/me` | – | *auth*. `{id, email, name, provider, picture}` |
| DELETE | `/api/auth/account` | – | *auth*. 204. Deletes docs, sessions and the user |

Password rules: 8–200 characters. Emails are lower-cased and length-checked.

## Documents — `server/crud.py`

A generic, owner-scoped JSON store. `col` matches `[A-Za-z0-9_-]{1,64}` and may
not start with `_` (reserved for server-side service data). Document `id`s match
`[A-Za-z0-9_-]{1,128}`; omit it and the server assigns a uuid. `id`, `_created`
and `_updated` are managed by the server. Bodies are capped at 64 000 characters.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/c/{col}?sort=-updated&limit=200` | *auth*. `sort` is `created`/`updated`, `-` for descending; `limit` 1..1000 |
| POST | `/api/c/{col}` | *auth*. 201, 409 if the id exists, 413 if too large |
| GET | `/api/c/{col}/{id}` | *auth*. 404 when not yours |
| PUT | `/api/c/{col}/{id}` | *auth*. Full body replace, 404 if missing |
| DELETE | `/api/c/{col}/{id}` | *auth*. 204 |
| GET | `/api/export` | *auth*. `{exported, user, collections}` — every document of the caller |

Collections the app uses: `progress`, `exams`, `submissions`, `certs`
(see `src/lib/academy.ts`).

## Aarohi — `server/assistant.py`

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/assistant` | `{messages: [{role, content}]}` | *auth*. `{reply, source}`; 1–20 messages, each 1–4000 chars, ≤24 000 chars total after trimming |

Limits: 20/min per user, 40/min per IP, 120/min per process (each call spends the
owner's LLM budget). If no LLM is configured the route answers 502 and the client
falls back to the offline tutor in `src/data/tutor.ts`.

## Health and platform

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{status: "ok"}` after a real SQLite probe; 503 `{status:"error"}` when the DB is unusable. Used by Docker/Render health checks |
| GET | `/api/services` | Which optional services are mounted (always present, inert by default) |

Optional service routes (AI chat, uploads, images, email, payments, Google login)
exist only when `ORVIS_SERVICES` names them — see
[`optional-services.md`](optional-services.md).

## SPA fallback

Every other GET serves `dist/index.html` with a CSP, so client-side hash routing
works. Files outside `dist/` are never served; unknown `/api/*` paths return a
JSON 404.
