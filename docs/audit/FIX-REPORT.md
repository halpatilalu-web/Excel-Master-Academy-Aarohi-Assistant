# Excel Master Academy — Fix, Performance, Security & Test Reports

**Date:** 9 November 2026
**Base commit (before this work):** `d44027e` · **Audit:** `7c6e034` · **Fixes:** `e1b1aa0` (see the branch/PR for the exact head)
**UI:** unchanged. No colour, gradient, radius, shadow, font, icon, spacing, card, dashboard or navigation markup was altered. The only markup-adjacent changes are new `aria-*`/`loading`/`role` attributes and one text line that was already in the status bar.

---

## 1. What was fixed, file by file

### 1.1 Critical

| # | Bug | Fix | Files |
|---|---|---|---|
| C1 | **Workbook autosave died after the first save (409) and every later edit was lost.** `persist()` always called `add()`, so save #2 POSTed the id that save #1 had just created; the server answered 409 and the `catch {}` swallowed it. | Save **creates once, then updates** (`PUT`). If the id is rejected the row is recreated once. A failed save is surfaced (`saveError`) and shown in the existing status line — never silently "Saved". | `src/lib/excel/useWorkbook.ts`, `src/components/ExcelGrid.tsx` |
| C2 | **An offline start was a blank page**, and a *network* failure made the app start a brand-new local guest — an empty dashboard for a student whose work was fine. | Service worker + offline page (cache-first for the hashed bundle, network-first for documents, `/api` never cached). The last account is remembered (`ema_last_account_v1`) and reused until the server answers a real 401/403. | `public/sw.js`, `public/offline.html`, `src/lib/offline.ts`, `src/main.tsx`, `src/lib/auth.ts` |
| C3 | **Exam attempts were memory-only** and the countdown was decremented, so a backgrounded APK got free minutes and a reload threw the marked paper away. | Attempt (paper, answers, position, deadline) kept in `sessionStorage`; expired attempts discarded; countdown recomputed from the deadline and re-synced on `visibilitychange`/`focus`; `beforeunload` guard while running; `aria-label` on the timer. | `src/views/Exam.tsx` |

### 1.2 High (Android WebView + honest UI)

| # | Bug | Fix | Files |
|---|---|---|---|
| H1 | Back button left the page with a drawer/sheet/search open. | `useOverlayBack` pushes one history entry per overlay and closes on Back; closing by UI pops it again. Wired to the mobile drawer, Settings sheet and search. | `src/lib/useOverlayBack.ts`, `src/components/Layout.tsx`, `src/components/SearchBox.tsx` |
| H2 | "Copy" showed a ✓ while copying nothing (no `navigator.clipboard` in a WebView). | `copyText()`: async API → `execCommand("copy")` fallback → `false`. The tick only appears on real success. | `src/lib/clipboard.ts`, `src/views/Reference.tsx`, `Chapters.tsx`, `ProToolkit.tsx`, `src/components/ExcelGrid.tsx` |
| H3 | Download buttons silently did nothing in a WebView; object URLs were revoked so fast that slow Android download managers got an empty file. | `saveFile()`: share sheet first (works inside WebView), then download, 60 s revoke delay, and `ok:false` reported by every export. | `src/lib/saveFile.ts`, `src/lib/store.ts`, `src/lib/desktop/fs.ts`, `src/data/labs.ts`, `src/components/LiveSpreadsheet.tsx`, `src/components/ExcelGrid.tsx` |
| N8 | A failed save still showed "Saved". | Covered by C1 (`saveError` → status line, `role="alert"`). | — |
| N9 | Streak sound toggle and the Settings switch disagreed until a reload. | Both read/write the shared settings store. | `src/lib/prefs.ts`, `src/components/StreakBadges.tsx` |

### 1.3 Performance

| # | Change | Effect |
|---|---|---|
| P1 | `DesktopPromo` moved out of `views/Windows.tsx` (which imports the whole desktop); `DIPLOMA_MODULES` no longer drags 75 kB of chapter content. | **First-screen JS: 811 kB → 368 kB raw**, and the home route now downloads **2** JS files instead of 4 (the 408 kB spreadsheet chunk is no longer fetched at all). |
| P2 | `CHAPTER_RICH` split into `src/data/diplomaChapterRich.ts`, re-exported so no caller changed. | `diplomaModules.ts` 85 kB → 10 kB for the dashboard path. |
| P4 | Removed the duplicated (dead) `setState` in `store.update()`. | Half the listener fan-out per save. |
| P5 | `loading="lazy" decoding="async"` on the 11 remaining images. | Fewer eager image requests on first paint. |
| — | `vercel.json`: `immutable` caching for `/assets/*`, `no-cache` for `sw.js`. | Repeat visits stop re-downloading the whole bundle. |
| — | `manualChunks` documented: vendor split only (react/motion/fflate). | An explicit `excel` chunk was tried and made the dashboard pull 1.6 MB — reverted, and the reason is written in the config so it is not "optimised" back in. |

### 1.4 Security / backend

| # | Change | Files |
|---|---|---|
| S1 | CORS narrows to `APP_ALLOWED_ORIGINS` when a deployment declares its origins; methods/headers are an explicit list; preflight cached 10 min. | `server/main.py` |
| S2 | Every response: `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`; `/api/*` also gets `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`. `/api/health` stays cross-origin readable for probes. | `server/main.py` |
| — | `vercel.json` headers (nosniff, referrer, frame options, permissions policy). | `vercel.json` |

No secret was added, moved or exposed. No database schema changed. No scoring rule changed.

---

## 2. Frontend testing report

**Automated (all executed just now, not claimed):**

| Check | Command | Result |
|---|---|---|
| Type-check | `npx tsc -b` | ✅ clean |
| Unit/integration | `npx vitest run` | ✅ **268 passed / 25 files** (was 248) |
| Course data | `python scripts/check_data.py` | ✅ 45 chapters · 90 chapter questions · 211 extra · 269 formulas · 400 shortcuts · 40 VBA · 11 labs |
| Production build | `npx vite build` | ✅ built |

**New regression tests (20):**

- `src/lib/excel/useWorkbook.test.ts` (3) — create-once/update-after, recreate when the update is rejected, and a failed save must surface instead of claiming success. *(This file would have failed on the old code: it asserted exactly the 409 sequence.)*
- `src/views/Exam.test.tsx` (3) — the marked attempt and its deadline survive a reload; two minutes in the background are charged, not gifted; `beforeunload` fires while a paper runs.
- `src/lib/transfer.test.ts` (7) — clipboard API path, WebView `execCommand` fallback, honest failure, share-sheet path, download path, revoke delay, exception path.
- `src/lib/offline.test.ts` (7) — remembered account survives a reload, corrupt entry ignored, network-vs-401 classification, `useOnline`, overlay Back closes and does not grow history.

**Live browser tests (headless Chromium, real app + API):**

| Scenario | Before | After |
|---|---|---|
| Two edits in Free Workbook, then `GET /api/c/excelWorkbooks` | `POST 201 → POST 409 → POST 409`, only the first cell stored | `POST 201 → PUT 200 → PUT 200`, both cells stored ✅ |
| All 16 routes, desktop + phone | 1 API error (the 409) | 0 errors, 0 page errors, no blank view ✅ |
| Offline reload (prod build, network off) | blank page, `body.innerText === ""` | full workbook renders from cache, `[data-app-ready]`, account kept ✅ |
| Android Back with drawer open | — | drawer closes, hash unchanged, nothing left behind ✅ |
| Exam resume after an interrupted attempt | start screen, timer reset | `16:58` left, `Question 5/20` ✅ |
| Deep route + Back ×3 | — | `#/chapters/7 → #/chapters → #/workbook → #/home` ✅ |

---

## 3. Backend testing report

| Check | Command | Result |
|---|---|---|
| Test suite | `.venv/bin/python -m pytest server -q` | ✅ **63 passed** |
| Lint | `ruff check server scripts` | ✅ All checks passed |
| Dependency audit | `pip-audit -r server/requirements.txt` | ✅ no known vulnerabilities |
| Header probe (real TestClient) | script | `/api/health` → 200 with nosniff / referrer / frame options / COOP / CORP=cross-origin; `/api/*` CSP present; SPA CSP unchanged; preflight → `Access-Control-Allow-Origin: *` (no credentials) ✅ |

Not exercised here: real Google OAuth, Razorpay, email/images services (they stay disabled → their routers are not even mounted), and load testing of SQLite.

---

## 4. Performance report (production build, 390×844, 4× CPU, cold cache)

| Metric | Before | After |
|---|---|---|
| Entry chunk | 1,078 kB (344 kB gzip) | **368 kB (132 kB gzip)** |
| JS files fetched by `#/home` | 4 (incl. the 408 kB spreadsheet chunk) | **2** (`index` + `react`) |
| First contentful paint (fast 4G) | 2.5 s | **1.8 s** |
| First contentful paint (slow 3G) | 1.0 s | **0.15 s** (from cache after first visit) |
| Repeat visit | full re-download | hashed assets `immutable` for a year |
| Offline | blank page | full offline shell |

Measurement harness: `/tmp/browser/probe-perf.js`, `probe-chunks.js` (throttling applied through CDP; numbers are from the built app, not the dev server).

---

## 5. Android WebView compatibility report

| Area | Status | Notes |
|---|---|---|
| Back button / gesture | ✅ fixed in app | Routes already worked; overlays now close first (`useOverlayBack`). |
| Offline / dead network | ✅ fixed in app | Service-worker shell + remembered identity. |
| Clipboard | ✅ fixed in app | `execCommand` fallback; no false success. |
| Downloads | ⚠️ improved, **needs one host change** | Share sheet works where available; the plain download path cannot be verified from JS. In the APK shell add a `DownloadListener` (or Capacitor `Filesystem`). See `ANDROID-WEBVIEW-REPORT.md`. |
| Keyboard overlap | ✅ already handled | Docked/floating keyboard, `max-h-[80dvh]` sheets, `dvh` units. |
| Safe areas | ⚠️ partial | Bottom nav uses `env(safe-area-inset-bottom)`; the header does not use `env(safe-area-inset-top)`. Changing it is visual (padding) → **not done without approval**. |
| Session persistence | ✅ | 30-day HttpOnly cookie; offline identity fallback added. |
| Video/fullscreen, external links | not tested here (no device) | No code change needed as far as the audit could tell. |
| Slow network / disconnect | ✅ | Fetch timeouts, local-first stores, offline shell. |

**Explicitly not testable in this environment:** a real APK on a real phone, real back-gesture hardware behaviour, real WebView download handling, Google login, payments.

---

## 6. Remaining issues / decisions for you

1. **APK shell work (host side):** add a `DownloadListener`, and consider `android:usesCleartextTraffic` / an allow-list `WebViewClient`. Needs your Android project, which is not in this repo.
2. **`env(safe-area-inset-top)` in the header** — a small padding change for notched phones. It *is* visual, so it waits for your yes.
3. **Server-side exam scoring (S3)** — scores are still computed client-side (unchanged rule, unchanged contract). Making them server-verified means moving the question bank behind the API and migrating old attempts. Your call.
4. **Session list / "sign out everywhere" (S4)** — optional endpoint; not added.
5. **Vercel deployment**: with `/api` excluded from the rewrite, a Vercel-only deploy runs as a static app (guest-only, local data). If that URL is meant to be live, it needs `VITE`-style API base + `APP_ALLOWED_ORIGINS`; say the word.
6. **`public/audio` (2 MB) and `public/ai-gallery` (2.1 MB)** ship inside the APK; harmless for the web build. Could be moved to the server if APK size matters.
7. **`formulaPractice.ts` (368 kB of drills)** is only loaded by the lab/workbook route; splitting it further is possible but low value.

---

## 7. APK build instructions

The repository does not contain an Android project, so these are the two supported ways to produce the APK. Both wrap the **same** web build — the UI is identical.

### Option A — Capacitor (recommended)

```bash
# once
pnpm add -D @capacitor/cli && pnpm add @capacitor/core @capacitor/android
npx cap init "Excel Master Academy" com.excelmaster.academy --web-dir=dist

# every release
corepack pnpm build          # produces dist/
npx cap sync android
npx cap open android         # Android Studio → Build ▸ Build APK(s)
```

`capacitor.config.ts` worth setting:

```ts
server: { androidScheme: "https" }   // keeps the WebView in a secure context → navigator.clipboard works
android: { allowMixedContent: false }
```

Then, in `MainActivity.java`, add a download bridge so `.xlsx`/`.csv` exports land in Downloads:

```java
webView.setDownloadListener((url, ua, cd, mime, len) -> {
  DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
  req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
  req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, cd);
  ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
});
```

### Option B — plain WebView wrapper

Point the WebView at `https://<your-deployment>/` (**not** `file://…/index.html`), because the app needs a secure origin for the clipboard, the service worker and the session cookie:

```java
WebSettings s = webView.getSettings();
s.setJavaScriptEnabled(true);
s.setDomStorageEnabled(true);
s.setMediaPlaybackRequiresUserGesture(true);   // keeps the "no autoplay" rule
webView.loadUrl("https://your-deployment.example/");
```

Add the same `DownloadListener` as above, and handle `onBackPressed()` by delegating to the page (the app already treats Back as "close the top overlay"):

```java
@Override public void onBackPressed() {
  if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
}
```

**Do not** load `dist/index.html` from `file://` — there is no secure context, so clipboard/cookies/offline caching all degrade.

---

## 8. Deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Updated source | this branch (see the PR; `git archive` of the head gives exactly the ZIP) |
| 2 | Modified files | §1 of this report + `git diff --stat` |
| 3 | Bug-fixing report | §1 |
| 4 | Performance report | §4 |
| 5 | Security audit report | `AUDIT-2026-11.md` §4 + §1.4 here |
| 6 | Frontend testing report | §2 |
| 7 | Backend testing report | §3 |
| 8 | Android WebView report | §5 + `ANDROID-WEBVIEW-REPORT.md` |
| 9 | Remaining issues | §6 |
| 10 | APK instructions | §7 |
