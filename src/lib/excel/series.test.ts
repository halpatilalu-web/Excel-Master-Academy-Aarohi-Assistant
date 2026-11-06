import { describe, expect, it } from "vitest";
import { fillSeries, parseSerial, serialToText, seriesValues, shiftFormula } from "./series";

/**
 * AutoFill is the single feature students use most and the one that is easiest
 * to get subtly wrong (1, 3, 5 must not become 1, 2, 3). These tests pin the
 * behaviour to what Windows Excel actually does.
 */
describe("auto-fill series", () => {
  it("continues a single number by +1", () => {
    expect(fillSeries(["1"], 3)).toEqual(["2", "3", "4"]);
  });

  it("continues an arithmetic progression using the seed step", () => {
    expect(fillSeries(["1", "3", "5"], 3)).toEqual(["7", "9", "11"]);
    expect(fillSeries(["100", "90"], 2)).toEqual(["80", "70"]);
  });

  it("keeps the decimals of the seed", () => {
    expect(fillSeries(["10.50"], 2)).toEqual(["11.50", "12.50"]);
  });

  it("continues weekdays, months and quarters like Excel's custom lists", () => {
    expect(fillSeries(["Mon"], 3)).toEqual(["Tue", "Wed", "Thu"]);
    expect(fillSeries(["Friday"], 2)).toEqual(["Saturday", "Sunday"]);
    expect(fillSeries(["January"], 2)).toEqual(["February", "March"]);
    expect(fillSeries(["Q1"], 2)).toEqual(["Q2", "Q3"]);
    expect(fillSeries(["रविवार"], 2)).toEqual(["सोमवार", "मंगलवार"]);
  });

  it("increments a trailing number and keeps zero padding", () => {
    expect(fillSeries(["Item 1"], 2)).toEqual(["Item 2", "Item 3"]);
    expect(fillSeries(["Floor-01"], 2)).toEqual(["Floor-02", "Floor-03"]);
  });

  it("continues dates day by day", () => {
    expect(fillSeries(["01-01-2026"], 2)).toEqual(["02-01-2026", "03-01-2026"]);
    expect(fillSeries(["31-01-2026"], 1)).toEqual(["01-02-2026"]);
  });

  it("repeats plain text instead of inventing a series", () => {
    expect(fillSeries(["Paid"], 3)).toEqual(["Paid", "Paid", "Paid"]);
  });

  it("shifts relative references in formulas and respects $", () => {
    expect(fillSeries(["=SUM(B2:D2)"], 2)).toEqual(["=SUM(B3:D3)", "=SUM(B4:D4)"]);
    expect(shiftFormula("=$A1+B$2", 1)).toBe("=$A2+B$2");
  });

  it("round-trips an Excel serial date", () => {
    expect(serialToText(parseSerial("15-08-2026") as number)).toBe("15-08-2026");
  });

  it("builds an explicit series with a step and stop", () => {
    expect(seriesValues(2, 2, 10)).toEqual(["2", "4", "6", "8", "10"]);
    expect(seriesValues(10, -5, 0)).toEqual(["10", "5", "0"]);
  });
});
