# Optional platform services (Orvis)

`server/services/` contains routers that are **inert by default**. An app gets
them only when `ORVIS_SERVICES` names them, e.g.

```dotenv
ORVIS_API_URL=https://api.orvis.example
ORVIS_PUBLIC_API_URL=https://api.orvis.example
ORVIS_APP_ID=app_...
ORVIS_SECRET_KEY=...
ORVIS_SERVICES=storage,email
```

`server/services/__init__.py` mounts a router per enabled name and always serves
`GET /api/services` so the frontend can discover what exists. `COMPANIONS` wires
`ai_image` to the uploads routes (generated images are `_uploads` records).

| Service | Routes | What it adds | Client helper |
|---|---|---|---|
| `ai` | `POST /api/chat` (SSE), `GET`/`DELETE /api/chat/history` | Streaming chat with per-user history | none in this app (deliberately removed) |
| `google_auth` | `/api/auth/oauth/start`, `/api/auth/oauth/callback` | "Continue with Google", brokered by the platform | `src/lib/orvis.ts` |
| `storage` | `/api/uploads/*` (presign → PUT → confirm, list, signed URL, delete) | File uploads to brokered S3, keys scoped `u/<user>/.` | none |
| `ai_image` | `/api/images/generate` | Image generation, stored as `_uploads` rows | none |
| `email` | `POST /api/email/send-me` (+ `send()` helper) | Mail to the signed-in user only | none |
| `payments` | `/api/payments/*` (Razorpay order, verify, webhook) | Checkout on the owner's own account | none |

## Before you enable one

1. **This course app does not need any of them.** Guests, progress, exams and
   certificates work without a key.
2. **Payments: never trust a browser-supplied amount.** `POST /api/payments/orders`
   accepts `amount_minor` from the client. Set `PAYMENTS_SERVER_PRICE_MINOR` to
   charge a fixed price (the client value is then ignored), or look the price up
   server-side. The webhook settles orders and now logs orders it cannot attribute
   instead of silently ignoring them.
3. **Google login does not link to an existing password account.**
   `server/auth.py:login_external` raises, and `services/oauth.py` redirects with
   `?auth=error&reason=account_exists`, because email is not verified in this app.
   It also requires `email_verified: true` from the provider.
4. **Uploads are owner-checked** (`services/uploads.py:_owned`): the record's key
   must live under `u/<user_id>/`, so a forged row cannot sign or delete another
   student's object.
5. **`/api/c` refuses `_`-prefixed collections**, so browser code can never write
   an `_uploads` or `_payments` record directly.

## Client-side helpers

Only Google login helpers remain in `src/lib/orvis.ts`. The chat/upload/image/
payment helpers were removed with the `xlsx` dependency cleanup: nothing imported
them, and keeping callable stubs for routes this app never mounts is how dead
money-handling code survives review. Add a helper next to the view that needs it,
with a test.
