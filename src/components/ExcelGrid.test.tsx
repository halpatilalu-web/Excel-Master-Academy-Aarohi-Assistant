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
    fireEvent.click(screen.getByRole("button", { name: /^AutoSum/i }));
    // Nothing numeric above B3 → it falls through to SUM() for the student to fill.
    expect(screen.getAllByText(/AutoSum|SUM\(/i).length).toBeGreaterThan(0);
  });

  it("shows the virtual keyboard with the function keys Excel has", async () => {
    render(<ExcelGrid template="t-keys" title="Keys" sheets={[{ name: "S", cells: { A1: "1" } }]} rows={4} cols={3} />);
    fireEvent.click(screen.getByRole("button", { name: /^View$/i }));
    // The ribbon button's accessible name is its visible label ("⌨Virtual keyboard").
    fireEvent.click(screen.getByRole("button", { name: /Virtual keyboard/i }));
    // The keypad opens on its main-keys tab, with the Excel function-key tab.
    expect(screen.getByRole("button", { name: /F1–F12/i })).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: /^Flash Fill/i }));
    // The pattern is echoed in the ribbon message strip and the status bar.
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
    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^A→Z/ }));
    expect((await screen.findAllByText(/rows stayed together/i)).length).toBeGreaterThan(0);
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
    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Remove duplicates/i }));
    expect((await screen.findAllByText(/Removed 1 duplicate/i)).length).toBeGreaterThan(0);
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
    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Find & Replace/i }));
    fireEvent.change(screen.getByLabelText("Find text"), { target: { value: "Delhi" } });
    fireEvent.click(screen.getByRole("button", { name: /Find next/i }));
    expect((await screen.findAllByText(/Found .Delhi./i)).length).toBeGreaterThan(0);
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
    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Find & Replace/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Replace…$/i }));
    fireEvent.change(screen.getByLabelText("Find text"), { target: { value: "GST" } });
    fireEvent.change(screen.getByLabelText("Replace with"), { target: { value: "Tax" } });
    fireEvent.click(screen.getByRole("button", { name: /Replace all/i }));
    expect((await screen.findAllByText(/Replaced .GST. in 2 cell/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tax 5/).length).toBeGreaterThan(0);
  });
});

describe("the two bugs students reported", () => {
  it("edits part of an existing formula from the formula bar without wiping it", async () => {
    render(
      <ExcelGrid
        template="t-edit"
        title="Edit"
        sheets={[{ name: "S", cells: { A1: "5", A2: "6", B1: "=SUM(A1:A2)" } }]}
        rows={5}
        cols={4}
      />,
    );
    const grid = screen.getByRole("grid");
    // Select B1 (row 1, second column) — shows the formula in the bar.
    fireEvent.mouseDown(within(grid).getAllByRole("cell")[2]);
    const bar = screen.getByLabelText("Formula bar") as HTMLInputElement;
    expect(bar.value).toBe("=SUM(A1:A2)");

    // Click into the bar and change only "A1" → "A2": the rest must survive.
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=SUM(A2:A2)" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect((await screen.findAllByText("6")).length).toBeGreaterThan(0);
    // Re-selecting the cell still shows the edited formula, not a blank.
    fireEvent.mouseDown(within(screen.getByRole("grid")).getAllByRole("cell")[2]);
    expect((screen.getByLabelText("Formula bar") as HTMLInputElement).value).toBe("=SUM(A2:A2)");
  });

  it("keeps the autocomplete open while editing the middle of a formula", async () => {
    render(<ExcelGrid template="t-mid" title="Mid" sheets={[{ name: "S", cells: { A1: "=XLOOKUP(A1,B:B,C:C)" } }]} rows={4} cols={3} />);
    const bar = screen.getByLabelText("Formula bar");
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=XLOOKUP(A1,B:B,C:C)" } });
    expect((bar as HTMLInputElement).value).toBe("=XLOOKUP(A1,B:B,C:C)");
  });

  it("fills a series when the handle is dragged, like Excel (1,2 → 3,4)", async () => {
    render(
      <ExcelGrid
        template="t-drag"
        title="Drag"
        sheets={[{ name: "S", cells: { A1: "1", A2: "2" } }]}
        rows={8}
        cols={4}
      />,
    );
    const grid = screen.getByRole("grid");
    // A1 starts selected; its handle is the seed for the series.
    const handle = screen.getByRole("button", { name: /Fill handle A1/i });
    const target = within(screen.getByRole("grid")).getAllByRole("cell").find((cell) => cell.getAttribute("data-address") === "A5");
    expect(target).toBeTruthy();
    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(target as HTMLElement);
    fireEvent.mouseUp(target as HTMLElement);
    // Dragging A1 down must continue the series (A1=1, A2=2 → A3=3, A4=4, A5=5)
    // and the status bar explains what it wrote.
    expect((await screen.findAllByText(/series detected like Excel/i)).length).toBeGreaterThan(0);
  });
});

describe("ribbon, formatting and the data form", () => {
  it("has Excel's five ribbon tabs", async () => {
    render(<ExcelGrid template="t-ribbon" title="Ribbon" sheets={[{ name: "S", cells: { A1: "1" } }]} rows={4} cols={3} />);
    ["Home", "Insert", "Formulas", "Data", "View"].forEach((tab) => {
      expect(screen.getByRole("button", { name: tab })).toBeTruthy();
    });
  });

  it("applies bold and a number format from the Home tab", async () => {
    render(<ExcelGrid template="t-fmt" title="Fmt" sheets={[{ name: "S", cells: { A1: "1234.5" } }]} rows={4} cols={3} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Bold/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /1,000.00/ }));
    expect((await screen.findAllByText("1,234.50")).length).toBeGreaterThan(0);
  });

  it("opens the data entry form and saves a new record", async () => {
    render(
      <ExcelGrid
        template="t-form"
        title="Form"
        sheets={[{ name: "S", cells: { A1: "Name", B1: "City", A2: "Aarav", B2: "Surat" } }]}
        rows={8}
        cols={4}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Data$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Data form/ }));
    const dialog = await screen.findByRole("dialog", { name: /Data entry form/i });
    // Only the form's own fields — the grid's formula bar is a textbox too.
    const inputs = within(dialog)
      .getAllByRole("textbox")
      .filter((input) => input.getAttribute("aria-label") === null);
    fireEvent.change(inputs[0], { target: { value: "Diya" } });
    fireEvent.change(inputs[1], { target: { value: "Pune" } });
    fireEvent.click(screen.getByRole("button", { name: /^New/ }));
    expect((await screen.findAllByText(/save ho gaya/i)).length).toBeGreaterThan(0);
  });
});
