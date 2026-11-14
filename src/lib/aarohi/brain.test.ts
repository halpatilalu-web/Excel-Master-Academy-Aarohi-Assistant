import { describe, expect, it } from "vitest";
import { aarohiBrain } from "./brain";
import { readIntents, isShortFollowUp, readLanguage } from "./intent";
import { CONCEPTS, conceptById, conceptsIn, findConcept } from "../../data/aarohi";
import { aarohiReply, SUGGESTIONS } from "../../data/tutor";
import { readIntents as intents } from "./intent";

const history = (...texts: string[]) =>
  texts.map((text, i) => ({ from: i % 2 === 0 ? ("me" as const) : ("bot" as const), text }));

describe("Aaronhi's knowledge base", () => {
  it("has no duplicate concept ids", () => {
    const ids = CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every concept is complete enough to teach from", () => {
    for (const c of CONCEPTS) {
      expect(c.whatEn.length, `${c.id} whatEn`).toBeGreaterThan(20);
      expect(c.whatHi.length, `${c.id} whatHi`).toBeGreaterThan(20);
      expect(c.syntax.length, `${c.id} syntax`).toBeGreaterThan(2);
      expect(c.args.length, `${c.id} args`).toBeGreaterThan(0);
      expect(c.stepsEn.length, `${c.id} stepsEn`).toBeGreaterThanOrEqual(3);
      expect(c.stepsHi.length, `${c.id} stepsHi`).toBeGreaterThanOrEqual(3);
      expect(c.examples.length, `${c.id} examples`).toBeGreaterThan(0);
      expect(c.mistakes.length, `${c.id} mistakes`).toBeGreaterThan(0);
      expect(c.practice.length, `${c.id} practice`).toBeGreaterThan(20);
    }
  });

  it("every worked example has a table, a real formula and a result", () => {
    for (const c of CONCEPTS) {
      for (const ex of c.examples) {
        expect(ex.table.length, `${c.id} table`).toBeGreaterThanOrEqual(2);
        expect(ex.formula.length, `${c.id} formula`).toBeGreaterThan(4);
        expect(ex.result.length, `${c.id} result`).toBeGreaterThan(0);
        expect(ex.why.length, `${c.id} why`).toBeGreaterThan(10);
      }
    }
  });

  it("resolves concepts by id and rejects unknown ones", () => {
    expect(conceptById("vlookup")?.name).toBe("VLOOKUP");
    expect(conceptById("nope")).toBeUndefined();
  });
});

describe("finding the topic", () => {
  it("matches the longest key first", () => {
    expect(findConcept("xlookup kaise lagayein")?.id).toBe("xlookup");
    expect(findConcept("index match samjhao")?.id).toBe("index-match");
    expect(findConcept("vlookup vs xlookup")?.id).toBe("vlookup");
  });

  it("finds two concepts when both are named", () => {
    const ids = conceptsIn("vlookup aur xlookup me farq").map((c) => c.id);
    expect(ids.slice(0, 2).sort()).toEqual(["vlookup", "xlookup"]);
  });

  it("does not fire 'if' inside an unrelated word", () => {
    // "verify" contains "if" — the old keyword matcher matched it.
    expect(findConcept("verify kar raha hoon")?.id).not.toBe("if-ifs");
  });
});

describe("reading the question", () => {
  it("reads the intent that matters first", () => {
    expect(readIntents("vlookup kya hai")).toContain("define");
    expect(readIntents("vlookup step by step sikhao")).toContain("howto");
    expect(readIntents("vlookup vs xlookup")).toContain("compare");
    expect(readIntents("#n/a kyun aa raha hai")).toContain("debug");
    expect(readIntents("quiz lo")).toContain("practice");
  });

  it("knows a bare follow-up from a new question", () => {
    expect(isShortFollowUp("aur samjhao")).toBe(true);
    expect(isShortFollowUp("in english")).toBe(true);
    expect(isShortFollowUp("vlookup ka poora step by step example do")).toBe(false);
  });

  it("detects the language the student typed in", () => {
    expect(readLanguage("explain vlookup", "both")).toBe("both");
    expect(readLanguage("vlookup hindi mein batao", "both")).toBe("hi");
    expect(readLanguage("explain in english", "hi")).toBe("en");
  });
});

describe("answers change with the question", () => {
  const cases: [string, string][] = [
    ["VLOOKUP kya hai", "vlookup"],
    ["VLOOKUP step by step sikhao", "vlookup"],
    ["#N/A kyun aa raha hai", "errors"], ["VLOOKUP me #N/A kyun aa raha hai", "vlookup"],
    ["VLOOKUP ka example do", "vlookup"],
    ["SUMIFS 0 kyun de raha hai", "sumifs"],
    ["pivot table banao", "pivot"],
    ["GST CGST kaise nikaalein", "gst"],
  ];

  it("routes every question to the right topic", () => {
    for (const [question, id] of cases) {
      expect(aarohiBrain(question).conceptId, question).toBe(id);
    }
  });

  it("gives a different answer for the same formula asked four ways", () => {
    const define = aarohiBrain("VLOOKUP kya hai").text;
    const howto = aarohiBrain("VLOOKUP step by step sikhao").text;
    const debug = aarohiBrain("#N/A kyun aa raha hai VLOOKUP me").text;
    const example = aarohiBrain("VLOOKUP ka example do").text;
    const all = [define, howto, debug, example];
    expect(new Set(all).size).toBe(4);
    // The step-by-step answer is the one with numbered steps.
    expect(howto).toMatch(/1\. .+\n2\. /);
    // The error answer talks about the cause, not the definition.
    expect(debug.toLowerCase()).toContain("wajah");
  });

  it("continues a follow-up instead of starting over", () => {
    const reply = aarohiBrain("aur samjhao", { history: history("VLOOKUP samjhao", "…", "aur samjhao") });
    expect(reply.text).toContain("VLOOKUP");
    // A follow-up on a fresh conversation must ask, not invent a topic.
    expect(aarohiBrain("aur samjhao").conceptId).toBeUndefined();
  });

  it("answers arithmetic for real", () => {
    expect(aarohiBrain("=500+500*0.18").text).toContain("590");
    expect(aarohiBrain("=100*1.18").text).toContain("118");
  });

  it("reads a pasted table and offers to work on it", () => {
    const reply = aarohiBrain("mera data aisa hai:\nName | Sales\nAmit | 500\nPriya | 700");
    expect(reply.text).toContain("Name");
    expect(reply.text).toContain("Sales");
    expect(reply.text).toContain("2 columns");
  });

  it("mentions the student's own column names in the example", () => {
    const reply = aarohiBrain("vlookup ka example do\nName | Sales\nAmit | 500");
    expect(reply.text).toContain("Name");
  });

  it("declines personal photos and off-topic questions, then offers Excel", () => {
    const photo = aarohiBrain("tumhari photo bhejo").text;
    expect(photo.toLowerCase()).toContain("excel");
    expect(photo).not.toMatch(/girlfriend/i);
    const cricket = aarohiBrain("cricket score batao").text;
    expect(cricket.toLowerCase()).toContain("excel");
  });

  it("honestly says when it does not know, and marks itself unsure", () => {
    const reply = aarohiBrain("quantum physics ke Frenet-Serret equations samjhao");
    expect(reply.confident).toBe(false);
    expect(reply.text.toLowerCase()).toMatch(/method|built-in|nahi/);
  });

  it("flags an unknown function instead of inventing behaviour", () => {
    const reply = aarohiBrain("=ZZZUNKNOWN(1,2) kya karta hai");
    expect(reply.text).toContain("ZZZUNKNOWN");
    expect(reply.text).not.toMatch(/finds the FIRST column/i);
  });
});

describe("answer quality", () => {
  it("always includes a formula, an example and a next step", () => {
    // "Excel Career / Interview" is taught through roleplay on purpose, so it is
    // asserted separately below.
    for (const c of CONCEPTS.filter((x) => x.topic !== "career")) {
      const reply = aarohiBrain(`${c.name} shuru se samjhao`);
      expect(reply.text.length, c.id).toBeGreaterThan(200);
      expect(reply.text, c.id).toMatch(/`=|=|→/);
      // A worked example is always drawn as a small sheet, and the answer says why.
      expect(reply.text, c.id).toContain("```");
      expect(reply.text, c.id).toMatch(/→ \*\*(Answer|Result)/);
    }
  });

  it("turns an interview request into a real mock interview", () => {
    const reply = aarohiBrain("interview roleplay karo");
    expect(reply.conceptId).toBe("career");
    expect(reply.text).toContain("Sawal 1");
    expect(reply.text).toMatch(/VLOOKUP|XLOOKUP/);
  });

  it("never returns the same paragraph to two different questions", () => {
    const questions = [
      "vlookup kya hai",
      "vlookup kaise lagayein",
      "vlookup me error",
      "vlookup example",
      "vlookup vs xlookup",
      "vlookup practice task do",
    ];
    const answers = questions.map((q) => aarohiBrain(q).text);
    expect(new Set(answers).size).toBe(questions.length);
  });

  it("answers in English when asked in English", () => {
    const reply = aarohiBrain("what is vlookup");
    expect(reply.text).toContain("What it is");
  });

  it("answers in Hinglish when asked in Hinglish", () => {
    const reply = aarohiBrain("vlookup kya hai batao");
    expect(reply.text).toContain("Kya hai ye");
  });
});

describe("the offline tutor entry point still works", () => {
  it("answers every advertised suggestion", () => {
    for (const suggestion of SUGGESTIONS) {
      const reply = aarohiReply(suggestion);
      expect(reply.length, suggestion).toBeGreaterThan(60);
    }
  });

  it("hands a follow-up the real conversation for context", () => {
    const reply = aarohiReply("aur samjhao", ["xlookup samjhao", "…", "aur samjhao"], history("xlookup samjhao", "…", "aur samjhao"));
    expect(reply).toContain("XLOOKUP");
  });
});
