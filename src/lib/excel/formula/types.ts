import type { Scalar, Val } from "./core";
import type { Node } from "./parser";

export interface CellRef {
  row: number;
  col: number;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
}

/**
 * The engine calls back into its host (the workbook UI or a test harness) for
 * everything sheet-shaped. Keeping this an interface means formulas can be unit
 * tested without a React tree, and the grid can stream values lazily.
 */
export interface Host {
  /** Names of the sheets in the workbook, in tab order. */
  sheetNames(): string[];
  /** The sheet a formula is being evaluated on (for unqualified references). */
  activeSheet(): string;
  /** Raw cell text ("=SUM(A1:A2)" or "42" or ""). */
  raw(sheet: string, row: number, col: number): string;
  /** Evaluated value of a cell (numbers, text, booleans, errors, null). */
  value(sheet: string, row: number, col: number): Scalar;
  /** Used rows/cols so a whole-column reference does not scan 1M rows. */
  bounds(sheet: string): { rows: number; cols: number };
  /** Workbook-level defined names (LAMBDAs and ranges). */
  definedName(name: string, sheet?: string): Node | undefined;
  /** "ddd" style settings that Excel keeps on the OS (used by TEXT / WEEKDAY). */
  locale?: { date1904?: boolean };
  /** Range reference text as the user wrote it, for CELL/INFO. */
  formula?(sheet: string, row: number, col: number): string;
}

export interface Ctx {
  host: Host;
  sheet: string;
  row: number;
  col: number;
  /** Variables bound by LET / LAMBDA. */
  vars: Map<string, Val>;
  /** Recursion guard for user-defined LAMBDAs. */
  depth: number;
  /** Set while expanding a spilled dynamic array, to break self-reference. */
  spillGuard?: Set<string>;
  evalNode(node: Node): Val;
  evalInVars(node: Node, vars: Map<string, Val>): Val;
}
