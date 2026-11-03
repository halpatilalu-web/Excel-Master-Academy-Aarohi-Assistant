/**
 * Sign-in state for the whole app. Call `useAuth()` ONCE in App.tsx and pass
 * the result down (AuthGate, Layout, Account take it as a prop) — each call
 * owns its own state.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { finishPopupLogin, onPopupLoginDone } from "./orvis";

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

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get<User>("/api/auth/me"));
    } catch {
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
    await api.post<{ ok: boolean }>("/api/auth/logout");
    setUser(null);
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

  return { user, checking, login, signup, logout, changePassword, refresh, guest, upgrade, isGuest: user?.provider === "guest" };
}

export type Auth = ReturnType<typeof useAuth>;
