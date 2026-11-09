/**
 * Sign-in state for the whole app. Call `useAuth()` ONCE in App.tsx and pass
 * the result down (AuthGate, Layout, Account take it as a prop) — each call
 * owns its own state.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { finishPopupLogin, onPopupLoginDone } from "./orvis";
import { isNetworkFailure, rememberUser, rememberedUser } from "./offline";
import { adoptUser, resetUserLocalState } from "./prefs";
import { clearStoreCache } from "./store";

const LOCAL_GUEST_KEY = "ema_local_guest_user_v1";

function getOrCreateLocalGuest(): User {
  try {
    const raw = localStorage.getItem(LOCAL_GUEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as User;
      if (parsed?.id && parsed?.provider === "guest") return parsed;
    }
  } catch {
    /* ignore */
  }
  // A student who already has an account on this device must never be silently
  // replaced by a brand-new local guest just because the network was down.
  const remembered = rememberedUser();
  if (remembered) return remembered;
  const u: User = {
    id: `local-${Math.random().toString(36).slice(2, 10)}`,
    email: "guest-local@guest.local",
    name: "",
    provider: "guest",
    picture: "",
  };
  try {
    localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
  return u;
}

export function isBackendUnavailable(err: unknown): boolean {
  if (err instanceof ApiError) {
    return err.status === 0 || err.status === 404 || err.status === 405 || err.status === 502 || err.status === 503 || err.status === 504;
  }
  return err instanceof TypeError || err instanceof SyntaxError;
}

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  /** Remember whose local state (chat, streak, badges) is on this device. */
  const adopt = (next: User | null) => adoptUser(next?.id);

  const refresh = useCallback(async () => {
    try {
      const next = await api.get<User>("/api/auth/me", { timeoutMs: 4000 });
      rememberUser(next);
      adopt(next);
      setUser(next);
    } catch (err) {
      // "Cannot reach the server" is not "you are signed out". Keep the account
      // this device already knows, so an offline start shows the student's own
      // dashboard (from the local copy) instead of an empty guest one.
      if (isNetworkFailure(err) || isBackendUnavailable(err)) {
        const offlineUser = rememberedUser() ?? getOrCreateLocalGuest();
        adopt(offlineUser);
        setUser(offlineUser);
      } else {
        rememberUser(null);
        adopt(null);
        setUser(null);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (finishPopupLogin()) return; // we are the Google-login popup; it closes itself
    void refresh();
    const onRequired = () => setUser(null); // api.ts fires this on any 401
    window.addEventListener("auth:required", onRequired);
    // Google login ran in a popup (preview iframe): the cookie is set, re-read the user.
    const offPopup = onPopupLoginDone(() => {
      void refresh().then(() => window.dispatchEvent(new Event("auth:signed-in")));
    });
    return () => { window.removeEventListener("auth:required", onRequired); offPopup(); };
  }, [refresh]);

  const signedIn = (u: User) => {
    rememberUser(u);
    adopt(u);
    setUser(u);
    window.dispatchEvent(new Event("auth:signed-in")); // stores re-fetch
    return u;
  };

  const login = useCallback(
    async (email: string, password: string) =>
      signedIn(await api.post<User>("/api/auth/login", { email, password })),
    [],
  );
  const signup = useCallback(
    async (email: string, password: string) =>
      signedIn(await api.post<User>("/api/auth/signup", { email, password })),
    [],
  );
  const logout = useCallback(async () => {
    try {
      await api.post<{ ok: boolean }>("/api/auth/logout");
    } finally {
      // Whatever happens server-side, this browser must forget the student.
      clearStoreCache();
      rememberUser(null);
      adoptUser(null);
      resetUserLocalState();
      setUser(null);
    }
  }, []);
  const changePassword = useCallback(
    (current: string, next: string) =>
      api.post<{ ok: boolean }>("/api/auth/password", { current, new: next }),
    [],
  );
  /** Guest mode: an anonymous account for this browser — falls back to local browser guest on static hosts (Vercel/Netlify). */
  const guest = useCallback(async () => {
    try {
      return signedIn(await api.post<User>("/api/auth/guest", undefined, { timeoutMs: 4500 }));
    } catch (err) {
      if (isBackendUnavailable(err)) {
        return signedIn(getOrCreateLocalGuest());
      }
      throw err;
    }
  }, []);
  /** Turn the current guest into a real account (keeps all data). */
  const upgrade = useCallback(async (email: string, password: string) => {
    const u = await api.post<User>("/api/auth/upgrade", { email, password });
    setUser(u);
    return u;
  }, []);
  /** Delete the account and everything it owns (irreversible). */
  const deleteAccount = useCallback(async () => {
    try {
      await api.del("/api/auth/account");
    } catch (err) {
      if (!isBackendUnavailable(err)) throw err;
    }
    try {
      localStorage.removeItem(LOCAL_GUEST_KEY);
      ["progress", "exams", "submissions", "certs"].forEach((c) => localStorage.removeItem(`ema_local_col_${c}`));
    } catch {
      /* ignore */
    }
    clearStoreCache();
    rememberUser(null);
    adoptUser(null);
    resetUserLocalState();
    setUser(null);
  }, []);

  return {
    user,
    checking,
    login,
    signup,
    logout,
    changePassword,
    refresh,
    guest,
    upgrade,
    deleteAccount,
    isGuest: user?.provider === "guest",
  };
}

export type Auth = ReturnType<typeof useAuth>;
