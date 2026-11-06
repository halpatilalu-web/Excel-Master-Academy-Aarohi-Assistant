import { describe, expect, it } from "vitest";
import { buildXlsx, buildCsv, parseXlsx } from "./xlsx";

describe("xlsx round-trip", () => {
  it("keeps formulas, text, numbers and sheets", () => {
    const bytes = buildXlsx([
      {
        name: "Marks",
        cells: {
          A1: "Student", B1: "Maths", C1: "Total",
          A2: "Aarav", B2: "78", C2: "=SUM(B2:B2)",
          A3: "Diya", B3: "90", C3: "=B3*2",
        },
        values: { B2: 78, C2: 78, B3: 90, C3: 180 },
        formats: { B2: "#,##0.00" },
        bold: ["A1", "B1", "C1"],
      },
      { name: "Instructions", cells: { A1: "Type formulas in column C" } },
    ]);
    expect(bytes.byteLength).toBeGreaterThan(500);

    const back = parseXlsx(bytes);
    expect(back.sheets.map((s) => s.name)).toEqual(["Marks", "Instructions"]);
    const marks = back.sheets[0];
    expect(marks.cells.A2.text).toBe("Aarav");
    expect(marks.cells.B2.text).toBe("78");
    expect(marks.cells.C2.text).toBe("=SUM(B2:B2)");
    expect(marks.cells.C3.text).toBe("=B3*2");
    expect(marks.cells.A1.bold).toBe(true);
    expect(marks.cells.B2.numberFormat).toBe("#,##0.00");
    expect(marks.cells.C1.text).toBe("Total");
  });

  it("escapes XML-hostile text", () => {
    const bytes = buildXlsx([{ name: "Sheet1", cells: { A1: 'a & b < c > d "e"', B1: "=IF(A1<>\"\",1,2)" } }]);
    const back = parseXlsx(bytes);
    expect(back.sheets[0].cells.A1.text).toBe('a & b < c > d "e"');
    expect(back.sheets[0].cells.B1.text).toBe('=IF(A1<>"",1,2)');
  });

  it("builds CSV for the values", () => {
    const csv = buildCsv({ A1: "Name", B1: "Marks", A2: "Aarav", B2: "78" }, { B2: 78 });
    expect(csv).toBe("Name,Marks\nAarav,78");
  });
});
