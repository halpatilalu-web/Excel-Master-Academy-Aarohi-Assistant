import { useState, type FormEvent } from "react";
import { Avatar } from "../components/Avatar";
import { Download, LogOut, Trash2 } from "lucide-react";
import type { Auth } from "../lib/auth";
import { exportJSON } from "../lib/store";
import { Button, Card, Field, inputCls } from "../components/ui";

/** Irreversible, so it asks once and spells out what disappears. */
function DeleteAccountCard({ auth }: { auth: Auth }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await auth.deleteAccount();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Account delete nahi hua");
      setBusy(false);
    }
  }

  return (
    <Card className="border-(--color-danger)">
      <h2 className="font-display font-bold mb-1">Delete account</h2>
      <p className="text-sm text-(--color-muted) mb-4">
        Tumhari progress, exam attempts, lab records, certificates aur guest account — sab server se hamesha ke liye mit
        jayega. Pehle backup export kar sakte ho.
      </p>
      {error && (
        <p role="alert" className="text-sm mb-3 text-(--color-danger)">
          {error}
        </p>
      )}
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={busy} onClick={() => void remove()}>
            {busy ? "Delete ho raha hai…" : "Haan, mera account delete karo"}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          <Trash2 size={16} /> Delete my account
        </Button>
      )}
    </Card>
  );
}

export function Account({ auth }: { auth: Auth }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  async function upgrade(e: FormEvent) {
    e.preventDefault();
    try {
      await auth.upgrade(email, pw);
      setMsg({ ok: true, text: "Account created — sign in with this email on any device." });
      setEmail(""); setPw("");
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  async function signInExisting(e: FormEvent) {
    e.preventDefault();
    setLoginMsg(null);
    try {
      await auth.login(loginEmail, loginPw);
    } catch (err) {
      setLoginMsg((err as Error).message);
    }
  }

  async function exportData() {
    setExportMsg(null);
    try {
      await exportJSON();
    } catch (err) {
      setExportMsg(`Backup export failed: ${(err as Error).message}`);
    }
  }

  if (auth.isGuest) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Account</h1>
          <p className="text-(--color-muted) mt-1 text-sm">You're using this app as a guest. Your data is saved on the server, but this guest is linked to this browser. Clear cookies/site data and you may lose access to it.</p>
        </div>
        <Card>
          <h2 className="font-display font-bold mb-1">Keep your data on any device</h2>
          <p className="text-sm text-(--color-muted) mb-4">Create a login and everything you've saved comes with it.</p>
          <form onSubmit={upgrade} className="max-w-sm">
            <Field label="Email">
              <input name="email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" autoComplete="new-password" required minLength={8} className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            {msg && <p role="status" className={`text-sm mb-3 ${msg.ok ? "text-(--color-good)" : "text-(--color-danger)"}`}>{msg.text}</p>}
            <Button type="submit">Create account</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display font-bold mb-1">Already have an account?</h2>
          <p className="text-sm text-(--color-muted) mb-4">Sign in to continue with that account. This browser guest's separate progress will not merge automatically.</p>
          <form onSubmit={signInExisting} className="max-w-sm">
            <Field label="Email">
              <input name="login-email" type="email" autoComplete="email" required className={inputCls} value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input name="login-password" type="password" autoComplete="current-password" required minLength={8} className={inputCls} value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
            </Field>
            {loginMsg && <p role="alert" className="text-sm mb-3 text-(--color-danger)">{loginMsg}</p>}
            <Button variant="secondary" type="submit">Sign in to existing account</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display font-bold mb-1">Your data</h2>
          <p className="text-sm text-(--color-muted) mb-4">Download a copy any time.</p>
          {exportMsg && <p role="alert" className="text-sm mb-3 text-(--color-danger)">{exportMsg}</p>}
          <Button variant="secondary" onClick={() => void exportData()}><Download size={16} /> Export backup (JSON)</Button>
        </Card>
        <DeleteAccountCard auth={auth} />
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setMsg({ ok: false, text: "New passwords don't match." });
    try {
      await auth.changePassword(current, next);
      setMsg({ ok: true, text: "Password changed. Other devices were signed out." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={auth.user?.name} email={auth.user?.email} picture={auth.user?.picture} size={56} />
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{auth.user?.name || "Account"}</h1>
          <p className="text-(--color-muted) mt-1 text-sm">Signed in as {auth.user?.email}</p>
        </div>
      </div>

      <Card>
        <h2 className="font-display font-bold mb-4">Change password</h2>
        <form onSubmit={submit} className="max-w-sm">
          <Field label="Current password">
            <input type="password" autoComplete="current-password" required className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password">
            <input type="password" autoComplete="new-password" required minLength={8} className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" autoComplete="new-password" required minLength={8} className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {msg && (
            <p role="status" className={`text-sm mb-3 ${msg.ok ? "text-(--color-good)" : "text-(--color-danger)"}`}>
              {msg.text}
            </p>
          )}
          <Button type="submit">Update password</Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-display font-bold mb-1">Your data</h2>
        <p className="text-sm text-(--color-muted) mb-4">
          Everything you save is stored on the server and only visible to you. Download a copy any time.
        </p>
        {exportMsg && <p role="alert" className="text-sm mb-3 text-(--color-danger)">{exportMsg}</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void exportData()}>
            <Download size={16} /> Export backup (JSON)
          </Button>
          <Button variant="ghost" onClick={() => void auth.logout()}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </Card>

      <DeleteAccountCard auth={auth} />
    </div>
  );
}
