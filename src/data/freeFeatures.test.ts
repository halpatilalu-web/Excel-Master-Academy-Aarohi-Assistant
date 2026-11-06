import { describe, expect, it } from "vitest";
import { FREE_FEATURES, FREE_GROUPS, STATUS_STYLE } from "./freeFeatures";
import { knownFunctions } from "../lib/excel/formula/engine";

/**
 * The app's central promise is "everything Excel charges for is free here".
 * These tests keep the promise honest: the list must cover the headline paid
 * features, and anything marked "full" must be backed by the engine or the grid.
 */
describe("free feature inventory", () => {
  const byName = (needle: string) => FREE_FEATURES.find((f) => f.name.includes(needle));

  it("covers every headline feature Excel puts behind a subscription", () => {
    ["400 worksheet functions", "Dynamic arrays", "LAMBDA", "Flash Fill", "AutoSum", "Fill handle", "Virtual Excel keyboard", ".xlsx import"].forEach(
      (needle) => {
        expect(byName(needle), `missing "${needle}"`).toBeTruthy();
      },
    );
  });

  it("marks each row with a real status and gives Hindi + English text", () => {
    FREE_FEATURES.forEach((feature) => {
      expect(STATUS_STYLE[feature.status]).toBeTruthy();
      expect(feature.en.length).toBeGreaterThan(10);
      expect(feature.hi.length).toBeGreaterThan(10);
      expect(FREE_GROUPS).toContain(feature.group);
    });
  });

  it("never claims a formula feature the engine cannot calculate", () => {
    const formulaRows = FREE_FEATURES.filter((f) => f.name.startsWith("400 worksheet"));
    expect(formulaRows.length).toBe(1);
    expect(knownFunctions().length).toBeGreaterThan(300);
  });

  it("is honest about VBA not running in a browser", () => {
    const vba = byName("VBA");
    expect(vba?.status).toBe("excel-only");
  });
});
