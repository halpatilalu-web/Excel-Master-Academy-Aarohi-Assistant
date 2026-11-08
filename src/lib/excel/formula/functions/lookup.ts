/**
 * Lookup & reference: VLOOKUP, HLOOKUP, XLOOKUP, INDEX/MATCH, XMATCH, OFFSET,
 * INDIRECT, CHOOSEROWS/COLS, TOCOL/TOROW and friends.
 *
 * XLOOKUP's defaults match Excel 365: an exact match, #N/A when nothing is
 * found, and a next-larger item when match_mode = -1.
 */
import {
  NA,
  REF,
  VALUE,
  compareValues,
  isBlank,
  isErr,
  scalarsIn,
  toMatrix,
  toNum,
  toStr,
  type Scalar,
  type XErr,
} from "../core";
import type { Node } from "../parser";
import { isFormula } from "../parser";
import { bool, evalArg, num, str, type FnImpl, type Val } from "../helpers";

const flat = (v: Val): Scalar[] => scalarsIn(v);

function asGrid(v: Val): Scalar[][] {
  const m = toMatrix(v);
  return m;
}

function lookupValue(args: Node[], ctx: Parameters<FnImpl>[1]): Scalar {
  const v = ctx.evalNode(args[0] ?? { t: "missing" });
  return Array.isArray(v) ? v[0]?.[0] ?? null : (v as Scalar);
}

/** Exact / approximate / wildcard match position, 0-based, or -1. */
function findIndex(
  needle: Scalar,
  haystack: Scalar[],
  matchMode: number,
  searchMode: 1 | -1 | 2 | -2,
): number {
  const order = (i: number) => (searchMode === 1 || searchMode === 2 ? i : haystack.length - 1 - i);
  const wildcard = (pattern: string): RegExp => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`, "i");
  };

  if (matchMode === 2) {
    const text = isBlank(needle) ? "" : toStr(needle);
    const re = wildcard(isErr(text) ? "" : text);
    for (let i = 0; i < haystack.length; i++) {
      const idx = order(i);
      const cell = haystack[idx];
      const s = isBlank(cell) ? "" : toStr(cell);
      if (!isErr(s) && re.test(s)) return idx;
    }
    return -1;
  }

  if (matchMode === 0) {
    for (let i = 0; i < haystack.length; i++) {
      const idx = order(i);
      const cell = haystack[idx];
      if (compareValues(cell, needle) === 0) return idx;
      // XLOOKUP treats a blank needle as matching the first blank cell.
      if (isBlank(needle) && isBlank(cell)) return idx;
    }
    return -1;
  }

  if (matchMode === -1) {
    // Exact, else the next smaller item.
    let best = -1;
    for (let i = 0; i < haystack.length; i++) {
      const idx = order(i);
      const cmp = compareValues(haystack[idx], needle);
      if (cmp === 0) return idx;
      if (cmp < 0 && (best === -1 || compareValues(haystack[idx], haystack[best]) > 0)) best = idx;
    }
    return best;
  }

  // matchMode === 1: exact, else the next larger item.
  let best = -1;
  for (let i = 0; i < haystack.length; i++) {
    const idx = order(i);
    const cmp = compareValues(haystack[idx], needle);
    if (cmp === 0) return idx;
    if (cmp > 0 && (best === -1 || compareValues(haystack[idx], haystack[best]) < 0)) best = idx;
  }
  return best;
}

function readMatchMode(args: Node[], ctx: Parameters<FnImpl>[1], i: number): number | XErr {
  if (!args[i] || args[i].t === "missing") return 0;
  const v = num(args, ctx, i, 0);
  if (isErr(v)) return v;
  const n = Math.trunc(v);
  return [0, -1, 1, 2].includes(n) ? n : VALUE;
}

function readSearchMode(args: Node[], ctx: Parameters<FnImpl>[1], i: number): 1 | -1 | 2 | -2 | XErr {
  if (!args[i] || args[i].t === "missing") return 1;
  const v = num(args, ctx, i, 1);
  if (isErr(v)) return v;
  const n = Math.trunc(v);
  return n === 1 || n === -1 || n === 2 || n === -2 ? (n as 1 | -1 | 2 | -2) : VALUE;
}

export const lookupFns: Record<string, FnImpl> = {
  ADDRESS: (args, ctx) => {
    const row = num(args, ctx, 0);
    if (isErr(row)) return row;
    const col = num(args, ctx, 1);
    if (isErr(col)) return col;
    const absNum = num(args, ctx, 2, 1);
    if (isErr(absNum)) return absNum;
    const a1 = bool(args, ctx, 3, true);
    if (isErr(a1)) return a1;
    const sheet = args[4] && args[4].t !== "missing" ? str(args, ctx, 4) : null;
    if (isErr(sheet)) return sheet;
    if (row < 1 || col < 1 || absNum < 1 || absNum > 4) return VALUE;
    const colLetter = colName(Math.trunc(col) - 1);
    let ref: string;
    if (a1) {
      const mode = Math.trunc(absNum);
      const colPart = mode === 1 || mode === 3 ? `$${colLetter}` : colLetter;
      const rowPart = mode === 1 || mode === 2 ? `$${Math.trunc(row)}` : String(Math.trunc(row));
      ref = `${colPart}${rowPart}`;
    } else {
      ref = `R${Math.trunc(absNum) === 1 || Math.trunc(absNum) === 2 ? Math.trunc(row) : `[${Math.trunc(row)}]`}C${
        Math.trunc(absNum) === 1 || Math.trunc(absNum) === 3 ? Math.trunc(col) : `[${Math.trunc(col)}]`
      }`;
    }
    return sheet ? `${sheet.includes(" ") ? `'${sheet}'` : sheet}!${ref}` : ref;
  },
  AREAS: (args, ctx) => {
    const node = args[0];
    if (!node) return VALUE;
    if (node.t === "ref" || node.t === "range") return 1;
    const raw = ctx.host.formula?.(ctx.sheet, ctx.row, ctx.col);
    void raw;
    return 1;
  },
  CHOOSECOLS: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const picks: number[] = [];
    for (let i = 1; i < args.length; i++) {
      const v = num(args, ctx, i);
      if (isErr(v)) return v;
      picks.push(Math.trunc(v));
    }
    const width = grid[0]?.length ?? 0;
    if (!picks.length || picks.some((p) => p === 0 || Math.abs(p) > width)) return VALUE;
    return grid.map((row) => picks.map((p) => row[p > 0 ? p - 1 : width + p] ?? null));
  },
  CHOOSEROWS: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const picks: number[] = [];
    for (let i = 1; i < args.length; i++) {
      const v = num(args, ctx, i);
      if (isErr(v)) return v;
      picks.push(Math.trunc(v));
    }
    if (!picks.length || picks.some((p) => p === 0 || Math.abs(p) > grid.length)) return VALUE;
    return picks.map((p) => [...grid[p > 0 ? p - 1 : grid.length + p]]);
  },
  COLUMN: (args, ctx) => {
    const node = args[0];
    if (!node || node.t === "missing") return ctx.col + 1;
    if (node.t === "ref") return node.col + 1;
    if (node.t === "range") {
      const width = node.c2 - node.c1 + 1;
      if (width === 1) return node.c1 + 1;
      return Array.from({ length: width }, (_, i) => [node.c1 + i + 1]);
    }
    return ctx.col + 1;
  },
  COLUMNS: (args, ctx) => {
    const node = args[0];
    if (node && (node.t === "ref" || node.t === "range")) {
      if (node.t === "ref") return 1;
      return Math.abs(node.c2 - node.c1) + 1;
    }
    const m = toMatrix(ctx.evalNode(node ?? { t: "missing" }));
    return m[0]?.length ?? 1;
  },
  DROP: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const rows = num(args, ctx, 1, 0);
    if (isErr(rows)) return rows;
    const cols = num(args, ctx, 2, 0);
    if (isErr(cols)) return cols;
    let out = grid.map((r) => [...r]);
    if (rows > 0) out = out.slice(Math.trunc(rows));
    else if (rows < 0) out = out.slice(0, out.length + Math.trunc(rows));
    if (cols > 0) out = out.map((r) => r.slice(Math.trunc(cols)));
    else if (cols < 0) out = out.map((r) => r.slice(0, r.length + Math.trunc(cols)));
    if (!out.length || !out[0].length) return { err: "#CALC!" };
    return out;
  },
  EXPAND: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const rows = num(args, ctx, 1);
    if (isErr(rows)) return rows;
    const cols = num(args, ctx, 2);
    if (isErr(cols)) return cols;
    // No pad argument means "pad with #N/A" — that is Excel's documented default,
    // so an error here is only fatal when the *caller* passed one.
    const padGiven = Boolean(args[3] && args[3].t !== "missing");
    const pad = padGiven ? ctx.evalNode(args[3]) : NA;
    if (padGiven && isErr(pad)) return pad;
    if (rows < 1 || cols < 1) return VALUE;
    const sourceRows = grid.length;
    const sourceCols = grid[0]?.length ?? 0;
    if (Math.trunc(rows) < sourceRows || Math.trunc(cols) < sourceCols) return VALUE;
    return Array.from({ length: Math.trunc(rows) }, (_, r) =>
      Array.from({ length: Math.trunc(cols) }, (_, c) => grid[r]?.[c] ?? (pad as Scalar)),
    );
  },
  FILTER: (args, ctx) => {
    const data = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const include = flat(ctx.evalNode(args[1] ?? { t: "missing" }));
    const fallback = args[2] && args[2].t !== "missing" ? ctx.evalNode(args[2]) : null;
    const filterByRows = include.length === data.length;
    const filterByCols = include.length === (data[0]?.length ?? 0);
    if (!filterByRows && !filterByCols) return VALUE;
    const keep = (i: number) => {
      const cell = include[i];
      if (isErr(cell)) return false;
      const truth = typeof cell === "boolean" ? cell : typeof cell === "number" ? cell !== 0 : false;
      return truth;
    };
    if (filterByRows && filterByCols && data.length === (data[0]?.length ?? 0)) {
      return data.filter((_, r) => keep(r)).map((row) => row.filter((_, c) => keep(c)));
    }
    if (filterByRows) {
      const rows = data.filter((_, r) => keep(r));
      return rows.length ? rows : fallback === null ? { err: "#CALC!" } : Array.isArray(fallback) ? fallback : [[fallback as Scalar]];
    }
    const cols = (data[0] ?? []).filter((_, c) => keep(c));
    if (!cols.length) return fallback === null ? { err: "#CALC!" } : Array.isArray(fallback) ? fallback : [[fallback as Scalar]];
    return data.map((row) => row.filter((_, c) => keep(c)));
  },
  FORMULATEXT: (args, ctx) => {
    const node = args[0];
    if (!node || node.t !== "ref") return NA;
    const raw = ctx.host.raw(ctx.sheet, node.row, node.col);
    return isFormula(raw) ? raw : NA;
  },
  GETPIVOTDATA: () => REF,
  HLOOKUP: (args, ctx) => {
    const needle = lookupValue(args, ctx);
    const grid = asGrid(ctx.evalNode(args[1] ?? { t: "missing" }));
    const rowIdx = num(args, ctx, 2);
    if (isErr(rowIdx)) return rowIdx;
    const rangeLookup = bool(args, ctx, 3, true);
    if (isErr(rangeLookup)) return rangeLookup;
    if (rowIdx < 1 || grid.length < Math.trunc(rowIdx)) return REF;
    const header = grid[0] ?? [];
    let colIdx = -1;
    for (let c = 0; c < header.length; c++) {
      const cmp = compareValues(header[c], needle);
      if (cmp === 0) {
        colIdx = c;
        break;
      }
      if (rangeLookup && cmp < 0) colIdx = c;
      if (!rangeLookup && cmp > 0) break;
    }
    if (colIdx === -1) return NA;
    return grid[Math.trunc(rowIdx) - 1]?.[colIdx] ?? NA;
  },
  HSTACK: (args, ctx) => {
    const grids = args.map((n) => asGrid(ctx.evalNode(n)));
    const height = Math.max(...grids.map((g) => g.length));
    return Array.from({ length: height }, (_, r) =>
      grids.flatMap((g) => {
        const width = Math.max(...grids.map((x) => x[0]?.length ?? 1));
        return Array.from({ length: width }, (_, c) => g[r]?.[c] ?? NA);
      }),
    );
  },
  INDEX: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const rowArg = args[1] && args[1].t !== "missing" ? num(args, ctx, 1) : 0;
    if (isErr(rowArg)) return rowArg;
    const colArg = args[2] && args[2].t !== "missing" ? num(args, ctx, 2) : 0;
    if (isErr(colArg)) return colArg;
    const height = grid.length;
    const width = grid[0]?.length ?? 1;
    const r = Math.trunc(rowArg);
    const c = Math.trunc(colArg);
    // A single row/column may be indexed along its length (see the 1-D note below),
    // so the bounds check has to know which axis the caller is walking.
    const rowLimit = height === 1 && c === 0 ? width : height;
    const colLimit = width === 1 && r === 0 ? height : width;
    if (r > rowLimit || c > colLimit) return REF;
    if (r === 0 && c === 0) return grid;
    /**
     * A one-dimensional array (a spilled row or column) is indexed with a single
     * number: INDEX(TEXTSPLIT("a-b-c","-"),3) is "c", INDEX(SEQUENCE(5),3) is 3.
     * Excel treats that one argument as the position along the array.
     */
    if (height === 1 && c === 0) {
      if (r < 0 || r > width) return REF;
      const cell = grid[0][r - 1];
      return cell === undefined ? REF : cell;
    }
    if (width === 1 && r === 0 && c !== 0) {
      if (c < 0 || c > height) return REF;
      const cell = grid[c - 1]?.[0];
      return cell === undefined ? REF : cell;
    }
    if (r === 0) {
      const col = (c > 0 ? c - 1 : width + c);
      return grid.map((row) => [row[col] ?? REF]);
    }
    if (c === 0) {
      // A single-column array (a spilled list) is indexed by row alone.
      if (width === 1) {
        if (r < 0 || r > height) return REF;
        const cell = grid[r - 1]?.[0];
        return cell === undefined ? REF : cell;
      }
      const row = grid[r > 0 ? r - 1 : height + r] ?? [];
      return height === 1 ? row.map((cell) => [cell]) : row.map((cell) => [cell]);
    }
    const row = grid[r > 0 ? r - 1 : height + r];
    if (!row) return REF;
    const value = row[c > 0 ? c - 1 : width + c];
    return value === undefined ? REF : value;
  },
  INDIRECT: (args, ctx) => {
    const text = str(args, ctx, 0);
    if (isErr(text)) return text;
    const parsed = parseRefText(text);
    if (!parsed) return REF;
    const sheet = parsed.sheet ?? ctx.sheet;
    if (!ctx.host.sheetNames().includes(sheet)) return REF;
    const { r1, c1, r2, c2 } = parsed;
    if (r1 === r2 && c1 === c2) return ctx.host.value(sheet, r1, c1);
    return Array.from({ length: r2 - r1 + 1 }, (_, r) =>
      Array.from({ length: c2 - c1 + 1 }, (_, c) => ctx.host.value(sheet, r1 + r, c1 + c)),
    );
  },
  LOOKUP: (args, ctx) => {
    const needle = lookupValue(args, ctx);
    const lookupVec = flat(ctx.evalNode(args[1] ?? { t: "missing" }));
    const resultVec = args[2] && args[2].t !== "missing" ? flat(ctx.evalNode(args[2])) : lookupVec;
    let best = -1;
    for (let i = 0; i < lookupVec.length; i++) {
      const cmp = compareValues(lookupVec[i], needle);
      if (cmp <= 0) best = i;
      if (cmp > 0) break;
    }
    return best === -1 ? NA : resultVec[best] ?? NA;
  },
  MATCH: (args, ctx) => {
    const needle = lookupValue(args, ctx);
    const haystack = flat(ctx.evalNode(args[1] ?? { t: "missing" }));
    const type = num(args, ctx, 2, 1);
    if (isErr(type)) return type;
    const t = Math.trunc(type);
    if (t === 0) {
      const idx = findIndex(needle, haystack, 2, 1);
      return idx === -1 ? NA : idx + 1;
    }
    if (t === 1) {
      let best = -1;
      for (let i = 0; i < haystack.length; i++) {
        const cmp = compareValues(haystack[i], needle);
        if (cmp <= 0) best = i;
        else break;
      }
      return best === -1 ? NA : best + 1;
    }
    if (t === -1) {
      let best = -1;
      for (let i = 0; i < haystack.length; i++) {
        const cmp = compareValues(haystack[i], needle);
        if (cmp >= 0) best = i;
        else break;
      }
      return best === -1 ? NA : best + 1;
    }
    return NA;
  },
  OFFSET: (args, ctx) => {
    const base = args[0];
    if (!base || (base.t !== "ref" && base.t !== "range")) return VALUE;
    const rows = num(args, ctx, 1, 0);
    if (isErr(rows)) return rows;
    const cols = num(args, ctx, 2, 0);
    if (isErr(cols)) return cols;
    const startRow = (base.t === "ref" ? base.row : base.r1) + Math.trunc(rows);
    const startCol = (base.t === "ref" ? base.col : base.c1) + Math.trunc(cols);
    const height = args[3] && args[3].t !== "missing" ? num(args, ctx, 3) : base.t === "range" ? Math.abs(base.r2 - base.r1) + 1 : 1;
    if (isErr(height)) return height;
    const width = args[4] && args[4].t !== "missing" ? num(args, ctx, 4) : base.t === "range" ? Math.abs(base.c2 - base.c1) + 1 : 1;
    if (isErr(width)) return width;
    if (startRow < 0 || startCol < 0 || height < 1 || width < 1) return REF;
    const sheet = base.sheet ?? ctx.sheet;
    if (Math.trunc(height) === 1 && Math.trunc(width) === 1) return ctx.host.value(sheet, startRow, startCol);
    return Array.from({ length: Math.trunc(height) }, (_, r) =>
      Array.from({ length: Math.trunc(width) }, (_, c) => ctx.host.value(sheet, startRow + r, startCol + c)),
    );
  },
  ROW: (args, ctx) => {
    const node = args[0];
    if (!node || node.t === "missing") return ctx.row + 1;
    if (node.t === "ref") return node.row + 1;
    if (node.t === "range") {
      const height = Math.abs(node.r2 - node.r1) + 1;
      const start = Math.min(node.r1, node.r2);
      return Array.from({ length: height }, (_, i) => [start + i + 1]);
    }
    return ctx.row + 1;
  },
  ROWS: (args, ctx) => {
    const node = args[0];
    if (node && (node.t === "ref" || node.t === "range")) {
      if (node.t === "ref") return 1;
      return Math.abs(node.r2 - node.r1) + 1;
    }
    return toMatrix(ctx.evalNode(node ?? { t: "missing" })).length;
  },
  RTD: () => ({ err: "#N/A" as const, hint: "RTD needs a Windows COM server; not available in the browser" }),
  SORT: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" })).map((r) => [...r]);
    const sortIndex = args[1] && args[1].t !== "missing" ? num(args, ctx, 1, 1) : 1;
    if (isErr(sortIndex)) return sortIndex;
    const sortOrder = args[2] && args[2].t !== "missing" ? num(args, ctx, 2, 1) : 1;
    if (isErr(sortOrder)) return sortOrder;
    const byCol = args[3] && args[3].t !== "missing" ? bool(args, ctx, 3, false) : false;
    if (isErr(byCol)) return byCol;
    const col = Math.trunc(sortIndex) - 1;
    const dir = sortOrder === -1 ? -1 : 1;
    if (byCol) {
      const cols = grid[0]?.length ?? 0;
      if (col < 0 || col >= grid.length) return VALUE;
      void cols;
      const order = Array.from({ length: grid[0]?.length ?? 0 }, (_, c) => c).sort(
        (a, b) => dir * compareValues(grid[Math.trunc(sortIndex) - 1]?.[a] ?? null, grid[Math.trunc(sortIndex) - 1]?.[b] ?? null),
      );
      return grid.map((row) => order.map((c) => row[c] ?? null));
    }
    if (col < 0 || col >= (grid[0]?.length ?? 0)) return VALUE;
    grid.sort((a, b) => dir * compareValues(a[col] ?? null, b[col] ?? null));
    return grid;
  },
  SORTBY: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" })).map((r) => [...r]);
    const keys: { values: Scalar[]; dir: number }[] = [];
    for (let i = 1; i < args.length; i += 2) {
      const values = flat(ctx.evalNode(args[i]));
      const dirArg = args[i + 1] && args[i + 1].t !== "missing" ? num(args, ctx, i + 1, 1) : 1;
      if (isErr(dirArg)) return dirArg;
      keys.push({ values, dir: dirArg === -1 ? -1 : 1 });
    }
    if (!keys.length) return VALUE;
    const order = grid.map((_, i) => i);
    order.sort((x, y) => {
      for (const key of keys) {
        const cmp = compareValues(key.values[x] ?? null, key.values[y] ?? null);
        if (cmp !== 0) return key.dir * cmp;
      }
      return 0;
    });
    return order.map((i) => grid[i]);
  },
  TAKE: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const rows = num(args, ctx, 1, grid.length);
    if (isErr(rows)) return rows;
    const cols = num(args, ctx, 2, grid[0]?.length ?? 1);
    if (isErr(cols)) return cols;
    const rowSlice = Math.trunc(rows);
    const colSlice = Math.trunc(cols);
    let out = grid;
    if (rowSlice > 0) out = out.slice(0, rowSlice);
    else if (rowSlice < 0) out = out.slice(rowSlice);
    if (colSlice > 0) out = out.map((r) => r.slice(0, colSlice));
    else if (colSlice < 0) out = out.map((r) => r.slice(colSlice));
    if (!out.length || !out[0].length) return { err: "#CALC!" };
    return out;
  },
  TOCOL: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const ignore = args[1] && args[1].t !== "missing" ? num(args, ctx, 1, 0) : 0;
    if (isErr(ignore)) return ignore;
    const scanByCol = args[2] && args[2].t !== "missing" ? bool(args, ctx, 2, false) : false;
    if (isErr(scanByCol)) return scanByCol;
    let cells: Scalar[] = [];
    if (scanByCol) {
      const width = grid[0]?.length ?? 0;
      for (let c = 0; c < width; c++) for (const row of grid) cells.push(row[c] ?? null);
    } else {
      cells = grid.flat();
    }
    const mode = Math.trunc(ignore);
    if (mode === 1 || mode === 3) cells = cells.filter((c) => !isBlank(c));
    if (mode === 2 || mode === 3) cells = cells.filter((c) => !isErr(c));
    return cells.map((c) => [c]);
  },
  TOROW: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const ignore = args[1] && args[1].t !== "missing" ? num(args, ctx, 1, 0) : 0;
    if (isErr(ignore)) return ignore;
    const scanByCol = args[2] && args[2].t !== "missing" ? bool(args, ctx, 2, false) : false;
    if (isErr(scanByCol)) return scanByCol;
    let cells: Scalar[] = [];
    if (scanByCol) {
      const width = grid[0]?.length ?? 0;
      for (let c = 0; c < width; c++) for (const row of grid) cells.push(row[c] ?? null);
    } else {
      cells = grid.flat();
    }
    const mode = Math.trunc(ignore);
    if (mode === 1 || mode === 3) cells = cells.filter((c) => !isBlank(c));
    if (mode === 2 || mode === 3) cells = cells.filter((c) => !isErr(c));
    return [cells];
  },
  TRANSPOSE: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const width = grid[0]?.length ?? 0;
    return Array.from({ length: width }, (_, c) => grid.map((row) => row[c] ?? null));
  },
  UNIQUE: (args, ctx) => {
    const grid = asGrid(ctx.evalNode(args[0] ?? { t: "missing" }));
    const byCol = args[1] && args[1].t !== "missing" ? bool(args, ctx, 1, false) : false;
    if (isErr(byCol)) return byCol;
    const exactlyOnce = args[2] && args[2].t !== "missing" ? bool(args, ctx, 2, false) : false;
    if (isErr(exactlyOnce)) return exactlyOnce;
    const key = (cells: Scalar[]) => cells.map((c) => (isBlank(c) ? "\u0000" : `${typeof c}:${String(c).toLowerCase()}`)).join("|");
    if (byCol) {
      const width = grid[0]?.length ?? 0;
      const seen = new Map<string, number[]>();
      for (let c = 0; c < width; c++) {
        const column = grid.map((row) => row[c] ?? null);
        const k = key(column);
        seen.set(k, [...(seen.get(k) ?? []), c]);
      }
      const picks: number[] = [];
      seen.forEach((indexes) => {
        if (exactlyOnce && indexes.length > 1) return;
        picks.push(indexes[0]);
      });
      return grid.map((row) => picks.map((c) => row[c] ?? null));
    }
    const seen = new Map<string, number[]>();
    grid.forEach((row, i) => {
      const k = key(row);
      seen.set(k, [...(seen.get(k) ?? []), i]);
    });
    const keep: number[] = [];
    seen.forEach((indexes) => {
      if (exactlyOnce && indexes.length > 1) return;
      keep.push(indexes[0]);
    });
    return keep.map((i) => [...grid[i]]);
  },
  VLOOKUP: (args, ctx) => {
    const needle = lookupValue(args, ctx);
    const grid = asGrid(ctx.evalNode(args[1] ?? { t: "missing" }));
    const colIdx = num(args, ctx, 2);
    if (isErr(colIdx)) return colIdx;
    const rangeLookup = bool(args, ctx, 3, true);
    if (isErr(rangeLookup)) return rangeLookup;
    const width = grid[0]?.length ?? 0;
    const c = Math.trunc(colIdx);
    if (c < 1 || c > width) return REF;
    let hit = -1;
    for (let r = 0; r < grid.length; r++) {
      const cmp = compareValues(grid[r][0] ?? null, needle);
      if (cmp === 0) {
        hit = r;
        break;
      }
      if (rangeLookup && cmp < 0) hit = r;
      if (!rangeLookup && cmp > 0) break;
    }
    if (hit === -1) return NA;
    return grid[hit]?.[c - 1] ?? NA;
  },
  WRAPCOLS: (args, ctx) => {
    const cells = flat(ctx.evalNode(args[0] ?? { t: "missing" }));
    const wrap = num(args, ctx, 1);
    if (isErr(wrap)) return wrap;
    const padGiven = Boolean(args[2] && args[2].t !== "missing");
    const pad = padGiven ? ctx.evalNode(args[2]) : NA;
    if (padGiven && isErr(pad)) return pad;
    const height = Math.trunc(wrap);
    if (height < 1) return VALUE;
    const colCount = Math.ceil(cells.length / height);
    return Array.from({ length: height }, (_, r) =>
      Array.from({ length: colCount }, (_, c) => cells[c * height + r] ?? (pad as Scalar)),
    );
  },
  WRAPROWS: (args, ctx) => {
    const cells = flat(ctx.evalNode(args[0] ?? { t: "missing" }));
    const wrap = num(args, ctx, 1);
    if (isErr(wrap)) return wrap;
    const padGiven = Boolean(args[2] && args[2].t !== "missing");
    const pad = padGiven ? ctx.evalNode(args[2]) : NA;
    if (padGiven && isErr(pad)) return pad;
    const width = Math.trunc(wrap);
    if (width < 1) return VALUE;
    const rowCount = Math.ceil(cells.length / width);
    return Array.from({ length: rowCount }, (_, r) =>
      Array.from({ length: width }, (_, c) => cells[r * width + c] ?? (pad as Scalar)),
    );
  },
  VSTACK: (args, ctx) => {
    const grids = args.map((n) => asGrid(ctx.evalNode(n)));
    const width = Math.max(...grids.map((g) => g[0]?.length ?? 1));
    return grids.flatMap((g) => g.map((row) => Array.from({ length: width }, (_, c) => row[c] ?? NA)));
  },
  XLOOKUP: (args, ctx) => {
    const needle = lookupValue(args, ctx);
    const lookupArr = flat(ctx.evalNode(args[1] ?? { t: "missing" }));
    const returnArr = asGrid(ctx.evalNode(args[2] ?? { t: "missing" }));
    const matchMode = readMatchMode(args, ctx, 4);
    if (isErr(matchMode)) return matchMode;
    const searchMode = readSearchMode(args, ctx, 5);
    if (isErr(searchMode)) return searchMode;
    const vertical = returnArr.length === lookupArr.length || returnArr.length > 1;
    const rowsOfReturn = returnArr.length;
    const colsOfReturn = returnArr[0]?.length ?? 1;
    const compareLength = vertical ? rowsOfReturn : colsOfReturn;

    let idx = -1;
    if (searchMode === 2 || searchMode === -2) {
      // Binary search (assumes sorted data).
      const asc = searchMode === 2;
      let lo = 0;
      let hi = lookupArr.length - 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const cmp = compareValues(lookupArr[mid], needle);
        if (cmp === 0) {
          idx = mid;
          break;
        }
        if (asc ? cmp < 0 : cmp > 0) lo = mid + 1;
        else hi = mid - 1;
      }
      if (idx === -1 && matchMode === -1) idx = asc ? hi : lo;
      if (idx === -1 && matchMode === 1) idx = asc ? lo : hi;
    } else {
      idx = findIndex(needle, lookupArr, matchMode, searchMode);
    }

    if (idx === -1) {
      if (args[3] && args[3].t !== "missing") return ctx.evalNode(args[3]);
      return NA;
    }
    if (lookupArr.length !== compareLength) return VALUE;
    if (vertical) {
      const row = returnArr[idx];
      if (!row) return NA;
      return colsOfReturn === 1 ? row[0] ?? null : [row.map((c) => c ?? null)];
    }
    const column = returnArr.map((row) => row[idx] ?? null);
    return rowsOfReturn === 1 ? column[0] : [column.map((c) => c ?? null)];
  },
  XMATCH: (args, ctx) => {
    const needle = lookupValue(args, ctx);
    const haystack = flat(ctx.evalNode(args[1] ?? { t: "missing" }));
    const matchMode = readMatchMode(args, ctx, 2);
    if (isErr(matchMode)) return matchMode;
    const searchMode = readSearchMode(args, ctx, 3);
    if (isErr(searchMode)) return searchMode;
    const idx = findIndex(needle, haystack, matchMode, searchMode);
    return idx === -1 ? NA : idx + 1;
  },
};

function colName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Parses A1, A1:B9, Sheet1!A1 and 'My Sheet'!A1:C3 from text. */
export function parseRefText(text: string): { sheet: string | null; r1: number; c1: number; r2: number; c2: number } | null {
  const cleaned = text.trim();
  const m = /^(?:'([^']+)'|([A-Za-z0-9_\u0900-\u097F]+))!(.+)$/.exec(cleaned);
  const sheet = m ? m[1] ?? m[2] : null;
  const body = m ? m[3] : cleaned;
  const cell = (t: string) => {
    const p = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(t.trim());
    if (!p) return null;
    const col = p[1].toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    return { row: Number(p[2]) - 1, col };
  };
  const parts = body.split(":");
  const a = cell(parts[0]);
  if (!a) return null;
  if (parts.length === 1) return { sheet, r1: a.row, c1: a.col, r2: a.row, c2: a.col };
  const b = cell(parts[1]);
  if (!b) return null;
  return {
    sheet,
    r1: Math.min(a.row, b.row),
    c1: Math.min(a.col, b.col),
    r2: Math.max(a.row, b.row),
    c2: Math.max(a.col, b.col),
  };
}

export const lookupHelpers = { toNum, toStr, evalArg, flat };
