import { useRef, useState } from "react";
import { Download, FileCheck2, FileSpreadsheet, FolderKanban, Monitor, Table2, Upload } from "lucide-react";
import { LiveSpreadsheet, type PracticeSheetId } from "../components/LiveSpreadsheet";
import { LABS, datasetCSV, downloadLabXlsx, downloadText } from "../data/labs";
import { useSubmissions, type Submission } from "../lib/academy";
import { Bilingual, LangSwitcher } from "../lib/lang";
import { Button, Card, Pill } from "../components/ui";

const ALLOWED_EXTENSIONS = ["csv", "xlsx", "xls"];
const MAX_FILE_BYTES = 5_000_000;

export function Lab({
  initialSheet = "sheet-marks",
  initialFormula,
}: { initialSheet?: PracticeSheetId; initialFormula?: string } = {}) {
  const [tab, setTab] = useState<"live" | "datasets">("live");
  const { items, loading, error: loadError, add } = useSubmissions();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const setLabMessage = (labId: string, text: string) =>
    setMsg((current) => ({ ...current, [labId]: text }));

  async function submit(labId: string, need: string[], file: File) {
    setBusy(labId);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setLabMessage(
          labId,
          "Sirf .csv, .xlsx ya .xls file chuno. Macro wali .xlsm file practice mode mein allowed nahi hai.",
        );
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setLabMessage(labId, "File 5 MB se chhoti honi chahiye.");
        return;
      }

      let status: Submission["status"] = "Saved (practice)";
      let score: number | undefined;
      let feedback =
        "Practice record save ho gaya. Is version mein file ki content server par upload/review nahi hoti — apni file apne paas rakho.";

      if (ext === "csv") {
        const text = (await file.text()).toLowerCase();
        const missing = need.filter((word) => !text.includes(word.toLowerCase()));
        status = "Auto-checked";
        score = need.length ? Math.round(((need.length - missing.length) / need.length) * 100) : 100;
        feedback = missing.length
          ? `Basic check: yeh zaroori naam/column nahi mila — ${missing.join(", ")}.`
          : "Basic check: sab zaroori naam/column mil gaye! Values/formulas khud bhi verify karo.";
      }

      await add({
        labId,
        fileName: file.name,
        size: file.size,
        date: new Date().toISOString(),
        status,
        score,
        feedback,
      });
      setLabMessage(labId, "✅ Practice record save ho gaya!");
    } catch (error) {
      setLabMessage(
        labId,
        error instanceof Error ? `Save nahi hua: ${error.message}` : "Save nahi hua. Dobara try karo.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
            🧪 Hands-On Practice Lab
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">
            Live Practice Sheet & Project Datasets 📊
          </h1>
          <p className="text-sm text-(--color-muted) mt-1">
            Practice real formulas directly inside the browser OR download multi-sheet .xlsx / .csv corporate project files!
          </p>
        </div>
        <LangSwitcher />
      </div>

      {/* The desktop is one click away from the lab — students can practise the
          same sheet inside the PC-like Windows mode. */}
      <a
        href="#/windows"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-(--color-accent)/40 bg-(--color-accent-soft)/60 px-3.5 py-2.5 text-xs no-underline"
      >
        <Monitor size={15} className="text-(--color-accent-dark)" />
        <span className="font-bold text-(--color-ink)">Windows Desktop mode</span>
        <span className="text-(--color-muted)">
          Poora PC ek tab mein — Excel, Word, PowerPoint, Paint, File Explorer, Calculator…
        </span>
        <span className="ml-auto font-semibold text-(--color-accent-dark)">Open desktop →</span>
      </a>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("live")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            tab === "live"
              ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)"
              : "neu-btn text-(--color-muted)"
          }`}
        >
          <Table2 size={16} /> Live Practice Sheet (In-Browser Excel)
        </button>
        <button
          type="button"
          onClick={() => setTab("datasets")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            tab === "datasets"
              ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)"
              : "neu-btn text-(--color-muted)"
          }`}
        >
          <FolderKanban size={16} /> Project Datasets ({LABS.length} Workbooks)
        </button>
      </div>

      {tab === "live" ? (
        <LiveSpreadsheet initialSheet={initialSheet} initialFormula={initialFormula} />
      ) : (
        <div className="space-y-4">
          {loading && items.length === 0 && (
            <p className="text-sm text-(--color-muted)">Submissions load ho rahe hain…</p>
          )}
          {loadError && (
            <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
              Submissions load nahi hue: {loadError}
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {LABS.map((lab) => {
              const last = items.find((submission) => submission.labId === lab.id);
              const tone =
                last?.status === "Auto-checked" && (last.score ?? 0) >= 100
                  ? "good"
                  : last?.status === "Saved (practice)"
                    ? "info"
                    : "warn";

              return (
                <Card key={lab.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-(--color-accent-dark)">
                        Chapter {lab.chapter} · {lab.count} Rows Dataset
                      </div>
                      <h2 className="font-display font-bold text-lg">{lab.title}</h2>
                    </div>
                    {last && (
                      <Pill tone={tone}>
                        {last.status}
                        {last.score !== undefined ? ` · ${last.score}%` : ""}
                      </Pill>
                    )}
                  </div>

                  <Bilingual compact en={lab.taskEn} hi={lab.task} className="text-sm" />

                  <div className="text-xs font-mono text-(--color-muted) bg-(--color-canvas) px-3 py-1.5 rounded-lg border border-(--color-border)">
                    Columns: {lab.header.join(" | ")}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="secondary" onClick={() => void downloadLabXlsx(lab)}>
                      <FileSpreadsheet size={16} /> .xlsx Workbook
                    </Button>
                    <Button variant="secondary" onClick={() => downloadText(lab.file, datasetCSV(lab))}>
                      <Download size={16} /> {lab.file}
                    </Button>
                    <input
                      ref={(element) => {
                        refs.current[lab.id] = element;
                      }}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void submit(lab.id, lab.need, file);
                        event.target.value = "";
                      }}
                    />
                    <Button disabled={busy === lab.id} onClick={() => refs.current[lab.id]?.click()}>
                      <Upload size={16} /> {busy === lab.id ? "Saving…" : "Verify & Save"}
                    </Button>
                  </div>

                  {msg[lab.id] && (
                    <p role="status" className="text-sm text-(--color-accent-dark) font-medium">
                      {msg[lab.id]}
                    </p>
                  )}

                  {last && (
                    <div className="text-xs rounded-xl bg-(--color-canvas) p-3 flex gap-2 border border-(--color-border)">
                      <FileCheck2 size={16} className="shrink-0 text-(--color-good)" />
                      <div>
                        <b>{last.fileName}</b> · {Math.max(1, Math.round(last.size / 1024))} KB
                        <br />
                        {last.feedback}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
