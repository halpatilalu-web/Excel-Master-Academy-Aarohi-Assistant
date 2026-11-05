import { describe, expect, it } from "vitest";
import { CHAPTERS, type MCQ } from "./chapters";
import { EXTRA_QUESTIONS } from "./questions";
import { FORMULAS } from "./formulas";
import { SHORTCUTS } from "./shortcuts";
import { VBA } from "./vba";
import { LABS, datasetCSV } from "./labs";
import { allQuestions, LEVEL_QUOTAS, QUESTION_COUNT } from "../lib/exam";

/**
 * Runtime integrity checks for the hand-authored course data.
 *
 * `scripts/check_data.py` greps the source text (it must stay dependency-free);
 * these tests import the real objects, so they catch what a regex cannot: an
 * out-of-range answer index, an empty option, a quiz that cannot be graded.
 */

const isBlank = (value: unknown) => typeof value !== "string" || value.trim() === "";

describe("chapters", () => {
  it("has 45 chapters numbered 1..45 in order", () => {
    expect(CHAPTERS.map((chapter) => chapter.n)).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });

  it("gives every chapter two answerable quick-check questions", () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.quiz, `chapter ${chapter.n}`).toHaveLength(2);
      chapter.quiz.forEach((question: MCQ, index: number) => {
        const where = `chapter ${chapter.n} quiz ${index + 1} (${question.q})`;
        expect(isBlank(question.q), where).toBe(false);
        expect(question.o, where).toHaveLength(4);
        question.o.forEach((option) => expect(isBlank(option), where).toBe(false));
        expect(Number.isInteger(question.a), where).toBe(true);
        expect(question.a, `${where}: answer index out of range`).toBeGreaterThanOrEqual(0);
        expect(question.a, `${where}: answer index out of range`).toBeLessThan(4);
      });
    }
  });

  it("does not repeat a question inside a chapter", () => {
    for (const chapter of CHAPTERS) {
      const texts = chapter.quiz.map((q) => q.q.trim().toLowerCase());
      expect(new Set(texts).size, `chapter ${chapter.n}`).toBe(texts.length);
    }
  });

  it("has no duplicate question text across both banks", () => {
    const texts = allQuestions().map((question) => question.q.trim().toLowerCase().replace(/\s+/g, " "));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("carries enough questions per level for the exam quotas", () => {
    const bank = allQuestions();
    for (const [level, quota] of Object.entries(LEVEL_QUOTAS)) {
      const pool = bank.filter((question) => question.level === level).length;
      expect(pool, `${level} pool`).toBeGreaterThanOrEqual(quota);
    }
    expect(bank.length).toBeGreaterThanOrEqual(QUESTION_COUNT);
  });
});

describe("question bank", () => {
  it("has four non-empty options and an in-range answer for every extra question", () => {
    expect(EXTRA_QUESTIONS.length).toBeGreaterThan(100);
    for (const question of EXTRA_QUESTIONS) {
      const where = question.q;
      expect(question.o, where).toHaveLength(4);
      question.o.forEach((option) => expect(isBlank(option), where).toBe(false));
      expect(question.a, where).toBeGreaterThanOrEqual(0);
      expect(question.a, where).toBeLessThan(4);
      expect(question.chapter, where).toBeGreaterThanOrEqual(1);
      expect(question.chapter, where).toBeLessThanOrEqual(45);
    }
  });
});

describe("reference libraries", () => {
  it("has complete formula rows", () => {
    expect(FORMULAS.length).toBeGreaterThan(100);
    for (const formula of FORMULAS) {
      expect(formula.name?.trim(), JSON.stringify(formula)).toBeTruthy();
      expect(formula.syntax?.trim()).toBeTruthy();
      expect(formula.hindi?.trim()).toBeTruthy();
      expect(formula.ex?.trim()).toBeTruthy();
      expect(formula.ch).toBeGreaterThanOrEqual(0);
      expect(formula.ch).toBeLessThanOrEqual(45);
    }
  });

  it("has complete shortcut rows", () => {
    expect(SHORTCUTS.length).toBeGreaterThan(100);
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.win?.trim()).toBeTruthy();
      expect(shortcut.mac?.trim()).toBeTruthy();
      expect(shortcut.desc?.trim()).toBeTruthy();
    }
  });

  it("has VBA snippets with a valid level and code", () => {
    expect(VBA.length).toBeGreaterThan(10);
    for (const snippet of VBA) {
      expect(["Basic", "Intermediate", "Advanced"]).toContain(snippet.level);
      expect(snippet.title?.trim()).toBeTruthy();
      expect(snippet.code?.trim()).toBeTruthy();
    }
  });
});

describe("lab datasets", () => {
  it("generates a header plus the promised number of rows", () => {
    for (const lab of LABS) {
      const lines = datasetCSV(lab).split("\n");
      expect(lines, lab.id).toHaveLength(lab.count + 1);
      expect(lines[0].split(","), lab.id).toHaveLength(lab.header.length);
      for (const line of lines.slice(1)) expect(line.split(","), lab.id).toHaveLength(lab.header.length);
    }
  });

  it("quotes values that contain a comma or a quote", () => {
    const lab = { ...LABS[0], rows: () => ["A, B", 'say "hi"', 1, 2], count: 1, header: ["Name", "Note", "A", "B"] };
    const csv = datasetCSV(lab);
    expect(csv.split("\n")[1]).toBe('"A, B","say ""hi""",1,2');
  });

  it("declares the columns a student must add, not columns already in the file", () => {
    // `need` is what the Lab view looks for in the header of the file the
    // student uploads: the columns the task asks them to create. A name that is
    // already in the source data would make the check trivially pass.
    for (const lab of LABS) {
      const header = lab.header.join(",").toLowerCase();
      for (const column of lab.need) {
        expect(column.trim(), lab.id).toBeTruthy();
        expect(header, `${lab.id}: "${column}" is already in the source data`).not.toContain(column.toLowerCase());
      }
      expect(new Set(lab.need).size, lab.id).toBe(lab.need.length);
    }
    expect(LABS.some((lab) => lab.need.length > 0)).toBe(true);
    // A lab with no column requirements must not be scored as "auto-checked".
    expect(LABS.some((lab) => lab.need.length === 0)).toBe(true);
  });
});
