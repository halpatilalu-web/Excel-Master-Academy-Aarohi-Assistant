/**
 * Pure exam logic (question selection + grading), kept out of the view so it can
 * be unit-tested. Nothing here touches the DOM, storage or the network.
 */
import { QUESTION_BANK, type ExamQ, type Level } from "../data/chapters";
import { EXTRA_QUESTIONS } from "../data/questions";

export const QUESTION_COUNT = 20;
export const DURATION_SECONDS = 20 * 60;
export const LEVEL_QUOTAS: Record<Level, number> = { Basic: 6, Intermediate: 8, Advanced: 6 };
export const PASS_PCT = 60;

export interface ExamOption {
  t: string;
  ok: boolean;
}

export interface ExamQuestion extends ExamQ {
  opts: ExamOption[];
}

export interface ExamOutcome {
  score: number;
  total: number;
  pct: number;
  passed: boolean;
  byLevel: Record<string, [number, number]>;
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Both banks, de-duplicated by question text (the banks overlap slightly). */
export function allQuestions(): ExamQ[] {
  const seen = new Map<string, ExamQ>();
  for (const question of [...QUESTION_BANK, ...EXTRA_QUESTIONS]) {
    const key = question.q.trim().toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(key)) seen.set(key, question);
  }
  return [...seen.values()];
}

/** A fresh 20-question paper: level-balanced, duplicate-free, options shuffled. */
export function buildExam(): ExamQuestion[] {
  const bank = allQuestions();
  const selected: ExamQ[] = [];
  const leftovers: ExamQ[] = [];

  (Object.keys(LEVEL_QUOTAS) as Level[]).forEach((level) => {
    const pool = shuffle(bank.filter((q) => q.level === level));
    selected.push(...pool.slice(0, LEVEL_QUOTAS[level]));
    leftovers.push(...pool.slice(LEVEL_QUOTAS[level]));
  });

  if (selected.length < QUESTION_COUNT) {
    selected.push(...shuffle(leftovers).slice(0, QUESTION_COUNT - selected.length));
  }

  return shuffle(selected)
    .slice(0, QUESTION_COUNT)
    .map((q) => ({ ...q, opts: shuffle(q.o.map((t, i) => ({ t, ok: i === q.a }))) }));
}

/** Grade an attempt. `answers` holds the chosen option index per question (-1 = skipped). */
export function gradeExam(questions: ExamQuestion[], answers: number[]): ExamOutcome {
  const byLevel: Record<string, [number, number]> = {};
  let score = 0;
  questions.forEach((question, index) => {
    const chosen = answers[index] ?? -1;
    const ok = chosen >= 0 && !!question.opts[chosen]?.ok;
    if (ok) score++;
    const [correct, count] = byLevel[question.level] ?? [0, 0];
    byLevel[question.level] = [correct + (ok ? 1 : 0), count + 1];
  });
  const total = questions.length || QUESTION_COUNT;
  const pct = Math.round((score / total) * 100);
  return { score, total, pct, passed: pct >= PASS_PCT, byLevel };
}

export const mmss = (seconds: number) =>
  `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
