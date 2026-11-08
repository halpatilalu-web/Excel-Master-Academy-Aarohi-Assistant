// @vitest-environment jsdom
/**
 * The formula lab is the "sare formulas ki practice" promise in UI form: pick a
 * function, get a seeded sheet, a written task and an engine-checked answer.
 * These tests drive it like a student would.
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FormulaPracticeLab } from "./FormulaPracticeLab";
import { FORMULA_DRILLS } from "../data/formulaPractice";

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(cleanup);

describe("formula practice lab", () => {
  it("lists every catalogue formula and says how many", () => {
    render(<FormulaPracticeLab initialFormula="SUM" />);
    expect(screen.getByText(new RegExp(`Sare formulas ki practice — ${FORMULA_DRILLS.length} drills`))).toBeTruthy();
    const list = screen.getByRole("list", { name: /formula drills/i });
    // The list is filtered by search, but the whole catalogue fits in the DOM.
    expect(within(list).getAllByRole("listitem").length).toBe(FORMULA_DRILLS.length);
  });

  it("shows the written task for the selected formula, not just an example", () => {
    render(<FormulaPracticeLab initialFormula="VLOOKUP" />);
    const brief = screen.getByLabelText(/task brief/i);
    expect(within(brief).getAllByText(/VLOOKUP/i).length).toBeGreaterThan(0);
    // The instruction names the answer cell and the formula to type.
    expect(screen.getAllByText(/H1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VLOOKUP\(1005/).length).toBeGreaterThan(0);
  });

  it("switches formula when a different drill is picked", () => {
    render(<FormulaPracticeLab initialFormula="SUM" />);
    const list = screen.getByRole("list", { name: /formula drills/i });
    // Buttons are labelled by their text, plus the tooltip (function purpose).
    fireEvent.click(within(list).getByRole("listitem", { name: /^XIRR/ }));
    expect(screen.getAllByText(/=XIRR\(B1:B12,A1:A12\)/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/task brief/i)).toBeTruthy();
  });

  it("filters the list by search text", () => {
    render(<FormulaPracticeLab initialFormula="SUM" />);
    const search = screen.getByLabelText(/search formulas/i);
    fireEvent.change(search, { target: { value: "vlookup" } });
    const list = screen.getByRole("list", { name: /formula drills/i });
    const items = within(list).getAllByRole("listitem");
    expect(items.length).toBeLessThan(FORMULA_DRILLS.length);
    expect(items.some((item) => item.textContent?.includes("VLOOKUP"))).toBe(true);
  });

  it("reveals the verified solution on demand", () => {
    render(<FormulaPracticeLab initialFormula="RANDARRAY" />);
    fireEvent.click(screen.getAllByRole("button", { name: /show solution/i })[0]);
    expect(screen.getAllByText(/RANDARRAY\(3,4,1,100,TRUE\)/).length).toBeGreaterThan(0);
  });

  it("shows a category count for every Excel group", () => {
    render(<FormulaPracticeLab initialFormula="SUM" />);
    expect(screen.getByRole("button", { name: /Math & Trig \(\d+\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Financial \(\d+\)/ })).toBeTruthy();
  });
});
