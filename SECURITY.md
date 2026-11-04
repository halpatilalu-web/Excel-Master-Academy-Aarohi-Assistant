# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Use GitHub's
"Report a vulnerability" (Security → Advisories) on this repository, or contact the
maintainer privately. Include:

- what you found and where (file, route, or UI flow),
- how to reproduce it,
- what an attacker gains.

You will get an acknowledgement as soon as possible. Please give a reasonable
window to ship a fix before publishing details.

## What this app is

A self-paced practice course for students, with a small FastAPI + SQLite backend
that stores per-user progress. It is **not** a certification body: the practice
certificate is self-attested and its ID is only format-checked in the browser.
Reports of the form "I can edit my own progress" or "I can make my own
certificate" are known and by design — see the limitations in the README. They
are still welcome if they let one user affect *another* user's data.

## Supported versions

Only the `main` branch is supported. Deploy from `main` (or a tag cut from it).

## Security model in one page

| Area | How it works |
|---|---|
| Passwords | scrypt (n=2^14, r=8, p=1), 16-byte random salt, constant-time compare |
| Sessions | 32-byte random token; only its SHA-256 hash is stored; 30-day expiry; expired rows purged on startup |
| Cookie | `HttpOnly`, `SameSite=None; Secure` over https (so the app works in a preview iframe), `Lax` over http |
| CSRF | Cookie-authenticated mutations must come from this app's own origin: `Sec-Fetch-Site`, `Origin` and `Referer` are checked; cross-site and same-site-but-different-origin are rejected |
| Authorisation | Every document route is scoped by `owner` in SQL; `_`-prefixed collections are server-only |
| Abuse | Per-IP guest/signup limits, per-(IP,email) login throttle, per-user/IP/global Aarohi budget |
| Secrets | Only in `server/.env` / the platform's env vars; never in the browser bundle |
| Headers | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store` on `/api/*`, CSP + HSTS in production |

### Known limitations (accepted for this version)

1. **No email verification or password reset.** Anyone can claim an arbitrary
   email with a password. To stop that turning into account takeover, an external
   (Google) sign-in is *never* attached to an existing password account —
   `server/auth.py:login_external` raises instead.
2. **Client-side grading.** Exam questions and answers ship in the bundle; a
   determined student can read them. Certificate issuance depends on that state.
3. **No certificate registry.** A certificate ID proves format, not issuance.
4. **Single-instance SQLite.** Rate limits live in process memory, so multiple
   replicas each get their own budget. Move to Redis/managed DB before scaling out.
5. **Guest accounts are free to create** (rate limited per IP). They exist so a
   student can start learning without a sign-up screen.

## If you deploy this

- Serve over HTTPS only; the session cookie is only marked `Secure` over https.
- Keep `server/.env` out of git and out of the Docker image.
- Set a durable `APP_DB_PATH` and back it up; the free Render plan loses the
  database on every restart (see `DEPLOY.md`).
- Never enable the `payments` service with a browser-supplied amount — set
  `PAYMENTS_SERVER_PRICE_MINOR` or look prices up server-side.
