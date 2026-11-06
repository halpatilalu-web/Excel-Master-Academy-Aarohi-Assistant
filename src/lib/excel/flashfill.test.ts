import { describe, expect, it } from "vitest";
import { inferFlashFill } from "./flashfill";

const fill = (source: string[], examples: { row: number; value: string }[], second?: string[]) =>
  inferFlashFill(source, examples, second);

describe("Flash Fill", () => {
  it("extracts the first name from a full name", () => {
    const source = ["Aarav Sharma", "Diya Patel", "Kabir Singh"];
    const out = fill(source, [{ row: 0, value: "Aarav" }]);
    expect(out.values).toEqual({ 0: "Aarav", 1: "Diya", 2: "Kabir" });
    expect(out.explain).toContain("first word");
  });

  it("extracts the last name from two examples", () => {
    const source = ["Aarav Sharma", "Diya Patel", "Kabir Singh"];
    const out = fill(source, [
      { row: 0, value: "Sharma" },
      { row: 1, value: "Patel" },
    ]);
    expect(out.values[2]).toBe("Singh");
  });

  it("pulls the domain out of an e-mail column", () => {
    const source = ["ravi@rediffmail.com", "asha@gmail.com"];
    const out = fill(source, [
      { row: 0, value: "rediffmail.com" },
      { row: 1, value: "gmail.com" },
    ]);
    expect(out.values).toEqual({ 0: "rediffmail.com", 1: "gmail.com" });
  });

  it("upper-cases a GSTIN column and keeps the digits of a phone column", () => {
    const gst = fill(["27abcde1234f1z5"], [{ row: 0, value: "27ABCDE1234F1Z5" }]);
    expect(gst.values[0]).toBe("27ABCDE1234F1Z5");
    const phone = fill(["+91 98765-43210"], [{ row: 0, value: "919876543210" }]);
    expect(phone.values[0]).toBe("919876543210");
  });

  it("joins two source columns", () => {
    const first = ["Aarav", "Diya"];
    const last = ["Sharma", "Patel"];
    const out = fill(first, [{ row: 0, value: "Aarav Sharma" }], last);
    expect(out.values).toEqual({ 0: "Aarav Sharma", 1: "Diya Patel" });
  });

  it("says so instead of guessing when nothing matches", () => {
    const out = fill(["abc", "def"], [{ row: 0, value: "zzz" }]);
    expect(out.rule).toBeNull();
    expect(out.values).toEqual({});
    expect(out.explain).toMatch(/could not find/i);
  });

  it("skips blank source rows", () => {
    const out = fill(["Aarav Sharma", "", "Kabir Singh"], [{ row: 0, value: "Aarav" }]);
    expect(out.values[1]).toBeUndefined();
    expect(Object.keys(out.values)).toEqual(["0", "2"]);
  });
});
