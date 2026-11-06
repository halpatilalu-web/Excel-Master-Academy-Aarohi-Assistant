/**
 * Array helpers used by the statistics functions (FREQUENCY bins) and the
 * spreadsheet-only array literals. Dynamic-array behaviour itself lives in the
 * functions that return matrices (FILTER, SORT, UNIQUE, SEQUENCE …).
 */
import { scalarsIn, type Scalar } from "../core";
import type { FnImpl } from "../helpers";

export function arrayBins(v: unknown): Scalar[] {
  return scalarsIn(v as never);
}

/**
 * Deliberately empty: every dynamic-array function (FILTER, SORT, UNIQUE,
 * SEQUENCE, TAKE, DROP, HSTACK …) is registered in its own teaching table
 * (math/lookup/logical) because that is where students look for it. The table is
 * kept so `functions/index.ts` can register it unconditionally, and so a future
 * array-only helper has an obvious home.
 */
export const arrayFns: Record<string, FnImpl> = {};
