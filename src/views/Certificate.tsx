import { useState } from "react";
import { Award, Info, Lock, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { DIPLOMA_MODULES } from "../data/diplomaModules";
import { CHAPTERS } from "../data/chapters";
import { certFormatValid, certId, latestCert, useCerts, useExams, useProgress } from "../lib/academy";
import { Button, Card, Field, inputCls } from "../components/ui";

export function Certificate({ defaultName }: { defaultName: string }) {
  const { items: prog, loading: progressLoading, error: progressError } = useProgress();
  const { items: exams, loading: examsLoading, error: examsError } = useExams();
  const { items: certs, add, remove } = useCerts();
  const [name, setName] = useState(defaultName);
  const [vid, setVid] = useState("");
  const [formatResult, setFormatResult] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const done = new Set(prog.map((p) => p.chapter)).size;
  const passed = exams.some((exam) => exam.passed);
  const ready = done === CHAPTERS.length && passed;
  // Newest by issue date — the server lists by `updated`, which is not the same
  // thing once a student has issued more than one certificate.
  const cert = latestCert(certs);
  const loading = progressLoading || examsLoading;
  const loadError = progressError || examsError;

  async function issue(displayName: string) {
    setBusy(true);
    setSaveError(null);
    try {
      const clean = displayName.trim() || defaultName;
      const date = new Date().toISOString().slice(0, 10);
      await add({ name: clean, date, certId: certId(clean, date) });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Certificate save nahi hua");
    } finally {
      setBusy(false);
    }
  }

  async function replaceCurrent() {
    if (!cert) return;
    setBusy(true);
    setSaveError(null);
    try {
      const clean = name.trim() || cert.name;
      const date = new Date().toISOString().slice(0, 10);
      await remove(cert.id);
      await add({ name: clean, date, certId: certId(clean, date) });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Certificate update nahi hua");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Practice Certificate</h1>
        <p className="text-sm text-(--color-muted) mt-1 flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Yeh self-paced practice completion certificate hai. Progress aur exam result tumhare account mein
            self-attested tareeke se save hote hain — yeh kisi external board/university se verified diploma nahi hai.
          </span>
        </p>
      </div>

      {loading && <p className="text-sm text-(--color-muted)">Tumhari progress load ho rahi hai…</p>}
      {loadError && (
        <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          Progress load nahi hua: {loadError}
        </p>
      )}

      {!ready && !loading && (
        <Card className="flex gap-3 items-start">
          <Lock className="shrink-0 text-(--color-muted)" />
          <div className="text-sm">
            <b>Abhi locked hai.</b>
            <ul className="list-disc pl-5 mt-1 text-(--color-muted)">
              <li>
                Chapters: {done}/{CHAPTERS.length} {done === CHAPTERS.length ? "✓" : ""}
              </li>
              <li>Practice exam {passed ? "pass ✓" : "pass karna baaki hai"}</li>
            </ul>
          </div>
        </Card>
      )}

      {ready && !cert && (
        <Card>
          <Field label="Certificate par naam">
            <input className={inputCls} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          {saveError && (
            <p role="alert" className="text-sm text-(--color-danger) mb-3">
              {saveError}
            </p>
          )}
          <Button disabled={busy} onClick={() => void issue(name)}>
            <Award size={16} /> {busy ? "Ban raha hai…" : "Practice certificate banao"}
          </Button>
        </Card>
      )}

      {cert && (
        <>
          <div className="print-area bg-white border-[10px] border-double border-amber-500 p-6 sm:p-10 text-center rounded-lg text-slate-900">
            <div className="text-xs tracking-[0.3em] text-amber-700 font-semibold">EXCEL MASTER ACADEMY</div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold mt-3 text-(--color-accent-dark)">
              Certificate of Practice Completion
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Complete Excel Diploma Practice Curriculum — Basic to Advanced ({DIPLOMA_MODULES.length} Modules · {CHAPTERS.length} Chapters)
            </p>
            <p className="mt-6 text-sm">Yeh pramaanit kiya jata hai ki / This certifies that</p>
            <div className="hand text-5xl sm:text-6xl font-bold my-3 text-rose-700">{cert.name}</div>
            <p className="text-sm max-w-lg mx-auto">
              ne {CHAPTERS.length} chapters (Basic Excel, Formulas, Data Cleaning, Conditional Formatting, Data Validation, XLOOKUP/INDEX-MATCH, Pivot Dashboards, Power Query & VBA Macros) aur online practice exam safaltapoorvak poora kiya hai.
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-3">
              Self-attested practice certificate — not an externally verified diploma.
            </p>
            <div className="mt-8 flex justify-between items-end text-xs text-left">
              <div>
                Date
                <br />
                <b className="text-sm">{cert.date}</b>
              </div>
              <Award size={48} className="text-amber-500" />
              <div className="text-right">
                Certificate ID
                <br />
                <b className="text-sm font-mono">{cert.certId}</b>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={() => window.print()}>
              <Printer size={16} /> Print / PDF save
            </Button>
            <Button variant="secondary" onClick={() => void replaceCurrent()} disabled={busy}>
              <Award size={16} /> Naam theek karke dobara banao
            </Button>
            <Button variant="ghost" onClick={() => void remove(cert.id)}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
          {saveError && (
            <p role="alert" className="text-sm text-(--color-danger)">
              {saveError}
            </p>
          )}
        </>
      )}

      <Card>
        <h2 className="font-display font-bold flex items-center gap-2">
          <ShieldCheck size={18} /> Certificate ID format check
        </h2>
        <p className="text-xs text-(--color-muted) mt-1">
          Yeh sirf ID ka pattern/checksum check karta hai. Server registry se issuance verify nahi karta.
        </p>
        <div className="flex gap-2 mt-3">
          <input
            className={inputCls}
            aria-label="Certificate ID"
            placeholder="EMA-2026-XXXXXXXX-00"
            value={vid}
            onChange={(event) => {
              setVid(event.target.value);
              setFormatResult(null);
            }}
          />
          <Button onClick={() => setFormatResult(certFormatValid(vid))}>Check</Button>
        </div>
        {formatResult !== null && (
          <p className={`text-sm mt-2 font-semibold ${formatResult ? "text-green-700" : "text-red-600"}`}>
            {formatResult
              ? "✓ ID ka format/checksum sahi hai (issuance verify nahi hua)"
              : "✗ ID ka format/checksum galat hai"}
          </p>
        )}
      </Card>
    </div>
  );
}
