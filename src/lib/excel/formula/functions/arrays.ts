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

export const arrayFns: Record<string, FnImpl> = {};
