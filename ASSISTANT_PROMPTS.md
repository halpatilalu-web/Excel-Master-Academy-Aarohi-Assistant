# Aarohi implementation notes

Aarohi is implemented in the main app. There is no separate add-on copy to keep in sync.

## Where things live

- System prompt and online model call: `server/assistant.py` (`SYSTEM_PROMPT`, `POST /api/assistant`)
- Browser client + Web Speech helpers: `src/lib/assistant.ts`
- Chat UI: `src/views/Aarohi.tsx`
- Offline Excel fallback: `src/data/tutor.ts` (`aarohiReply`, `SUGGESTIONS`)

## Behaviour

- The endpoint requires the app's guest/account session and is rate-limited per user.
- Only the last 20 messages are sent to the backend; each message is capped at 4,000 characters.
- Chat history is kept in browser `localStorage` (`aarohi_excel_chat_v4`) and can be cleared from the UI; the chosen avatar scene is saved under `aarohi_avatar_scene_v1`.
- Speech-to-text uses the browser Web Speech API (`hi-IN`) when available.
- Text-to-speech uses `speechSynthesis`, strips code/markdown/emoji before speaking, and cancels previous speech when a new question is asked.
- Without `LLM_API_KEY`/Orvis AI, the UI automatically falls back to the offline tutor data.
- Aarohi is an Excel study companion. Romantic roleplay and personal-photo generation are intentionally out of scope for this student app; the system prompt redirects those requests back to Excel practice.
