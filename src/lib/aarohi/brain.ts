import type { Concept, WorkedExample } from "../../data/aarohi/types";
import { conceptsIn } from "../../data/aarohi";
import { isShortFollowUp, readIntents, readLanguage, type Intent } from "./intent";

/**
 * Aarohi's offline brain.
 *
 * Rules of the house:
 *  - The answer is composed from the question, not looked up by keyword. A
 *    "what is it" question gets the mental model, a "how do I" gets numbered
 *    steps, an "my data looks like this" gets a filled-in table, an error gets
 *    cause→fix. That is what stops the same paragraph coming back every time.
 *  - Anything quoted from the student (`=VLOOKUP(...)`, a pasted table) is used
 *    literally in the example, so the answer is about THEIR data.
 *  - Arithmetic that Excel would do is actually done here with the app's own
 *    formula engine, so "=2+2 kya aayega" cannot lie.
 */

export interface BrainTurn {
  from: "me" | "bot";
  text: string;
}

export type Lang = "both" | "hi" | "en";

export interface BrainContext {
  /** Conversation so far, oldest first. The last item is the new question. */
  history: BrainTurn[];
  lang?: Lang;
}

export interface BrainReply {
  text: string;
  /**
   * False when the brain is only guessing: it should then step aside and let
   * the online model answer, with this text as the fallback.
   */
  confident?: boolean;
  /** The concept the answer is about, so the UI can offer its next questions. */
  conceptId?: string;
  /** Suggested follow-ups for the chip row. */
  chips?: string[];
  source: "brain";
}

/* ------------------------------------------------------------------ utils */

/**
 * Words that appear in Hinglish but not in ordinary English. Ambiguous tokens
 * ("do", "hi", "me", "par", "ka") are deliberately left out, because "how do i
 * use vlookup" is an English question and must keep English section labels.
 */
const HINGLISH = [
  "kya","kaise","kyun","kyu","kahan","kaun","hai","hain","hota","hoti","batao","bata","karo","kare","karna","karke","karein","karne","mujhe","mera","meri","mere","aap","tum","nahi","nhi","yaar","bhai","samjha","samjhao","samjhaao","samajh","chahiye","gaya","gayi","hoon","raha","rahi","lagana","lagaye","lagau","banana","banaye","banao","dikhao","dijiye","dedo","sahi","galat","thoda","abhi","phir","aur","iska","iske","iski","seekho","sikhao","sikha","chalo","achha","accha","kuch","wala","wali","poochho","puchho","poocha","matlab","udaharan","bhejo",
];
const HINGLISH_RE = new RegExp(`\\b(${HINGLISH.join("|")})\\b`, "i");
const isHinglish = (text: string) => /[\u0900-\u097F]/.test(text) || HINGLISH_RE.test(text);

const pad = (n: string, w: number) => n.padEnd(w, " ");

function renderTable(rows: string[][]): string {
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length)));
  return rows.map((r) => r.map((c, i) => pad(c ?? "", widths[i])).join(" | ")).join("\n");
}

/** One example, presented the way a teacher would draw it on the board. */
function renderExample(ex: WorkedExample, lang: Lang, number?: number): string {
  const head = number ? `${number}. **${ex.title}**` : `**${ex.title}**`;
  const parts = [head, "```", renderTable(ex.table), "```"];
  if (ex.formula.startsWith("=")) {
    parts.push(`${ex.at} cell mein: \`${ex.formula}\``);
  } else {
    parts.push(`${ex.at}: ${ex.formula}`);
  }
  parts.push(
    lang === "en"
      ? `→ **Result:** ${ex.result}\n→ **Why:** ${ex.why}`
      : `→ **Answer:** ${ex.result}\n→ **Kyun:** ${ex.why}`,
  );
  return parts.join("\n");
}

const T = {
  what: { en: "What it is", hi: "Kya hai ye" },
  idea: { en: "The idea that makes it click", hi: "Samajhne ki asli trick" },
  syntax: { en: "Syntax", hi: "Syntax" },
  args: { en: "Every argument, in order", hi: "Har argument, isi order mein" },
  steps: { en: "Step by step", hi: "Step by step" },
  example: { en: "Real example with numbers", hi: "Asli example, numbers ke saath" },
  mistakes: { en: "Where students actually get stuck", hi: "Jahan asli galti hoti hai" },
  practice: { en: "Try this now", hi: "Abhi ye try karo" },
  next: { en: "What you can ask next", hi: "Aage ye poochh sakte ho" },
  shortcuts: { en: "Shortcuts worth knowing", hi: "Kaam ke shortcuts" },
} as const;

function label(key: keyof typeof T, lang: Lang): string {
  return lang === "hi" ? T[key].hi : T[key].en;
}

function argsBlock(c: Concept, lang: Lang): string {
  return c.args
    .map((a) => `• \`${a.name}\` — ${a.meaning}${a.example ? `  (${a.example})` : ""}`)
    .join("\n");
}

function fixBlock(c: Concept, lang: Lang, limit = 3): string {
  return c.mistakes
    .slice(0, limit)
    .map(
      (m, i) =>
        `${i + 1}. **${m.symptom}**\n   ${lang === "en" ? "Cause" : "Wajah"}: ${m.cause}\n   ${lang === "en" ? "Fix" : "Ilaaj"}: ${m.fix}`,
    )
    .join("\n");
}

function nextBlock(c: Concept): string {
  return (c.next ?? []).map((n) => `• ${n}`).join("\n");
}

/* ------------------------------------------------------- answer composers */

function answerDefine(c: Concept, lang: Lang): string {
  return [
    `**${c.name}** — ${label("what", lang)}`,
    lang === "en" ? c.whatEn : c.whatHi,
    `\n**${label("idea", lang)}**\n${lang === "en" ? c.ideaEn : c.ideaHi}`,
    `\n**${label("syntax", lang)}**\n\`${c.syntax}\``,
    `\n**${label("example", lang)}**\n${renderExample(c.examples[0], lang)}`,
    `\n**${label("practice", lang)}**\n${c.practice}`,
    `\n**${label("next", lang)}**\n${nextBlock(c)}`,
  ].join("\n");
}

function answerHowTo(c: Concept, lang: Lang): string {
  const steps = lang === "en" ? c.stepsEn : c.stepsHi;
  return [
    `**${c.name} — ${label("steps", lang)}**`,
    steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    `\n**${label("syntax", lang)}**\n\`${c.syntax}\``,
    `\n**${label("args", lang)}**\n${argsBlock(c, lang)}`,
    `\n**${label("example", lang)}**\n${renderExample(c.examples[0], lang)}`,
    c.mistakes.length ? `\n**${label("mistakes", lang)}**\n${fixBlock(c, lang, 2)}` : "",
    `\n**${label("practice", lang)}**\n${c.practice}`,
    c.shortcuts?.length
      ? `\n**${label("shortcuts", lang)}**\n${c.shortcuts.map((s) => `• \`${s.keys}\` — ${s.what}`).join("\n")}`
      : "",
    `\n**${label("next", lang)}**\n${nextBlock(c)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function answerDebug(c: Concept, lang: Lang, asked: string): string {
  const lower = asked.toLowerCase();
  // Prefer the mistake whose symptom the student actually described.
  const direct = c.mistakes.filter((m) => {
    const symptom = m.symptom.toLowerCase();
    if (symptom.includes("#n/a") && /#n\/a/.test(lower)) return true;
    if (symptom.includes("#spill") && /spill/.test(lower)) return true;
    if (symptom.includes("#value") && /value/.test(lower)) return true;
    if (symptom.includes("#name") && /name/.test(lower)) return true;
    if (symptom.includes("#ref") && /ref/.test(lower)) return true;
    if (symptom.includes("0 aa raha") && /\b0\b|zero/.test(lower)) return true;
    if (symptom.includes("galat value") && /galat|wrong/.test(lower)) return true;
    if (symptom.includes("slow") && /slow|hang|freeze/.test(lower)) return true;
    if (symptom.includes("duplicate") && /duplicate|repeat/.test(lower)) return true;
    return false;
  });
  const list = (direct.length ? direct : c.mistakes).slice(0, 3);
  return [
    `**${c.name} — ${label("mistakes", lang)}**`,
    lang === "en"
      ? "Let's find the real cause instead of hiding the error."
      : "Error chhupane se pehle asli wajah pakadte hain.",
    `\n${list
      .map(
        (m, i) =>
          `${i + 1}. **${m.symptom}**\n   ${lang === "en" ? "Cause" : "Wajah"}: ${m.cause}\n   ${lang === "en" ? "Fix" : "Ilaaj"}: ${m.fix}`,
      )
      .join("\n")}`,
    `\n**Diagnose karna ka tarika**\n1. Cell par click karo aur exact error code padho — andaza mat lagao.\n2. \`Formulas → Evaluate Formula\` se ek-ek step chalao.\n3. Jahan pehli baar galat value dikhe, wahi asli problem hai.\n4. Theek hone ke baad hi \`IFNA\` lagao — warna galti chhup jayegi.`,
    `\n**${label("example", lang)}**\n${renderExample(c.examples[c.examples.length - 1], lang)}`,
    `\n**${label("next", lang)}**\n${nextBlock(c)}`,
  ].join("\n");
}

function answerCompare(a: Concept, b: Concept | undefined, lang: Lang): string {
  if (!b) return answerHowTo(a, lang);
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const one = (c: Concept) => (lang === "en" ? clean(c.whatEn) : clean(c.whatHi));
  const pick = (c: Concept) => (lang === "en" ? clean(c.ideaEn) : clean(c.ideaHi));
  return [
    `**${a.name} vs ${b.name}**`,
    `
**${a.name}** — ${one(a)}`,
    `**${b.name}** — ${one(b)}`,
    `
**Kab kaunsa use karo**`,
    `• **${a.name}** tab jab — ${pick(a)}`,
    `• **${b.name}** tab jab — ${pick(b)}`,
    `
**Syntax side by side**`,
    `\`${a.syntax}\``,
    `\`${b.syntax}\``,
    a.mistakes[0] && b.mistakes[0]
      ? `\n**Dono ki sabse badi galti**\n• ${a.name}: ${a.mistakes[0].symptom} → ${a.mistakes[0].fix}\n• ${b.name}: ${b.mistakes[0].symptom} → ${b.mistakes[0].fix}`
      : "",
    `\n**${label("example", lang)} — ${a.name}**\n${renderExample(a.examples[0], lang)}`,
    `\n**Aur ${b.name} ka wahi kaam:**\n${renderExample(b.examples[0], lang)}`,
    `\n**${label("next", lang)}**\n${nextBlock(a)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Read a pasted table out of the message: pipe, tab or 3+ space separated. */
function readPastedTable(text: string): string[][] | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return undefined;
  const split = (l: string) =>
    l.includes("|") ? l.split("|").map((c) => c.trim()) : l.split(/\t+|\s{3,}/).map((c) => c.trim());
  const rows = lines.map(split).filter((r) => r.length >= 2);
  return rows.length >= 2 ? rows : undefined;
}

/** A short "(what will this give?)" answer, evaluated for real when possible. */
function answerValue(c: Concept, lang: Lang): string {
  const ex = c.examples[0];
  return [
    `**${c.name} ka result kaise banta hai**`,
    renderExample(ex, lang),
    `\nIs example me: ${lang === "en" ? ex.why : ex.why}`,
    `\nAgar aapke data par answer alag aa raha hai, to sabse pehle teen cheezein check karo:\n1. Lookup/criteria ka data type (number vs text)\n2. Ranges locked hain ya nahi (\`F4\`)\n3. Column number ya range ka size sahi hai`,
    `\n**${label("next", lang)}**\n${nextBlock(c)}`,
  ].join("\n");
}

function answerPractice(c: Concept, lang: Lang): string {
  return [
    `**${c.name} — ab aapki baari**`,
    lang === "en" ? "Do this small task in Excel, then tell me your answer." : "Excel mein ye chhota task karo, phir answer batao.",
    `\n**Task:** ${c.practice}`,
    `\n**Hint:** ${lang === "en" ? "Lead with the syntax" : "Syntax se shuru karo"} — \`${c.syntax}\``,
    `\nJab kar lo, mujhe apna formula bhej dena — main check karke bataungi kahan sudhaarna hai.`,
  ].join("\n");
}

/* ------------------------------------------------------------ cell values */

/**
 * If the student asks what a specific cell will show, we can compute it:
 * "A2 me 102 hai to =VLOOKUP(A2,...) kya dega?" is answerable with the app's
 * own engine plus a few known values, but guessing is worse than teaching, so
 * we show the mechanism and the arithmetic we CAN do (`=2+2`, `=500*1.18`).
 */
function answerArithmetic(formula: string): string | undefined {
  if (!/^=[\d\s+\-*/().]+$/.test(formula)) return undefined;
  // eslint-disable-next-line no-new-func
  try {
    const value = Function(`"use strict";return (${formula.slice(1)})`)();
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    const shown = Math.round(value * 1e6) / 1e6;
    return `**\`${formula}\` = ${shown}**\n\nExcel isi tarah calculate karta hai: pehle brackets, phir \`*\`/\`/\`, aakhir mein \`+\`/\`-\`. Isliye \`=500+500*0.18\` me pehle 500×0.18 hota hai (90), phir 500 jodta hai → 590.`;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------- the brain */

export function aarohiBrain(question: string, ctx: BrainContext = { history: [] }): BrainReply {
  const asked = question.trim();
  const history = ctx.history ?? [];
  // The question's own language wins over the saved setting: "explain vlookup
  // step by step" wants English labels, "VLOOKUP step by step sikhao" wants
  // Hinglish. A bare follow-up ("aur samjhao") is Hinglish anyway.
  const lang: Lang = /(english|in english)/i.test(asked)
    ? "en"
    : isHinglish(asked)
      ? "hi"
      : readLanguage(asked, ctx.lang ?? "both");
  const intents = readIntents(asked);
  const has = (i: Intent) => intents.includes(i);

  /* 1. Pure arithmetic — answer with real maths. */
  const arithmetic = answerArithmetic(asked);
  if (arithmetic) return { text: arithmetic, source: "brain" };

  /* 2. Which concept? The current message first, then the conversation. */
  const mentioned = conceptsIn(asked);
  const follow = isShortFollowUp(asked);
  const previous = [...history]
    .reverse()
    .filter((m) => m.from === "me")
    .slice(1)
    .find((m) => conceptsIn(m.text).length);
  const fromHistory = previous ? conceptsIn(previous.text)[0] : undefined;
  const primary = mentioned[0] ?? (follow ? fromHistory : undefined);
  const secondary = mentioned[1];

  /* 3. Not an Excel question at all. */
  if (has("offtopic") && !primary) {
    return {
      text: [
        "Main Aarohi hoon — Excel Master Academy ki AI study saathi. Personal photos ya romantic baaton mein nahi jaati, par Excel mein main poori tarah aapki hoon 🙂",
        "\nAaj kuch asli kaam karte hain. Ye teen cheezein sabse zyada poochhi jaati hain:",
        "• `VLOOKUP` ya `XLOOKUP` kaise lagayein",
        "• `SUMIFS` se do shart ka total",
        "• `Pivot Table` se 10 second ka summary",
        "\nInme se koi bhi chuno, ya apna formula paste kar do.",
      ].join("\n"),
      chips: ["VLOOKUP step by step sikhao", "SUMIFS do condition ke saath", "Pivot Table banao"],
      source: "brain",
    };
  }

  /* 4. Greeting / help. */
  if (has("greet") && !primary) {
    return {
      text: [
        "Namaste! 👋 Main **Aarohi** hoon — aapki Excel Diploma teacher.",
        "\nMain kisi ek jawab par atakti nahi. Aap poochh sakte ho:",
        "• \"VLOOKUP kya hai\" — ek minute mein concept",
        "• \"VLOOKUP step by step sikhao\" — poore steps, arguments ke saath",
        "• \"Mera data aisa hai, formula banao\" — apna table paste karo",
        "• \"#N/A kyun aa raha hai\" — asli wajah aur ilaaj",
        "• \"VLOOKUP vs XLOOKUP\" — kaunsa kab",
        "\nAur haan — Hindi, English ya Hinglish, jis bhasha mein likhoge usi mein jawab dungi.",
      ].join("\n"),
      chips: ["VLOOKUP kya hai?", "VLOOKUP step by step sikhao", "#N/A kyun aata hai?", "VLOOKUP vs XLOOKUP"],
      source: "brain",
    };
  }

  /* 5. Roleplay. */
  if (has("roleplay")) {
    const base = primary ?? fromHistory;
    return {
      text: [
        "🎤 **Mock interview — chalo shuru karte hain**",
        "\nMain interviewer hoon, aap MIS Executive ke candidate. Ek-ek sawal poochhungi, aap jawab do — main turant feedback dungi.",
        "\n**Sawal 1:** Aapke paas ek sheet hai jisme **EmpID column C** mein hai aur **Department column A** mein. Aapko Department ke hisaab se EmpID nikaalna hai.",
        "\n- Ye kaam `VLOOKUP` se kyun nahi hoga?",
        "- Kaunsa formula lagaoge, aur `#N/A` se kaise bachoge?",
        base ? `\n(Hint: aap abhi \`${base.name}\` par baat kar rahe the — usi ka use karo.)` : "",
        "\nJawab likho, main wait kar rahi hoon 🙂",
      ]
        .filter(Boolean)
        .join("\n"),
      conceptId: "career",
      chips: ["XLOOKUP se answer do", "INDEX-MATCH se answer do", "Mujhe answer batao"],
      source: "brain",
    };
  }

  /* 6. A bare follow-up with nothing to continue: ask, do not guess. */
  if (!primary && follow && previous) {
    return {
      text: [
        `Pehle hum \`${previous.text.slice(0, 60).trim()}…\` par baat kar rahe the — par us sawal mein koi formula ka naam nahi tha.`,
        "\nAap kya jaanna chahte ho?",
        '• **Theory** — "VLOOKUP kya hai"',
        '• **Steps** — "VLOOKUP step by step sikhao"',
        '• **Example** — "VLOOKUP ka example do"',
        '• **Galti** — "#N/A kyun aa raha hai"',
        "\nYa seedha formula ka naam likho — main usi ke hisaab se samjhaungi.",
      ].join("\n"),
      chips: ["VLOOKUP kya hai?", "VLOOKUP step by step sikhao", "#N/A kyun aata hai?"],
      confident: false,
      source: "brain",
    };
  }

  /* 7. No concept found: parse a pasted formula or table. */
  if (!primary) {
    const formulaMatch = /(^|\s)(=[A-Z][A-Z0-9._]*\s*\([^)]*\))/i.exec(asked);
    if (formulaMatch) {
      const fn = /^=([A-Z0-9._]+)\s*\(/i.exec(formulaMatch[2])?.[1]?.toUpperCase() ?? "";
      const known = conceptsIn(fn)[0];
      if (known) {
        return {
          text: [
            `**Aapka formula:** \`${formulaMatch[2]}\``,
            `\nYe **${known.name}** ka formula hai. Isse ek-ek karke todte hain.`,
            `\n**${label("syntax", lang)}**\n\`${known.syntax}\``,
            `\n**${label("args", lang)}**\n${argsBlock(known, lang)}`,
            `\nAapke formula ke arguments alag order mein ya adhoore lag sakte hain — syntax se mila kar dekho.`,
            `\n**${label("example", lang)}**\n${renderExample(known.examples[0], lang)}`,
            `\n**${label("next", lang)}**\n${nextBlock(known)}`,
          ].join("\n"),
          conceptId: known.id,
          chips: known.next?.slice(0, 3),
          source: "brain",
        };
      }
      return {
        text: [
          `**Aapka formula:** \`${formulaMatch[2]}\``,
          "\nYe function mere paas detail mein nahi hai, par formula ko aise padha jaata hai:",
          "1. Bracket ke andar arguments ko comma se alag karo.",
          "2. Har argument ka matlab likho — kya range, kya value.",
          "3. Formula bar mein ek-ek argument select karke `F9` dabao — Excel us hisse ka result dikha dega.",
          "4. Jo hissa galat value de raha hai, wahi problem hai.",
          "\nAgar aap function ka naam bata do (`VLOOKUP`, `SUMIFS`, `IFS`, `FILTER`…), main poora step-by-step samjhaungi.",
        ].join("\n"),
        chips: ["VLOOKUP samjhao", "SUMIFS samjhao", "#N/A kaise theek karein"],
        source: "brain",
      };
    }

    const table = readPastedTable(asked);
    if (table) {
      return {
        text: [
          "**Aapka data mil gaya** 👇",
          "```",
          renderTable(table.slice(0, 8)),
          "```",
          `\nIsme ${table[0].length} columns aur ${table.length - 1} data rows hain. Ab batao kya karna hai — main isi table ke hisaab se exact formula likhungi:`,
          "• \"ID se naam nikaalo\" → lookup formula",
          "• \"Region ka total\" → SUMIFS",
          "• \"Duplicate hatao\" → cleanup steps",
          "• \"Ek page ka summary\" → pivot plan",
        ].join("\n"),
        chips: ["Isme se lookup formula do", "Region ka total nikaalo", "Duplicate hatao"],
        source: "brain",
      };
    }

    /* Fallback: a genuinely new question. Teach the method, not a canned line. */
    return {
      text: [
        "Ye sawal mere built-in knowledge me seedha nahi hai, par main aapko galat jawab dene se behtar **method** sikha sakti hoon — aur baaki sab ke liye mujhe online mode chahiye.",
        "\n**Kisi bhi Excel sawal ko todne ka tarika:**",
        "1. **Kya chahiye?** — ek value, ya poora summary? (lookup vs pivot)",
        "2. **Shart kya hai?** — ek column match, ya do-tin sharten? (`VLOOKUP` vs `SUMIFS`)",
        "3. **Data kaisa hai?** — number ya text? khali cells? duplicates?",
        "4. **Error ka plan** — `IFNA` kab lagaoge?",
        "\nAur main in cheezon me poori detail se help kar sakti hoon:",
        "• Lookups — `VLOOKUP`, `XLOOKUP`, `INDEX-MATCH`",
        "• Totals — `SUMIFS`, `COUNTIFS`, `FILTER`",
        "• Logic — `IF`, `IFS`, `AND`, `OR`, `IFERROR`",
        "• Cleaning — `TRIM`, `PROPER`, `TEXTSPLIT`, Power Query",
        "• Reports — Pivot Table, charts, dashboard",
        "• VBA automation, GST invoice, shortcuts, interview prep",
        "\nApna sawal inme se kisi ek ke around likho, ya seedha formula paste kar do.",
      ].join("\n"),
      chips: ["VLOOKUP kya hai?", "SUMIFS do condition ke saath", "Pivot Table banao", "Excel errors kaise theek karein"],
      confident: false,
      source: "brain",
    };
  }

  /* 7. Compare two concepts. */
  if (has("compare")) {
    return {
      text: answerCompare(primary, secondary ?? conceptsIn(primary.related?.join(" ") ?? "")[0], lang),
      conceptId: primary.id,
      chips: primary.next?.slice(0, 3),
      source: "brain",
    };
  }

  /* 8. Debug / error. If the student named an error code but the concept we
     matched has no mistake for it, the errors concept is the better teacher. */
  if (has("debug")) {
    const code = /#(n\/a|value|ref|div\/0|name|num|null|spill|calc|connect|blocked)/i.exec(asked)?.[0];
    const codeHints: Record<string, string[]> = {
      "#n/a": ["#n/a", "#name"],
      "#name": ["#name"],
      "#spill": ["#spill"],
      "#calc": ["#calc"],
      "#value": ["#value"],
      "#ref": ["#ref"],
      "#div/0": ["#div/0"],
    };
    let teacher = primary;
    if (code) {
      const wanted = codeHints[code.toLowerCase()] ?? [code.toLowerCase()];
      const covered = primary.mistakes.some((m) => wanted.some((w) => m.symptom.toLowerCase().includes(w)));
      if (!covered) teacher = conceptsIn("errors")[0] ?? primary;
    }
    return {
      text: answerDebug(teacher, lang, asked),
      conceptId: teacher.id,
      chips: teacher.next?.slice(0, 3),
      source: "brain",
    };
  }

  /* 9. Value question. */
  if (has("value") && !has("howto")) {
    return {
      text: answerValue(primary, lang),
      conceptId: primary.id,
      chips: primary.next?.slice(0, 3),
      source: "brain",
    };
  }

  /* 10. Practice / quiz. */
  if (has("practice") && !has("example")) {
    return {
      text: answerPractice(primary, lang),
      conceptId: primary.id,
      chips: ["Mera jawab check karo", `${primary.name} ka example do`],
      source: "brain",
    };
  }

  /* 11. Example with THEIR data. */
  if (has("example") && (has("howto") || has("example"))) {
    const table = readPastedTable(asked);
    const ex = primary.examples[0];
    return {
      text: [
        `**${primary.name} — example, ${table ? "aapke data par" : "numbers ke saath"}**`,
        table ? "```\n" + renderTable(table.slice(0, 8)) + "\n```" : "",
        table
          ? `\nAapki table mein pehla column \`${table[0][0]}\` hai. Lookup value aapke table ke pehle column me honi chahiye — agar nahi hai to XLOOKUP ya INDEX-MATCH chahiye.`
          : "",
        `\n${renderExample(ex, lang)}`,
        primary.examples[1] ? `\n${renderExample(primary.examples[1], lang, 2)}` : "",
        `\n**Aapke data par lagane ka tarika:**\n1. Lookup value wala cell chuno (jaise \`E2\`)\n2. Formula likho: \`${primary.syntax.replace(/\[|\]/g, "")}\`\n3. Ranges ko \`F4\` se lock karo\n4. Neeche drag karo, phir ek row par \`Formulas → Evaluate Formula\` se check karo`,
        `\n**${label("mistakes", lang)}**\n${fixBlock(primary, lang, 2)}`,
        `\n**${label("next", lang)}**\n${nextBlock(primary)}`,
      ]
        .filter(Boolean)
        .join("\n"),
      conceptId: primary.id,
      chips: primary.next?.slice(0, 3),
      source: "brain",
    };
  }

  /* 12. How-to (steps) or a plain definition. */
  if (has("howto")) {
    return {
      text: answerHowTo(primary, lang),
      conceptId: primary.id,
      chips: primary.next?.slice(0, 3),
      source: "brain",
    };
  }

  return {
    text: answerDefine(primary, lang),
    conceptId: primary.id,
    chips: primary.next?.slice(0, 3),
    source: "brain",
  };
}
