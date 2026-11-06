/**
 * Criteria-block matcher shared by the database (D*) functions.
 *
 * Excel's D-function criteria block is a mini filter form: the first row holds
 * field names, and every later row is a set of conditions that must all hold
 * (AND across a row, OR across rows). This reproduces that behaviour.
 */
import { matchesCriteria, parseCriteria, toStr, isErr, type Scalar, type XErr } from "../core";

export function needsCriteria(criteria: Scalar[][]): ((row: Scalar[]) => boolean) | XErr {
  if (!criteria.length) return { err: "#VALUE!" };
  const header = criteria[0] ?? [];
  const rows = criteria.slice(1).filter((row) => row.some((c) => c !== null && c !== ""));
  const parsed = rows.map((row) => {
    const conditions: { index: number; test: (cell: Scalar) => boolean }[] = [];
    row.forEach((cell, index) => {
      if (cell === null || cell === "") return;
      const text = toStr(cell);
      if (isErr(text)) return;
      const crit = parseCriteria(cell);
      conditions.push({ index, test: (value: Scalar) => matchesCriteria(value, crit) });
    });
    return conditions;
  });
  void header;
  if (!parsed.length) return () => true;
  return (row: Scalar[]) =>
    parsed.some((conditions) =>
      conditions.every((c) => c.test(row[c.index] ?? null)),
    );
}
