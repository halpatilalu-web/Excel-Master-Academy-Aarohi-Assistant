/**
 * Shared plumbing for every worksheet function implementation.
 *
 * Functions receive their argument **AST nodes** rather than values: that lets
 * IF/IFS/CHOOSE stay lazy (Excel only evaluates the branch it returns), and lets
 * LAMBDA/MAP/BYROW receive an unevaluated body. Each implementation calls the
 * `num`/`str`/`bool` helpers below, which handle the coercion rules and error
 * propagation once instead of in 400 places.
 */
import {
  CALC,
  DIV0,
  NAME,
  NUM,
  REF,
  VALUE,
  findError,
  formatGeneral,
  isArray,
  isBlank,
  isErr,
  isLambda,
  scalarsIn,
  scalarOf,
  toBool,
  toMatrix,
  toNum,
  toStr,
  type Scalar,
  type Val,
  type XErr,
} from "./core";
import type { Node } from "./parser";
import type { Ctx } from "./types";

export type FnImpl = (args: Node[], ctx: Ctx) => Val;

export const fnTable: Record<string, FnImpl> = {};

/** Every function the engine knows — used by the autocomplete + docs panel. */
export function knownFunctions(): string[] {
  return Object.keys(fnTable).sort((a, b) => a.localeCompare(b));
}

export function hasFunction(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(fnTable, name);
}

export function register(table: Record<string, FnImpl>): void {
  Object.assign(fnTable, table);
}

/* ------------------------- argument helpers ------------------------- */

export function evalArg(args: Node[], ctx: Ctx, i: number): Val {
  const node = args[i];
  if (!node || node.t === "missing") return null;
  return ctx.evalNode(node);
}

export function isRangeArg(args: Node[], i: number): boolean {
  const node = args[i];
  return Boolean(node && (node.t === "ref" || node.t === "range"));
}

export function num(args: Node[], ctx: Ctx, i: number, fallback?: number): number | XErr {
  if (!args[i] || args[i].t === "missing") {
    return fallback === undefined ? VALUE : fallback;
  }
  const v = ctx.evalNode(args[i]);
  // Excel takes the top-left cell of a range given where a number is expected.
  const s = scalarOf(v);
  const n = toNum(s);
  if (isErr(n)) return n;
  return n;
}

export function str(args: Node[], ctx: Ctx, i: number, fallback?: string): string | XErr {
  if (!args[i] || args[i].t === "missing") {
    return fallback === undefined ? VALUE : fallback;
  }
  const v = ctx.evalNode(args[i]);
  const s = toStr(scalarOf(v));
  return s;
}

export function bool(args: Node[], ctx: Ctx, i: number, fallback?: boolean): boolean | XErr {
  if (!args[i] || args[i].t === "missing") {
    return fallback === undefined ? VALUE : fallback;
  }
  const v = ctx.evalNode(args[i]);
  return toBool(scalarOf(v));
}

export function argCount(args: Node[]): number {
  return args.filter((a) => a.t !== "missing").length;
}

export function need(args: Node[], min: number, max = 255): XErr | null {
  const c = argCount(args);
  if (c < min || c > max) return VALUE;
  return null;
}

/** Returns the first error found in the raw values of the arguments. */
export function firstError(args: Node[], ctx: Ctx): XErr | null {
  for (const node of args) {
    if (!node || node.t === "missing") continue;
    const v = ctx.evalNode(node);
    const e = findError(v);
    if (e) return e;
  }
  return null;
}

/**
 * Numbers harvested from argument nodes with Excel's SUM rules: text and
 * booleans inside *ranges* are skipped; typed directly (SUM(TRUE,"2")) they
 * count. Errors are returned instead of a list.
 */
export function numbersFromArgs(args: Node[], ctx: Ctx): number[] | XErr {
  const out: number[] = [];
  for (let i = 0; i < args.length; i++) {
    const node = args[i];
    if (!node || node.t === "missing") continue;
    const rangeLike = node.t === "ref" || node.t === "range";
    const value = ctx.evalNode(node);
    const e = findError(value);
    if (e) return e;
    if (rangeLike) {
      for (const cell of scalarsIn(value)) {
        if (typeof cell === "number") out.push(cell);
        else if (typeof cell === "string") {
          // Excel ignores text in ranges for SUM, even numeric-looking text.
          continue;
        }
      }
    } else if (isArray(value)) {
      for (const cell of scalarsIn(value)) {
        if (typeof cell === "number") out.push(cell);
        else if (typeof cell === "boolean") out.push(cell ? 1 : 0);
        else if (typeof cell === "string" && cell !== "") {
          const n = toNum(cell);
          if (isErr(n)) out.push(NaN);
          else out.push(n);
        }
      }
    } else if (isBlank(value)) {
      out.push(0);
    } else {
      const n = toNum(value as Scalar);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
}

/** Same harvest, but returning the values themselves (for COUNT/COUNTA/TEXTJOIN). */
export function scalarsFromArgs(args: Node[], ctx: Ctx): Scalar[] | XErr {
  const out: Scalar[] = [];
  for (const node of args) {
    if (!node || node.t === "missing") continue;
    const value = ctx.evalNode(node);
    const e = findError(value);
    if (e) return e;
    out.push(...scalarsIn(value));
  }
  return out;
}

export function matrix(args: Node[], ctx: Ctx, i: number): Scalar[][] {
  if (!args[i] || args[i].t === "missing") return [[null]];
  return toMatrix(ctx.evalNode(args[i]));
}

/** Elementwise map that keeps the 2-D shape (dynamic-array behaviour). */
export function mapArray(v: Val, f: (s: Scalar) => Scalar): Val {
  if (!isArray(v)) return f(v as Scalar);
  return v.map((row) =>
    (Array.isArray(row) ? row : [row]).map((cell) => mapArray(cell as Val, f) as Scalar),
  );
}

/** Excel ROUND: half away from zero (JS Math.round(-2.5) is wrong here). */
export function roundHalfUp(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, digits);
  if (!Number.isFinite(factor) || factor === 0) return value;
  const scaled = value * factor;
  const rounded = Math.sign(scaled) * Math.round(Math.abs(Number(scaled.toPrecision(15))));
  const out = rounded / factor;
  return Number(out.toPrecision(15));
}

export function roundUp(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  const scaled = value * factor;
  const out = (scaled < 0 ? -Math.ceil(Math.abs(scaled) - 1e-12) : Math.ceil(Math.abs(scaled) - 1e-12)) / factor;
  return Number(out.toPrecision(15));
}

export function roundDown(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  const scaled = value * factor;
  const out = (scaled < 0 ? -Math.floor(Math.abs(scaled) + 1e-12) : Math.floor(Math.abs(scaled) + 1e-12)) / factor;
  return Number(out.toPrecision(15));
}

export function numText(n: number): string {
  return formatGeneral(n);
}

/** Signed 1-based index → array position (Excel is 1-based everywhere). */
export function index1(n: number): number {
  return n > 0 ? Math.floor(n) - 1 : n;
}

export const errOut = { VALUE, NUM, DIV0, NAME, REF, CALC };

export function isText(v: unknown): v is string {
  return typeof v === "string";
}

export { scalarOf, scalarsIn, isArray, isErr, isBlank, isLambda, toNum, toStr, toBool, toMatrix, findError };
export type { Scalar, Val, XErr, Node, Ctx };
