/**
 * Core value model for the in-browser Excel-compatible formula engine.
 *
 * Everything here is written from scratch for this course (MIT), so the whole
 * Office 365 formula surface can be practised for free, offline, on any device —
 * no desktop Excel, no Microsoft 365 subscription and no paid spreadsheet API.
 *
 * The engine follows Excel's own rules for the things students notice first:
 * how text becomes a number, what "empty" means in a sum, why "10" > 9 is TRUE
 * in Excel, and how a comparison operator behaves inside a SUMIF criteria.
 */

export type ErrorCode =
  | "#NULL!"
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#NUM!"
  | "#N/A"
  | "#SPILL!"
  | "#CALC!"
  | "#CYCLE!"
  | "#GETTING_DATA"
  | "#BLOCKED!";

export interface XErr {
  readonly err: ErrorCode;
  /** Extra hint shown in the UI (never part of the Excel-visible value). */
  readonly hint?: string;
}

export interface XLambda {
  readonly lambda: {
    params: { name: string; optional?: boolean }[];
    body: unknown; // AST — kept opaque here to avoid a cycle with the parser
    /** Parameter indexes the current call left out — read by ISOMITTED(). */
    omitted?: Set<number>;
  };
  /** Captured outer variables, so LAMBDA closes over LET bindings. */
  readonly closure?: Map<string, Scalar | Scalar[][]>;
}

/** A value that can live in one cell. `null` means "empty cell". */
export type Scalar = number | string | boolean | XErr | XLambda | null;

/** Any evaluated value: a cell value or a rectangular 2-D array (dynamic array). */
export type Val = Scalar | Scalar[][];

export const err = (code: ErrorCode, hint?: string): XErr => ({ err: code, hint });
export const VALUE = err("#VALUE!");
export const DIV0 = err("#DIV/0!");
export const REF = err("#REF!");
export const NAME = err("#NAME?");
export const NUM = err("#NUM!");
export const NA = err("#N/A");
export const CALC = err("#CALC!");
export const CYCLE = err("#CYCLE!");

export function isErr(v: unknown): v is XErr {
  return typeof v === "object" && v !== null && "err" in (v as Record<string, unknown>);
}

export function isLambda(v: unknown): v is XLambda {
  return typeof v === "object" && v !== null && "lambda" in (v as Record<string, unknown>);
}

export function isArray(v: unknown): v is Scalar[][] {
  return Array.isArray(v);
}

/** First scalar of any value (Excel's implicit intersection for scalars). */
export function scalarOf(v: Val): Scalar {
  if (!isArray(v)) return v;
  const first = v[0]?.[0];
  return first === undefined ? null : first;
}

export function isBlank(v: Scalar): boolean {
  return v === null || v === undefined;
}

/** Number of significant digits Excel displays before switching to exponent. */
export function formatGeneral(n: number): string {
  if (!Number.isFinite(n)) return "#NUM!";
  if (Object.is(n, -0)) return "0";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-9 || abs >= 1e15)) return n.toExponential(5).replace(/\.?0+e/, "E");
  // Kill binary floating-point noise (0.30000000000000004) the way Excel does.
  const rounded = Number(n.toPrecision(15));
  return String(rounded);
}

function parseNumberLike(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  // Excel is forgiving about thousands separators and trailing %.
  const pct = t.endsWith("%");
  const body = (pct ? t.slice(0, -1) : t).replace(/,/g, "");
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(body)) return null;
  const n = Number(body);
  if (!Number.isFinite(n)) return null;
  return pct ? n / 100 : n;
}

/** Excel text → number, or `null` when the text is not numeric. */
export function toNumberOrNull(v: Scalar): number | null {
  if (isBlank(v)) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") return parseNumberLike(v);
  return null;
}

export function toNum(v: Scalar): number | XErr {
  if (isErr(v)) return v;
  if (typeof v === "number") return v;
  const n = toNumberOrNull(v);
  return n === null ? VALUE : n;
}

/** Excel text of a value (TRUE / 123 / "" for empty). */
export function toStr(v: Scalar): string | XErr {
  if (isErr(v)) return v;
  if (isBlank(v)) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return formatGeneral(v);
  return VALUE;
}

export function toBool(v: Scalar): boolean | XErr {
  if (isErr(v)) return v;
  if (isBlank(v)) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v !== "string") return VALUE;
  const t = v.trim().toUpperCase();
  if (t === "TRUE") return true;
  if (t === "FALSE") return false;
  return VALUE;
}

/** Data type rank used by Excel when comparing different types. */
function typeRank(v: Scalar): number {
  if (isBlank(v)) return 0;
  if (typeof v === "number") return 1;
  if (typeof v === "string") return 2;
  if (typeof v === "boolean") return v ? 4 : 3;
  return 5;
}

/** Excel `=` comparison (case-insensitive text, typed ordering). */
export function compareValues(a: Scalar, b: Scalar): number {
  if (isErr(a)) return 1;
  if (isErr(b)) return -1;
  const ra = typeRank(a);
  const rb = typeRank(b);
  if (ra !== rb) {
    // Empty cell compares as 0 against numbers and "" against text.
    if (ra === 0 && rb === 1) return 0 - (b as number) === 0 ? 0 : (0 > (b as number) ? 1 : -1);
    if (rb === 0 && ra === 1) return (a as number) === 0 ? 0 : ((a as number) > 0 ? 1 : -1);
    if (ra === 0) return rb === 2 ? 0 : -1;
    if (rb === 0) return ra === 2 ? 0 : 1;
    return ra < rb ? -1 : 1;
  }
  if (ra === 1) {
    const x = a as number;
    const y = b as number;
    return x === y ? 0 : x < y ? -1 : 1;
  }
  if (ra === 2) {
    const x = (a as string).toLowerCase();
    const y = (b as string).toLowerCase();
    return x === y ? 0 : x < y ? -1 : 1;
  }
  return 0;
}

export function excelEquals(a: Scalar, b: Scalar): boolean {
  if (isBlank(a) && isBlank(b)) return true;
  return compareValues(a, b) === 0;
}

/* ------------------------------------------------------------------ *
 * Criteria ("≥40", "<>Delhi", "A*", 100) used by SUMIF/COUNTIF/DSUM …
 * ------------------------------------------------------------------ */

function wildcardToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "~") {
      const next = pattern[i + 1];
      if (next === "*" || next === "?" || next === "~") {
        out += next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        i++;
        continue;
      }
      out += "~";
      continue;
    }
    if (ch === "*") out += "[\\s\\S]*";
    else if (ch === "?") out += "[\\s\\S]";
    else out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

export interface Criteria {
  op: "=" | "<>" | ">" | ">=" | "<" | "<=";
  value: Scalar;
  regex?: RegExp;
}

export function parseCriteria(raw: Val): Criteria {
  if (isArray(raw)) return parseCriteria(scalarOf(raw));
  if (isErr(raw)) return { op: "=", value: raw };
  if (typeof raw !== "string") return { op: "=", value: raw };
  const m = /^(<>|>=|<=|=|>|<)?([\s\S]*)$/.exec(raw.trim());
  const op = (m?.[1] as Criteria["op"]) ?? "=";
  const body = m?.[2] ?? "";
  const num = parseNumberLike(body);
  const bool = /^(true|false)$/i.test(body) ? /^true$/i.test(body) : null;
  let value: Scalar = num !== null ? num : bool !== null ? bool : body;
  // An empty criteria ("=" or "") matches empty cells.
  if (body === "" && op === "=") value = null;
  const regex =
    typeof value === "string" && !isErr(raw) ? wildcardToRegExp(value) : undefined;
  return { op, value, regex };
}

export function matchesCriteria(cell: Scalar, crit: Criteria): boolean {
  const { op, value } = crit;
  if (isErr(value)) return isErr(cell) && (cell as XErr).err === (value as XErr).err;
  if (crit.regex) {
    const text = isBlank(cell) ? "" : toStr(cell);
    if (isErr(text)) return false;
    const hit = crit.regex.test(text);
    return op === "<>" ? !hit : hit;
  }
  if (op === "=") return excelEquals(cell, value);
  if (op === "<>") return !excelEquals(cell, value);
  const cmp = compareValues(cell, value);
  if (op === ">") return cmp > 0;
  if (op === ">=") return cmp >= 0;
  if (op === "<") return cmp < 0;
  return cmp <= 0;
}

/* ------------------------------------------------------------------ *
 * Dates — Excel 1900 date system (serial 1 = 1900-01-01)
 * ------------------------------------------------------------------ */

export const MS_PER_DAY = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
export const MAX_SERIAL = 2_958_465; // 9999-12-31

export function serialToDate(serial: number): Date {
  const ms = EXCEL_EPOCH + Math.round(serial * MS_PER_DAY);
  return new Date(ms);
}

export function dateToSerial(d: Date): number {
  const utc = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
  );
  return (utc - EXCEL_EPOCH) / MS_PER_DAY;
}

/** A date/time value from any scalar (number = serial, text = parsed). */
export function toSerial(v: Scalar): number | XErr {
  if (isErr(v)) return v;
  if (isBlank(v)) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v !== "string") return VALUE;
  const parsed = parseDateText(v.trim());
  return parsed === null ? VALUE : parsed;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Parses the date/time strings Excel accepts in a cell (ISO, D/M/Y, "5 Jan 2026"). */
export function parseDateText(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (iso) {
    return dateToSerial(
      new Date(
        Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] ?? 0), +(iso[5] ?? 0), +(iso[6] ?? 0)),
      ),
    );
  }
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (dmy) {
    const year = +dmy[3] < 100 ? 2000 + +dmy[3] : +dmy[3];
    return dateToSerial(
      new Date(Date.UTC(year, +dmy[2] - 1, +dmy[1], +(dmy[4] ?? 0), +(dmy[5] ?? 0), +(dmy[6] ?? 0))),
    );
  }
  const named = /^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})$/.exec(t);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (!month) return null;
    const year = +named[3] < 100 ? 2000 + +named[3] : +named[3];
    return dateToSerial(new Date(Date.UTC(year, month - 1, +named[1])));
  }
  const monthName = /^([A-Za-z]{3,9})[-\s](\d{1,2}),?[-\s](\d{2,4})$/.exec(t);
  if (monthName) {
    const month = MONTHS[monthName[1].slice(0, 3).toLowerCase()];
    if (!month) return null;
    const year = +monthName[3] < 100 ? 2000 + +monthName[3] : +monthName[3];
    return dateToSerial(new Date(Date.UTC(year, month - 1, +monthName[2])));
  }
  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?$/.exec(t);
  if (timeOnly) {
    let hours = +timeOnly[1];
    const meridiem = timeOnly[4]?.toLowerCase();
    // Excel accepts "9:30 AM", "9:30 pm" and "21:30"; the suffix decides
    // whether 12 means midnight or noon.
    if (meridiem) {
      if (hours > 12) return null;
      if (hours === 12) hours = 0;
      if (meridiem === "pm") hours += 12;
    }
    if (hours > 23 || +timeOnly[2] > 59 || +(timeOnly[3] ?? 0) > 59) return null;
    return (hours * 3600 + +timeOnly[2] * 60 + +(timeOnly[3] ?? 0)) / 86400;
  }
  return null;
}

/**
 * Excel's TIMEVALUE() reads the time part of any date/time text, including the
 * AM/PM forms users actually type. Kept separate so DATEVALUE and the grid's
 * import path can stay strict about whole dates.
 */
export function parseTimeText(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parsed = parseDateText(t);
  if (parsed === null) return null;
  // A time-only string is already a fraction of a day (0 ≤ x < 1).
  return parsed < 1 ? parsed : parsed - Math.floor(parsed);
}

export function isDateSerial(n: number): boolean {
  return n >= 1 && n < MAX_SERIAL;
}

/** Column letters ↔ 0-based index (A → 0, Z → 25, AA → 26). */
export function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) return -1;
    n = n * 26 + (code - 64);
  }
  return n - 1;
}

export function indexToCol(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function addr(row: number, col: number): string {
  return `${indexToCol(col)}${row + 1}`;
}

/** "B12" → { row: 11, col: 1 }; returns null for anything else. */
export function parseAddr(text: string): { row: number; col: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(text.trim());
  if (!m) return null;
  const col = colToIndex(m[1]);
  const row = Number(m[2]) - 1;
  if (col < 0 || row < 0) return null;
  return { row, col };
}

/** Normalise any number to a rectangular 2-D array. */
export function toMatrix(v: Val): Scalar[][] {
  if (!isArray(v)) return [[v]];
  const rows = v.length;
  const width = Math.max(1, ...v.map((r) => (Array.isArray(r) ? r.length : 1)));
  return Array.from({ length: Math.max(1, rows) }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      const row = v[r];
      if (!Array.isArray(row)) return (row ?? null) as Scalar;
      const cell = row[c];
      return (cell === undefined ? null : cell) as Scalar;
    }),
  );
}

/** Flatten numbers out of ranges, skipping text/blank like SUM does. */
export function numbersIn(v: Val): number[] {
  const out: number[] = [];
  const walk = (x: Val) => {
    if (isArray(x)) {
      x.forEach((row) => walk(row as unknown as Val));
      return;
    }
    if (isErr(x) || typeof x === "object") return;
    const n = toNumberOrNull(x);
    if (n !== null && !isBlank(x)) out.push(n);
  };
  walk(v);
  return out;
}

/** Every scalar in a range, in row-major order (blanks included as null). */
export function scalarsIn(v: Val): Scalar[] {
  if (!isArray(v)) return [v];
  return v.flatMap((row) => (Array.isArray(row) ? row : [row])) as Scalar[];
}

export function findError(v: Val): XErr | null {
  if (isErr(v)) return v;
  if (!isArray(v)) return null;
  for (const row of v) {
    const arr: Scalar[] = Array.isArray(row) ? row : [row];
    for (const cell of arr) {
      const e = findError(cell);
      if (e) return e;
    }
  }
  return null;
}
