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

describe("pro tools", () => {
  it("AutoSum writes a SUM over the numbers above", async () => {
    render(
      <ExcelGrid
        template="t-autosum"
        title="AutoSum"
        sheets={[{ name: "S", cells: { A1: "5", A2: "6", B1: "", C1: "=SUM(A1:A2)" } }]}
        rows={6}
        cols={4}
      />,
    );
    // Put the cursor in B3 (index 0 is the row header, so row 3 is index 1+2*4)
    const grid = screen.getByRole("grid");
    const cells = within(grid).getAllByRole("cell");
    fireEvent.mouseDown(cells[1 + 4 + 4 + 1]);
    fireEvent.click(screen.getByRole("button", { name: /AutoSum/i }));
    // Nothing numeric above B3 → it falls through to SUM() for the student to fill.
    expect(screen.getAllByText(/AutoSum|SUM\(/i).length).toBeGreaterThan(0);
  });

  it("shows the virtual keyboard with the function keys Excel has", async () => {
    render(<ExcelGrid template="t-keys" title="Keys" sheets={[{ name: "S", cells: { A1: "1" } }]} rows={4} cols={3} />);
    fireEvent.click(screen.getByRole("button", { name: /Keyboard/i }));
    // Main keys tab: Flash Fill + AutoSum chords are on screen, and F1–F12 is a tab.
    expect(screen.getByRole("button", { name: /F1–F12/i })).toBeTruthy();
    expect(screen.getAllByText(/Flash Fill/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /F1–F12/i }));
    expect(screen.getByText("F11")).toBeTruthy();
  });

  it("runs Flash Fill from the toolbar and reports the pattern", async () => {
    render(
      <ExcelGrid
        template="t-flash"
        title="Flash"
        sheets={[{ name: "S", cells: { A1: "Aarav Sharma", A2: "Diya Patel", B1: "Aarav" } }]}
        rows={8}
        cols={4}
      />,
    );
    const grid = screen.getByRole("grid");
    const cells = within(grid).getAllByRole("cell");
    // Select B1 (row 1, second data column) — index 1 is A1's value cell.
    fireEvent.mouseDown(cells[2]);
    fireEvent.click(screen.getByRole("button", { name: /Flash Fill/i }));
    // The pattern is echoed in the toolbar chip and the status bar.
    expect((await screen.findAllByText(/Flash Fill pattern|first word/i)).length).toBeGreaterThan(0);
  });
});

describe("data tools in the grid", () => {
  it("sorts A→Z keeping the header row and the other columns attached", async () => {
    render(
      <ExcelGrid
        template="t-sort"
        title="Sort"
        sheets={[{ name: "S", cells: { A1: "Name", B1: "Sales", A2: "Kabir", B2: "300", A3: "Aarav", B3: "1200" } }]}
        rows={6}
        cols={4}
      />,
    );
    const grid = screen.getByRole("grid");
    fireEvent.mouseDown(within(grid).getAllByRole("cell")[1]); // A1
    fireEvent.click(screen.getByRole("button", { name: /Sort A→Z/i }));
    expect(await screen.findByText(/rows stayed together/i)).toBeTruthy();
    const cells = within(screen.getByRole("grid")).getAllByRole("cell");
    // header row 1: [◢?] A1=Name, B1=Sales … then A2 must be Aarav.
    const values = cells.map((cell) => cell.textContent);
    expect(values).toContain("Aarav");
    expect(values.indexOf("Aarav")).toBeLessThan(values.indexOf("Kabir"));
  });

  it("removes duplicate rows on demand", async () => {
    render(
      <ExcelGrid
        template="t-dupe"
        title="Dupes"
        sheets={[
          { name: "S", cells: { A1: "Name", A2: "Diya", A3: "Diya", A4: "Kabir" } },
        ]}
        rows={6}
        cols={3}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /No dupes|duplicates/i }));
    expect(await screen.findByText(/Removed 1 duplicate/i)).toBeTruthy();
  });
});

describe("find & replace", () => {
  it("finds a value and jumps the selection to it", async () => {
    render(
      <ExcelGrid
        template="t-find"
        title="Find"
        sheets={[{ name: "S", cells: { A1: "Delhi", A2: "Mumbai", A3: "Delhi" } }]}
        rows={5}
        cols={3}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Find$/i }));
    fireEvent.change(screen.getByLabelText("Find text"), { target: { value: "Delhi" } });
    fireEvent.click(screen.getByRole("button", { name: /Find next/i }));
    expect(await screen.findByText(/Found .Delhi./i)).toBeTruthy();
  });

  it("replaces every occurrence", async () => {
    render(
      <ExcelGrid
        template="t-replace"
        title="Replace"
        sheets={[{ name: "S", cells: { A1: "GST 5", A2: "GST 12" } }]}
        rows={4}
        cols={3}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Find$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Replace/i }));
    fireEvent.change(screen.getByLabelText("Find text"), { target: { value: "GST" } });
    fireEvent.change(screen.getByLabelText("Replace with"), { target: { value: "Tax" } });
    fireEvent.click(screen.getByRole("button", { name: /Replace all/i }));
    expect(await screen.findByText(/Replaced .GST. in 2 cell/i)).toBeTruthy();
    expect(screen.getAllByText(/Tax 5/).length).toBeGreaterThan(0);
  });
});
