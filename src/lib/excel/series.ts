/**
 * @license MIT
 * Excel's AutoFill series logic.
 *
 * Dragging a fill handle is not "copy the cell" — Excel looks at the *seed*
 * cells and continues the pattern: 1 → 2 → 3, Mon → Tue → Wed, Q1 → Q2,
 * 10-Jan-2026 → 11-Jan-2026, "Item 1" → "Item 2", ₹1,000 → ₹2,000. This module
 * reproduces that from the seeds the student selected, with the same built-in
 * custom lists Excel ships (days, months, quarters) plus the ones every Indian
 * office maintains (weekdays in Hindi, financial quarters, GST slabs).
 *
 * It is pure: seeds in, next values out. The grid decides how many cells to
 * write, so the same code drives the fill handle, Fill Down and Fill Series.
 */
export type Seed =
  | { kind: "number"; value: number; decimals: number }
  | { kind: "date"; serial: number }
  | { kind: "text"; value: string }
  | { kind: "formula"; value: string }
  | { kind: "blank" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = DAYS.map((day) => day.slice(0, 3));
/** Hindi weekday names, which students typing in Devanagari expect to continue. */
const DAYS_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const FISCAL = ["Q1 FY", "Q2 FY", "Q3 FY", "Q4 FY"];
const GST = ["0%", "5%", "12%", "18%", "28%"];

/** Custom lists Excel ships, plus the office lists this course teaches. */
export const CUSTOM_LISTS: string[][] = [DAYS, DAYS_SHORT, DAYS_HI, MONTHS, MONTHS_SHORT, QUARTERS, FISCAL, GST];

/** Accepts "1,23,456.50", "₹1,200", "12%" and returns the number + decimals. */
function parseNumber(text: string): { value: number; decimals: number } | null {
  const cleaned = text.trim().replace(/[₹$,\s]/g, "").replace(/%$/, "");
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const decimals = cleaned.includes(".") ? (cleaned.split(".")[1] ?? "").length : 0;
  return { value: Number(cleaned), decimals };
}

/** Excel serial (1899-12-30 = 0) for a dd-mm-yyyy / yyyy-mm-dd / dd/mm/yy text. */
export function parseSerial(text: string): number | null {
  const m = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/.exec(text.trim());
  if (!m) return null;
  const [, a, b, c] = m;
  let year: number;
  let month: number;
  let day: number;
  if (a.length === 4) {
    year = Number(a);
    month = Number(b);
    day = Number(c);
  } else {
    day = Number(a);
    month = Number(b);
    year = c.length === 2 ? 2000 + Number(c) : Number(c);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86400000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel serial → dd-mm-yyyy (the format the grid displays and re-parses). */
export function serialToText(serial: number): string {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}`;
}

/** Classify one seed cell so the series logic knows what it is looking at. */
export function readSeed(text: string): Seed {
  if (text === undefined || text === null || text.trim() === "") return { kind: "blank" };
  if (text.startsWith("=")) return { kind: "formula", value: text };
  const serial = parseSerial(text);
  if (serial !== null) return { kind: "date", serial };
  const number = parseNumber(text);
  if (number) return { kind: "number", value: number.value, decimals: number.decimals };
  return { kind: "text", value: text.trim() };
}

/** Position of `value` inside a custom list (case-insensitive), or -1. */
function listIndex(value: string): { list: string[]; index: number } | null {
  const lower = value.toLowerCase();
  for (const list of CUSTOM_LISTS) {
    const index = list.findIndex((item) => item.toLowerCase() === lower);
    if (index >= 0) return { list, index };
  }
  return null;
}

/**
 * Continue a textual pattern.
 *
 * Handles:
 *  - trailing numbers ("Item 1" → "Item 2", "Floor-01" → "Floor-02", keeps padding)
 *  - custom lists (a day/month/quarter continues to the next entry, cycling)
 *  - a plain word repeated, which is what Excel does when it cannot infer more
 */
function nextText(seeds: string[], count: number): string[] {
  const out: string[] = [];
  const first = seeds[0];

  // Custom lists: use the seed's position and step forward one entry each time.
  const listed = listIndex(first);
  if (listed) {
    const step = seeds.length > 1 && listIndex(seeds[1])?.index !== listed.index ? 1 : 1;
    for (let i = 1; i <= count; i++) {
      const position = (listed.index + i * step) % listed.list.length;
      const template = seeds[seeds.length - 1] ?? first;
      // Keep the original casing/padding style of the seed when it is short (Jan vs January).
      const source = listed.list[position];
      out.push(template === first && seeds.length === 1 ? source : source);
    }
    return out;
  }

  // Trailing number with optional zero padding: "Item 007" → "Item 008".
  const trailing = /^(.*?)(\d+)$/.exec(first);
  if (trailing) {
    const [, prefix, digits] = trailing;
    const startNumber = Number(digits);
    const width = digits.length;
    const step = seeds.length > 1 ? Number(/(\d+)$/.exec(seeds[1])?.[1] ?? startNumber + 1) - startNumber : 1;
    for (let i = 1; i <= count; i++) {
      const nextValue = startNumber + step * i;
      out.push(`${prefix}${String(nextValue).padStart(width, "0")}`);
    }
    return out;
  }

  // Nothing numeric: repeat the seed text (Excel copies text unless it knows a list).
  for (let i = 0; i < count; i++) out.push(seeds[i % seeds.length]);
  return out;
}

/** Numeric seeds → arithmetic progression using the seed step when there is one. */
function nextNumber(seeds: number[], count: number): number[] {
  if (seeds.length === 1) {
    const base = seeds[0];
    return Array.from({ length: count }, (_, i) => base + (i + 1));
  }
  const step = seeds[1] - seeds[0];
  const last = seeds[seeds.length - 1];
  return Array.from({ length: count }, (_, i) => last + step * (i + 1));
}

/**
 * Main entry point: given the seed values and how many cells to produce, return
 * the values for the filled cells (never including the seeds themselves).
 *
 * @param seedTexts raw cell texts of the selected seed block, in order
 * @param count how many new cells the drag covers
 * @param orientation "down" continues rows, "right"/"left" continue columns
 * @param spreadFormulas when true (default) formulas are shifted, not copied
 */
export function fillSeries(
  seedTexts: string[],
  count: number,
  orientation: "down" | "up" | "right" | "left" = "down",
  spreadFormulas = true,
): string[] {
  if (count <= 0) return [];
  const seeds = seedTexts.map(readSeed);
  const reverse = orientation === "up" || orientation === "left";

  // Formulas: shift relative references by one step each cell.
  if (seeds.every((seed) => seed.kind === "formula" && spreadFormulas)) {
    const step = reverse ? -1 : 1;
    return Array.from({ length: count }, (_, i) => shiftFormula((seedTexts[seedTexts.length - 1] ?? ""), step * (i + 1), orientation));
  }

  if (seeds.every((seed) => seed.kind === "date")) {
    const serials = seeds.map((seed) => (seed as { serial: number }).serial);
    const step = serials.length > 1 ? serials[1] - serials[0] : 1;
    const last = serials[serials.length - 1];
    return Array.from({ length: count }, (_, i) => serialToText(last + step * (reverse ? -1 : 1) * (i + 1)));
  }

  if (seeds.every((seed) => seed.kind === "number")) {
    const numbers = seeds.map((seed) => (seed as { value: number }).value);
    const decimals = (seeds[seeds.length - 1] as { decimals: number }).decimals;
    const values = nextNumber(numbers, count);
    const ordered = reverse ? [...values].reverse() : values;
    return ordered.map((value) => (decimals ? value.toFixed(decimals) : String(value)));
  }

  if (seeds.every((seed) => seed.kind === "text")) {
    const texts = seeds.map((seed) => (seed as { value: string }).value);
    const values = nextText(texts, count);
    return reverse ? values.reverse() : values;
  }

  // Mixed seeds: Excel copies the seed block, cycling through it.
  return Array.from({ length: count }, (_, i) => seedTexts[i % seedTexts.length] ?? "");
}

/**
 * Shift every relative A1 reference in a formula, keeping `$` anchors.
 * (`=$A1+B$2` moves down to `=$A2+B$2`, exactly like Excel.)
 */
export function shiftFormula(formula: string, deltaRow: number, orientation: "down" | "up" | "right" | "left" = "down"): string {
  const deltaCol = orientation === "right" ? Math.abs(deltaRow) : orientation === "left" ? -Math.abs(deltaRow) : 0;
  const dRow = orientation === "down" ? Math.abs(deltaRow) : orientation === "up" ? -Math.abs(deltaRow) : 0;
  return formula.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})/g, (match, colAbs: string, col: string, rowAbs: string, row: string) => {
    // Skip things that are obviously function names or plain words.
    const nextCol = colAbs ? col : shiftColumn(col, deltaCol);
    const nextRow = rowAbs ? row : String(Math.max(1, Number(row) + dRow));
    void match;
    return `${colAbs}${nextCol}${rowAbs}${nextRow}`;
  });
}

function shiftColumn(col: string, delta: number): string {
  if (!delta) return col;
  let index = col.toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  index = Math.max(0, index + delta);
  let out = "";
  let n = index;
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** What will the drag write? Used for the live tooltip behind the cursor. */
export function previewFill(seedTexts: string[], count: number): string {
  const values = fillSeries(seedTexts, Math.min(count, 3));
  return values.length ? values.join(" → ") : "";
}

/**
 * Fill a series with an explicit step/stop (Fill ▸ Series dialog):
 * the student types start, step and stop, this returns the numbers.
 */
export function seriesValues(start: number, step: number, stop: number, decimals = 0): string[] {
  if (step === 0) return [];
  const out: string[] = [];
  const forwards = step > 0;
  for (let value = start; forwards ? value <= stop + 1e-9 : value >= stop - 1e-9; value += step) {
    out.push(decimals ? value.toFixed(decimals) : String(Number(value.toFixed(10))));
    if (out.length > 10_000) break;
  }
  return out;
}
