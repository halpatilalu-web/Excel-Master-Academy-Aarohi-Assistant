import { createStore, type Doc } from "./store";
export interface Progress extends Doc { chapter: number }
export interface ExamResult extends Doc { score: number; total: number; pct: number; passed: boolean; date: string; seconds: number; byLevel: Record<string, [number, number]> }
export interface Submission extends Doc { labId: string; fileName: string; size: number; date: string; status: "Auto-checked" | "Saved (practice)" | "Pending review" | "Reviewed"; score?: number; feedback?: string }
export interface Cert extends Doc { certId: string; name: string; date: string }
export const useProgress = createStore<Progress>("progress");
export const useExams = createStore<ExamResult>("exams");
export const useSubmissions = createStore<Submission>("submissions");
export const useCerts = createStore<Cert>("certs");
export const PASS_PCT = 60;

export function certId(name: string, date: string) {
  let h = 5381;
  for (const c of name + date) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  const body = h.toString(16).toUpperCase().padStart(8, "0");
  const chk = [...body].reduce((a, c) => a + c.charCodeAt(0), 0) % 97;
  return `EMA-${date.slice(0, 4)}-${body}-${String(chk).padStart(2, "0")}`;
}
/**
 * Format/checksum check only. This does NOT verify that a certificate was
 * issued by a server registry; practice certificates are self-attested.
 */
export function certFormatValid(id: string) {
  const m = /^EMA-(\d{4})-([0-9A-F]{8})-(\d{2})$/.exec(id.trim().toUpperCase());
  return !!m && [...m[2]].reduce((a, c) => a + c.charCodeAt(0), 0) % 97 === Number(m[3]);
}

/** @deprecated Use certFormatValid — the old name overstated what is checked. */
export const certValid = certFormatValid;
