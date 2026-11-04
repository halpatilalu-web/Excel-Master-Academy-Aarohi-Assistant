# Aarohi implementation notes

Aarohi is implemented in the main app. There is no separate add-on copy to keep in sync.

## Where things live

- System prompt and online model call: `server/assistant.py` (`SYSTEM_PROMPT`, `POST /api/assistant`)
- Browser client + Web Speech helpers: `src/lib/assistant.ts`
- Chat UI: `src/views/Aarohi.tsx`
- Offline Excel fallback: `src/data/tutor.ts` (`aarohiReply`, `SUGGESTIONS`)

## Behaviour

- The endpoint requires the app's guest/account session.
- Only the last 20 messages are sent, each capped at 4,000 characters, and the
  whole payload is trimmed to ~24,000 characters before it leaves the server.
- **Cost limits** (`server/assistant.py`): 20 requests/minute per user,
  40/minute per IP and 120/minute per process. Guest accounts are free to create,
  so limits are per-IP as well as per-account; without them a script could spend
  the owner's LLM budget. 429s carry `Retry-After`.
- Upstream failures return a friendly 502 (`Aarohi abhi online nahi hai…`) and log
  the real exception server-side; the UI silently falls back to the offline tutor.
- Chat history is kept in browser `localStorage` (`aarohi_excel_chat_v4`) and can be
  cleared from the UI; the chosen avatar scene is saved under
  `aarohi_avatar_scene_v1`. Both are **per student**: signing in as a different
  account (or signing out) clears them, because classroom machines are shared.
- Speech-to-text uses the browser Web Speech API (`hi-IN`) when available.
- Text-to-speech uses `speechSynthesis`, strips code/markdown/emoji before
  speaking, picks a Hindi voice (waiting for `voiceschanged` if the list is still
  loading) and cancels previous speech when a new question is asked.
- Without `LLM_API_KEY`/Orvis AI, the UI automatically falls back to the offline tutor data.
- Aarohi is an Excel study companion. Romantic roleplay and personal-photo
  generation are intentionally out of scope for this student app; the system
  prompt redirects those requests back to Excel practice.
