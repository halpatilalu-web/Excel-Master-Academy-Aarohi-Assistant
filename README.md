# Excel Master Academy — Complete Excel Diploma Course

A bilingual (Hindi + English), self-paced **Excel Diploma Practice Course**:

- **45 chapters across 9 Diploma Modules** from Basic Excel to Advanced Formulas, Data Cleaning, Conditional Formatting, Data Validation, XLOOKUP & INDEX-MATCH, Pivot Dashboards, Power Query, VBA Macros, Report Color Theory, All 12 Error Auditing, Database (`DSUM`/`DGET`), Indian GST/Payroll Accounts, and AI Automation
- **Bilingual Hindi + English switcher** (`Hindi + English`, `Hindi`, `English`) across chapters, notes, infographics, videos, 3D lessons, practice sheets, toolkit, and sample papers
- **All 45 Handwritten Notebook Pages + 10 Professional Visual Infographics** + **Personal Student Auto-Saved Study Scratchpad** per chapter
- **🧰 Pro Toolkit & Career Hub**: Interactive **5-Part Excel AI Automation Prompt Builder**, **Report Color Theory & Live HEX/RGB Palette Studio**, **All 12 Excel Errors Diagnostic Doctor**, **400-Shortcut Speed Flashcard Trainer**, and **Corporate MIS Interview Q&A Bank**
- **269 Formulas** (including full `Database` & `Audit` categories + Best-For vs Limitations comparison matrix + ⭐ Favorites), **400 Shortcut Keys**, and **40 VBA Automation Macros**
- **8 Animated Video Lessons + 10 AI-Generated 3D Excel Illustrations**
- **6 Interactive 3D Excel Lessons** (3D Pivot Cube, 3D Sheet Stack, 3D Lookup Laser, 3D Conditional Chart Cityscape, 3D Power Query Pipeline, 3D VBA Macro Robot)
- **7 In-Browser Live Practice Spreadsheets** (including **Live GST Tax Invoice CGST/SGST/IGST**) + 11 downloadable `.xlsx` / `.csv` corporate project datasets
- **6 Solved Diploma Sample Papers**, **9 Module Topic Quizzes**, and **Timed 20-Question Final Practice Exam**
- **Aarohi Live AI Assistant** (floating chat + voice assistant on every screen & full-screen AI studio)
- A clearly labelled **self-attested practice certificate**

> This is a learning/practice application. Its certificate is **not** an externally
> verified diploma: chapter completion is self-marked and certificate IDs are only
> format-checked in the browser. Do not market it as board/university verified
> until server-graded exams and a certificate registry are implemented.

## How students enter

The app uses **guest-first auth**:

1. On first visit, the backend creates an anonymous guest account for that browser.
2. Progress, practice-exam attempts, lab records and certificates are saved per guest on the server.
3. From **Account**, a student may upgrade the guest to an email/password account without losing data, or sign in to an account created earlier. Signing into an existing account does not merge a separate guest's progress.

There is no default demo password. Password reset, email verification and real admin roles are not implemented.

## Tech stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, Motion, Lucide
- Backend: Python FastAPI + SQLite (stdlib auth with scrypt password hashing)
- Optional platform services: Orvis (`server/orvis.py`, `server/services/`)
- Optional AI tutor backend: any OpenAI-compatible chat-completions API

## Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm via Corepack
- Python 3.12+ (see `.python-version`)

## Local development

### 1. Install frontend dependencies

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

### 2. Install backend dependencies

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r server/requirements-dev.txt
```

On Windows PowerShell, use `.venv\Scripts\python.exe` instead of `.venv/bin/python`.

### 3. Configure the backend

Copy the example and fill only what you use:

```bash
cp server/.env.example server/.env
```

For basic chapters/progress/exams, no AI or Orvis keys are required. Aarohi will
fall back to the built-in Excel knowledge base when no online AI is configured.

### 4. Run frontend + backend

The package scripts call `uvicorn` directly, so activate the venv first:

```bash
source .venv/bin/activate
corepack pnpm dev:all
```

Open the Vite URL printed in the terminal (default `http://127.0.0.1:5173`).
Vite proxies `/api` to FastAPI on `BACKEND_PORT` (default `8000`).

## Production-style run

For the easiest public deployment (GitHub + Render, using the included
`Dockerfile` and `render.yaml`), follow [`DEPLOY.md`](DEPLOY.md).

To run the production build locally, build the frontend, then let FastAPI serve both `dist/` and `/api` from one process:

```bash
corepack pnpm build
source .venv/bin/activate
corepack pnpm start
```

By default the backend binds to `127.0.0.1`; put it behind your platform/reverse
proxy as appropriate. Persist and back up `server/data.db` (or set `APP_DB_PATH`
to a durable path). SQLite is suitable for a single-instance deployment; use a
managed database before running multiple backend replicas.

## Environment variables

Backend variables are read from the process environment and `server/.env`.
See `server/.env.example` for the full template. The important ones are:

| Variable | Purpose |
|---|---|
| `BACKEND_PORT` | FastAPI port (default `8000`) |
| `WEB_PORT` | Vite dev port (default `5173`) |
| `APP_DB_PATH` | SQLite path override (default `server/data.db`) |
| `LLM_API_KEY` | Optional OpenAI-compatible key for Aarohi |
| `LLM_BASE_URL` | Optional LLM base URL (default OpenAI) |
| `LLM_MODEL` | Optional LLM model name |
| `ORVIS_API_URL`, `ORVIS_APP_ID`, `ORVIS_SECRET_KEY` | Optional Orvis platform connection |
| `ORVIS_SERVICES` | Comma-separated Orvis services to mount, e.g. `ai,storage` |
| `DEMO_ENABLED` | Set `1` only if you intentionally want a demo login |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Demo credentials; password has no default and must be 8+ chars |

Never commit `server/.env` or any real secret.

Frontend build-time variables used by the template service helpers include
`VITE_ORVIS_SERVICES` and `VITE_ORVIS_GOOGLE_AUTH=1`. They are not required for
the core guest-first course.

## Tests and checks

```bash
# Frontend type-check + production build
corepack pnpm build

# Course-data validation (chapters/questions/formulas/shortcuts/VBA)
corepack pnpm test:data

# Backend security/API tests (activate the venv where requirements-dev.txt was installed)
source .venv/bin/activate
corepack pnpm test:server
```

GitHub Actions (`.github/workflows/ci.yml`) runs the same build, data check and
backend tests on pushes to `main` and on pull requests.

## Project map

| Path | What lives there |
|---|---|
| `src/App.tsx` | Guest auth gate, hash routing, app shell |
| `src/views/` | Dashboard, Chapters, Lab, Exam, Reference, Charts, Notes, Aarohi, Certificate, Account |
| `src/data/` | Course content: chapters, questions, formulas, shortcuts, labs, charts, VBA, tutor |
| `src/lib/store.ts` | Per-user server collection hooks over `/api/c/{collection}` |
| `src/lib/academy.ts` | Progress/exam/lab/certificate document types |
| `server/main.py` | FastAPI entrypoint and safe SPA fallback |
| `server/auth.py` | Guest/email auth, scrypt passwords, hashed session tokens |
| `server/crud.py` | Owner-scoped generic document CRUD |
| `server/assistant.py` | Authenticated, rate-limited Aarohi LLM endpoint |
| `server/services/` | Optional Orvis-backed AI, OAuth, uploads, images, email and payments |
| `scripts/check_data.py` | Dependency-free course-data validator |
| `server/tests/` | Backend API/security regression tests |

## Current limitations (intentional for this practice version)

- No teacher/admin role or cross-student dashboard.
- Lab workbooks are not uploaded to the server; Lab saves a practice record and
  performs only a basic CSV column-name check. Students keep their own files.
- Exam questions/answers ship in the frontend bundle and grading is client-side.
- Certificate IDs are not verified against a server registry.
- No password reset or email verification.
- Payment helpers in the Orvis template services are dormant unless provisioned;
  never sell a real product using a browser-supplied amount — price server-side.
