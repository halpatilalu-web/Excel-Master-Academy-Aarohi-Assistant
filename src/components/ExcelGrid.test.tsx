// @vitest-environment jsdom
/**
 * Interaction test for the practice grid.
 *
 * The promise this app makes is "type any Excel formula and it calculates, then
 * hand the same sheet to real Excel as a .xlsx". Both halves are checked here:
 * a formula typed into a cell recalculates, and the export button produces a
 * file download (jsdom has no Blob URLs, so they are stubbed).
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExcelGrid } from "./ExcelGrid";

beforeEach(() => {
  localStorage.clear();
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => "blob:sheet");
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
  globalThis.fetch = vi.fn(async () => new Response("[]", { headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
});

afterEach(cleanup);

const SHEETS = [{ name: "Practice", cells: { A1: "10", A2: "20", A3: "=SUM(A1:A2)" } }];

describe("ExcelGrid", () => {
  it("calculates a typed formula with the full engine", async () => {
    render(<ExcelGrid template="t-sum" title="Sum practice" sheets={SHEETS} rows={8} cols={6} />);
    // A3 already holds =SUM(A1:A2) → 30.
    expect(await screen.findByText("30")).toBeTruthy();

    // Move to the empty B1 (arrow keys, like Excel) and type through the formula bar.
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    const bar = screen.getByLabelText("Formula bar");
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=AVERAGE(A1:A2)" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(screen.getAllByText("15").length).toBeGreaterThan(0);
  });

  it("accepts a whole-column SUM in its own column-free cell", async () => {
    render(
      <ExcelGrid
        template="t-col"
        title="Column sum"
        sheets={[{ name: "Sheet1", cells: { A1: "5", A2: "6", B1: "" } }]}
        rows={6}
        cols={5}
      />,
    );
    // Select B1 by clicking it (index 0 is the row-number header) — B1 is
    // outside column A, so =SUM(A:A) cannot see its own cell, like real Excel.
    const grid = screen.getByRole("grid");
    fireEvent.mouseDown(within(grid).getAllByRole("cell")[2]);
    const bar = screen.getByLabelText("Formula bar");
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=SUM(A:A)" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(screen.getAllByText("11").length).toBeGreaterThan(0);
  });

  it("reports a circular reference instead of silently breaking, like Excel", async () => {
    render(<ExcelGrid template="t-cyc" title="Cycle" sheets={[{ name: "Sheet1", cells: { A1: "5" } }]} rows={4} cols={3} />);
    const bar = screen.getByLabelText("Formula bar");
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=A1+1" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(screen.getAllByText(/#(CYCLE|CIRCULAR)/i).length).toBeGreaterThan(0);
  });

  it("offers the whole function library while typing", async () => {
    render(<ExcelGrid template="t-ac" title="Autocomplete" sheets={[{ name: "Sheet1", cells: {} }]} rows={6} cols={5} />);
    const bar = screen.getByLabelText("Formula bar");
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=XLOO" } });
    expect(await screen.findByText("XLOOKUP")).toBeTruthy();
  });

  it("exports the sheet as a real .xlsx download", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ExcelGrid template="t-export" title="Export" sheets={SHEETS} rows={6} cols={5} />);
    fireEvent.click(await screen.findByRole("button", { name: /Open in Excel \(\.xlsx\)/i }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
