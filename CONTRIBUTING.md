# Contributing

Thanks for helping. This repo is a practice course plus the small FastAPI server
behind it, so most changes are either **course content** or **app code**.

## Set up

```bash
corepack enable
corepack pnpm install --frozen-lockfile
python -m venv .venv
.venv/bin/python -m pip install -r server/requirements-dev.txt
cp server/.env.example server/.env      # optional: only if you use AI/Orvis
source .venv/bin/activate
corepack pnpm dev:all
```

## Before you push

```bash
corepack pnpm test          # content validator + vitest + pytest
corepack pnpm build         # type-check + production build
python -m ruff check server scripts
```

All four run in CI. A pull request that fails any of them will not be merged.
If `pnpm test:server` says pytest is missing, the venv is not active — the script
detects `<repo>/.venv` itself, or you can pass `PYTHON=/path/to/python`.

## Adding course content

Course data lives in `src/data/*.ts` and is written in a compact, hand-editable
form. Two rules keep it working:

1. **`scripts/check_data.py` and `src/data/course.test.ts` must pass.** They
   validate the same content from two directions (source text vs. imported
   objects), so a broken row fails twice — that's intentional.
2. **Field counts are fixed.** Each row is pipe-delimited and every pipe starts a
   new field. Do not put a `|` inside a field.

### A chapter — `src/data/chapters.ts`

```ts
C(
  33,                                  // number: must continue 1..N with no gaps
  "Advanced",                          // "Basic" | "Intermediate" | "Advanced"
  "Chapter title",
  "One-paragraph intro in Hinglish.",
  ["Point 1", "Point 2", "Point 3"],   // the handwritten-notes list
  "One practical tip.",
  [
    Q("Question text?", ["A", "B", "C", "D"], 1),   // third argument = 0-based correct option
    Q("Second question?", ["A", "B", "C", "D"], 3),
  ],
  { f: "=FORMULA(A1)", note: "What it does" },      // optional formula card
),
```

Every chapter needs exactly **two** quick-check questions, four non-empty
options each, and an answer index in `0..3`. Adding a chapter also needs
`CHAPTER_COUNT` updated in `scripts/check_data.py` (it is asserted, not inferred).

### An exam question — `src/data/questions.ts`

`question | option1 | option2 | option3 | option4 | answer(0-3) | chapter(1-32)`

Questions are de-duplicated by text against the chapter quizzes, and the exam
draws a fixed level mix (6 Basic / 8 Intermediate / 6 Advanced). Keep enough
questions per level — the validator checks the pool, and the exam falls back to
whatever is available.

### A formula or shortcut — `src/data/formulas.ts`, `src/data/shortcuts.ts`

```
formula:  NAME|=SYNTAX|Hindi explanation|Example|chapter (0 = no chapter link)
shortcut: Win keys|Mac keys|What it does          ("-" when a shortcut has no Mac twin)
```

### A VBA snippet — `src/data/vba.ts`

Blocks inside the `RAW` template are separated by a line containing `===`:

```
Basic
Title
One-line Hindi description
Sub Example()
    ' code
End Sub
```

### A lab — `src/data/labs.ts`

Labs generate their CSV in the browser. `need` lists the **columns the student
must add** before uploading — never a column that already exists in the generated
file, or the check passes without any work.

## Changing app code

- **Types and the build are the contract.** `pnpm typecheck` must be clean; there
  is no `any` budget in `src/lib`.
- **Server routes that mutate data need the CSRF/origin guard** (it is automatic
  for cookies; bearer clients are exempt by design).
- **Every new document collection** goes through `src/lib/store.ts`; do not
  hand-roll `fetch("/api/c/…")`.
- **New backend state** goes into `server/db.py` as a numbered migration. Do not
  patch tables ad hoc.
- **Money-touching code** may never trust an amount from the browser.
- Add a test with the fix. `server/tests/` for Python, `src/**/*.test.ts` for
  TypeScript. Tests must not share a database — use the `client` fixture.

## Style

- TypeScript: 2 spaces, double quotes, `const` over `let`, no default exports
  except views.
- Python: standard library first; `from __future__ import annotations` at the top;
  keep modules importable without optional dependencies.
- Comments explain *why* (especially for anything security-related), not *what*.
- UI copy is Hinglish, matching the rest of the course. Errors should tell the
  student what to do next.

## Reporting a bug

Open an issue with: what you did, what happened, what you expected, and the
browser/OS or the failing command's output. For anything security-related, follow
[`SECURITY.md`](SECURITY.md) instead of opening a public issue.
