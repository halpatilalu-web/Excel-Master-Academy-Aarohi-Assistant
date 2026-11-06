import { describe, expect, it } from "vitest";
import { CATALOG_NAMES, CATALOG_COUNT, FORMULA_CATALOG } from "../../data/formulaCatalog";
import { knownFunctions, Workbook } from "./formula/engine";

/**
 * The catalogue is marketing copy *and* the autocomplete source, so it must not
 * drift away from what the engine can actually calculate.
 */
describe("formula catalogue", () => {
  const engineNames = new Set(knownFunctions().map((n) => n.replace(/_/g, ".")));

  it("lists a useful number of functions", () => {
    expect(CATALOG_COUNT).toBeGreaterThan(150);
  });

  it("only advertises functions the engine implements", () => {
    const missing = CATALOG_NAMES.filter((name) => !engineNames.has(name));
    expect(missing).toEqual([]);
  });

  it("has Hindi text, syntax and an example for every entry", () => {
    const bad = FORMULA_CATALOG.filter((f) => !f.hi.trim() || !f.en.trim() || !f.syntax.trim() || !f.example.trim());
    expect(bad.map((f) => f.name)).toEqual([]);
  });

  it("every advertised example actually calculates (not #NAME?)", () => {
    const broken: string[] = [];
    FORMULA_CATALOG.forEach((entry) => {
      const wb = new Workbook({
        sheets: [
          {
            name: "Sheet1",
            cells: {
              A1: "10", A2: "20", A3: "30", B1: "5", B2: "6", B3: "7",
              C1: "Delhi", C2: "Mumbai", C3: "Delhi",
              D1: "Sales", D2: "100", D3: "200",
              E1: "Region", E2: "Delhi",
              Z1: entry.example,
            },
          },
        ],
      });
      const value = wb.value("Sheet1", 0, 25);
      if (value && typeof value === "object" && !Array.isArray(value) && "err" in value) {
        if (value.err === "#NAME?" || value.err === "#CYCLE!") broken.push(`${entry.name}: ${entry.example} → ${value.err}`);
      }
    });
    expect(broken).toEqual([]);
  });

  it("documents every single function the engine can calculate", () => {
    // Dots and underscores are the same function to Excel (STDEV.S === STDEV_S),
    // so compare them after normalising to the Excel spelling.
    const excelName = (name: string) => name.replace(/_/g, ".");
    const documented = new Set(CATALOG_NAMES.map(excelName));
    const missing = knownFunctions().filter((name) => !documented.has(excelName(name)));
    expect(missing).toEqual([]);
  });
});
