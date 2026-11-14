import type { Concept } from "./types";
import { LOOKUP_CONCEPTS } from "./conceptsLookup";
import { CORE_CONCEPTS } from "./conceptsCore";
import { DATA_CONCEPTS } from "./conceptsData";
import { EXCEL_BASICS } from "./conceptsExcel";

export const CONCEPTS: Concept[] = [...EXCEL_BASICS, ...LOOKUP_CONCEPTS, ...CORE_CONCEPTS, ...DATA_CONCEPTS];

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function conceptById(id: string | undefined): Concept | undefined {
  return id ? BY_ID.get(id) : undefined;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Does this key appear as a WORD in the text?
 *
 * Plain `includes` is what made the old tutor answer "IF" to "verify" and "SUM"
 * to "summary". Short keys therefore need real word boundaries; long keys and
 * keys with symbols (`=if(`, `#n/a`) can stay substring matches, because nobody
 * writes those inside another word.
 */
function mentions(text: string, key: string): boolean {
  const plain = /^[a-z0-9]+$/i.test(key);
  if (!plain || key.length > 4) return text.includes(key);
  return new RegExp(`(^|[^a-z0-9])${escape(key)}([^a-z0-9]|$)`, "i").test(text);
}

/** Every concept mentioned in the text, strongest mention first. */
export function conceptsIn(text: string): Concept[] {
  const t = text.toLowerCase();
  const scored: { concept: Concept; score: number }[] = [];
  for (const concept of CONCEPTS) {
    let score = 0;
    for (const key of concept.keys) {
      if (!mentions(t, key)) continue;
      score = Math.max(score, key.length);
    }
    if (score) scored.push({ concept, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.concept);
}

/** Find the concept a message is about. Longest key wins. */
export function findConcept(text: string): Concept | undefined {
  return conceptsIn(text)[0];
}
