import { describe, expect, it } from "vitest";
import { dataBars, removeDuplicates, sortRows, usedRange } from "./dataTools";

const cells = {
  A1: "Name", B1: "Sales",
  A2: "Kabir", B2: "300",
  A3: "Aarav", B3: "1200",
  A4: "Diya", B4: "700",
  A5: "Diya", B5: "700",
};

describe("data tools", () => {
  it("finds the used range", () => {
    expect(usedRange(cells)).toEqual({ firstRow: 0, lastRow: 4, firstCol: 0, lastCol: 1 });
  });

  it("sorts whole rows by a numeric column and keeps names attached", () => {
    const bounds = usedRange(cells);
    const sorted = sortRows(cells, bounds, 1, "desc", true, true);
    expect(sorted.A1).toBe("Name"); // header stays on top
    expect(sorted.A2).toBe("Aarav");
    expect(sorted.B2).toBe("1200");
    expect(sorted.A3).toBe("Diya");
    expect(sorted.B3).toBe("700");
    expect(sorted.A4).toBe("Diya"); // the duplicate 700 sits above 300
    expect(sorted.A5).toBe("Kabir");
  });

  it("sorts text alphabetically and never mixes the columns up", () => {
    const bounds = usedRange(cells);
    const sorted = sortRows(cells, bounds, 0, "asc", false, true);
    expect([sorted.A2, sorted.A3, sorted.A4, sorted.A5]).toEqual(["Aarav", "Diya", "Diya", "Kabir"]);
    expect([sorted.B2, sorted.B3]).toEqual(["1200", "700"]);
  });

  it("removes duplicate rows and reports how many went", () => {
    const bounds = usedRange(cells);
    const result = removeDuplicates(cells, bounds, true);
    expect(result.removed).toBe(1);
    expect(result.cells.A5).toBeUndefined();
    expect(result.cells.B4).toBe("700");
  });

  it("computes data bars relative to the column maximum", () => {
    const bars = dataBars({ B2: 300, B3: 1200, B4: 700 }, usedRange(cells), 1);
    expect(bars.B3).toBe(1);
    expect(bars.B2).toBeCloseTo(0.25, 2);
  });
});
