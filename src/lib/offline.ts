/**
 * The last-known account, so a dead network does not look like a deleted one.
 *
 * The app remembers whose work is on this device (see `prefs.adoptUser`), but
 * on a failed `/api/auth/me` it used to forget the identity too: the student
 * was quietly turned into a *new local guest*, and their dashboard, streak and
 * exam history looked empty. That is the worst possible message to send when
 * someone opens the app on a train. The identity is now kept on the device and
 * re-used until the server says otherwise.
 *
 * A real 401 is different: the session expired or was revoked, so the identity
 * is cleared and the sign-in screen comes back.
 */
import { useEffect, useState } from "react";
import { api } from "./api";
import { adoptUser } from "./prefs";

export interface User {
  id: string;
  email: string;
  /** Display name — set for Google sign-ins, empty for email/password users. */
  name?: string;
  /** "password" | "google" | "guest" */
  provider?: string;
  /** Avatar URL (Google sign-ins); empty for email/password users. */
  picture?: string;
}

const LAST_USER_STORE = "ema_last_account_v1";

/** The account this device last signed in as, if it is still trustworthy. */
export function rememberedUser(): User | null {
  try {
    const raw = localStorage.getItem(LAST_USER_STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberUser(user: User | null): void {
  try {
    if (user) localStorage.setItem(LAST_USER_STORE, JSON.stringify(user));
    else localStorage.removeItem(LAST_USER_STORE);
  } catch {
    /* private mode: identity just is not remembered across reloads */
  }
}

/**
 * Was this failure "the server said no" or "we could not reach the server"?
 * Only the first one may sign the student out.
 */
export function isNetworkFailure(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") return status === 0 || status === 502 || status === 503 || status === 504;
  return err instanceof TypeError; // fetch() rejected: DNS, offline, CORS at the network layer
}

/**
 * `navigator.onLine` plus the `online`/`offline` events, as a hook.
 * Used to tell the student "you are offline, showing saved work" instead of
 * letting them think a save silently failed.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

/**
 * Register the offline shell. Silent on purpose: a browser that cannot do
 * service workers (or a private window) must still get a working app, so every
 * failure path here just returns.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // A dev server's module graph changes on every edit; caching it would serve
  // stale code. The built app (preview/production) is where the shell matters.
  if (import.meta.env.DEV) return;
  const register = () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

/** Warm the caches with the pieces a cold start needs (used after first paint). */
export async function prefetchShellAssets(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  try {
    await api.get("/api/health", { timeoutMs: 2500 });
  } catch {
    /* nothing to warm; the service worker handles the rest */
  }
}
