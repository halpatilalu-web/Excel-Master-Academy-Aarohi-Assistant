import { describe, expect, it } from "vitest";
import {
  DURATION_SECONDS,
  LEVEL_QUOTAS,
  PASS_PCT,
  QUESTION_COUNT,
  buildExam,
  gradeExam,
  mmss,
  type ExamQuestion,
} from "./exam";

const correctIndex = (question: ExamQuestion) => question.opts.findIndex((option) => option.ok);

describe("buildExam", () => {
  it("produces a full, duplicate-free paper", () => {
    const paper = buildExam();
    expect(paper).toHaveLength(QUESTION_COUNT);
    const texts = paper.map((question) => question.q.toLowerCase());
    expect(new Set(texts).size).toBe(QUESTION_COUNT);
  });

  it("gives every question four options with exactly one correct answer", () => {
    for (const question of buildExam()) {
      expect(question.opts).toHaveLength(4);
      expect(question.opts.filter((option) => option.ok)).toHaveLength(1);
      expect(new Set(question.opts.map((option) => option.t)).size).toBe(4);
    }
  });

  it("keeps the level mix balanced", () => {
    const counts = buildExam().reduce<Record<string, number>>((acc, question) => {
      acc[question.level] = (acc[question.level] ?? 0) + 1;
      return acc;
    }, {});
    for (const [level, quota] of Object.entries(LEVEL_QUOTAS)) {
      expect(counts[level] ?? 0).toBe(quota);
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(QUESTION_COUNT);
  });

  it("shuffles options so the first choice is not always the answer", () => {
    const positions = new Set(buildExam().map(correctIndex));
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe("gradeExam", () => {
  const paper = buildExam();

  it("scores a perfect paper 100 and passes it", () => {
    const outcome = gradeExam(paper, paper.map(correctIndex));
    expect(outcome.score).toBe(QUESTION_COUNT);
    expect(outcome.pct).toBe(100);
    expect(outcome.passed).toBe(true);
  });

  it("scores an empty paper 0 and fails it", () => {
    const outcome = gradeExam(paper, Array(QUESTION_COUNT).fill(-1));
    expect(outcome.score).toBe(0);
    expect(outcome.pct).toBe(0);
    expect(outcome.passed).toBe(false);
  });

  it("counts a wrong option as wrong", () => {
    const wrong = paper.map((question) => (correctIndex(question) + 1) % 4);
    expect(gradeExam(paper, wrong).score).toBe(0);
  });

  it("passes exactly at the pass threshold", () => {
    const needed = Math.ceil((PASS_PCT / 100) * QUESTION_COUNT);
    const answers = paper.map((question, index) => (index < needed ? correctIndex(question) : -1));
    const outcome = gradeExam(paper, answers);
    expect(outcome.score).toBe(needed);
    expect(outcome.passed).toBe(true);
    expect(outcome.pct).toBeGreaterThanOrEqual(PASS_PCT);
  });

  it("breaks the result down by level", () => {
    const outcome = gradeExam(paper, paper.map(correctIndex));
    for (const level of Object.keys(LEVEL_QUOTAS)) {
      const [correct, total] = outcome.byLevel[level];
      expect(correct).toBe(total);
      expect(total).toBe(LEVEL_QUOTAS[level as keyof typeof LEVEL_QUOTAS]);
    }
  });

  it("tolerates short or missing answer arrays", () => {
    expect(gradeExam(paper, []).score).toBe(0);
    expect(gradeExam(paper, [correctIndex(paper[0])]).score).toBe(1);
  });
});

describe("mmss", () => {
  it("formats a countdown", () => {
    expect(mmss(0)).toBe("00:00");
    expect(mmss(59)).toBe("00:59");
    expect(mmss(600)).toBe("10:00");
    expect(mmss(DURATION_SECONDS)).toBe("20:00");
    expect(mmss(-5)).toBe("00:00");
  });
});
