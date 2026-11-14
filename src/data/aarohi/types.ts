/**
 * The shape of Aarohi's own knowledge.
 *
 * The 269-entry `formulas.ts` catalogue is a *reference*: a name, a syntax, one
 * Hindi line and one example. That is enough to look something up and useless
 * for teaching — it cannot answer "why did I get #N/A", "A2 par kya hoga", or
 * "step by step samjhao" without repeating the same paragraph.
 *
 * A `Concept` is a small lesson: what it is, how it works step by step, a
 * worked example with real numbers, the mistakes students actually make, and
 * what to ask next. Aarohi composes answers from these parts, which is why the
 * same topic can produce a different answer for a different question.
 */

export type Topic = "lookup" | "math" | "logical" | "text" | "date" | "stat" | "dynamic" | "error" | "data" | "vba" | "pivot" | "shortcut" | "career";

/** One worked example: the sheet, the formula, and what Excel actually shows. */
export interface WorkedExample {
  /** Short scenario in Hinglish, e.g. "Employee ID se salary nikaalni hai". */
  title: string;
  /** Mini table as rows of text. First row is treated as the header. */
  table: string[][];
  /** Cell the formula is typed into, e.g. "G2". */
  at: string;
  /** The formula itself, starting with "=". */
  formula: string;
  /** What the cell shows, e.g. "₹48,000". */
  result: string;
  /** Why that is the answer, one or two lines. */
  why: string;
}

export interface Mistake {
  /** What goes wrong, in the student's words, e.g. "#N/A aa raha hai". */
  symptom: string;
  /** The real cause. */
  cause: string;
  /** The fix, ideally with a formula. */
  fix: string;
}

export interface Concept {
  /** Stable id, also the offline chat storage key. */
  id: string;
  /** Human name shown in the answer title, e.g. "VLOOKUP". */
  name: string;
  topic: Topic;
  /** Words and spellings that should find this concept. Lowercase. */
  keys: string[];
  /** Other concepts a student often confuses this with. */
  related?: string[];
  /** Chapter number in the diploma course, when there is one. */
  chapter?: number;
  /** One-sentence answer to "what is this?" — English. */
  whatEn: string;
  /** Same, Hinglish. */
  whatHi: string;
  /** The mental model. One or two sentences that make it click. */
  ideaEn: string;
  ideaHi: string;
  /** Exact syntax as Excel wants it. */
  syntax: string;
  /** Argument-by-argument meaning, in order. */
  args: { name: string; meaning: string; example?: string }[];
  /** What Excel does with it, in the order it does it. */
  stepsEn: string[];
  stepsHi: string[];
  /** At least one worked example with real numbers. */
  examples: WorkedExample[];
  /** Real mistakes, not theory. */
  mistakes: Mistake[];
  /** A short thing to try in Excel right now. */
  practice: string;
  /** Keyboard shortcuts worth knowing for this topic. */
  shortcuts?: { keys: string; what: string }[];
  /** Follow-up questions that actually have depth in this app. */
  next?: string[];
}
