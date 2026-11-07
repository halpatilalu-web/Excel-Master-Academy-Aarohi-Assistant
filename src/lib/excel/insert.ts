/**
 * @license MIT
 * The Insert tab's objects: one-cell sparklines, chart ranges, and the text
 * that Excel's Link / Picture / Symbol / Shape dialogs put into a cell.
 *
 * Pure functions only — the grid owns the state and renders the marks — so the
 * maths behind a sparkline is testable without a browser.
 */
import { parseAddress, rangeBounds } from "./sheetTools";

export type Cells = Record<string, string>;

/* ============================= sparklines ============================= */

/** 24 stepped blocks, low → high. A bar chart that fits inside one cell. */
export const SPARK_BLOCKS = "▁▂▃▄▅▆▇█";

export type SparkKind = "column" | "line" | "winloss";

export interface Sparkline {
  /** The cell the mini chart is drawn in. */
  address: string;
  /** The range it reads, e.g. "B2:G2". */
  source: string;
  kind: SparkKind;
  /** Excel's sparkline colours (optionally overridden in the panel). */
  color?: string;
}

/** Numbers from a row/column of raw cell text, in sheet order. */
export function seriesFrom(cells: Cells, source: string): number[] {
  const bounds = rangeBounds(source);
  if (!bounds) return [];
  const out: number[] = [];
  for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      const address = `${columnLabel(col)}${row + 1}`;
      const raw = (cells[address] ?? "").replace(/,/g, "").trim();
      if (!raw) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) out.push(value);
    }
  }
  return out;
}

function columnLabel(col: number): string {
  let label = "";
  let n = col;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/**
 * The sparkline text for a series. Column and line sparklines pick one of the
 * eight block characters per value; win/loss prints a dash or a box, which is
 * exactly what Excel's Win/Loss sparkline does.
 */
export function sparkText(values: number[], kind: SparkKind = "column"): string {
  if (!values.length) return "";
  if (kind === "winloss") {
    // Excel treats only negatives as a "loss"; zero and up are a win.
    return values.map((value) => (value < 0 ? "▁" : "█")).join("");
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return values
    .map((value) => {
      // A flat series (all equal numbers) gets mid-height bars, not blanks.
      const index = span === 0 ? 3 : Math.round(((value - min) / span) * (SPARK_BLOCKS.length - 1));
      return SPARK_BLOCKS[Math.min(SPARK_BLOCKS.length - 1, Math.max(0, index))];
    })
    .join("");
}

/** Sparkline text for a cell, or an empty string when there is no series. */
export function sparkFor(cells: Cells, spark: Sparkline): string {
  return sparkText(seriesFrom(cells, spark.source), spark.kind);
}

/* ============================== charts =============================== */

export type ChartKind = "column" | "bar" | "line" | "pie";

export interface ChartSpec {
  id: string;
  kind: ChartKind;
  /** The range the chart reads at the time it was inserted. */
  source: string;
  title: string;
}

export const CHART_KINDS: { kind: ChartKind; label: string; hindi: string }[] = [
  { kind: "column", label: "Column", hindi: "कॉलम" },
  { kind: "bar", label: "Bar", hindi: "बार" },
  { kind: "line", label: "Line", hindi: "लाइन" },
  { kind: "pie", label: "Pie", hindi: "पाई" },
];

export interface ChartSeries {
  labels: string[];
  values: number[];
  /** Column heading the numbers came from, for the legend. */
  series: string;
  /** What the label column is called. */
  categoryHeader: string;
}

/**
 * Read a chart the way Excel's "Insert Chart" reads a selection: the last
 * column that holds numbers becomes the series, and the column to its left
 * gives the labels. A single column of numbers is charted against row numbers.
 */
export function chartSeriesFrom(cells: Cells, source: string): ChartSeries {
  const bounds = rangeBounds(source);
  if (!bounds) return { labels: [], values: [], series: "", categoryHeader: "" };
  const columns: { col: number; nums: number; texts: number; header: string }[] = [];
  for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
    let nums = 0;
    let texts = 0;
    for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
      const raw = (cells[`${columnLabel(col)}${row + 1}`] ?? "").replace(/,/g, "").trim();
      if (!raw) continue;
      if (Number.isFinite(Number(raw))) nums++;
      else texts++;
    }
    columns.push({ col, nums, texts, header: (cells[`${columnLabel(col)}${bounds.firstRow + 1}`] ?? "").trim() });
  }
  const valueColumn = [...columns].reverse().find((column) => column.nums > 0);
  if (!valueColumn) return { labels: [], values: [], series: "", categoryHeader: "" };
  // The first row is a header only when it is the single non-number in the
  // column and the rest of the rows are all numbers.
  const hasHeader = valueColumn.texts === 1 && valueColumn.nums === bounds.lastRow - bounds.firstRow;
  const firstDataRow = hasHeader ? bounds.firstRow + 1 : bounds.firstRow;
  const labelColumn = columns.find((column) => column.col < valueColumn.col && column.texts > 0);
  const labels: string[] = [];
  const values: number[] = [];
  for (let row = firstDataRow; row <= bounds.lastRow; row++) {
    const raw = (cells[`${columnLabel(valueColumn.col)}${row + 1}`] ?? "").replace(/,/g, "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    values.push(value);
    labels.push(
      labelColumn
        ? (cells[`${columnLabel(labelColumn.col)}${row + 1}`] ?? "").trim() || String(row + 1)
        : `Row ${row + 1}`,
    );
  }
  return {
    labels,
    values,
    series: hasHeader ? valueColumn.header || "Values" : "Values",
    categoryHeader: labelColumn ? (cells[`${columnLabel(labelColumn.col)}${bounds.firstRow + 1}`] ?? "").trim() : "",
  };
}

/* ========================= text for the cell ========================= */

/**
 * Excel's Insert ▸ Link. This app stores it as a real HYPERLINK() formula, so
 * the engine shows the friendly text and the .xlsx keeps a working link.
 */
export function hyperlinkFormula(url: string, text: string): string {
  const clean = url.trim();
  const label = text.trim() || clean;
  return `=HYPERLINK(${quote(clean)},${quote(label)})`;
}

/** Excel's Insert ▸ Picture: a picture in a cell is a link plus a label. */
export function pictureFormula(url: string, alt: string): string {
  const clean = url.trim();
  const label = alt.trim() || "Picture";
  // A plain path would be reported as an #VALUE! by HYPERLINK's first argument,
  // so an empty URL falls back to the label alone.
  if (!clean) return label;
  return `=HYPERLINK(${quote(clean)},${quote(`🖼 ${label}`)})`;
}

const quote = (text: string): string => `"${text.replace(/"/g, '""')}"`;

/**
 * Prefix a cell with a symbol. Prefixing keeps whatever the student already
 * typed, which is what Insert ▸ Symbol does at the cursor in Excel.
 */
export function withSymbol(existing: string, symbol: string): string {
  if (!symbol) return existing;
  const raw = existing.trim();
  if (!raw) return symbol;
  // A number formatted as currency should not become text.
  if (/%/.test(symbol)) return `${raw}${symbol}`;
  return symbol === "₹" || symbol === "$" || symbol === "€" || symbol === "£" ? `${symbol}${raw}` : `${raw}${symbol}`;
}

/** The symbols Excel's Symbol dialog shows first (currency and maths). */
export const SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "₹", name: "Rupee" },
  { symbol: "$", name: "Dollar" },
  { symbol: "€", name: "Euro" },
  { symbol: "£", name: "Pound" },
  { symbol: "%", name: "Percent" },
  { symbol: "±", name: "Plus-minus" },
  { symbol: "×", name: "Multiply" },
  { symbol: "÷", name: "Divide" },
  { symbol: "≤", name: "Less than or equal" },
  { symbol: "≥", name: "Greater than or equal" },
  { symbol: "≠", name: "Not equal" },
  { symbol: "√", name: "Square root" },
  { symbol: "∞", name: "Infinity" },
  { symbol: "Δ", name: "Delta" },
  { symbol: "°", name: "Degree" },
  { symbol: "✓", name: "Tick" },
  { symbol: "✗", name: "Cross" },
  { symbol: "→", name: "Right arrow" },
  { symbol: "▲", name: "Up arrow" },
  { symbol: "●", name: "Dot" },
  { symbol: "©", name: "Copyright" },
  { symbol: "®", name: "Registered" },
  { symbol: "™", name: "Trademark" },
];

/* ============================== shapes =============================== */

export type ShapeArt = "arrow" | "check" | "star" | "banner" | "circle" | "callout";

export interface ShapeSpec {
  id: string;
  art: ShapeArt;
  label: string;
  color: string;
  /** Where it is anchored in the sheet. */
  address: string;
}

export const SHAPE_ART: { art: ShapeArt; label: string; hindi: string; glyph: string; color: string }[] = [
  { art: "arrow", label: "Arrow", hindi: "तीर", glyph: "➜", color: "#2563eb" },
  { art: "check", label: "Tick", hindi: "सही", glyph: "✔", color: "#16a34a" },
  { art: "star", label: "Star", hindi: "तारा", glyph: "★", color: "#d97706" },
  { art: "banner", label: "Banner", hindi: "बैनर", glyph: "▬", color: "#7c3aed" },
  { art: "circle", label: "Circle", hindi: "गोला", glyph: "●", color: "#dc2626" },
  { art: "callout", label: "Callout", hindi: "बुलावा", glyph: "💬", color: "#0d9488" },
];

/* ============================ suggestions ============================ */

/**
 * A sensible sparkline source for the active cell: the numbers to its left in
 * the same row, else the numbers above it in the same column. Excel guesses the
 * same way when you pick Insert ▸ Sparkline with one cell selected.
 */
export function guessSparkSource(cells: Cells, address: string): string {
  const cell = parseAddress(address);
  if (!cell) return "";
  for (let offset = 1; offset <= 12; offset++) {
    const col = cell.col - offset;
    if (col < 0) break;
    const label = columnLabel(col);
    const raw = (cells[`${label}${cell.row + 1}`] ?? "").trim();
    if (!raw) {
      // A blank cell ends a contiguous block of numbers, like Excel's guess.
      if (offset > 1) break;
      continue;
    }
    if (!Number.isFinite(Number(raw.replace(/,/g, "")))) break;
    // Walked far enough left to have a block: read the whole block.
    let first = col;
    while (first > 0) {
      const previous = (cells[`${columnLabel(first - 1)}${cell.row + 1}`] ?? "").trim();
      if (!previous || !Number.isFinite(Number(previous.replace(/,/g, "")))) break;
      first--;
    }
    if (col - first + 1 >= 2) {
      return `${columnLabel(first)}${cell.row + 1}:${columnLabel(col)}${cell.row + 1}`;
    }
  }
  for (let offset = 1; offset <= 12; offset++) {
    const row = cell.row - offset;
    if (row < 0) break;
    const raw = (cells[`${columnLabel(cell.col)}${row + 1}`] ?? "").trim();
    if (!raw) break;
    if (!Number.isFinite(Number(raw.replace(/,/g, "")))) break;
    let first = row;
    while (first > 0) {
      const previous = (cells[`${columnLabel(cell.col)}${first}`] ?? "").trim();
      if (!previous || !Number.isFinite(Number(previous.replace(/,/g, "")))) break;
      first--;
    }
    if (row - first + 1 >= 2) {
      return `${columnLabel(cell.col)}${first + 1}:${columnLabel(cell.col)}${row + 1}`;
    }
  }
  return "";
}
