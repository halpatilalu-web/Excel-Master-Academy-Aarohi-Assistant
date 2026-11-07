// @vitest-environment node
/**
 * @license MIT
 * The Review / Page Layout / Formulas tools must be correct: auditing has to
 * find the same precedents Excel shows, spell check must not flag the course's
 * own vocabulary, and print settings must produce valid CSS.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRINT,
  areaLabel,
  dependentsOf,
  formulasMentioning,
  isKnownWord,
  pageCss,
  precedentsOf,
  spellCheck,
} from "./workbookTools";

const sheet = {
  A1: "Item",
  B1: "Qty",
  C1: "Rate",
  D1: "Amount",
  D2: "=B2*C2",
  D3: "=B3*C3",
  D4: "=SUM(D2:D3)",
  E1: "Note",
  E2: "gst invoice for Ahmedabad",
  E3: "plese chek this",
};

describe("formula auditing", () => {
  it("finds the cells a formula reads, including ranges", () => {
    expect(precedentsOf("=B2*C2").map((ref) => ref.address)).toEqual(["B2", "C2"]);
    expect(precedentsOf("=SUM(D2:D3)").map((ref) => ref.address)).toEqual(["D2", "D3"]);
    expect(precedentsOf("=IF(B2>0,SUM(C2:C3),0)").map((ref) => ref.address)).toEqual(["B2", "C2", "C3"]);
    expect(precedentsOf("not a formula")).toEqual([]);
  });

  it("finds which formulas read a cell (trace dependents)", () => {
    expect(dependentsOf(sheet, "B2")).toEqual(["D2"]);
    expect(dependentsOf(sheet, "D2")).toEqual(["D4"]);
    // A cell that nothing reads has no dependents.
    expect(dependentsOf(sheet, "A1")).toEqual([]);
  });

  it("caps huge range expansion so the UI never freezes", () => {
    expect(precedentsOf("=SUM(A1:A100000)", 50)).toHaveLength(50);
  });
});

describe("spell check", () => {
  it("accepts the course's own vocabulary", () => {
    expect(isKnownWord("GST")).toBe(true);
    expect(isKnownWord("XLOOKUP")).toBe(true);
    expect(isKnownWord("Ahmedabad")).toBe(true);
    expect(isKnownWord("invoices")).toBe(true);
    expect(isKnownWord("Laptop")).toBe(true);
  });

  it("flags genuine typos and ignores formulas", () => {
    const issues = spellCheck(sheet);
    expect(issues.map((issue) => issue.word)).toContain("plese");
    expect(issues.map((issue) => issue.word)).toContain("chek");
    // "gst" / "invoice" / "Ahmedabad" must not be flagged.
    expect(issues.map((issue) => issue.word.toLowerCase())).not.toContain("gst");
    expect(issues.map((issue) => issue.address)).not.toContain("D2");
  });
});

describe("page layout", () => {
  it("labels the used range like Excel's print area", () => {
    expect(areaLabel({ firstRow: 0, lastRow: 36, firstCol: 0, lastCol: 5 })).toBe("A1:F37");
  });

  it("turns print setup into @page CSS", () => {
    const css = pageCss({ ...DEFAULT_PRINT, orientation: "landscape", paper: "A4", margins: "narrow" });
    expect(css).toContain("size: A4 landscape;");
    expect(css).toContain("margin: 1.3cm;");
    expect(css).toContain("@media print");
  });
});

describe("find in formulas", () => {
  it("lists the formulas that mention a token", () => {
    const hits = formulasMentioning(sheet, "SUM");
    expect(hits.map((hit) => hit.address)).toEqual(["D4"]);
    expect(formulasMentioning(sheet, "")).toEqual([]);
  });
});
