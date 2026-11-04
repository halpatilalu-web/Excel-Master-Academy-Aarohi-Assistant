/**
 * Google sign-in helpers (optional `google_auth` service).
 *
 * Sign-in is a full-page navigation this app's own server brokers — the browser
 * never holds a platform key. Everything else the platform can do (AI chat,
 * file uploads, image generation, payments) has no client helper here on
 * purpose: this course app never mounts those routes. See
 * `docs/optional-services.md` before adding one back.
 */

/**
 * Google login (service `google_auth`). Full-page navigation: the app server
 * hands the browser to Orvis, Orvis to Google, and back to this app with the
 * session cookie set. `returnTo` is the in-app path to land on afterwards.
 */
export function startGoogleLogin(returnTo = "/"): void {
  if (inIframe()) {
    // Google refuses to render its sign-in page inside an iframe (X-Frame-Options),
    // and the Orvis chat shows this app in a preview iframe. Run the flow in a
    // popup on this same origin; the callback lands on `/?auth=popup`, which
    // notifies the opener (see finishPopupLogin / onPopupLoginDone) and closes.
    const q = new URLSearchParams({
      origin: window.location.origin,
      return_to: `/?auth=popup&to=${encodeURIComponent(returnTo)}`,
    });
    const url = `/api/auth/oauth/start?${q.toString()}`;
    const w = window.open(url, "orvis_google_login", "popup,width=520,height=680");
    if (!w) window.open(url, "_blank"); // popup blocked → a tab still works
    return;
  }
  const q = new URLSearchParams({ origin: window.location.origin, return_to: returnTo });
  window.location.assign(`/api/auth/oauth/start?${q.toString()}`);
}

function inIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

const POPUP_DONE = "orvis:google-login-done";

/**
 * Call once at boot. When this window is the Google-login popup that just came
 * back signed in (`?auth=popup`), tell the opener and close. Returns true in
 * that case so the caller can skip its own work; the session cookie is already
 * set for this origin, so the opener only needs to re-read `/api/auth/me`.
 */
export function finishPopupLogin(): boolean {
  const p = new URLSearchParams(window.location.search);
  if (p.get("auth") !== "popup") return false;
  const to = p.get("to") || "/";
  p.delete("auth"); p.delete("to");
  const rest = p.toString();
  window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  if (window.opener && !window.opener.closed) {
    try { window.opener.postMessage({ type: POPUP_DONE, to }, window.location.origin); } catch { /* ignore */ }
    window.close();
    return true;
  }
  return false;
}

/** Subscribe to "the Google popup finished signing in"; returns an unsubscribe. */
export function onPopupLoginDone(cb: (to: string) => void): () => void {
  const handler = (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return;
    if (e.data && e.data.type === POPUP_DONE) cb(String(e.data.to || "/"));
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/** `?auth=error&reason=…` left by a failed Google login redirect, or null. */
export function readAuthError(): string | null {
  const p = new URLSearchParams(window.location.search);
  if (p.get("auth") !== "error") return null;
  const reason = p.get("reason") || "unknown";
  p.delete("auth"); p.delete("reason");
  const rest = p.toString();
  window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
  return reason;
}
