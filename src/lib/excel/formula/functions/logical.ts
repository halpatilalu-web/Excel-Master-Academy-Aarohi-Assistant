/** Logical functions, LET and the LAMBDA family (Office 365 dynamic arrays). */
import {
  CALC,
  VALUE,
  isArray,
  isBlank,
  isErr,
  scalarOf,
  toBool,
  toMatrix,
  toNum,
  toStr,
  type Scalar,
  type Val,
  type XErr,
  type XLambda,
} from "../core";
import type { Node } from "../parser";
import { register, type FnImpl } from "../helpers";

/** Apply a scalar predicate elementwise, keeping the array shape (365 broadcast). */
function broadcast1(v: Val, f: (s: Scalar) => Scalar): Val {
  if (!isArray(v)) return f(v);
  return v.map((row) => row.map((cell) => f(cell)));
}

function broadcastN(vals: Val[], f: (cells: Scalar[]) => Scalar): Val {
  const arr = vals.find((v) => isArray(v));
  if (!arr) return f(vals as Scalar[]);
  const shape = toMatrix(arr as Val);
  const rows = shape.length;
  const cols = shape[0]?.length ?? 1;
  const mats = vals.map((v) => toMatrix(v));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const cells = mats.map((m, i) => {
        const wantRows = isArray(vals[i]) ? rows : 1;
        const wantCols = isArray(vals[i]) ? cols : 1;
        const rr = wantRows === 1 ? 0 : Math.min(r, m.length - 1);
        const cc = wantCols === 1 ? 0 : Math.min(c, (m[0]?.length ?? 1) - 1);
        return m[rr]?.[cc] ?? null;
      });
      return f(cells);
    }),
  );
}

const truthy = (v: Scalar): boolean | XErr => toBool(v);

export const logicalFns: Record<string, FnImpl> = {
  IF: (args, ctx) => {
    if (!args.length) return VALUE;
    const cond = ctx.evalNode(args[0]);
    const pick = (ok: boolean): Val => {
      if (ok) return args[1] ? ctx.evalNode(args[1]) : true;
      return args[2] ? ctx.evalNode(args[2]) : false;
    };
    if (isArray(cond)) {
      return toMatrix(cond).map((row) =>
        row.map((cell) => {
          const ok = toBool(cell);
          if (isErr(ok)) return ok;
          const branch = pick(ok);
          return scalarOf(branch);
        }),
      );
    }
    const ok = truthy(cond as Scalar);
    if (isErr(ok)) return ok;
    return pick(ok);
  },
  IFS: (args, ctx) => {
    for (let i = 0; i + 1 < args.length; i += 2) {
      const cond = ctx.evalNode(args[i]);
      const ok = truthy(scalarOf(cond));
      if (isErr(ok)) return ok;
      if (ok) return ctx.evalNode(args[i + 1]);
    }
    return { err: "#N/A", hint: "IFS: no condition was TRUE" };
  },
  AND: (args, ctx) => {
    const cells: Scalar[] = [];
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v)) return v;
      cells.push(...(isArray(v) ? toMatrix(v).flat() : [v as Scalar]));
    }
    if (!cells.length) return VALUE;
    let any = false;
    for (const c of cells) {
      if (isBlank(c)) continue;
      const b = toBool(c);
      if (isErr(b)) return b;
      any = true;
      if (!b) return false;
    }
    return any ? true : VALUE;
  },
  OR: (args, ctx) => {
    const cells: Scalar[] = [];
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v)) return v;
      cells.push(...(isArray(v) ? toMatrix(v).flat() : [v as Scalar]));
    }
    if (!cells.length) return VALUE;
    let any = false;
    for (const c of cells) {
      if (isBlank(c)) continue;
      const b = toBool(c);
      if (isErr(b)) return b;
      any = true;
      if (b) return true;
    }
    return any ? false : VALUE;
  },
  XOR: (args, ctx) => {
    const cells: Scalar[] = [];
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v)) return v;
      cells.push(...(isArray(v) ? toMatrix(v).flat() : [v as Scalar]));
    }
    let count = 0;
    for (const c of cells) {
      if (isBlank(c)) continue;
      const b = toBool(c);
      if (isErr(b)) return b;
      if (b) count++;
    }
    if (!cells.length) return VALUE;
    return count % 2 === 1;
  },
  NOT: (args, ctx) => {
    const v = ctx.evalNode(args[0] ?? { t: "missing" });
    const b = broadcast1(v, (s) => {
      const ok = toBool(s);
      return isErr(ok) ? ok : !ok;
    });
    return b;
  },
  TRUE: () => true,
  FALSE: () => false,
  IFERROR: (args, ctx) => {
    const v = ctx.evalNode(args[0] ?? { t: "missing" });
    const fallback = (): Val => (args[1] ? ctx.evalNode(args[1]) : null);
    const hasError = (x: Val): boolean => (isArray(x) ? x.some((row) => row.some((cell) => isErr(cell))) : isErr(x));
    if (isArray(v)) {
      const alt = fallback();
      return toMatrix(v).map((row) => row.map((cell) => (isErr(cell) ? scalarOf(alt) : cell)));
    }
    return hasError(v) ? fallback() : v;
  },
  IFNA: (args, ctx) => {
    const v = ctx.evalNode(args[0] ?? { t: "missing" });
    const alt = args[1] ? ctx.evalNode(args[1]) : null;
    const isNa = (x: Scalar) => isErr(x) && (x as XErr).err === "#N/A";
    if (isArray(v)) return toMatrix(v).map((row) => row.map((cell) => (isNa(cell) ? scalarOf(alt) : cell)));
    return isNa(v as Scalar) ? alt : v;
  },
  SWITCH: (args, ctx) => {
    const target = scalarOf(ctx.evalNode(args[0] ?? { t: "missing" }));
    const rest = args.slice(1);
    const pairs = rest.length % 2 === 0 ? rest.length : rest.length - 1;
    for (let i = 0; i < pairs; i += 2) {
      const candidate = scalarOf(ctx.evalNode(rest[i]));
      if (isErr(target)) return target;
      const eq = toStr(target).toString().toLowerCase() === toStr(candidate).toString().toLowerCase();
      if (eq) return ctx.evalNode(rest[i + 1]);
    }
    return rest.length % 2 === 1 ? ctx.evalNode(rest[rest.length - 1]) : { err: "#N/A" as const, hint: "SWITCH: no match and no default" };
  },
  CHOOSE: (args, ctx) => {
    const idx = toNum(scalarOf(ctx.evalNode(args[0] ?? { t: "missing" })));
    if (isErr(idx)) return idx;
    const i = Math.trunc(idx);
    if (i < 1 || i >= args.length) return VALUE;
    return ctx.evalNode(args[i]);
  },
  LET: (args, ctx) => {
    if (args.length < 3 || args.length % 2 === 0) return VALUE;
    const vars = new Map(ctx.vars);
    for (let i = 0; i + 2 < args.length; i += 2) {
      const nameNode = args[i];
      if (nameNode.t !== "name") return VALUE;
      vars.set(nameNode.v, ctx.evalInVars(args[i + 1], vars));
    }
    return ctx.evalInVars(args[args.length - 1], vars);
  },
  LAMBDA: (args, ctx) => {
    if (args.length < 2) return VALUE;
    const params: { name: string; optional?: boolean }[] = [];
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i].t !== "name") return VALUE;
      params.push({ name: (args[i] as { v: string }).v });
    }
    const lambda: XLambda = {
      lambda: { params, body: args[args.length - 1] },
      closure: new Map(ctx.vars),
    };
    return lambda;
  },
  ISOMITTED: (args, ctx) => {
    const node = args[0];
    if (!node) return true;
    if (node.t === "missing") return true;
    // Inside a LAMBDA, a parameter that the caller skipped is "omitted".
    if (node.t === "name") {
      // The parser upper-cases names, so a parameter can only be matched
      // case-insensitively (LAMBDA's `y` arrives here as `Y`).
      const wanted = node.v.toLowerCase();
      const index = (ctx.lambdaParams ?? []).findIndex((param) => param.toLowerCase() === wanted);
      if (index >= 0) return Boolean(ctx.lambdaOmitted?.has(index));
    }
    return false;
  },
  MAP: (args, ctx) => {
    if (args.length < 2) return VALUE;
    const lambda = ctx.evalNode(args[args.length - 1]);
    if (!isLambdaValue(lambda)) return CALC;
    const arrays = args.slice(0, -1).map((n) => toMatrix(ctx.evalNode(n)));
    const rows = arrays[0].length;
    const cols = arrays[0][0]?.length ?? 1;
    return Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        scalarOf(callLambda(lambda, arrays.map((m) => m[r]?.[c] ?? null), ctx)),
      ),
    );
  },
  REDUCE: (args, ctx) => {
    if (args.length < 3) return VALUE;
    let acc = ctx.evalNode(args[0]);
    const lambda = ctx.evalNode(args[2]);
    if (!isLambdaValue(lambda)) return CALC;
    for (const cell of toMatrix(ctx.evalNode(args[1])).flat()) {
      acc = callLambda(lambda, [acc, cell], ctx);
    }
    return acc;
  },
  SCAN: (args, ctx) => {
    if (args.length < 3) return VALUE;
    let acc = ctx.evalNode(args[0]);
    const lambda = ctx.evalNode(args[2]);
    if (!isLambdaValue(lambda)) return CALC;
    const out: Scalar[][] = [];
    const items = toMatrix(ctx.evalNode(args[1]));
    for (const row of items) {
      const line: Scalar[] = [];
      for (const cell of row) {
        acc = callLambda(lambda, [acc, cell], ctx);
        line.push(scalarOf(acc));
      }
      out.push(line);
    }
    return out;
  },
  BYROW: (args, ctx) => {
    if (args.length < 2) return VALUE;
    const lambda = ctx.evalNode(args[1]);
    if (!isLambdaValue(lambda)) return CALC;
    return toMatrix(ctx.evalNode(args[0])).map((row) => [scalarOf(callLambda(lambda, [row as unknown as Val], ctx))]);
  },
  BYCOL: (args, ctx) => {
    if (args.length < 2) return VALUE;
    const lambda = ctx.evalNode(args[1]);
    if (!isLambdaValue(lambda)) return CALC;
    const m = toMatrix(ctx.evalNode(args[0]));
    const cols = m[0]?.length ?? 1;
    return [
      Array.from({ length: cols }, (_, c) =>
        scalarOf(callLambda(lambda, [m.map((row) => row[c] ?? null) as unknown as Val], ctx)),
      ),
    ];
  },
  MAKEARRAY: (args, ctx) => {
    const rows = toNum(scalarOf(ctx.evalNode(args[0] ?? { t: "missing" })));
    if (isErr(rows)) return rows;
    const cols = toNum(scalarOf(ctx.evalNode(args[1] ?? { t: "missing" })));
    if (isErr(cols)) return cols;
    const lambda = ctx.evalNode(args[2] ?? { t: "missing" });
    if (!isLambdaValue(lambda)) return CALC;
    const R = Math.trunc(rows);
    const C = Math.trunc(cols);
    if (R < 1 || C < 1 || R * C > 100_000) return VALUE;
    return Array.from({ length: R }, (_, r) =>
      Array.from({ length: C }, (_, c) => scalarOf(callLambda(lambda, [r + 1, c + 1], ctx))),
    );
  },
};

function isLambdaValue(v: Val): v is XLambda {
  return typeof v === "object" && v !== null && !Array.isArray(v) && "lambda" in v;
}

/**
 * Applies a LAMBDA value. Parameter arity is enforced the way Excel does it:
 * missing required parameters are `#VALUE!`, extra arguments are `#VALUE!`.
 */
export function callLambda(lambda: XLambda, callArgs: Val[], ctx: Parameters<FnImpl>[1]): Val {
  if (ctx.depth > 120) return { err: "#NUM!", hint: "LAMBDA recursion too deep" };
  const params = lambda.lambda.params;
  if (callArgs.length > params.length) return VALUE;
  const vars: Map<string, Val> = new Map(lambda.closure ?? []);
  /**
   * An omitted argument is not a blank value: ISOMITTED() must be able to tell
   * `LAMBDA(x,y,…)(1)` from `LAMBDA(x,y,…)(1,0)`. Excel sets omitted parameters
   * to a special "missing" value, which is what the sentinel below stands for.
   */
  const omitted = new Set<number>();
  lambda.lambda.omitted = omitted;
  params.forEach((p, i) => {
    const value = callArgs[i];
    if (value === undefined) omitted.add(i);
    vars.set(p.name, value === undefined ? null : value);
  });
  const body = lambda.lambda.body as Node;
  // The body runs in the caller's scope, plus this frame's parameters — which is
  // what ISOMITTED() inspects — and one level deeper for the recursion guard.
  return ctx.evalInVars(body, vars, {
    depth: ctx.depth + 1,
    lambdaParams: params.map((p) => p.name.toLowerCase()),
    lambdaOmitted: omitted,
  });
}

register({});
