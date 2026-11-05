/**
 * Sign-in state for the whole app. Call `useAuth()` ONCE in App.tsx and pass
 * the result down (AuthGate, Layout, Account take it as a prop) — each call
 * owns its own state.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { finishPopupLogin, onPopupLoginDone } from "./orvis";
import { adoptUser, resetUserLocalState } from "./prefs";
import { clearStoreCache } from "./store";

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
      const next = await api.get<User>("/api/auth/me");
      adopt(next);
      setUser(next);
    } catch {
      adopt(null);
      setUser(null);
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
  /** Guest mode: an anonymous account for this browser — no sign-in screen. */
  const guest = useCallback(async () => signedIn(await api.post<User>("/api/auth/guest")), []);
  /** Turn the current guest into a real account (keeps all data). */
  const upgrade = useCallback(async (email: string, password: string) => {
    const u = await api.post<User>("/api/auth/upgrade", { email, password });
    setUser(u);
    return u;
  }, []);
  /** Delete the account and everything it owns (irreversible). */
  const deleteAccount = useCallback(async () => {
    await api.del("/api/auth/account");
    clearStoreCache();
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
