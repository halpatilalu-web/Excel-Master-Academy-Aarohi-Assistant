# Aarohi implementation notes

Aarohi is implemented in the main app. There is no separate add-on copy to keep in sync.

## Where things live

| Piece | File | What it does |
|---|---|---|
| Brain (offline teacher) | `src/lib/aarohi/brain.ts` | Reads the question's intent, composes the answer |
| Intent reader | `src/lib/aarohi/intent.ts` | Is this a definition, how-to, error, example, comparison, practice, follow-up… |
| Knowledge base | `src/data/aarohi/*.ts` | 35 concepts, each with steps, real examples, mistakes, practice |
| Orchestrator | `src/lib/aarohi/respond.ts` | Brain first, model for open questions, brain as fallback |
| Message renderer | `src/components/AssistantText.tsx` | Tables, formula blocks with copy, numbered step cards |
| Chat UI | `src/views/Aarohi.tsx`, `src/components/FloatingAssistant.tsx` | Both surfaces use the same orchestrator |
| Server endpoint | `server/assistant.py` | `POST /api/assistant` → Gemini / OpenAI-compatible / Orvis / built-in |
| Last-resort tutor | `src/data/tutor.ts` (`aarohiReply`) | Synchronous one-liners if the brain chunk cannot load |

## Why the brain exists

The old tutor matched a keyword and printed one fixed paragraph. "VLOOKUP kya hai",
"VLOOKUP step by step sikhao", "isme #N/A kyun aaya" and "A2 par kya hoga" all
returned the same text, and a follow-up returned it again. The brain fixes that by
reading the **intent** first and composing from parts:

- **define** → what it is, the mental model, syntax, one worked example, practice
- **howto** → numbered steps in Excel's own order, then every argument, then an example
- **example** → a small sheet with real numbers, the formula, the result, and why
- **debug** → symptom → cause → fix (matched to the error code the student typed)
- **compare** → both concepts side by side, when to use which, both syntaxes
- **practice** → a task built from the concept's own practice line
- **follow-up** ("aur samjhao") → continues the previous topic instead of restarting

A pasted table (`Name | Sales …`) or a pasted formula (`=VLOOKUP(...)`) is used
literally in the answer, so the reply is about the student's own data.

## Answer sources, in order

1. **Brain** — instant, free, offline. Used whenever it recognises the topic
   (`confident === true`). No network call is made at all.
2. **Browser key** (`src/lib/aarohi/provider.ts`) — if a key was pasted in
   Aarohi → ⚙️, the provider is called **directly from the browser**. This is the
   only way a static host (GitHub Pages, Vercel) can have a real model, because
   those deployments have no `/api`. The key sits in `localStorage`
   (`aarohi_ai_config_v1`) and is cleared when the signed-in account changes.
3. **App server** — `/api/assistant`. The key lives in the server environment and
   never reaches the browser. Configure one:
   - `GEMINI_API_KEY` (free tier) → `GEMINI_MODEL` (optional — see below)
   - `LLM_API_KEY` + optional `LLM_BASE_URL` / `LLM_MODEL` (any OpenAI-compatible API)
   - Orvis (`ORVIS_SERVICES`)
4. **Brain text with an "offline" badge** and the actual reason — if the provider
   fails (bad key, quota, blocked, no network). The chat never goes empty, and the
   message says what to fix instead of a generic "unavailable".

The provider picker has four modes: **Auto** (browser key if present, else
server), **Gemini**, **OpenAI-compatible** (base URL + model are editable, so
Groq/Ollama/OpenRouter work), and **Sirf built-in** (guarantees zero network
calls).

### When Google retires a model

It happened: `gemini-2.0-flash` was removed and the API started answering
"…is no longer available. Please update your code to use models/gemini-3.8-flash",
which broke every chat that had a saved model name. Both sides now heal
themselves, so a retirement is a one-second hiccup instead of an outage:

1. the configured model,
2. **the model Google names in its own error message** (regex on `models/<name>`),
3. `GET /v1beta/models` — every model the key can actually use, flash preferred,
4. `MODEL_FALLBACKS` / `GEMINI_FALLBACKS` shipped with the build.

Only a *retired model* triggers the fallback (`404` or "no longer available").
A bad key or a quota error fails once, immediately — no stampede.

The panel's model field is a dropdown with an **Auto** option (empty = use the
default) plus a 🔄 button that lists what the key can use. If a saved model is no
longer offered, the panel switches to Auto and says so. `describeProvider()` and
the Test button report the model that **actually answered**, so the UI can never
claim a retired model is working.

### Where the key lives — and why it matters

| Deployment | Key location | Reaches the browser? |
|---|---|---|
| Docker / Render / local | server env (`GEMINI_API_KEY`) | never |
| GitHub Pages / Vercel | `localStorage` via ⚙️ | yes — by design, there is no server |

Because a classroom machine is shared, `aarohi_ai_config_v1` is in
`USER_SCOPED_KEYS` (`src/lib/prefs.ts`): signing in as someone else, or signing
out, removes the pasted key.

The server logs which provider failed and tries the next one, so one dead provider
never takes Aarohi down.

## Bundle cost

The brain is ~104 kB raw / 37 kB gzip, so it is a **lazy chunk**
(`dist/assets/brain-*.js`), loaded on the first question and cached by the service
worker afterwards. The entry bundle grew only ~6 kB gzip, and the home page does not
download the brain at all.

## Cost / abuse limits (unchanged)

- 20 requests/minute per user, 40/minute per IP, 120/minute per process
- Last 20 messages, each capped at 4,000 characters, ~24,000 characters total
- 429s carry `Retry-After`; upstream failures return a friendly 502 and log the real error

## Student-facing behaviour that must not regress

- Chat history in `localStorage` (`aarohi_excel_chat_v5`), cleared per student so
  classroom machines do not leak conversations.
- Voice: Web Speech for input (`hi-IN`), `speechSynthesis` for output, with markdown
  and emoji stripped before speaking.
- Aarohi is a study companion: personal-photo and romantic requests are declined and
  redirected to Excel. Off-topic questions get an honest "I teach Excel" answer.
- She never invents a formula. Unknown functions produce an honest method-level
  answer and a request for the function name.
