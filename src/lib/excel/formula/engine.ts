/**
 * Workbook engine.
 *
 * Takes a plain sheet model (raw text in, values out), parses every formula
 * lazily, resolves dependencies with a memoised recursive evaluator (so a
 * formula can reference cells further down the sheet), and detects circular
 * references instead of hanging the tab.
 *
 * Cheap correctness > clever: the cache is rebuilt per calculation pass, which
 * keeps recalculation deterministic and matches Excel's full-recalc behaviour.
 */
import {
  CYCLE,
  NAME,
  REF,
  VALUE,
  findError,
  isArray,
  isErr,
  scalarsIn,
  toMatrix,
  type Scalar,
  type Val,
  type XErr,
  type XLambda,
} from "./core";
import { parseFormula, ParseError, isFormula, type Node } from "./parser";
import type { Ctx, Host } from "./types";
import { fnTable, hasFunction, knownFunctions } from "./helpers";
import { callLambda } from "./functions/logical";
import "./functions/index";
import { parseDateText } from "./core";

export interface SheetData {
  name: string;
  /** Raw cell text keyed by "A1". */
  cells: Record<string, string>;
  /** Optional: column widths / formatting used by the UI only. */
  meta?: Record<string, unknown>;
}

export interface WorkbookData {
  sheets: SheetData[];
  /** Defined names → formula text (e.g. TAX = 0.18, Total = Sheet1!B2). */
  names?: Record<string, string>;
}

export interface EvaluatedCell {
  /** What the cell displays. */
  value: Scalar;
  /** The formula without "=" when the cell holds one. */
  formula?: string;
  error?: XErr;
  /** True when the cell is the origin of an array that spills into neighbours. */
  spilledFrom?: string;
}

const MAX_RANGE_CELLS = 200_000;

export class Workbook {
  private readonly sheets = new Map<string, SheetData>();
  private readonly names: Record<string, string>;
  private cache = new Map<string, Scalar>();
  private visiting = new Set<string>();
  private parseCache = new Map<string, Node>();
  private parseFailures = new Map<string, XErr>();

  constructor(data: WorkbookData) {
    data.sheets.forEach((sheet) => this.sheets.set(sheet.name, sheet));
    if (!this.sheets.size) this.sheets.set("Sheet1", { name: "Sheet1", cells: {} });
    this.names = data.names ?? {};
  }

  sheetNames(): string[] {
    return [...this.sheets.keys()];
  }

  getSheet(name: string): SheetData | undefined {
    return this.sheets.get(name);
  }

  /** Replaces one sheet's raw cells (used by the editor on every keystroke). */
  setCells(sheet: string, cells: Record<string, string>): void {
    const target = this.sheets.get(sheet);
    if (target) target.cells = cells;
    this.invalidate();
  }

  setSheets(sheets: SheetData[]): void {
    this.sheets.clear();
    sheets.forEach((s) => this.sheets.set(s.name, s));
    this.invalidate();
  }

  invalidate(): void {
    this.cache = new Map();
  }

  private key(sheet: string, row: number, col: number): string {
    return `${sheet}\u0000${row}\u0000${col}`;
  }

  raw(sheet: string, row: number, col: number): string {
    const s = this.sheets.get(sheet);
    if (!s) return "";
    return s.cells[`${columnName(col)}${row + 1}`] ?? "";
  }

  /** Value of a cell, evaluating formulas on demand. */
  value(sheet: string, row: number, col: number): Scalar {
    const k = this.key(sheet, row, col);
    const cached = this.cache.get(k);
    if (cached !== undefined) return cached;
    if (this.visiting.has(k)) return CYCLE;

    const text = this.raw(sheet, row, col);
    if (!isFormula(text)) {
      const literal = this.literal(text);
      this.cache.set(k, literal);
      return literal;
    }
    this.visiting.add(k);
    let result: Scalar;
    try {
      const node = this.ast(text);
      if (isErr(node)) {
        result = node;
      } else {
        result = collapseScalar(this.evaluate(node, sheet, row, col));
      }
    } finally {
      this.visiting.delete(k);
    }
    this.cache.set(k, result);
    return result;
  }

  /** Literal text → typed value. Dates stay numbers, numbers get numbers. */
  literal(text: string): Scalar {
    if (text === "" || text === undefined) return null;
    const trimmed = text.trim();
    if (trimmed === "") return text === "" ? null : text;
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
    const num = Number(trimmed.replace(/,/g, ""));
    if (trimmed !== "" && Number.isFinite(num) && !/^0\d/.test(trimmed)) return num;
    const serial = parseDateText(trimmed);
    if (serial !== null && /[-/]/.test(trimmed)) return serial;
    return text;
  }

  private ast(text: string): Node | XErr {
    const hit = this.parseCache.get(text);
    if (hit) return hit;
    const failure = this.parseFailures.get(text);
    if (failure) return failure;
    try {
      const node = parseFormula(text);
      this.parseCache.set(text, node);
      return node;
    } catch (error) {
      const failure: XErr = {
        err: error instanceof ParseError ? "#NAME?" : "#VALUE!",
        hint: error instanceof Error ? error.message : "Formula could not be parsed",
      };
      this.parseFailures.set(text, failure);
      return { t: "err", v: failure.err };
    }
  }

  host(activeSheet: string): Host {
    return {
      sheetNames: () => this.sheetNames(),
      activeSheet: () => activeSheet,
      raw: (sheet, row, col) => this.raw(sheet, row, col),
      value: (sheet, row, col) => this.value(sheet, row, col),
      bounds: (sheet) => boundsOf(this.sheets.get(sheet)),
      definedName: (name, sheet) => {
        const scoped = sheet ? this.names[`${sheet}!${name}`] : undefined;
        const text = scoped ?? this.names[name];
        if (!text) return undefined;
        try {
          return parseFormula(text.startsWith("=") ? text : `=${text}`);
        } catch {
          return undefined;
        }
      },
    };
  }

  evaluate(
    node: Node,
    sheet: string,
    row: number,
    col: number,
    vars?: Map<string, Val>,
    inherited?: Partial<Ctx>,
  ): Val {
    const ctx = this.makeCtx(sheet, row, col, vars ?? new Map(), inherited);
    return this.evalNode(node, ctx);
  }

  /**
   * Build an evaluation context whose `evalNode`/`evalInVars` closures point at
   * THAT context. The previous version spread an old context, so nested nodes
   * kept evaluating against stale variables — which is why a LAMBDA body like
   * `a+b` lost its parameters while a bare `a` worked.
   */
  private makeCtx(
    sheet: string,
    row: number,
    col: number,
    vars: Map<string, Val>,
    inherited?: Partial<Ctx>,
  ): Ctx {
    const ctx = { host: this.host(sheet), sheet, row, col, depth: 0, ...inherited } as Ctx;
    // The scope/position arguments win over anything inherited — otherwise the
    // parent's variable map would overwrite the child's.
    ctx.vars = vars;
    ctx.sheet = sheet;
    ctx.row = row;
    ctx.col = col;
    ctx.evalNode = (n) => this.evalNode(n, ctx);
    ctx.evalInVars = (n, nextVars, extra) =>
      this.evalNode(n, this.makeCtx(sheet, row, col, nextVars, { ...ctx, ...extra }));
    return ctx;
  }

  private evalNode(node: Node, ctx: Ctx): Val {
    switch (node.t) {
      case "num":
        return node.v;
      case "str":
        return node.v;
      case "bool":
        return node.v;
      case "err":
        return { err: node.v };
      case "missing":
        return null;
      case "ref": {
        const sheet = node.sheet ?? ctx.sheet;
        if (!this.sheets.has(sheet)) return REF;
        return ctx.host.value(sheet, node.row, node.col);
      }
      case "range":
        return this.rangeValue(node, ctx);
      case "name": {
        if (ctx.vars.has(node.v)) return ctx.vars.get(node.v) as Val;
        /**
         * LAMBDA parameters keep the case they were written in (`LAMBDA(a,b,…)`),
         * while the parser upper-cases every reference in the body (`A`, `B`), so
         * fall back to a case-insensitive lookup before calling it an unknown name.
         */
        for (const [key, value] of ctx.vars) {
          if (key.toLowerCase() === node.v.toLowerCase()) return value as Val;
        }
        const defined = ctx.host.definedName(node.v, ctx.sheet);
        if (!defined) return { err: "#NAME?", hint: `Unknown name "${node.v}"` };
        return ctx.evalNode(defined);
      }
      case "array":
        return node.rows.map((row) => row.map((cell) => collapseScalar(ctx.evalNode(cell))));
      case "unary": {
        if (node.op === "@") return collapseScalar(ctx.evalNode(node.v));
                const mapScalar = (s: Scalar): Scalar => {
          if (isErr(s)) return s;
          if (node.op === "+") {
            const n = Number(s === null ? 0 : s);
            return Number.isNaN(n) ? VALUE : n;
          }
          const n = Number(s === null ? 0 : s);
          return Number.isNaN(n) ? VALUE : -n;
        };
        const v = ctx.evalNode(node.v);
        return isArray(v) ? mapMatrix(v, mapScalar) : mapScalar(collapseScalar(v));
      }
      case "pct": {
        const v = collapseScalar(ctx.evalNode(node.v));
        if (isErr(v)) return v;
        const n = Number(v ?? 0);
        return Number.isNaN(n) ? VALUE : n / 100;
      }
      case "binary":
        return this.binary(node.op, ctx.evalNode(node.l), ctx.evalNode(node.r));
      case "func":
        return this.callFunction(node.name, node.args, ctx);
      case "call": {
        const target = ctx.evalNode(node.fn);
        if (!isLambdaValue(target)) {
          return { err: "#VALUE!", hint: "Only a LAMBDA can be called like a function" };
        }
        return callLambda(target, node.args.map((a) => ctx.evalNode(a)), ctx);
      }
      default:
        return VALUE;
    }
  }

  private rangeValue(node: Extract<Node, { t: "range" }>, ctx: Ctx): Val {
    const sheet = node.sheet ?? ctx.sheet;
    if (!this.sheets.has(sheet)) return REF;
    const r1 = Math.min(node.r1, node.r2);
    const r2 = Math.max(node.r1, node.r2);
    const c1 = Math.min(node.c1, node.c2);
    const c2 = Math.max(node.c1, node.c2);
    const bounds = ctx.host.bounds(sheet);
    // A whole-column reference (A:A) carries row 1048576 and a whole-row (1:1)
    // carries column XFD; clamping both ends to the used area trims those
    // sentinels without ever widening the *other* axis (A:A stays one column).
    const lastRow = Math.min(r2, Math.max(bounds.rows - 1, r1));
    const lastCol = Math.min(c2, Math.max(bounds.cols - 1, c1));
    const rows = Math.max(1, lastRow - r1 + 1);
    const cols = Math.max(1, lastCol - c1 + 1);
    if (rows * cols > MAX_RANGE_CELLS) {
      return { err: "#NUM!", hint: "Range too large for the browser engine" };
    }
    // A formula reading a whole column while sitting inside that column must not
    // count itself as a circular reference: Excel treats that cell as blank.
    const ownCell = sheet === ctx.sheet;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const row = r1 + r;
        const col = c1 + c;
        if (ownCell && row === ctx.row && col === ctx.col) return null;
        return ctx.host.value(sheet, row, col);
      }),
    );
  }

  private callFunction(name: string, args: Node[], ctx: Ctx): Val {
    // Excel writes dotted names (MODE.SNGL); the tables use MODE_SNGL.
    const impl = fnTable[name] ?? fnTable[name.replace(/\./g, "_")];
    if (!impl) {
      if (name === "LAMBDA") return fnTable.LAMBDA(args, ctx);
      // A defined name used with brackets, or a UDF reference.
      return { err: "#NAME?", hint: `"${name}" is not a function in this build` };
    }
    try {
      return impl(args, ctx);
    } catch (error) {
      return {
        err: "#VALUE!",
        hint: error instanceof Error ? error.message : "Function failed",
      };
    }
  }

  private binary(op: string, leftRaw: Val, rightRaw: Val): Val {
    const left = isArray(leftRaw) ? leftRaw : collapseScalar(leftRaw);
    const right = isArray(rightRaw) ? rightRaw : collapseScalar(rightRaw);

    if (isArray(left) || isArray(right)) {
      const l = toMatrix(left);
      const r = toMatrix(right);
      const rows = Math.max(l.length, r.length);
      const cols = Math.max(l[0]?.length ?? 1, r[0]?.length ?? 1);
      return Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => {
          const a = l[Math.min(i, l.length - 1)]?.[Math.min(j, (l[0]?.length ?? 1) - 1)] ?? null;
          const b = r[Math.min(i, r.length - 1)]?.[Math.min(j, (r[0]?.length ?? 1) - 1)] ?? null;
          return this.scalarBinary(op, a, b);
        }),
      );
    }
    return this.scalarBinary(op, left as Scalar, right as Scalar);
  }

  private scalarBinary(op: string, a: Scalar, b: Scalar): Scalar {
    if (op === "&") {
      if (isErr(a)) return a;
      if (isErr(b)) return b;
      const left = a === null ? "" : String(typeof a === "boolean" ? (a ? "TRUE" : "FALSE") : a);
      const right = b === null ? "" : String(typeof b === "boolean" ? (b ? "TRUE" : "FALSE") : b);
      return left + right;
    }
    if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
      if (isErr(a)) return a;
      if (isErr(b)) return b;
      const cmp = compare(a, b);
      if (op === "=") return cmp === 0;
      if (op === "<>") return cmp !== 0;
      if (op === "<") return cmp < 0;
      if (op === ">") return cmp > 0;
      if (op === "<=") return cmp <= 0;
      return cmp >= 0;
    }
    if (isErr(a)) return a;
    if (isErr(b)) return b;
    const x = numeric(a);
    if (isErr(x)) return x;
    const y = numeric(b);
    if (isErr(y)) return y;
    switch (op) {
      case "+":
        return clean(x + y);
      case "-":
        return clean(x - y);
      case "*":
        return clean(x * y);
      case "/":
        return y === 0 ? { err: "#DIV/0!" } : clean(x / y);
      case "^": {
        const out = x ** y;
        return Number.isFinite(out) ? clean(out) : { err: "#NUM!" };
      }
      default:
        return VALUE;
    }
  }

  /** Every cell of a sheet with its display value (for rendering / export). */
  snapshot(sheet: string): Record<string, Scalar> {
    const target = this.sheets.get(sheet);
    const out: Record<string, Scalar> = {};
    if (!target) return out;
    Object.keys(target.cells).forEach((addr) => {
      const parsed = addressToRC(addr);
      if (!parsed) return;
      out[addr] = this.value(sheet, parsed.row, parsed.col);
    });
    return out;
  }
}

/* ------------------------------ helpers ------------------------------ */

function isLambdaValue(v: Val): v is XLambda {
  return typeof v === "object" && v !== null && !Array.isArray(v) && "lambda" in v;
}

function collapseScalar(v: Val): Scalar {
  if (isArray(v)) return v[0]?.[0] ?? null;
  return v;
}

function mapMatrix(m: Scalar[][], f: (s: Scalar) => Scalar): Scalar[][] {
  return m.map((row) => row.map((cell) => f(cell)));
}

function numeric(v: Scalar): number | XErr {
  if (isErr(v)) return v;
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v !== "string") return VALUE;
  const t = v.trim();
  if (t === "") return 0;
  const n = Number(t.replace(/,/g, ""));
  if (Number.isFinite(n)) return n;
  const serial = parseDateText(t);
  return serial === null ? VALUE : serial;
}

/** Excel comparison: numbers < text < FALSE < TRUE, text case-insensitive. */
function compare(a: Scalar, b: Scalar): number {
  if (a === null && b === null) return 0;
  const rank = (v: Scalar): number => {
    if (v === null) return 0;
    if (typeof v === "number") return 1;
    if (typeof v === "string") return 2;
    if (typeof v === "boolean") return v ? 4 : 3;
    return 5;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra === 0 || rb === 0) {
    // Blank equals 0 and "" — Excel's special case.
    if (ra === 0 && rb === 0) return 0;
    const other = ra === 0 ? b : a;
    const sign = ra === 0 ? 1 : -1;
    if (typeof other === "number") return other === 0 ? 0 : -sign;
    if (typeof other === "string") return other === "" ? 0 : -sign;
    return -sign;
  }
  if (ra !== rb) return ra < rb ? -1 : 1;
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

function clean(n: number): number {
  if (!Number.isFinite(n)) return Number.POSITIVE_INFINITY === n ? { err: "#NUM!" } as unknown as number : (0 as number);
  return Number(n.toPrecision(15));
}

export function columnName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function addressToRC(text: string): { row: number; col: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(text.trim());
  if (!m) return null;
  const col = m[1].toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { row: Number(m[2]) - 1, col };
}

function boundsOf(sheet: SheetData | undefined): { rows: number; cols: number } {
  if (!sheet) return { rows: 1, cols: 1 };
  let rows = 0;
  let cols = 0;
  Object.keys(sheet.cells).forEach((addr) => {
    const rc = addressToRC(addr);
    if (!rc) return;
    if (sheet.cells[addr] === "" || sheet.cells[addr] === undefined) return;
    rows = Math.max(rows, rc.row + 1);
    cols = Math.max(cols, rc.col + 1);
  });
  return { rows: Math.max(rows, 1), cols: Math.max(cols, 1) };
}

/** Re-exported so the UI can show "this function exists" badges. */
export { knownFunctions, hasFunction, findError, scalarsIn };

export const engineInternals = { callLambda, CYCLE, REF, NAME, VALUE };
