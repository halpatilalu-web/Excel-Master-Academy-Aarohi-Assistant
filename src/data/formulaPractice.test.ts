import { describe, expect, it } from "vitest";
import { FORMULA_DRILLS, PRACTICE_ANSWER_CELL, DRILL_COUNTS, drillSheet } from "./formulaPractice";
import { CATALOG_BY_NAME, FORMULA_CATALOG } from "./formulaCatalog";
import { Workbook } from "../lib/excel/formula/engine";
import { displayValue } from "../lib/excel/useWorkbook";

/**
 * The promise of the formula lab is "a practice sheet for every formula, and the
 * answer is right". These tests enforce both halves:
 *
 *  - coverage: each unique catalogue name has exactly one drill,
 *  - correctness: re-running the drill's formula on its own seeded sheet returns
 *    the `expected` value. A stale or hand-typed answer fails here instead of
 *    confusing a student later.
 */
const uniqueNames = [...new Set(FORMULA_CATALOG.map((entry) => entry.name))];

describe("formula practice drills", () => {
  it("has one drill for every unique catalogue function", () => {
    const drilled = FORMULA_DRILLS.map((drill) => drill.name);
    expect(new Set(drilled).size).toBe(drilled.length); // no duplicates
    expect(uniqueNames.filter((name) => !drilled.includes(name))).toEqual([]);
    expect(drilled.length).toBe(uniqueNames.length);
  });

  it("uses names the catalogue actually knows", () => {
    const unknown = FORMULA_DRILLS.filter((drill) => !CATALOG_BY_NAME[drill.name] && !CATALOG_BY_NAME[drill.name.replace(/\./g, "_")]);
    expect(unknown.map((drill) => drill.name)).toEqual([]);
  });

  it("counts drills per category to match the list", () => {
    const total = Object.values(DRILL_COUNTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(FORMULA_DRILLS.length);
  });

  it("always asks for the answer in H1, away from the seeded data", () => {
    expect(PRACTICE_ANSWER_CELL).toBe("H1");
    FORMULA_DRILLS.forEach((drill) => {
      const sheet = drillSheet(drill);
      expect(Object.keys(sheet.cells)).not.toContain(PRACTICE_ANSWER_CELL);
    });
  });

  it("writes a task, not just an example, for every drill", () => {
    FORMULA_DRILLS.forEach((drill) => {
      expect(drill.goalHi.length).toBeGreaterThan(40);
      expect(drill.goalEn.length).toBeGreaterThan(40);
      expect(drill.goalHi).toContain(PRACTICE_ANSWER_CELL);
      expect(drill.watchOutHi.length).toBeGreaterThan(10);
      expect(drill.formula.startsWith("=")).toBe(true);
    });
  });

  it("re-evaluates every expected answer with the engine", () => {
    const wrong: string[] = [];
    FORMULA_DRILLS.forEach((drill) => {
      const sheet = drillSheet(drill);
      const book = new Workbook({
        sheets: [{ name: "Practice", cells: { ...sheet.cells, [PRACTICE_ANSWER_CELL]: drill.formula } }],
      });
      const got = displayValue(book.value("Practice", 0, 7));
      if (got !== drill.expected) wrong.push(`${drill.name}: expected ${drill.expected}, engine says ${got}`);
    });
    expect(wrong).toEqual([]);
  });
});
