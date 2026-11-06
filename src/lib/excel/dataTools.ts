/**
 * @license MIT
 * Data tools from Excel's Data tab — Sort, Remove Duplicates and conditional
 * formatting data bars — written as pure functions over a sheet's cell map so
 * they can be unit-tested without a DOM and reused by the grid and the .xlsx
 * export.
 *
 * Everything is row-locked to the used range: a sort moves whole rows so the
 * other columns stay attached to their key, which is the mistake beginners make
 * when they sort a single column in Excel and the data falls apart.
 */
export type Cells = Record<string, string>;

/** A1 address helpers local to this module (no engine import → no cycles). */
const LETTERS = (index: number): string => {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};
const INDEX = (label: string): number =>
  label.toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export interface Bounds {
  firstRow: number;
  lastRow: number;
  firstCol: number;
  lastCol: number;
}

/** Used range of a sheet, treating A1 addresses as 1-based. */
export function usedRange(cells: Cells): Bounds {
  let firstRow = Infinity;
  let lastRow = -1;
  let firstCol = Infinity;
  let lastCol = -1;
  Object.keys(cells).forEach((address) => {
    const m = /^([A-Z]+)(\d+)$/i.exec(address);
    if (!m) return;
    const row = Number(m[2]) - 1;
    const col = INDEX(m[1]);
    firstRow = Math.min(firstRow, row);
    lastRow = Math.max(lastRow, row);
    firstCol = Math.min(firstCol, col);
    lastCol = Math.max(lastCol, col);
  });
  if (lastRow < 0) return { firstRow: 0, lastRow: 0, firstCol: 0, lastCol: 0 };
  return { firstRow, lastRow, firstCol, lastCol };
}

/**
 * Sort whole rows by one column, keeping every other column attached.
 *
 * @param numeric when true, compares as numbers (blank cells last)
 */
export function sortRows(
  cells: Cells,
  bounds: Bounds,
  byColumn: number,
  direction: "asc" | "desc",
  numeric = false,
  /** Excel's "My data has headers" tick — the first row stays on top. */
  hasHeader = false,
): Cells {
  const firstDataRow = bounds.firstRow + (hasHeader ? 1 : 0);
  const rows: number[] = [];
  for (let row = firstDataRow; row <= bounds.lastRow; row++) rows.push(row);
  const keyOf = (row: number) => cells[`${LETTERS(byColumn)}${row + 1}`] ?? "";
  const weight = (text: string) => {
    if (text.trim() === "") return Number.POSITIVE_INFINITY;
    if (!numeric) return text.toLowerCase();
    const n = Number(text.replace(/[,₹$%\s]/g, ""));
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };
  const sorted = [...rows].sort((a, b) => {
    const ka = weight(keyOf(a));
    const kb = weight(keyOf(b));
    if (typeof ka === "number" && typeof kb === "number") {
      if (ka === kb) return a - b;
      // Blanks always sink to the bottom, whatever the direction.
      if (!Number.isFinite(ka)) return 1;
      if (!Number.isFinite(kb)) return -1;
      return direction === "asc" ? ka - kb : kb - ka;
    }
    const cmp = String(ka).localeCompare(String(kb), "en", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? cmp : -cmp;
  });

  const next: Cells = {};
  if (hasHeader) {
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      const header = cells[`${LETTERS(col)}${bounds.firstRow + 1}`];
      if (header !== undefined && header !== "") next[`${LETTERS(col)}${bounds.firstRow + 1}`] = header;
    }
  }
  // Walk the *sorted* order and write rows back into the same block.
  sorted.forEach((sourceRow, targetIndex) => {
    const targetRow = firstDataRow + targetIndex;
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      const value = cells[`${LETTERS(col)}${sourceRow + 1}`];
      if (value !== undefined && value !== "") next[`${LETTERS(col)}${targetRow + 1}`] = value;
    }
  });
  // Keep anything outside the sorted block untouched.
  Object.entries(cells).forEach(([address, value]) => {
    const m = /^([A-Z]+)(\d+)$/i.exec(address);
    if (!m) return;
    const row = Number(m[2]) - 1;
    if (row < bounds.firstRow || row > bounds.lastRow) next[address] = value;
  });
  return next;
}

/** Remove duplicate rows inside the used range, keeping the first occurrence. */
export function removeDuplicates(cells: Cells, bounds: Bounds, hasHeader = false): { cells: Cells; removed: number } {
  const firstDataRow = bounds.firstRow + (hasHeader ? 1 : 0);
  const seen = new Set<string>();
  const keep: number[] = [];
  for (let row = firstDataRow; row <= bounds.lastRow; row++) {
    const signature: string[] = [];
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      signature.push((cells[`${LETTERS(col)}${row + 1}`] ?? "").trim().toLowerCase());
    }
    if (signature.every((value) => value === "")) continue; // blank row: drop
    const key = signature.join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    keep.push(row);
  }
  const next: Cells = {};
  if (hasHeader) {
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      const header = cells[`${LETTERS(col)}${bounds.firstRow + 1}`];
      if (header !== undefined && header !== "") next[`${LETTERS(col)}${bounds.firstRow + 1}`] = header;
    }
  }
  keep.forEach((sourceRow, index) => {
    const targetRow = firstDataRow + index;
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      const value = cells[`${LETTERS(col)}${sourceRow + 1}`];
      if (value !== undefined && value !== "") next[`${LETTERS(col)}${targetRow + 1}`] = value;
    }
  });
  Object.entries(cells).forEach(([address, value]) => {
    const m = /^([A-Z]+)(\d+)$/i.exec(address);
    if (!m) return;
    const row = Number(m[2]) - 1;
    if (row < bounds.firstRow || row > bounds.lastRow) next[address] = value;
  });
  return { cells: next, removed: bounds.lastRow - firstDataRow + 1 - keep.length };
}

/**
 * Conditional formatting data bars: the fraction of the column maximum for each
 * numeric cell, so the grid can paint a bar behind the number.
 */
export function dataBars(values: Record<string, number>, bounds: Bounds, column: number): Record<string, number> {
  const numbers: number[] = [];
  const cells: string[] = [];
  for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
    const address = `${LETTERS(column)}${row + 1}`;
    const value = values[address];
    if (typeof value === "number" && Number.isFinite(value)) {
      numbers.push(value);
      cells.push(address);
    }
  }
  if (!numbers.length) return {};
  const max = Math.max(...numbers);
  const min = Math.min(0, ...numbers);
  const span = max - min || 1;
  const out: Record<string, number> = {};
  cells.forEach((address) => {
    out[address] = Math.max(0.02, Math.min(1, (values[address] - min) / span));
  });
  return out;
}

/** Count how many numeric / text / blank cells the used range holds (status bar). */
export function columnStats(values: Record<string, string | number | boolean | null>, bounds: Bounds) {
  let numbers = 0;
  let text = 0;
  let blanks = 0;
  let sum = 0;
  for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      const value = values[`${LETTERS(col)}${row + 1}`];
      if (value === null || value === undefined || value === "") blanks++;
      else if (typeof value === "number") {
        numbers++;
        sum += value;
      } else text++;
    }
  }
  return { numbers, text, blanks, sum, count: numbers + text };
}

export { INDEX as columnIndexOf, LETTERS as columnLabelOf };
