import { describe, expect, it } from "vitest";
import {
  chartSeriesFrom,
  guessSparkSource,
  hyperlinkFormula,
  pictureFormula,
  seriesFrom,
  sparkText,
  SPARK_BLOCKS,
  withSymbol,
} from "./insert";

const cells = {
  A1: "Month",
  B1: "Sales",
  C1: "Profit",
  A2: "Jan",
  B2: "100",
  C2: "20",
  A3: "Feb",
  B3: "150",
  C3: "-10",
  A4: "Mar",
  B4: "120",
  C4: "35",
};

describe("sparklines", () => {
  it("reads a row of numbers in sheet order", () => {
    expect(seriesFrom(cells, "A1:D1")).toEqual([]);
    expect(seriesFrom({ B2: "1", C2: "2", D2: "-3" }, "B2:D2")).toEqual([1, 2, -3]);
  });

  it("maps values onto the eight block characters", () => {
    const text = sparkText([0, 50, 100]);
    expect(text[0]).toBe(SPARK_BLOCKS[0]);
    expect(text[2]).toBe(SPARK_BLOCKS[SPARK_BLOCKS.length - 1]);
    expect(text).toHaveLength(3);
  });

  it("gives a flat series mid-height bars instead of nothing", () => {
    expect(sparkText([5, 5, 5])).toBe("▄▄▄");
  });

  it("draws win/loss as block or low dash", () => {
    expect(sparkText([10, -4, 0], "winloss")).toBe("█▁█");
  });

  it("guesses the numbers to the left of the active cell", () => {
    expect(guessSparkSource({ B2: "1", C2: "2", D2: "3" }, "E2")).toBe("B2:D2");
  });

  it("guesses a column of numbers above the active cell", () => {
    expect(guessSparkSource({ B2: "1", B3: "2", B4: "3" }, "B5")).toBe("B2:B4");
  });

  it("returns nothing when there is no series nearby", () => {
    expect(guessSparkSource({ A1: "hello" }, "C4")).toBe("");
  });
});

describe("chart ranges", () => {
  it("uses the last numeric column as the series and the text column as labels", () => {
    const series = chartSeriesFrom(cells, "A1:B4");
    expect(series.values).toEqual([100, 150, 120]);
    expect(series.labels).toEqual(["Jan", "Feb", "Mar"]);
    expect(series.series).toBe("Sales");
    expect(series.categoryHeader).toBe("Month");
  });

  it("charts a single column without labels", () => {
    const series = chartSeriesFrom({ B1: "10", B2: "20" }, "B1:B2");
    expect(series.values).toEqual([10, 20]);
    expect(series.labels).toEqual(["Row 1", "Row 2"]);
  });

  it("skips blank and text cells inside the range", () => {
    const series = chartSeriesFrom({ A1: "x", B1: "5", B2: "", B3: "7" }, "B1:B3");
    expect(series.values).toEqual([5, 7]);
  });

  it("returns an empty series for a range with no numbers", () => {
    expect(chartSeriesFrom({ A1: "a", A2: "b" }, "A1:A2").values).toEqual([]);
  });
});

describe("inserted text", () => {
  it("builds a HYPERLINK formula with an escaped label", () => {
    expect(hyperlinkFormula("https://excel.com", 'Say "hi"')).toBe('=HYPERLINK("https://excel.com","Say ""hi""")');
  });

  it("falls back to the URL as the label", () => {
    expect(hyperlinkFormula("https://x.dev", "")).toBe('=HYPERLINK("https://x.dev","https://x.dev")');
  });

  it("marks a picture with a label", () => {
    expect(pictureFormula("https://x.dev/a.png", "logo")).toBe('=HYPERLINK("https://x.dev/a.png","🖼 logo")');
    expect(pictureFormula("", "logo")).toBe("logo");
  });

  it("puts a currency symbol before a number and a percent after it", () => {
    expect(withSymbol("1200", "₹")).toBe("₹1200");
    expect(withSymbol("1200", "%")).toBe("1200%");
    expect(withSymbol("", "✓")).toBe("✓");
    expect(withSymbol("done", "✓")).toBe("done✓");
  });
});
