// @vitest-environment node
/**
 * @license MIT
 * Rules that students rely on: filters must hide the right rows, validation
 * must reject the same values Excel rejects, conditional formatting must colour
 * by the same maths, and names must expand without touching function names.
 */
import { describe, expect, it } from "vitest";
import {
  cfStyleFor,
  colourScaleFor,
  expandNamedRanges,
  filterMatches,
  hiddenRows,
  numericStats,
  rangeBounds,
  ruleFor,
  ruleMatches,
  validateCell,
  type CfRule,
  type SheetFilter,
  type ValidationRule,
} from "./sheetTools";

const cells = {
  A1: "Item",
  B1: "Qty",
  C1: "City",
  A2: "Laptop",
  B2: "2",
  C2: "Surat",
  A3: "Mouse",
  B3: "10",
  C3: "Pune",
  A4: "Cable",
  B4: "25",
  C4: "Surat",
};

describe("ranges", () => {
  it("reads A1 ranges", () => {
    expect(rangeBounds("B2:D30")).toEqual({ firstRow: 1, lastRow: 29, firstCol: 1, lastCol: 3 });
    expect(rangeBounds("B2")).toEqual({ firstRow: 1, lastRow: 1, firstCol: 1, lastCol: 1 });
    expect(rangeBounds("nonsense")).toBeNull();
  });
});

describe("filters", () => {
  const textAt = (row: number, col: number) => {
    const letter = String.fromCharCode(65 + col);
    return cells[`${letter}${row + 1}` as keyof typeof cells] ?? "";
  };
  const filter: SheetFilter = { filters: [], headerRow: 0, firstRow: 0, lastRow: 3, firstCol: 0, lastCol: 2 };

  it("matches numbers and text the way Excel's AutoFilter does", () => {
    expect(filterMatches("10", { column: 1, op: "gt", value: "5" })).toBe(true);
    expect(filterMatches("2", { column: 1, op: "gt", value: "5" })).toBe(false);
    expect(filterMatches("Surat", { column: 2, op: "contains", value: "sur" })).toBe(true);
    expect(filterMatches("Surat", { column: 2, op: "neq", value: "Pune" })).toBe(true);
    expect(filterMatches("", { column: 2, op: "blank", value: "" })).toBe(true);
  });

  it("hides exactly the rows that fail a condition", () => {
    const hidden = hiddenRows({ ...filter, filters: [{ column: 2, op: "eq", value: "Surat" }] }, textAt);
    expect([...hidden]).toEqual([2]); // row index 2 = sheet row 3 (Pune)
  });

  it("ANDs two conditions, like Excel", () => {
    const hidden = hiddenRows(
      { ...filter, filters: [{ column: 2, op: "eq", value: "Surat" }, { column: 1, op: "gt", value: "5" }] },
      textAt,
    );
    expect([...hidden]).toEqual([1, 2]);
  });
});

describe("data validation", () => {
  const listRule: ValidationRule = { id: "1", range: "C2:C9", type: "list", items: ["Surat", "Pune", "Mumbai"] };
  const wholeRule: ValidationRule = { id: "2", range: "B2:B9", type: "whole", op: "between", min: "1", max: "100" };
  const textRule: ValidationRule = { id: "3", range: "A2:A9", type: "textLength", op: "lte", max: "10" };
  const dateRule: ValidationRule = { id: "4", range: "D2:D9", type: "date", op: "between", min: "01-01-2026", max: "31-12-2026" };

  it("accepts list values case-insensitively and rejects others", () => {
    expect(validateCell(listRule, "surat")).toBeNull();
    expect(validateCell(listRule, "Delhi")).toContain("Delhi");
    expect(validateCell(listRule, "")).toBeNull(); // blank allowed by default
  });

  it("enforces whole numbers between 1 and 100", () => {
    expect(validateCell(wholeRule, "50")).toBeNull();
    expect(validateCell(wholeRule, "1.5")).not.toBeNull();
    expect(validateCell(wholeRule, "500")).not.toBeNull();
    expect(validateCell(wholeRule, "₹50")).toBeNull(); // currency text is still a number
  });

  it("enforces text length and dates", () => {
    expect(validateCell(textRule, "Aarav")).toBeNull();
    expect(validateCell(textRule, "Aarav Patel Kumar")).not.toBeNull();
    expect(validateCell(dateRule, "15-06-2026")).toBeNull();
    expect(validateCell(dateRule, "15-06-2027")).not.toBeNull();
    expect(validateCell(dateRule, "not a date")).not.toBeNull();
  });

  it("finds the rule that governs an address", () => {
    expect(ruleFor([listRule, wholeRule], "B5")?.id).toBe("2");
    expect(ruleFor([listRule], "Z5")).toBeUndefined();
  });
});

describe("conditional formatting", () => {
  const values = [12, 45, 45, 3, 88];

  it("highlights greater-than, between and duplicates", () => {
    const greater: CfRule = { id: "g", type: "greater", range: "A1:A5", a: "40", fill: "#dcfce7", color: "#15803d" };
    expect(ruleMatches(greater, "A2", 45, values)?.fill).toBe("#dcfce7");
    expect(ruleMatches(greater, "A4", 3, values)).toBeNull();

    const between: CfRule = { id: "b", type: "between", range: "A1:A5", a: "10", b: "50" };
    expect(ruleMatches(between, "A1", 12, values)).not.toBeNull();

    const dupes: CfRule = { id: "d", type: "duplicates", range: "A1:A5", fill: "#fef9c3" };
    expect(ruleMatches(dupes, "A2", 45, values)).not.toBeNull();
    expect(ruleMatches(dupes, "A5", 88, values)).toBeNull();
  });

  it("handles top-N, above-average and text-contains rules", () => {
    expect(ruleMatches({ id: "t", type: "top", range: "A1:A5", n: 1 }, "A5", 88, values)).not.toBeNull();
    expect(ruleMatches({ id: "t", type: "top", range: "A1:A5", n: 1 }, "A1", 12, values)).toBeNull();
    expect(ruleMatches({ id: "a", type: "aboveAvg", range: "A1:A5" }, "A5", 88, values)).not.toBeNull();
    expect(ruleMatches({ id: "x", type: "textContains", range: "A1:A5", text: "sur" }, "A1", "Surat", ["Surat"])).not.toBeNull();
  });

  it("colours a scale red → yellow → green and merges rules", () => {
    expect(colourScaleFor({ id: "s", type: "colorScale", range: "A1:A5" }, "A4", 3, values)?.scale).toBe("bad");
    expect(colourScaleFor({ id: "s", type: "colorScale", range: "A1:A5" }, "A5", 88, values)?.scale).toBe("good");
    const merged = cfStyleFor(
      [
        { id: "1", type: "greater", range: "A1:A5", a: "10", fill: "#fee2e2", color: "#b91c1c" },
        { id: "0", type: "less", range: "A1:A5", a: "1", fill: "#000000" },
        { id: "2", type: "top", range: "A1:A5", n: 1, bold: true },
      ],
      "A5",
      88,
      () => values,
    );
    expect(merged.fill).toBe("#fee2e2");
    expect(merged.bold).toBe(true);
  });

  it("summarises numbers for the average rules", () => {
    expect(numericStats(["1", "2", "x", null, 3])).toEqual({ min: 1, max: 3, avg: 2, count: 3 });
  });
});

describe("named ranges", () => {
  const names = [
    { id: "1", name: "Sales", range: "B2:B30" },
    { id: "2", name: "Rate", range: "C1" },
  ];

  it("expands names in formulas but never function names", () => {
    expect(expandNamedRanges("=SUM(Sales)", names)).toBe("=SUM(B2:B30)");
    expect(expandNamedRanges("=Sales*Rate", names)).toBe("=B2:B30*C1");
    expect(expandNamedRanges("=SUM(TotalSales)", names)).toBe("=SUM(TotalSales)");
    expect(expandNamedRanges('=TEXT(A1,"Sales")', names)).toBe('=TEXT(A1,"Sales")');
    expect(expandNamedRanges("plain text", names)).toBe("plain text");
  });
});
