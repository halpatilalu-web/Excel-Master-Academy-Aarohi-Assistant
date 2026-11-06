/**
 * @license MIT
 * A tiny in-memory file system for the desktop shell.
 *
 * Every Office app in the desktop writes here, and the desktop shows the same
 * files on the "Desktop" and in File Explorer. It is deliberately simple (a flat
 * map keyed by document id) because a browser tab is not a disk — but it does
 * persist to the student's own store, so a document written in Word is still
 * there after a reload.
 */
import { createStore } from "../store";

export type DocKind = "sheet" | "doc" | "slides" | "image" | "text";

export interface DesktopFile {
  id: string;
  name: string;
  kind: DocKind;
  /** ISO timestamp, shown in Explorer. */
  updatedAt: string;
  /** App-specific payload — kept as text so it survives JSON storage. */
  content: string;
  folder: string;
}

const files = createStore<DesktopFile>("desktopFiles");

/** Default library so the desktop is never an empty, confusing screen. */
export const SEED_FILES: DesktopFile[] = [
  {
    id: "seed-sheet-gst",
    name: "GST-Invoice-January.xlsx",
    kind: "sheet",
    folder: "Desktop",
    updatedAt: "2026-01-08T09:30:00.000Z",
    content: JSON.stringify({
      A1: "Tax Invoice — Sharma Traders",
      A2: "No",
      B2: "Item",
      C2: "Qty",
      D2: "Rate",
      E2: "Amount",
      F2: "GST 18%",
      A3: "1",
      B3: "Laptop",
      C3: "2",
      D3: "45000",
      E3: "=C3*D3",
      F3: "=ROUND(E3*0.18,2)",
      A4: "2",
      B4: "Mouse",
      C4: "10",
      D4: "450",
      E4: "=C4*D4",
      F4: "=ROUND(E4*0.18,2)",
      E5: "=SUM(E3:E4)",
      F5: "=SUM(F3:F4)",
      D5: "Total",
    }),
  },
  {
    id: "seed-doc-offer",
    name: "Offer-Letter-Aarav.docx",
    kind: "doc",
    folder: "Desktop",
    updatedAt: "2026-01-06T11:00:00.000Z",
    content: [
      "OFFER LETTER",
      "",
      "Dear Aarav,",
      "",
      "We are pleased to offer you the position of MIS Executive at Excel Master Academy.",
      "Your annual CTC will be INR 4,80,000 (Rupees Four Lakh Eighty Thousand only),",
      "payable monthly, with a probation period of three months.",
      "",
      "Reporting: Head of Operations, Ahmedabad office.",
      "Date of joining: 01 February 2026.",
      "",
      "Please sign and return a copy of this letter as acceptance.",
      "",
      "For Excel Master Academy",
      "Head of Operations",
    ].join("\n"),
  },
  {
    id: "seed-slides-mis",
    name: "MIS-Review-Q4.pptx",
    kind: "slides",
    folder: "Desktop",
    updatedAt: "2026-01-04T16:20:00.000Z",
    content: JSON.stringify([
      { title: "Q4 MIS Review", bullets: ["Sales up 18% QoQ", "Returns down to 2.1%", "GST filed on time, all months"] },
      { title: "What worked", bullets: ["SUMIFS dashboard replaced 6 manual sheets", "Flash Fill cleaned 4,200 vendor names", "Pivot-free KPI cards shipped"] },
      { title: "Next quarter", bullets: ["Automate the dispatch register", "Train 12 staff on XLOOKUP", "Move reports to Power Query (desktop Excel)"] },
    ]),
  },
];

export function useDesktopFiles() {
  return files();
}

/**
 * The slice of the store that saving needs. Passed in explicitly because
 * `files()` is a hook: calling it from an onClick throws "Invalid hook call",
 * which is exactly the bug this signature prevents.
 */
export interface FileStore {
  items: DesktopFile[];
  add: (doc: Omit<DesktopFile, "id" | "_created" | "_updated"> & { id?: string }) => Promise<DesktopFile>;
  update: (id: string, patch: Partial<DesktopFile>) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

/**
 * Create or update a file by id (falling back to name). Kept free of hooks so
 * any app can call it from an onClick, and so it is easy to unit-test.
 */
export async function saveDesktopFile(
  input: { id?: string; name: string; kind: DocKind; content: string; folder?: string },
  store: FileStore,
): Promise<DesktopFile> {
  const existing =
    store.items.find((item) => item.id === input.id) ?? store.items.find((item) => item.name === input.name);
  const payload = {
    name: input.name,
    kind: input.kind,
    content: input.content,
    folder: input.folder ?? "Desktop",
    updatedAt: new Date().toISOString(),
  };
  if (existing) {
    await store.update(existing.id, payload);
    return { ...existing, ...payload };
  }
  const created = await store.add(payload);
  return { id: created?.id ?? `local-${Date.now()}`, ...payload } as DesktopFile;
}

export async function deleteDesktopFile(id: string, store: FileStore): Promise<void> {
  await store.remove(id);
}

/** Bytes for a file download, so work can leave the desktop as a real file. */
export function downloadText(name: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
