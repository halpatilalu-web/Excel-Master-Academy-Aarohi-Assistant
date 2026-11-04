import { useRef, useState } from "react";
import { Download, FileCheck2, Upload } from "lucide-react";
import { LABS, datasetCSV, downloadText } from "../data/labs";
import { useSubmissions, type Submission } from "../lib/academy";
import { Button, Card, Pill } from "../components/ui";

const ALLOWED_EXTENSIONS = ["csv", "xlsx", "xls"];
const MAX_FILE_BYTES = 5_000_000;

export function Lab() {
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
        setLabMessage(labId, "Sirf .csv, .xlsx ya .xls file chuno. Macro wali .xlsm file practice mode mein allowed nahi hai.");
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

      if (ext === "csv" && need.length > 0) {
        // Only the HEADER row is checked. Scanning the whole file meant any
        // stray mention in a data row counted as a correct column name.
        const headerLine = (await file.text()).split(/\r?\n/, 1)[0] ?? "";
        const header = headerLine.toLowerCase();
        const missing = need.filter((word) => !header.includes(word.toLowerCase()));
        status = "Auto-checked";
        score = Math.round(((need.length - missing.length) / need.length) * 100);
        feedback = missing.length
          ? `Basic check (sirf header row): yeh zaroori column nahi mila — ${missing.join(", ")}.`
          : "Basic check (sirf header row): sab zaroori column mil gaye. Values/formulas khud bhi verify karo.";
      } else if (ext === "csv") {
        feedback =
          "Is lab mein auto-check nahi hai — practice record save ho gaya. Apni workbook apne paas rakho.";
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
      setLabMessage(labId, "Practice record save ho gaya!");
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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Practical Lab</h1>
        <p className="text-sm text-(--color-muted) mt-1">
          Dataset download karo, Excel mein kaam karo, phir practice record save karo. CSV par basic column check hota hai.
          Is practice version mein tumhari workbook file server par upload ya teacher-review nahi hoti.
        </p>
      </div>

      {loading && items.length === 0 && <p className="text-sm text-(--color-muted)">Submissions load ho rahe hain…</p>}
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
            <Card key={lab.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-(--color-muted)">Chapter {lab.chapter}</div>
                  <h2 className="font-display font-bold">{lab.title}</h2>
                </div>
                {last && (
                  <Pill tone={tone}>
                    {last.status}
                    {last.score !== undefined ? ` · ${last.score}%` : ""}
                  </Pill>
                )}
              </div>

              <p className="text-sm mt-2">{lab.task}</p>

              <div className="flex flex-wrap gap-2 mt-4">
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
                  <Upload size={16} /> {busy === lab.id ? "Save ho raha hai…" : "Practice record save karo"}
                </Button>
              </div>

              {msg[lab.id] && (
                <p role="status" className="text-sm mt-2 text-(--color-accent-dark)">
                  {msg[lab.id]}
                </p>
              )}

              {last && (
                <div className="mt-3 text-xs rounded-xl bg-(--color-canvas) p-3 flex gap-2">
                  <FileCheck2 size={16} className="shrink-0" />
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
  );
}
