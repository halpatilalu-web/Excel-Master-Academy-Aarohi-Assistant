/**
 * Database functions (DSUM, DCOUNT, DGET …) — the chapter-44 skill set.
 * They take a criteria block that mimics a filter form: header row + criteria
 * rows, exactly like Excel's Advanced Filter.
 */
import { NUM, VALUE, isErr, scalarsIn, toMatrix, type Scalar, type XErr } from "../core";
import { needsCriteria } from "./db-helpers";
import { evalArg, type FnImpl } from "../helpers";

export const databaseFns: Record<string, FnImpl> = {
  DAVERAGE: (args, ctx) => dbAggregate(args, ctx, "AVERAGE"),
  DCOUNT: (args, ctx) => dbAggregate(args, ctx, "COUNT"),
  DCOUNTA: (args, ctx) => dbAggregate(args, ctx, "COUNTA"),
  DGET: (args, ctx) => {
    const matches = dbMatches(args, ctx);
    if (isErr(matches)) return matches;
    if (matches.matches.length === 0) return VALUE;
    if (matches.matches.length > 1) return NUM;
    return matches.matches[0];
  },
  DMAX: (args, ctx) => dbAggregate(args, ctx, "MAX"),
  DMIN: (args, ctx) => dbAggregate(args, ctx, "MIN"),
  DPRODUCT: (args, ctx) => dbAggregate(args, ctx, "PRODUCT"),
  DSTDEV: (args, ctx) => dbAggregate(args, ctx, "STDEV"),
  DSTDEVP: (args, ctx) => dbAggregate(args, ctx, "STDEVP"),
  DSUM: (args, ctx) => dbAggregate(args, ctx, "SUM"),
  DVAR: (args, ctx) => dbAggregate(args, ctx, "VAR"),
  DVARP: (args, ctx) => dbAggregate(args, ctx, "VARP"),
};

function dbMatches(
  args: Parameters<FnImpl>[0],
  ctx: Parameters<FnImpl>[1],
): { matches: Scalar[] } | XErr {
  const db = toMatrix(evalArg(args, ctx, 0));
  const fieldNode = args[1] ? ctx.evalNode(args[1]) : null;
  const criteria = toMatrix(evalArg(args, ctx, 2));
  if (!db.length) return VALUE;

  const header = db[0] ?? [];
  let fieldIndex = -1;
  if (typeof fieldNode === "number") {
    fieldIndex = Math.trunc(fieldNode) - 1;
  } else if (typeof fieldNode === "string") {
    fieldIndex = header.findIndex((h) => String(h ?? "").toLowerCase() === fieldNode.toLowerCase());
  }
  if (fieldIndex < 0 || fieldIndex >= header.length) return VALUE;

  const crit = needsCriteria(criteria, header);
  if (typeof crit !== "function") return crit;

  const rows = db.slice(1).filter((row) => crit(row));
  return { matches: rows.map((row) => row[fieldIndex] ?? null) };
}

function dbAggregate(
  args: Parameters<FnImpl>[0],
  ctx: Parameters<FnImpl>[1],
  kind: string,
): Scalar {
  const result = dbMatches(args, ctx);
  if (isErr(result)) return result;
  const cells = result.matches;
  const nums = cells.filter((c): c is number => typeof c === "number");
  switch (kind) {
    case "SUM":
      return nums.reduce((a, b) => a + b, 0);
    case "AVERAGE":
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : { err: "#DIV/0!" };
    case "COUNT":
      return nums.length;
    case "COUNTA":
      return cells.filter((c) => c !== null && c !== "").length;
    case "MAX":
      return nums.length ? Math.max(...nums) : 0;
    case "MIN":
      return nums.length ? Math.min(...nums) : 0;
    case "PRODUCT":
      return nums.length ? nums.reduce((a, b) => a * b, 1) : 0;
    case "STDEV": {
      if (nums.length < 2) return { err: "#DIV/0!" };
      const m = nums.reduce((a, b) => a + b, 0) / nums.length;
      return Math.sqrt(nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1));
    }
    case "STDEVP": {
      if (!nums.length) return { err: "#DIV/0!" };
      const m = nums.reduce((a, b) => a + b, 0) / nums.length;
      return Math.sqrt(nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length);
    }
    case "VAR": {
      if (nums.length < 2) return { err: "#DIV/0!" };
      const m = nums.reduce((a, b) => a + b, 0) / nums.length;
      return nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
    }
    case "VARP": {
      if (!nums.length) return { err: "#DIV/0!" };
      const m = nums.reduce((a, b) => a + b, 0) / nums.length;
      return nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
    }
    default:
      return VALUE;
  }
}

export const databaseHelpers = { scalarsIn };
