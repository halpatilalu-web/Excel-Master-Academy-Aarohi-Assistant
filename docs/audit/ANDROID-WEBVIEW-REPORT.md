# Android WebView & APK compatibility report

**Date:** 9 November 2026 · app build: this branch

## How this was tested

There is **no Android SDK or emulator in this environment**, so nothing below
was observed on real hardware. What *was* done:

- The production build was driven in headless Chromium at 390×844 with
  `isMobile`, `hasTouch`, device scale 2 (an Android phone viewport).
- Network throttling through CDP: fast 4G and slow 3G profiles.
- CPU throttled 4× (mid-range phone).
- `Page.setWebLifecycleState("frozen"/"active")` — the same lifecycle transition
  Android performs when the app is backgrounded.
- Offline mode (`Network.emulateNetworkConditions {offline:true}`) followed by a
  full reload.
- `history.goBack()` for the hardware Back path, including with an overlay open.
- The service worker was inspected inside the page (`getRegistration`, cache
  contents).

Items marked ⚠️ need a real device or the host Android project, and are called
out rather than guessed at.

## Findings and status

| # | Area | Before | After | Verified how |
|---|---|---|---|---|
| 1 | **Hardware Back** with a drawer/sheet/search open | left the page | closes the overlay, page stays (`useOverlayBack`, one history entry) | browser: `history.goBack()` → drawer gone, `location.hash` unchanged |
| 2 | **Hardware Back** on a deep route | already worked (hash routes) | unchanged | `#/chapters/7 → #/chapters → #/workbook → #/home` |
| 3 | **Offline start** (no network, app killed and reopened) | blank page, then an empty *local guest* dashboard | full app from the service-worker cache, same account | offline reload → workbook renders, `[data-app-ready]`, `ema_last_account_v1` intact |
| 4 | **App backgrounded mid-exam** | timer fell behind (free time), answers lost on kill | deadline recomputed; attempt resumed (`16:58` left, Q5/20) | frozen lifecycle + real browser resume |
| 5 | **Clipboard** (`Copy formula`, block copy) | ✓ shown, nothing copied | `execCommand` fallback, ✓ only on real success | unit tests + code path |
| 6 | **File download** (`.xlsx`, `.csv`, backup JSON) | click dropped, no feedback | share sheet where available, 60 s revoke delay, failure message | unit tests; ⚠️ the *host* must add a `DownloadListener` for the plain download path |
| 7 | **Keyboard overlap** | docked/floating keyboard, `dvh` sheets | unchanged (already correct) | code review |
| 8 | **Safe-area** top / notch | bottom bar only | unchanged | ⚠️ adding `env(safe-area-inset-top)` is a padding change (visual) → **needs approval** |
| 9 | **Session persistence** | 30-day cookie; offline dropped identity | cookie + remembered identity offline | offline reload |
| 10 | **Video / fullscreen / external links** | — | no change | ⚠️ not testable here |
| 11 | **Slow network / disconnects** | 20 s fetch timeout, local-first stores | + offline shell | throttled runs |
| 12 | **App load speed** | 1,078 kB entry, 4 JS files | 368 kB entry, 2 JS files, immutable caching | `probe-chunks.js`, `probe-perf.js` |

## What the APK shell must do (not in this repository)

1. Load the app over **https** (or `capacitor://`/`https` scheme). A `file://`
   origin has no secure context: clipboard, cookies and the service worker all
   degrade.
2. Add a `DownloadListener` (see `FIX-REPORT.md` §7) — this is the one WebView
   behaviour JavaScript cannot work around.
3. Delegate `onBackPressed()` to `webView.goBack()` when possible; the page then
   closes overlays before it leaves.
4. Keep `setMediaPlaybackRequiresUserGesture(true)` — the app's music player is
   deliberately no-autoplay.
5. If the app is served from the APK on a non-https host, add that origin to
   `APP_ALLOWED_ORIGINS` on the server so CORS/CSRF stay coherent.

## Metrics from the simulated phone (390×844, 4× CPU, cold cache)

| Network | FCP before | FCP after | JS files before → after |
|---|---|---|---|
| Fast 4G | 2.5 s | 1.8 s | 4 → 2 |
| Slow 3G | 1.0 s | 0.15 s (cached shell) | 4 → 2 |
| Offline | blank | full app | — |

## Honest limits of this report

- No real APK, no real device, no real back-gesture hardware test.
- WebView download behaviour is host-dependent and only partly observable from
  JavaScript — stated as ⚠️ rather than claimed fixed.
- Notch/safe-area on a physical device was not observed.
