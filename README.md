# Excel Master Academy

A Hinglish, self-paced Excel practice course:

- 32 chapters from Basic to Advanced
- Formula, shortcut and VBA reference libraries
- Practical lab datasets with a CSV header check
- Balanced 20-question practice exams (resumable, level-balanced)
- Charts and dashboard lessons with downloadable practice CSVs
- Aarohi, a friendly illustrated Indian Excel study companion with selectable avatar scenes, learning roleplay, and voice input/output
- A clearly labelled **self-attested practice certificate**

> This is a learning/practice application. Its certificate is **not** an externally
> verified diploma: chapter completion is self-marked and certificate IDs are only
> format-checked in the browser. Do not market it as board/university verified
> until server-graded exams and a certificate registry are implemented.

## Quick start

```bash
# 1. Frontend dependencies (Node 20+, pnpm via Corepack)
corepack enable
corepack pnpm install --frozen-lockfile

# 2. Backend dependencies
python -m venv .venv
.venv/bin/python -m pip install -r server/requirements-dev.txt   # Windows: .venv\Scripts\python.exe

# 3. Run both
source .venv/bin/activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
corepack pnpm dev:all
```

Open the Vite URL (default <http://localhost:5173>). Vite proxies `/api` to
FastAPI on `BACKEND_PORT` (default `8000`). No AI or Orvis keys are required:
Aarohi falls back to the built-in Excel knowledge base.

`pnpm dev:all` starts the API with `scripts/run_server.py`, so the same commands
work in cmd.exe/PowerShell, macOS and Linux (npm scripts used to rely on
`${VAR:-default}`, which only a POSIX shell expands). If the active `python` does
not have the server dependencies, both launchers fall back to `<repo>/.venv`
automatically; any other interpreter can be pointed at with `PYTHON=/path/to/python`.

## How students enter

The app uses **guest-first auth**:

1. On first visit the backend creates an anonymous guest account for that browser.
2. Progress, practice-exam attempts, lab records and certificates are stored per guest on the server.
3. From **Account** a student may upgrade the guest to an email/password account without losing data, or sign in to an account created earlier. Signing into an existing account does not merge a separate guest's progress.
4. **Account → Delete my account** removes the user row, sessions and every document that belongs to them.

There is no default demo password, no password reset and no email verification
(so `google_auth`, if you enable it, never auto-links a Google identity to an
existing password account — that would be an account-takeover path).

Account creation is rate limited per IP (10 guests / 5 accounts per minute) and
logins are limited per (IP, email) — a shared classroom network cannot be locked
out by one student's typos.

## Tech stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, Motion, Lucide
- Backend: Python FastAPI + SQLite (stdlib scrypt password hashing, hashed session tokens)
- Optional platform services: Orvis (`server/orvis.py`, `server/services/`) — see [`docs/optional-services.md`](docs/optional-services.md)
- Optional AI tutor backend: any OpenAI-compatible chat-completions API

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server (`HOST`, `WEB_PORT`) |
| `pnpm dev:server` | FastAPI with `--reload` (`BACKEND_PORT`, `HOST`) |
| `pnpm dev:all` | Both, with combined logs |
| `pnpm typecheck` | `tsc -b` |
| `pnpm test` | Course data + frontend unit tests + backend tests |
| `pnpm test:data` | `scripts/check_data.py` (content validator) |
| `pnpm test:web` | Vitest unit tests (`src/**/*.test.ts`) |
| `pnpm test:server` | Pytest (`server/tests/`) |
| `pnpm build` | Type-check + production bundle into `dist/` |
| `pnpm start` | Serve `dist/` + `/api` from one FastAPI process |

## Environment variables

Backend variables are read from the process environment and `server/.env`
(template: `server/.env.example`). The important ones:

| Variable | Purpose |
|---|---|
| `BACKEND_PORT` / `HOST` | FastAPI port (default `8000`) / bind address (default `127.0.0.1`) |
| `WEB_PORT` / `HOST` | Vite dev port (default `5173`) / bind address (default `0.0.0.0`) |
| `APP_DB_PATH` | SQLite path override (default `server/data.db`) |
| `APP_ALLOWED_ORIGINS` | Extra origins allowed to send cookie-authenticated writes (comma separated) |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Optional OpenAI-compatible key for Aarohi |
| `ORVIS_API_URL`, `ORVIS_APP_ID`, `ORVIS_SECRET_KEY`, `ORVIS_SERVICES` | Optional Orvis platform connection |
| `PAYMENTS_SERVER_PRICE_MINOR` | With the `payments` service: always charge this amount instead of the browser's |
| `DEMO_ENABLED`, `DEMO_EMAIL`, `DEMO_PASSWORD` | Optional demo login; password has no default and must be 8+ chars |

Frontend build-time variables used by the optional Google login:
`VITE_ORVIS_SERVICES`, `VITE_ORVIS_GOOGLE_AUTH=1`. They are not required for the
core guest-first course. Never commit `server/.env` or any real secret.

## Security model (short version)

- Session token in an HttpOnly cookie (`SameSite=None; Secure` over https so the
  app also works inside a preview iframe) and as an optional `Authorization: Bearer`.
  Only the SHA-256 hash of the token is stored.
- Because the cookie is `SameSite=None`, every cookie-authenticated mutation must
  come from this app's own origin: `Sec-Fetch-Site`, `Origin` and `Referer` are all
  checked (`server/main.py`). Cross-site and "same-site but different origin"
  requests get 403.
- `/api/*` responses are `Cache-Control: no-store`; the SPA is served with a CSP.
- Documents are owner-scoped in SQL, collection names starting with `_` are
  reserved for server code, and client-chosen document ids are validated.
- Aarohi calls are rate limited per user, per IP and globally, because a guest
  account is free to create and each call spends your API budget.

## Tests and checks

```bash
corepack pnpm build          # type-check + production build
corepack pnpm test:data      # course-content validator (no dependencies)
corepack pnpm test:web       # vitest: exam logic, certificates, course data, CSV
corepack pnpm test:server    # pytest: auth, CSRF, CRUD, health, services
```

GitHub Actions (`.github/workflows/ci.yml`) runs the build, the frontend tests,
Ruff, the content validator, the backend tests, `pnpm audit --audit-level high`,
`pip-audit`, and a `docker build` of the production image.

## Project map

| Path | What lives there |
|---|---|
| `src/App.tsx` | Guest auth gate, hash routing, app shell (views are code-split) |
| `src/views/` | Dashboard, Chapters, Lab, Exam, Reference, Charts, Notes, Aarohi, Certificate, Account |
| `src/data/` | Course content: chapters, questions, formulas, shortcuts, labs, charts, VBA, tutor |
| `src/lib/exam.ts` | Pure exam logic: question selection, quotas, grading |
| `src/lib/store.ts` | Shared per-collection cache over `/api/c/{collection}` |
| `src/lib/academy.ts` | Progress/exam/lab/certificate document types + certificate ids |
| `src/lib/api.ts` | Fetch wrapper: same-origin cookies, timeouts, `ApiError` |
| `server/main.py` | FastAPI entrypoint, CSRF/origin guard, security headers, SPA fallback |
| `server/auth.py` | Guest/email auth, scrypt passwords, hashed session tokens, rate limits |
| `server/crud.py` | Owner-scoped generic document CRUD |
| `server/assistant.py` | Authenticated, rate-limited Aarohi LLM endpoint |
| `server/db.py` | SQLite schema + numbered migrations |
| `server/services/` | Optional Orvis-backed AI, OAuth, uploads, images, email and payments |
| `scripts/check_data.py` | Dependency-free course-data validator |
| `scripts/run_server.py` | Cross-platform server launcher used by `pnpm dev:server` / `start` |
| `scripts/make_icons.py` | Generates the PWA PNG icons |
| `server/tests/` | Backend API/security and content-validator tests |

Adding course content (a chapter, question, formula, shortcut, VBA snippet) is
described in [`CONTRIBUTING.md`](CONTRIBUTING.md).

More docs: [API reference](docs/API.md) ·
[optional platform services](docs/optional-services.md) ·
[Aarohi notes](ASSISTANT_PROMPTS.md) · [deployment](DEPLOY.md)

## Current limitations (intentional for this practice version)

- No teacher/admin role or cross-student dashboard.
- Lab workbooks are not uploaded to the server; Lab saves a practice record and
  checks the CSV header row only. Students keep their own files.
- Exam questions/answers ship in the frontend bundle and grading is client-side.
- Certificate IDs are not verified against a server registry.
- No password reset or email verification.
- Chat history and streaks are per browser and are cleared when a different
  account signs in on that device (classroom machines are shared).
- Payment helpers in the Orvis template services are dormant unless provisioned;
  never sell a real product using a browser-supplied amount — price server-side
  (or set `PAYMENTS_SERVER_PRICE_MINOR`).

## Licence

MIT — see [`LICENSE`](LICENSE). The course text and illustrations are part of the
same repository; check with the original author before republishing them as your
own course.
