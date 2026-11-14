/**
 * What is the student actually asking for?
 *
 * The old tutor matched a keyword and printed one fixed paragraph, so "VLOOKUP
 * kya hai", "VLOOKUP step by step sikhao", "isme #N/A kyun aaya" and "A2 par kya
 * hoga" all produced the same text. Reading the intent first is what makes the
 * answer change with the question.
 */

export type Intent =
  | "greet" // hi / help / who are you
  | "define" // what is X
  | "howto" // how do I do X (steps)
  | "example" // show me an example / my data is like this
  | "compare" // X vs Y, kaunsa behtar
  | "debug" // error, not working, wrong answer
  | "value" // what will this cell / formula give
  | "practice" // quiz me, give me a task
  | "next" // aage kya, aur samjhao, short follow-up
  | "roleplay" // interview / office roleplay
  | "offtopic"; // not Excel

const GREET = /\b(hi|hii|hello|hey|namaste|namaskar|good morning|good evening|kaise ho|kaisi ho|who are you|tum kaun|aap kaun|help|madad)\b/i;
const DEFINE = /\b(kya hai|kya hota|what is|what's|define|matlab kya|meaning|explain|samjha(o|do|ye|na)?|batao|bata do|bolo)\b/i;
const HOWTO = /\b(kaise|how to|how do i|steps?|step by step|process|tarika|tareeka|banaye|banau|banao|banana|bana do|lagaye|lagau|lagao|lagana|use kar|use kare|karna|sikhao|sikha do|seekhna)\b/i;
const EXAMPLE = /\b(example|udaharan|sample|for instance|jaise|dikha(o|do)|demo|real data|mera data|my data|mere paas)\b/i;
const COMPARE = /\b(vs\.?|versus|compare|difference|antar|farq|fark|behtar|better|kaunsa|which one|ya .* ya)\b/i;
const DEBUG = /(#(n\/a|value!?|ref!?|div\/0|name\?|num!?|null!?|spill!?|calc!?|connect!?|blocked!?))|\b(error|galat|wrong|not working|kaam nahi|nahi chal|fail ho|aa raha|aata hai|problem|issue|fix|theek)\b/i;
const VALUE = /\b(kitna aayega|kya aayega|result kya|answer kya|output|kya dega|kitna dega|kya hoga)\b/i;
const PRACTICE = /\b(quiz|test|practice|abhyas|sawal poochh|question|task|homework|assignment)\b/i;
const ROLEPLAY = /\b(roleplay|role play|interview|mock|hr round|office role)\b/i;
const NEXT = /\b(aur|more|continue|aage|next|phir|iska|iske baad|detail|deep|zyada)\b/i;
const OFFTOPIC = /\b(movie|movie|song|gaana|weather|mausam|cricket|politic|recipe|love|crush|girlfriend|boyfriend|flirt|romantic)\b|\b(selfie|photo|pic|image|tasveer)\b/i;

/** Read the ordered set of intents from one message. */
export function readIntents(text: string): Intent[] {
  const t = text.trim();
  if (!t) return ["greet"];
  const out: Intent[] = [];
  const push = (i: Intent) => {
    if (!out.includes(i)) out.push(i);
  };

  if (OFFTOPIC.test(t)) push("offtopic");
  if (ROLEPLAY.test(t)) push("roleplay");
  if (DEBUG.test(t)) push("debug");
  if (COMPARE.test(t)) push("compare");
  if (VALUE.test(t)) push("value");
  if (EXAMPLE.test(t)) push("example");
  if (HOWTO.test(t)) push("howto");
  if (PRACTICE.test(t)) push("practice");
  if (DEFINE.test(t)) push("define");
  if (NEXT.test(t)) push("next");

  // A bare greeting ("hi", "hello aarohi") is only that.
  if (!out.length && GREET.test(t) && t.split(/\s+/).length <= 4) push("greet");
  if (!out.length) push("define");
  return out;
}

/** True when the message is only a follow-up, e.g. "aur samjhao", "in English". */
export function isShortFollowUp(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length <= 5 && !/=/.test(text) && !/[A-Z]{3,}\(/.test(text);
}

/** The language the student wants this answer in. */
export function readLanguage(text: string, fallback: "both" | "hi" | "en"): "both" | "hi" | "en" {
  const t = text.toLowerCase();
  if (/\b(english|in english|angrezi)\b/.test(t)) return "en";
  if (/\b(hindi|hinglish|hindi me|hindi mein)\b/.test(t)) return "hi";
  return fallback;
}
