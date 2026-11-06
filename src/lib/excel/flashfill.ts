/**
 * Flash Fill — infer a transformation from the cells the student typed by hand
 * and apply it to the rest of the column, exactly like Ctrl+E in Excel.
 *
 * The real Excel engine guesses from examples; so does this one, but with a
 * small, explainable library of patterns instead of a neural net. Every rule is
 * a pure function, so the grid can show *why* a cell was filled and the whole
 * feature is unit-tested without a browser.
 *
 * Supported patterns (all case-insensitive on the input):
 *  - first word / last word (split on space, -, _, /, .)
 *  - first N characters / last N characters
 *  - text between the same delimiter
 *  - before / after a delimiter ("@" for e-mail domains)
 *  - upper/lower/Proper case, and trim of spaces
 *  - extract digits, extract letters
 *  - date parts (day, month, year) from any parseable date text
 *  - concatenation of two source columns (e.g. "Aarav" + "Sharma" → "Aarav Sharma")
 *  - constant prefix + source column or constant suffix
 */
export type FlashRule =
  | { k: "word"; index: number }
  | { k: "left"; n: number }
  | { k: "right"; n: number }
  | { k: "between"; open: string; close: string }
  | { k: "before"; sep: string }
  | { k: "after"; sep: string }
  | { k: "case"; mode: "upper" | "lower" | "proper" }
  | { k: "trim" }
  | { k: "digits" }
  | { k: "letters" }
  | { k: "datePart"; part: "day" | "month" | "year" }
  | { k: "concat"; secondColumn: number; joiner: string }
  | { k: "prefix"; text: string }
  | { k: "suffix"; text: string };

export interface FlashFillResult {
  /** The rule that explained every example, if one did. */
  rule: FlashRule | null;
  /** Filled values, keyed by 0-based row inside the target column. */
  values: Record<number, string>;
  /** Human explanation for the status bar. */
  explain: string;
}

const SPLIT_RE = /[\s\-_/.]+/;
const DATE_PARTS = /^(\d{1,4})[-/.](\d{1,4})[-/.](\d{1,4})$/;

function words(text: string): string[] {
  return text.split(SPLIT_RE).filter(Boolean);
}

function proper(text: string): string {
  // Lower-case everything first, then capitalise the first letter of each word.
  return text
    .toLowerCase()
    .replace(/(^|[\s\-_/.])(\p{L})/gu, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

/** Every candidate rule, cheapest/most-useful first so the guess is predictable. */
function candidates(source: string): { rule: FlashRule; label: string }[] {
  const list: { rule: FlashRule; label: string }[] = [];
  const w = words(source);
  if (w.length > 1) {
    list.push({ rule: { k: "word", index: 0 }, label: "first word" });
    list.push({ rule: { k: "word", index: w.length - 1 }, label: "last word" });
  }
  for (let n = 1; n <= Math.min(12, source.length); n++) {
    list.push({ rule: { k: "left", n }, label: `first ${n} characters` });
    list.push({ rule: { k: "right", n }, label: `last ${n} characters` });
  }
  (["@", "-", "_", "/", ".", ",", ":", " "].filter((sep) => source.includes(sep)) as string[]).forEach((sep) => {
    list.push({ rule: { k: "before", sep }, label: `text before "${sep}"` });
    list.push({ rule: { k: "after", sep }, label: `text after "${sep}"` });
    list.push({ rule: { k: "between", open: sep, close: sep }, label: `text between "${sep}"` });
  });
  ([["(", ")"], ["[", "]"], ['"', '"']] as [string, string][]).forEach(([open, close]) => {
    if (source.includes(open) && source.includes(close)) {
      list.push({ rule: { k: "between", open, close }, label: `text inside ${open}…${close}` });
    }
  });
  list.push({ rule: { k: "case", mode: "upper" }, label: "UPPER CASE" });
  list.push({ rule: { k: "case", mode: "lower" }, label: "lower case" });
  list.push({ rule: { k: "case", mode: "proper" }, label: "Proper Case" });
  list.push({ rule: { k: "trim" }, label: "trimmed text" });
  if (/\d/.test(source)) list.push({ rule: { k: "digits" }, label: "digits only" });
  if (/[A-Za-z]/.test(source)) list.push({ rule: { k: "letters" }, label: "letters only" });
  ([["day", 1], ["month", 2], ["year", 3]] as ["day" | "month" | "year", number][]).forEach(([part, group]) => {
    const m = DATE_PARTS.exec(source.trim());
    if (m) list.push({ rule: { k: "datePart", part }, label: `${part} of the date` });
  });
  return list;
}

function applyRule(rule: FlashRule, source: string, second?: string): string {
  const text = source.trim();
  switch (rule.k) {
    case "word": {
      const w = words(text);
      return w[rule.index] ?? "";
    }
    case "left":
      return text.slice(0, rule.n);
    case "right":
      return text.slice(-rule.n);
    case "before": {
      const at = text.indexOf(rule.sep);
      return at < 0 ? text : text.slice(0, at);
    }
    case "after": {
      const at = text.lastIndexOf(rule.sep);
      return at < 0 ? text : text.slice(at + rule.sep.length);
    }
    case "between": {
      const start = text.indexOf(rule.open);
      const end = text.indexOf(rule.close, start + rule.open.length);
      if (start < 0 || end < 0) return "";
      return text.slice(start + rule.open.length, end);
    }
    case "case":
      if (rule.mode === "upper") return text.toUpperCase();
      if (rule.mode === "lower") return text.toLowerCase();
      return proper(text);
    case "trim":
      return text.replace(/\s+/g, " ").trim();
    case "digits":
      return (text.match(/\d/g) ?? []).join("");
    case "letters":
      return (text.match(/\p{L}/gu) ?? []).join("");
    case "datePart": {
      const m = DATE_PARTS.exec(text);
      if (!m) return "";
      // dd-mm-yyyy or yyyy-mm-dd — the 4-digit group is always the year.
      const [, a, b, c] = m;
      const year = a.length === 4 ? a : c;
      const month = a.length === 4 ? b : b;
      const day = a.length === 4 ? c : a;
      return rule.part === "year" ? year : rule.part === "month" ? month : day;
    }
    case "concat": {
      const base = text;
      const extra = (second ?? "").trim();
      return extra ? `${base}${rule.joiner}${extra}` : base;
    }
    case "prefix":
      return `${rule.text}${text}`;
    case "suffix":
      return `${text}${rule.text}`;
    default:
      return text;
  }
}

/**
 * Infer a rule from hand-typed examples.
 *
 * @param sourceValues the source column, row-aligned
 * @param exampleRows rows the student typed by hand, with what they typed
 * @param secondColumn optional neighbouring column for concatenation
 */
export function inferFlashFill(
  sourceValues: string[],
  exampleRows: { row: number; value: string }[],
  secondColumn?: string[],
): FlashFillResult {
  const examples = exampleRows.filter((e) => e.value.trim() !== "" && (sourceValues[e.row] ?? "").trim() !== "");
  if (examples.length === 0) {
    return { rule: null, values: {}, explain: "Type one or two examples in this column, then press Flash Fill (Ctrl+E)." };
  }

  const tries: { rule: FlashRule; label: string }[] = [];
  examples.forEach((example) => tries.push(...candidates(sourceValues[example.row] ?? "")));

  // Concatenation and affixes need both columns, so they are built up front.
  if (secondColumn) {
    examples.forEach((example) => {
      const a = (sourceValues[example.row] ?? "").trim();
      const b = (secondColumn[example.row] ?? "").trim();
      if (!a || !b) return;
      ([" ", ", ", "-", ""] as string[]).forEach((joiner) => {
        tries.push({ rule: { k: "concat", secondColumn: 0, joiner }, label: `both columns joined ${joiner ? `with "${joiner}"` : "directly"}` });
      });
    });
  }

  const matches = (rule: FlashRule) =>
    examples.every((example) => applyRule(rule, sourceValues[example.row] ?? "", secondColumn?.[example.row]) === example.value.trim());

  const hit = tries.find((candidate) => matches(candidate.rule));
  if (!hit) {
    return { rule: null, values: {}, explain: "Could not find a pattern — try one more example, or type it manually." };
  }

  const values: Record<number, string> = {};
  sourceValues.forEach((source, row) => {
    if ((source ?? "").trim() === "") return;
    const filled = applyRule(hit.rule, source, secondColumn?.[row]);
    if (filled !== "") values[row] = filled;
  });

  return { rule: hit.rule, values, explain: `Flash Fill pattern: ${hit.label}.` };
}

/** Apply an already-inferred rule to a whole column (used by "fill down"). */
export function applyFlashRule(rule: FlashRule, sourceValues: string[], secondColumn?: string[]): Record<number, string> {
  const values: Record<number, string> = {};
  sourceValues.forEach((source, row) => {
    if ((source ?? "").trim() === "") return;
    const filled = applyRule(rule, source, secondColumn?.[row]);
    if (filled !== "") values[row] = filled;
  });
  return values;
}
