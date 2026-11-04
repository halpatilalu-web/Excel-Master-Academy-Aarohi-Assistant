import { describe, expect, it } from "vitest";
import { bestScore, certFormatValid, certId, latestCert, type Cert, type ExamResult } from "./academy";
import { aarohiReply, SUGGESTIONS } from "../data/tutor";

describe("certificate ids", () => {
  it("builds an id in the documented format", () => {
    const id = certId("Ravi Kumar", "2026-03-14");
    expect(id).toMatch(/^EMA-2026-[0-9A-F]{8}-\d{2}$/);
    expect(certFormatValid(id)).toBe(true);
  });

  it("is stable for the same name and date, and different otherwise", () => {
    expect(certId("Ravi Kumar", "2026-03-14")).toBe(certId("Ravi Kumar", "2026-03-14"));
    expect(certId("Ravi Kumar", "2026-03-14")).not.toBe(certId("Ravi Kumari", "2026-03-14"));
  });

  it("rejects malformed and tampered ids", () => {
    expect(certFormatValid("")).toBe(false);
    expect(certFormatValid("EMA-2026-XXXXXXXX-00")).toBe(false);
    expect(certFormatValid("not-a-certificate")).toBe(false);

    const valid = certId("Test Student", "2026-01-01");
    const [, year, body, check] = valid.split("-");
    const tampered = `EMA-${year}-${body}-${String((Number(check) + 1) % 100).padStart(2, "0")}`;
    expect(certFormatValid(tampered)).toBe(false);
  });

  it("accepts lower case input", () => {
    expect(certFormatValid(certId("Lower Case", "2026-05-05").toLowerCase())).toBe(true);
  });

  it("picks the newest certificate by issue date, not by last write", () => {
    const certs: Cert[] = [
      { id: "b", certId: certId("A", "2026-06-01"), name: "A", date: "2026-06-01", _updated: 1 },
      { id: "a", certId: certId("B", "2025-12-31"), name: "B", date: "2025-12-31", _updated: 99 },
    ];
    expect(latestCert(certs)?.id).toBe("b");
    expect(latestCert([])).toBeUndefined();
  });
});

describe("exam summaries", () => {
  const attempt = (pct: number): ExamResult => ({
    id: String(pct),
    score: pct / 5,
    total: 20,
    pct,
    passed: pct >= 60,
    date: "2026-01-01T00:00:00.000Z",
    seconds: 60,
    byLevel: {},
  });

  it("reports the best score, and 0 when nothing was attempted", () => {
    expect(bestScore([])).toBe(0);
    expect(bestScore([attempt(40), attempt(85), attempt(60)])).toBe(85);
  });
});

describe("offline tutor", () => {
  it("answers the suggestions it advertises", () => {
    for (const suggestion of SUGGESTIONS) {
      const reply = aarohiReply(suggestion);
      expect(reply.length, suggestion).toBeGreaterThan(40);
      expect(reply).not.toContain("pakad nahi paayi");
    }
  });

  it("recognises common errors and functions", () => {
    expect(aarohiReply("#N/A kyun aata hai")).toContain("#N/A");
    expect(aarohiReply("VLOOKUP kaise lagayein")).toContain("VLOOKUP");
    expect(aarohiReply("pivot table banao")).toContain("Pivot");
  });

  it("routes unknown questions to a chapter or a helpful fallback", () => {
    const reply = aarohiReply("conditional formatting ke bare mein batao");
    expect(reply.length).toBeGreaterThan(20);
  });

  it("declines romantic roleplay and selfie requests", () => {
    expect(aarohiReply("tumhari photo bhejo")).toContain("avatar");
  });
});
