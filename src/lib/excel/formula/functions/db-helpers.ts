/**
 * Criteria-block matcher shared by the database (D*) functions.
 *
 * Excel's D-function criteria block is a mini filter form: the first row holds
 * field names, and every later row is a set of conditions that must all hold
 * (AND across a row, OR across rows). This reproduces that behaviour.
 */
import { matchesCriteria, parseCriteria, toStr, isErr, type Scalar, type XErr } from "../core";

export function needsCriteria(
  criteria: Scalar[][],
  /** The database's header row — criteria columns are matched *by name*. */
  dbHeader: Scalar[] = [],
): ((row: Scalar[]) => boolean) | XErr {
  if (!criteria.length) return { err: "#VALUE!" };
  const header = criteria[0] ?? [];
  const rows = criteria.slice(1).filter((row) => row.some((c) => c !== null && c !== ""));
  /**
   * Excel lines up a criteria block with the database by **header name**, not by
   * column position — that is why a criteria block can sit in F1:G2 and still
   * filter the "Sales" column in C. Map each criteria column to the matching
   * database column once, and report #VALUE! for a name that is not a field.
   */
  const columnFor = header.map((cell, index) => {
    const label = cell === null || cell === "" ? "" : toStr(cell);
    if (typeof label !== "string" || label === "") return index < dbHeader.length ? index : -1;
    const found = dbHeader.findIndex((h) => String(h ?? "").toLowerCase() === label.toLowerCase());
    return found;
  });
  const parsed = rows.map((row) => {
    const conditions: { index: number; test: (cell: Scalar) => boolean }[] = [];
    row.forEach((cell, index) => {
      if (cell === null || cell === "") return;
      const target = columnFor[index];
      if (target === undefined || target < 0) return;
      const crit = parseCriteria(cell);
      conditions.push({ index: target, test: (value: Scalar) => matchesCriteria(value, crit) });
    });
    return conditions;
  });
  if (!parsed.length) return () => true;
  return (row: Scalar[]) =>
    parsed.some((conditions) =>
      conditions.every((c) => c.test(row[c.index] ?? null)),
    );
}
