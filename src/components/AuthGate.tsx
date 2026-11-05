import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { KeyRound } from "lucide-react";
import type { Auth } from "../lib/auth";
import { Button, Field, inputCls } from "./ui";
import { GoogleButton } from "./GoogleButton";
import { readAuthError } from "../lib/orvis";

const GOOGLE_LOGIN = import.meta.env.VITE_ORVIS_GOOGLE_AUTH === "1";
const AUTH_ERROR_TEXT: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  byo_credential_missing: "Google sign-in is not configured for this app yet.",
  google_not_configured: "Google sign-in is not available right now.",
};

export type AuthMode = "accounts" | "guest";

/**
 * `mode="accounts"`: renders the sign-in / create-account form until
 * `auth.user` is set, then the children inside `[data-app-ready]`. The data-*
 * attributes and input names are the contract verify-site.py uses — keep them.
 *
 * `mode="guest"` (the default for apps whose brief never mentions accounts):
 * no form at all. A silent anonymous account is created for this browser and
 * the app opens straight away; data is still per-user on the server, and the
 * Account view offers to turn the guest into a real login later.
 */
export function AuthGate({ auth, appName, children, mode: authMode = "accounts" }: { auth: Auth; appName: string; children: ReactNode; mode?: AuthMode }) {
  const guestStarted = useRef(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  useEffect(() => {
    if (authMode !== "guest" || auth.checking || auth.user || guestStarted.current) return;
    guestStarted.current = true;
    void auth.guest().catch((err: unknown) => {
      setGuestError(err instanceof Error ? err.message : "Guest sign-in failed");
    });
  }, [authMode, auth.checking, auth.user, auth]);

  // Allow a fresh guest to be created if this session later signs out/expires.
  useEffect(() => {
    if (!auth.user) return;
    guestStarted.current = false;
    setGuestError(null);
  }, [auth.user]);

  async function retryGuest() {
    setGuestError(null);
    guestStarted.current = true;
    try {
      await auth.guest();
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : "Guest sign-in failed");
    }
  }
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const reason = readAuthError();
    return reason ? (AUTH_ERROR_TEXT[reason] ?? "Sign-in failed. Please try again.") : null;
  });
  const [busy, setBusy] = useState(false);

  const loadingSplash = (
    <div className="min-h-screen flex items-center justify-center px-4" data-auth-checking>
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-(--color-accent) text-white font-display font-extrabold text-xl flex items-center justify-center mx-auto shadow-md animate-pulse">
          E
        </div>
        <div className="font-display font-bold text-base text-(--color-ink)">{appName}</div>
        <p className="text-xs text-(--color-muted)">Course load ho raha hai… / Loading your Diploma workspace…</p>
      </div>
    </div>
  );

  if (auth.checking) return loadingSplash;
  if (auth.user) return <div data-app-ready>{children}</div>;
  if (authMode === "guest" && guestError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" data-auth-gate>
        <div className="w-full max-w-sm bg-(--color-surface) border border-(--color-border) rounded-2xl p-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{appName}</h1>
          <p role="alert" className="text-sm text-(--color-danger) mt-3">
            Server se guest session nahi ban paaya: {guestError}
          </p>
          <p className="text-sm text-(--color-muted) mt-2">Backend chal raha hai ya nahi check karke dobara try karo.</p>
          <Button className="w-full mt-5" onClick={() => void retryGuest()}>Dobara try karo</Button>
        </div>
      </div>
    );
  }
  if (authMode === "guest") return loadingSplash;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await auth.login(email, password);
      else await auth.signup(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" data-auth-gate>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-(--color-surface) border border-(--color-border) rounded-2xl p-7"
      >
        <div className="w-12 h-12 rounded-xl bg-(--color-accent) text-white flex items-center justify-center mb-5">
          <KeyRound size={22} />
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{appName}</h1>
        <p className="text-sm text-(--color-muted) mt-1 mb-6">
          {mode === "login" ? "Sign in to your account." : "Create an account — it takes ten seconds."}
        </p>
        <Field label="Email">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-(--color-danger) mb-3">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
        {GOOGLE_LOGIN && (
          <>
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-(--color-muted)">
              <span className="h-px flex-1 bg-(--color-border)" />
              or
              <span className="h-px flex-1 bg-(--color-border)" />
            </div>
            <GoogleButton />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
          }}
          className="mt-4 w-full text-sm text-(--color-muted) hover:text-(--color-ink)"
        >
          {mode === "login" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </motion.form>
    </div>
  );
}
