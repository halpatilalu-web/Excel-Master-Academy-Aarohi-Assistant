/**
 * @license MIT
 * Spreadsheet list & rule engine: filters, data validation, conditional
 * formatting rules and named ranges.
 *
 * Everything here is pure (cells in, results out) so the grid stays a view and
 * this stays testable. The rules are modelled on the ones students meet in
 * Windows Excel / mobile Excel:
 *
 *   Data ▸ Filter, Data ▸ Data Validation, Home ▸ Conditional Formatting,
 *   Formulas ▸ Name Manager.
 *
 * Nothing here needs a licence or a server — it is plain TypeScript.
 */

export interface Bounds {
  firstRow: number;
  lastRow: number;
  firstCol: number;
  lastCol: number;
}

const INDEX = (label: string): number =>
  label.replace(/\$/g, "").toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** "B2" → { row: 1, col: 1 } (0-based), or null. */
export function parseAddress(address: string): { row: number; col: number } | null {
  const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(address.trim());
  if (!match) return null;
  return { row: Number(match[2]) - 1, col: INDEX(match[1]) };
}

export function colLetter(col: number): string {
  let out = "";
  let n = col;
  do {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** "B2:B30" (or a single "B2") → bounds, or null for "A1:Z1000"-style junk. */
export function rangeBounds(range: string): Bounds | null {
  const parts = range.split(":").map((part) => parseAddress(part));
  if (!parts[0]) return null;
  const second = parts[1] ?? parts[0];
  if (!second) return null;
  return {
    firstRow: Math.min(parts[0].row, second.row),
    lastRow: Math.max(parts[0].row, second.row),
    firstCol: Math.min(parts[0].col, second.col),
    lastCol: Math.max(parts[0].col, second.col),
  };
}

/** A range can also be a comma list: "A2:A20,C2". */
export function rangesOf(spec: string): Bounds[] {
  return spec
    .split(",")
    .map((part) => rangeBounds(part.trim()))
    .filter((bounds): bounds is Bounds => bounds !== null);
}

export function addressInRange(address: string, range: string): boolean {
  const cell = parseAddress(address);
  if (!cell) return false;
  return rangesOf(range).some(
    (b) => cell.row >= b.firstRow && cell.row <= b.lastRow && cell.col >= b.firstCol && cell.col <= b.lastCol,
  );
}

/* ============================ value helpers ============================ */

/** Anything the grid can hold — formula errors included, so rules never crash. */
export type CellValue = string | number | boolean | null | undefined | { err: string };

/** A cell's text, formula errors shown as their code. */
export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object" && value !== null) return String((value as { err?: string }).err ?? "");
  return String(value);
}

/** A cell's number, tolerating "1,000", "₹1000" and "12%". Null if not numeric. */
export function cellNumber(value: CellValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/[₹$,\s]/g, "");
  if (text === "") return null;
  if (/^-?\d+(\.\d+)?%$/.test(text)) return Number(text.slice(0, -1)) / 100;
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

export interface NumberStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export function numericStats(values: CellValue[]): NumberStats {
  const numbers = values.map(cellNumber).filter((n): n is number => n !== null);
  if (!numbers.length) return { min: 0, max: 0, avg: 0, count: 0 };
  const sum = numbers.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    avg: sum / numbers.length,
    count: numbers.length,
  };
}

/* ============================== filtering ============================== */

export type FilterOp =
  | "eq"
  | "neq"
  | "contains"
  | "ncontains"
  | "begins"
  | "ends"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "blank"
  | "nblank";

export interface ListFilter {
  /** 0-based column. */
  column: number;
  op: FilterOp;
  value: string;
}

/** The AutoFilter on one sheet: a header row plus the conditions. */
export interface SheetFilter {
  filters: ListFilter[];
  /** Row index (0-based) of the header — Excel's filter row. */
  headerRow: number;
  firstRow: number;
  lastRow: number;
  firstCol: number;
  lastCol: number;
}

export const FILTER_LABELS: Record<FilterOp, string> = {
  eq: "Equals",
  neq: "Does not equal",
  contains: "Text contains",
  ncontains: "Text does not contain",
  begins: "Begins with",
  ends: "Ends with",
  gt: "Greater than",
  gte: "Greater than or equal",
  lt: "Less than",
  lte: "Less than or equal",
  blank: "Is blank",
  nblank: "Is not blank",
};

export function filterMatches(text: string, filter: ListFilter): boolean {
  const needle = filter.value.trim().toLowerCase();
  const hay = text.trim().toLowerCase();
  switch (filter.op) {
    case "eq":
      return hay === needle;
    case "neq":
      return hay !== needle;
    case "contains":
      return hay.includes(needle);
    case "ncontains":
      return !hay.includes(needle);
    case "begins":
      return hay.startsWith(needle);
    case "ends":
      return hay.endsWith(needle);
    case "blank":
      return hay === "";
    case "nblank":
      return hay !== "";
    default: {
      const left = cellNumber(text);
      const right = cellNumber(filter.value);
      if (left === null || right === null) {
        // Text comparison, like Excel comparing strings for > and <.
        const cmp = hay.localeCompare(needle);
        if (filter.op === "gt") return cmp > 0;
        if (filter.op === "gte") return cmp >= 0;
        if (filter.op === "lt") return cmp < 0;
        return cmp <= 0;
      }
      if (filter.op === "gt") return left > right;
      if (filter.op === "gte") return left >= right;
      if (filter.op === "lt") return left < right;
      return left <= right;
    }
  }
}

/**
 * Which data rows a filter hides. Every filter must match (Excel's AND across
 * columns); blank rows inside the range stay visible so the sheet keeps shape.
 */
export function hiddenRows(
  filter: SheetFilter,
  textAt: (row: number, col: number) => string,
): Set<number> {
  const hidden = new Set<number>();
  if (!filter.filters.length) return hidden;
  for (let row = filter.firstRow; row <= filter.lastRow; row++) {
    if (row === filter.headerRow) continue;
    const values = Array.from(
      { length: filter.lastCol - filter.firstCol + 1 },
      (_, i) => textAt(row, filter.firstCol + i),
    );
    if (values.every((value) => value === "")) continue;
    const visible = filter.filters.every((item) => filterMatches(values[item.column - filter.firstCol] ?? "", item));
    if (!visible) hidden.add(row);
  }
  return hidden;
}

/* =========================== data validation =========================== */

export type ValidationType = "list" | "whole" | "decimal" | "date" | "textLength" | "custom";

export type ValidationOp = "between" | "notBetween" | "equal" | "notEqual" | "greater" | "less" | "gte" | "lte";

export interface ValidationRule {
  id: string;
  /** Where the rule applies: "C2:C500". */
  range: string;
  type: ValidationType;
  op?: ValidationOp;
  min?: string;
  max?: string;
  /** Dropdown items for type "list". */
  items?: string[];
  /** Formula body for "custom" (without the leading =). */
  formula?: string;
  allowBlank?: boolean;
  showDropdown?: boolean;
  style?: "stop" | "warning" | "information";
  title?: string;
  message?: string;
}

const VALIDATION_DEFAULT_MESSAGE = (value: string) =>
  `“${value}” allowed nahi hai — is cell par Data Validation rule lagaya hua hai. Allowed value daalo ya rule badlo.`;

function compareLeft(op: ValidationOp, left: number, min: number, max: number): boolean {
  // For single-bound operators Excel uses the one limit the student typed.
  const single = Number.isFinite(min) ? min : max;
  switch (op) {
    case "between":
      return left >= Math.min(min, max) && left <= Math.max(min, max);
    case "notBetween":
      return left < Math.min(min, max) || left > Math.max(min, max);
    case "equal":
      return left === single;
    case "notEqual":
      return left !== single;
    case "greater":
      return left > single;
    case "less":
      return left < single;
    case "gte":
      return left >= single;
    default:
      return left <= single;
  }
}

/** Serial day number for dd-mm-yyyy / yyyy-mm-dd / dd/mm/yyyy, else null. */
export function dateSerial(text: string): number | null {
  const cleaned = text.trim();
  let day = 0;
  let month = 0;
  let year = 0;
  const dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(cleaned);
  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(cleaned);
  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else if (ymd) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else return null;
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/**
 * Check one typed value against one rule. Returns null when it passes, or the
 * message to show the student (Excel's "stop" alert).
 */
export function validateCell(rule: ValidationRule, raw: string): string | null {
  const text = raw.trim();
  if (text === "") return rule.allowBlank === false ? rule.message ?? "Yeh cell khali nahi chhod sakte." : null;
  const fail = rule.message ?? VALIDATION_DEFAULT_MESSAGE(text);

  if (rule.type === "list") {
    const items = rule.items ?? [];
    if (!items.length) return null;
    return items.some((item) => item.trim().toLowerCase() === text.toLowerCase()) ? null : fail;
  }

  if (rule.type === "custom") {
    // Custom rules are stored as a comparison against the cell value, e.g.
    // "value>100" or "len(value)<=10" — evaluated without eval.
    const body = (rule.formula ?? "").replace(/\s/g, "");
    const compare = /^(value|len\(value\))(>=|<=|>|<|==|!=)(-?\d+(?:\.\d+)?)$/.exec(body);
    if (!compare) return null;
    const left = compare[1] === "value" ? cellNumber(text) : text.length;
    if (left === null) return fail;
    const right = Number(compare[3]);
    const op = compare[2];
    const ok =
      op === ">="
        ? left >= right
        : op === "<="
          ? left <= right
          : op === ">"
            ? left > right
            : op === "<"
              ? left < right
              : op === "=="
                ? left === right
                : left !== right;
    return ok ? null : fail;
  }

  const op = rule.op ?? "between";
  if (rule.type === "date") {
    const left = dateSerial(text);
    const min = dateSerial(rule.min ?? "");
    const max = dateSerial(rule.max ?? "");
    // Excel stores dates as serial numbers: accept a real date or a serial.
    const serial = left ?? cellNumber(text);
    if (serial === null) return fail;
    if (min === null) return null;
    return compareLeft(op, serial, min, max ?? min) ? null : fail;
  }

  if (rule.type === "textLength") {
    const min = rule.min === undefined || rule.min === "" ? Number.NaN : Number(rule.min);
    const max = rule.max === undefined || rule.max === "" ? Number.NaN : Number(rule.max);
    if (!Number.isFinite(min) && !Number.isFinite(max)) return null;
    return compareLeft(op, text.length, Number.isFinite(min) ? min : max, Number.isFinite(max) ? max : min) ? null : fail;
  }

  const left = cellNumber(text);
  if (left === null) return fail;
  if (rule.type === "whole" && !Number.isInteger(left)) return fail;
  const min = cellNumber(rule.min ?? "");
  const max = cellNumber(rule.max ?? "");
  if (min === null && max === null) return null;
  return compareLeft(op, left, min ?? (max as number), max ?? (min as number)) ? null : fail;
}

/** The rule that governs an address, if any (first match wins). */
export function ruleFor(ruleList: ValidationRule[], address: string): ValidationRule | undefined {
  return ruleList.find((rule) => addressInRange(address, rule.range));
}

/* ======================= conditional formatting ======================== */

export type CfType =
  | "greater"
  | "less"
  | "between"
  | "equal"
  | "textContains"
  | "top"
  | "bottom"
  | "aboveAvg"
  | "belowAvg"
  | "duplicates"
  | "unique"
  | "dataBar"
  | "colorScale";

export interface CfRule {
  id: string;
  type: CfType;
  /** Applies to this range, e.g. "B2:B30" or "A2:F30". */
  range: string;
  a?: string;
  b?: string;
  text?: string;
  /** N for Top/Bottom rules. */
  n?: number;
  fill?: string;
  color?: string;
  bold?: boolean;
  bar?: boolean;
  scale?: boolean;
  italic?: boolean;
}

export interface CfStyle {
  fill?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  bar?: boolean;
  scale?: "good" | "mid" | "bad";
}

export const CF_PRESETS: { fill: string; color: string; label: string }[] = [
  { fill: "#dcfce7", color: "#15803d", label: "Green fill, dark green text" },
  { fill: "#fee2e2", color: "#b91c1c", label: "Red fill, dark red text" },
  { fill: "#fef9c3", color: "#a16207", label: "Yellow fill, dark yellow text" },
  { fill: "#dbeafe", color: "#1d4ed8", label: "Blue fill, dark blue text" },
  { fill: "#f3e8ff", color: "#6d28d9", label: "Purple fill, purple text" },
  { fill: "#f1f5f9", color: "#334155", label: "Grey fill, slate text" },
];

function rankOf(rule: CfRule, value: number, stats: NumberStats, values: CellValue[]): boolean {
  const numbers = values.map(cellNumber).filter((n): n is number => n !== null);
  if (!numbers.length) return false;
  const n = Math.max(1, rule.n ?? 10);
  const sorted = [...numbers].sort((a, b) => b - a);
  if (rule.type === "top") return sorted.slice(0, n).includes(value);
  const ascending = [...numbers].sort((a, b) => a - b);
  void stats;
  return ascending.slice(0, n).includes(value);
}

function countOccurrences(values: CellValue[], text: string): number {
  return values.filter((value) => cellText(value).trim().toLowerCase() === text.trim().toLowerCase()).length;
}

/**
 * Does one rule fire for this cell? `values` is every value inside the rule's
 * range (needed for Top N, duplicates and averages).
 */
export function ruleMatches(rule: CfRule, address: string, value: CellValue, values: CellValue[]): CfStyle | null {
  if (!addressInRange(address, rule.range)) return null;
  const text = cellText(value);
  const number = cellNumber(value);
  const stats = numericStats(values);
  const base: CfStyle = {};
  if (rule.fill) base.fill = rule.fill;
  if (rule.color) base.color = rule.color;
  if (rule.bold) base.bold = true;
  if (rule.italic) base.italic = true;

  switch (rule.type) {
    case "greater": {
      const limit = cellNumber(rule.a ?? "");
      return number !== null && limit !== null && number > limit ? base : null;
    }
    case "less": {
      const limit = cellNumber(rule.a ?? "");
      return number !== null && limit !== null && number < limit ? base : null;
    }
    case "between": {
      const low = cellNumber(rule.a ?? "");
      const high = cellNumber(rule.b ?? "");
      return number !== null && low !== null && high !== null && number >= Math.min(low, high) && number <= Math.max(low, high)
        ? base
        : null;
    }
    case "equal": {
      const target = rule.text ?? rule.a ?? "";
      const targetNumber = cellNumber(target);
      return targetNumber !== null && number !== null ? (number === targetNumber ? base : null) : text.trim().toLowerCase() === target.trim().toLowerCase() ? base : null;
    }
    case "textContains":
      return (rule.text ?? "") !== "" && text.toLowerCase().includes((rule.text ?? "").toLowerCase()) ? base : null;
    case "top":
    case "bottom":
      return number !== null && rankOf(rule, number, stats, values) ? base : null;
    case "aboveAvg":
      return number !== null && stats.count > 0 && number > stats.avg ? base : null;
    case "belowAvg":
      return number !== null && stats.count > 0 && number < stats.avg ? base : null;
    case "duplicates":
      return text.trim() !== "" && countOccurrences(values, text) > 1 ? base : null;
    case "unique":
      return text.trim() !== "" && countOccurrences(values, text) === 1 ? base : null;
    case "dataBar":
      return { bar: true };
    case "colorScale":
      return null; // handled by colourScale(), needs min/max over the range.
  }
}

/** Excel's 3-colour scale: red at the bottom, yellow in the middle, green on top. */
export function colourScaleFor(rule: CfRule, address: string, value: CellValue, values: CellValue[]): CfStyle | null {
  if (rule.type !== "colorScale" || !addressInRange(address, rule.range)) return null;
  const number = cellNumber(value);
  if (number === null) return null;
  const stats = numericStats(values);
  if (stats.count < 2) return { scale: "mid" };
  const ratio = stats.max === stats.min ? 0.5 : (number - stats.min) / (stats.max - stats.min);
  return { scale: ratio > 0.66 ? "good" : ratio < 0.33 ? "bad" : "mid" };
}

/** Merge every rule's style for one cell (later rules win, like Excel). */
export function cfStyleFor(
  rules: CfRule[],
  address: string,
  value: CellValue,
  valuesByRule: (rule: CfRule) => CellValue[],
): CfStyle {
  let style: CfStyle = {};
  for (const rule of rules) {
    const hit = rule.type === "colorScale" ? colourScaleFor(rule, address, value, valuesByRule(rule)) : ruleMatches(rule, address, value, valuesByRule(rule));
    if (!hit) continue;
    // Later rules win only for the properties they actually set, exactly the
    // way Excel stacks conditional formats.
    Object.entries(hit).forEach(([key, value2]) => {
      if (value2 !== undefined) (style as Record<string, unknown>)[key] = value2;
    });
  }
  return style;
}

/* ============================ named ranges ============================= */

export interface NamedRange {
  id: string;
  name: string;
  range: string;
}

const RESERVED_NAME = /^(TRUE|FALSE)$/i;

/** Expand student-defined names inside a formula: =SUM(Sales) → =SUM(B2:B30). */
export function expandNamedRanges(formula: string, names: NamedRange[]): string {
  if (!formula.startsWith("=") || !names.length) return formula;
  let out = formula;
  for (const item of names) {
    const name = item.name.trim();
    if (!name || RESERVED_NAME.test(name)) continue;
    const escaped = name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&");
    // Whole-word match, never inside a quoted string or function name.
    const pattern = new RegExp(`(^|[^A-Za-z0-9_.'\\\\"])(${escaped})(?=[^A-Za-z0-9_(.]|$)`, "g");
    out = out.replace(pattern, (_all, prefix: string) => `${prefix}${item.range}`);
  }
  return out;
}

export function nameFor(range: string, names: NamedRange[]): string | undefined {
  return names.find((item) => item.range.replace(/\$/g, "").toUpperCase() === range.replace(/\$/g, "").toUpperCase())?.name;
}
