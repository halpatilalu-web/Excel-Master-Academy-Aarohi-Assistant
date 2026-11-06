/**
 * @license MIT
 * Workbook-level helpers for the Review / Page Layout / Formulas tabs:
 * document properties, print setup, formula auditing (trace precedents and
 * dependents), spell check, notes and a find-references index.
 *
 * Everything is pure — the grid owns the state — so each tool is testable
 * without mounting React.
 */
import { parseFormula, type Node } from "../../lib/excel/formula/parser";
import { colLetter, parseAddress, type Bounds } from "./sheetTools";

export type Cells = Record<string, string>;

/* ========================= document properties ======================== */

export interface DocProps {
  title: string;
  subject: string;
  author: string;
  company: string;
  keywords: string;
  comments: string;
}

export const EMPTY_DOC_PROPS: DocProps = {
  title: "",
  subject: "",
  author: "",
  company: "",
  keywords: "",
  comments: "",
};

/* ============================ print setup ============================= */

export type Orientation = "portrait" | "landscape";
export type PaperSize = "A4" | "Letter" | "Legal";

export interface PrintSetup {
  area: string;
  orientation: Orientation;
  paper: PaperSize;
  /** Print titles repeat this row range on every page, e.g. "1:1". */
  titleRows: string;
  fitToPage: boolean;
  scale: number;
  gridlines: boolean;
  headers: boolean;
  centreHorizontally: boolean;
  margins: "normal" | "wide" | "narrow";
}

export const DEFAULT_PRINT: PrintSetup = {
  area: "",
  orientation: "portrait",
  paper: "A4",
  titleRows: "",
  fitToPage: true,
  scale: 100,
  gridlines: true,
  headers: true,
  centreHorizontally: true,
  margins: "normal",
};

const MARGIN_CM: Record<PrintSetup["margins"], number> = { normal: 1.9, wide: 2.5, narrow: 1.3 };

/** Real @page CSS so "Print" produces the sheet the student configured. */
export function pageCss(setup: PrintSetup): string {
  const margin = MARGIN_CM[setup.margins];
  return [
    "@page {",
    `  size: ${setup.paper} ${setup.orientation};`,
    `  margin: ${margin}cm;`,
    "}",
    "@media print {",
    "  body { background: #fff !important; }",
    "  .no-print, .no-print * { display: none !important; }",
    `  .paper { margin: 0 auto !important; ${setup.centreHorizontally ? "" : "margin-left: 0 !important;"} }`,
    setup.gridlines ? "  table td, table th { border-color: #cbd5e1 !important; }" : "  table td, table th { border-color: transparent !important; }",
    "}",
  ].join("\n");
}

/* ============================ cell notes ============================== */

export interface CellNote {
  id: string;
  address: string;
  text: string;
  author?: string;
  at: string;
}

/* =========================== spell check ============================== */

/**
 * Words the course uses constantly and that are not English dictionary words.
 * A spell check that flags "GST" and "XLOOKUP" would train students to ignore it.
 */
const ALLOWED = new Set(
  [
    "gst", "gstin", "hsn", "sac", "tds", "pan", "ifsc", "upi", "emi", "roi", "cagr", "npv", "irr", "xirr",
    "xlookup", "vlookup", "hlookup", "xmatch", "sumif", "sumifs", "countif", "countifs", "averageif",
    "averageifs", "sumproduct", "index", "match", "offset", "indirect", "textjoin", "concat", "textsplit",
    "let", "lambda", "filter", "sort", "unique", "sequence", "choosecols", "chooserows", "hstack", "vstack",
    "tocol", "torow", "wrapcols", "wraprows", "makearray", "map", "reduce", "scan", "byrow", "bycol",
    "excel", "spreadsheet", "workbook", "worksheet", "pivot", "macro", "aadhaar", "aarohi", "halpati",
    "ahmedabad", "gujarat", "surat", "pune", "mumbai", "delhi", "bengaluru", "banglore", "chennai",
    "kolkata", "hyderabad", "jaipur", "indore", "nagpur", "nashik", "rajkot", "vadodara", "bhavnagar",
    "kutch", "gandhinagar", "kunbi", "ladies", "colour", "colours", "organisation", "authorisation",
    "customise", "customisation", "centre", "centres", "programme", "licence", "behaviour",
    "a", "an", "the", "and", "or", "to", "of", "in", "on", "at", "by", "for", "with", "from", "as", "is",
    "it", "its", "this", "that", "these", "those", "be", "was", "were", "are", "has", "have", "had",
  ].map((word) => word.toLowerCase()),
);

const COMMON = new Set(
  (
    "name city amount total qty quantity price rate item itemname date month year invoice tax gstin " +
    "customer vendor supplier product unit units sales purchase profit loss salary employee department " +
    "region north south east west status paid due overdue pending approved rejected remarks note notes " +
    "address phone email mobile contact company branch manager executive senior junior assistant " +
    "january february march april may june july august september october november december " +
    "monday tuesday wednesday thursday friday saturday sunday " +
    "yes no true false ok alert action monitor printer keyboard laptop mouse cable desk chair table " +
    "price list order orders discount balance received payment receipt voucher ledger account accounts " +
    "report reports summary dashboard chart data sheet table value values formula count average sum " +
    "minimum maximum highest lowest first last top bottom filter sort lookup search find replace " +
    "student students marks subject subjects exam exams grade class school college course " +
    "laptop printer monitor keyboard cable desk chair stationery electronics furniture"
  ).split(/\s+/),
);

/** English words we consider correct: the course vocabulary plus very common words. */
export function isKnownWord(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean || clean.length < 2) return true;
  if (ALLOWED.has(clean) || COMMON.has(clean)) return true;
  // Plurals and simple suffixes of known words.
  if (clean.endsWith("s") && (ALLOWED.has(clean.slice(0, -1)) || COMMON.has(clean.slice(0, -1)))) return true;
  if (clean.endsWith("es") && (ALLOWED.has(clean.slice(0, -2)) || COMMON.has(clean.slice(0, -2)))) return true;
  if (clean.endsWith("ed") && COMMON.has(clean.slice(0, -2))) return true;
  if (clean.endsWith("ing") && COMMON.has(clean.slice(0, -3))) return true;
  return false;
}

const TYPOS: Record<string, string> = {
  plese: "please",
  chek: "check",
  recieve: "receive",
  adress: "address",
  ammount: "amount",
  balence: "balance",
  totel: "total",
  invioce: "invoice",
  custmer: "customer",
  salery: "salary",
  empolyee: "employee",
  febuary: "February",
  wedensday: "Wednesday",
  repot: "report",
  summery: "summary",
  valuse: "values",
  formulla: "formula",
  calcualte: "calculate",
  conditon: "condition",
};

/** The best correction this app can offer for a flagged word. */
export function suggestionFor(word: string): string {
  const clean = word.toLowerCase();
  if (TYPOS[clean]) return TYPOS[clean];
  for (let i = 1; i < clean.length - 1; i++) {
    const swapped = clean.slice(0, i) + clean[i + 1] + clean[i] + clean.slice(i + 2);
    if (TYPOS[swapped]) return TYPOS[swapped];
  }
  return word;
}

export interface SpellIssue {
  address: string;
  word: string;
  /** The cell text with the offending word wrapped for highlighting. */
  sentence: string;
}

/** Every text cell whose words are not recognised, in sheet order. */
export function spellCheck(cells: Cells, ignore: string[] = []): SpellIssue[] {
  const skip = new Set(ignore.map((word) => word.toLowerCase()));
  const issues: SpellIssue[] = [];
  Object.entries(cells)
    .sort((a, b) => orderOf(a[0]) - orderOf(b[0]))
    .forEach(([address, raw]) => {
      if (!raw || raw.startsWith("=")) return;
      const words = raw.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
      words.forEach((word) => {
        if (!isKnownWord(word) && !skip.has(word.toLowerCase()) && /^[A-Za-z]{3,}$/.test(word)) {
          issues.push({ address, word, sentence: raw });
        }
      });
    });
  return issues;
}

function orderOf(address: string): number {
  const parsed = parseAddress(address);
  return parsed ? parsed.row * 1000 + parsed.col : 0;
}

/* ========================= formula auditing ========================== */

export interface AuditRef {
  address: string;
  sheet: string | null;
}

/**
 * Collect the cells a formula reads. Ranges are expanded but capped, because
 * tracing =SUM(B2:B100000) should not create a million highlights.
 */
export function precedentsOf(formula: string, cap = 400): AuditRef[] {
  if (!formula.startsWith("=")) return [];
  let ast: Node;
  try {
    ast = parseFormula(formula);
  } catch {
    return [];
  }
  const out: AuditRef[] = [];
  const seen = new Set<string>();

  const push = (sheet: string | null, row: number, col: number) => {
    const address = `${colLetter(col)}${row + 1}`;
    const key = `${sheet ?? ""}!${address}`;
    if (seen.has(key) || out.length >= cap) return;
    seen.add(key);
    out.push({ address, sheet });
  };

  const walk = (node: Node): void => {
    switch (node.t) {
      case "ref":
        push(node.sheet, node.row, node.col);
        return;
      case "range": {
        for (let row = node.r1; row <= node.r2 && out.length < cap; row++) {
          for (let col = node.c1; col <= node.c2 && out.length < cap; col++) push(node.sheet, row, col);
        }
        return;
      }
      case "func":
        node.args.forEach(walk);
        return;
      case "call":
        walk(node.fn);
        node.args.forEach(walk);
        return;
      case "binary":
        walk(node.l);
        walk(node.r);
        return;
      case "unary":
      case "pct":
        walk(node.v);
        return;
      case "array":
        node.rows.forEach((row) => row.forEach(walk));
        return;
      default:
        return;
    }
  };

  walk(ast);
  return out;
}

/**
 * Which formulas read this cell — Excel's "Trace Dependents". Ranges count as
 * a dependency so a total under a column lights up its cells.
 */
export function dependentsOf(cells: Cells, address: string): string[] {
  const target = parseAddress(address);
  if (!target) return [];
  const out: string[] = [];
  Object.entries(cells).forEach(([other, raw]) => {
    if (!raw.startsWith("=")) return;
    const reads = precedentsOf(raw, 5000);
    if (reads.some((ref) => ref.address === address)) {
      out.push(other);
      return;
    }
    // A range that contains the cell (even if expansion was capped).
    if (raw.includes(":") && rangeCovers(raw, target.row, target.col)) out.push(other);
  });
  return out.sort((a, b) => orderOf(a) - orderOf(b));
}

/** Does any A1:B9-style range inside this formula cover the cell? */
function rangeCovers(formula: string, row: number, col: number): boolean {
  const matches = formula.match(/\$?[A-Za-z]{1,3}\$?\d{1,7}:\$?[A-Za-z]{1,3}\$?\d{1,7}/g) ?? [];
  return matches.some((range) => {
    const [first, second] = range.split(":");
    const a = parseAddress(first);
    const b = parseAddress(second);
    if (!a || !b) return false;
    return (
      row >= Math.min(a.row, b.row) &&
      row <= Math.max(a.row, b.row) &&
      col >= Math.min(a.col, b.col) &&
      col <= Math.max(a.col, b.col)
    );
  });
}

export interface RefHit {
  address: string;
  preview: string;
}

/** Formulas ▸ "Show Formulas" search: every cell that mentions a token. */
export function formulasMentioning(cells: Cells, token: string): RefHit[] {
  const needle = token.trim().toLowerCase();
  if (!needle) return [];
  return Object.entries(cells)
    .filter(([, raw]) => raw.toLowerCase().includes(needle))
    .sort((a, b) => orderOf(a[0]) - orderOf(b[0]))
    .slice(0, 200)
    .map(([address, raw]) => ({ address, preview: raw.length > 90 ? `${raw.slice(0, 90)}…` : raw }));
}

/* ========================== page layout fit ========================== */

/** Used range → "A1:F37", for the Print Area placeholder and the pt numbering. */
export function areaLabel(bounds: Bounds): string {
  return `${colLetter(bounds.firstCol)}${bounds.firstRow + 1}:${colLetter(bounds.lastCol)}${bounds.lastRow + 1}`;
}
