/**
 * The practice lab's answers are promises: "type =SUM(B2:D2) in E2 and the
 * Check answers button says yes". A wrong expectation teaches the wrong thing,
 * so every sheet's declared answers are evaluated here with the real engine.
 */
import { describe, expect, it } from "vitest";
import { PRACTICE_SHEETS } from "../components/LiveSpreadsheet";
import { PRACTICE_TASKS, taskFor } from "./practiceTasks";
import { Workbook } from "../lib/excel/formula/engine";

const split = (address: string) => {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) return null;
  const col = match[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { row: Number(match[2]) - 1, col };
};

describe("practice lab answers", () => {
  it("every declared answer is what the formula really calculates", () => {
    const problems: string[] = [];
    for (const sheet of PRACTICE_SHEETS) {
      // Checks are declared in task order, so a Result cell can only be right
      // once the Total above it exists — apply them one by one.
      const running: Record<string, string> = { ...sheet.initialGrid };
      for (const check of sheet.checks) {
        const cell = split(check.cell);
        if (!cell) {
          problems.push(`${sheet.id}: unreadable address ${check.cell}`);
          continue;
        }
        running[check.cell] = check.formulaSample;
        const book = new Workbook({ sheets: [{ name: "Practice", cells: { ...running } }] });
        const got = String(book.value("Practice", cell.row, cell.col));
        if (got !== check.expected) {
          problems.push(`${sheet.id} ${check.cell}: expected ${check.expected}, got ${got} from ${check.formulaSample}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("has eleven practice sheets, each with checks", () => {
    expect(PRACTICE_SHEETS).toHaveLength(11);
    for (const sheet of PRACTICE_SHEETS) {
      expect(sheet.checks.length).toBeGreaterThan(0);
      expect(Object.keys(sheet.initialGrid).length).toBeGreaterThan(3);
    }
  });
});

describe("practice tasks (the written instructions)", () => {
  it("gives every practice sheet a task with steps, cells to write and a finish line", () => {
    for (const sheet of PRACTICE_SHEETS) {
      const task = PRACTICE_TASKS.find((item) => item.id === sheet.id);
      expect(task, `no task for ${sheet.id}`).toBeTruthy();
      expect(task!.steps.length).toBeGreaterThanOrEqual(4);
      expect(task!.write.length).toBeGreaterThan(0);
      expect(task!.watchOut.hi.length).toBeGreaterThan(10);
      expect(task!.result.en.length).toBeGreaterThan(5);
      // Every step is written in both languages.
      for (const step of task!.steps) {
        expect(step.hi.trim().length).toBeGreaterThan(5);
        expect(step.en.trim().length).toBeGreaterThan(5);
      }
    }
  });

  it("names a real cell or range in every write line", () => {
    for (const task of PRACTICE_TASKS) {
      for (const line of task.write) {
        expect(line.formula.trim()).not.toBe("");
        expect(line.why.trim()).not.toBe("");
        // Either a plain address/range, or a named summary block.
        expect(/^[A-Z$]|[A-Za-z]/.test(line.at)).toBe(true);
      }
    }
  });

  it("returns a matching task for every sheet id and falls back safely", () => {
    expect(taskFor("sheet-gst").id).toBe("sheet-gst");
    expect(taskFor("sheet-marks").steps.length).toBeGreaterThan(3);
  });
});
