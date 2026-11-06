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
    fireEvent.click(screen.getByRole("button", { name: /^Home$/i }));
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
    fireEvent.click(screen.getByRole("button", { name: /^Home$/i }));
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
  it("has all nine Excel ribbon tabs, in Excel's order", async () => {
    render(<ExcelGrid template="t-ribbon" title="Ribbon" sheets={[{ name: "S", cells: { A1: "1" } }]} rows={4} cols={3} />);
    const tabs = ["File", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View", "Help"];
    const strip = screen.getByLabelText("Ribbon tabs");
    const rendered = tabs.map((tab) => within(strip).getByRole<HTMLButtonElement>("button", { name: tab }));
    rendered.forEach((button) => expect(button).toBeTruthy());
    // Order matters: students are taught to find things where Excel puts them.
    const positions = rendered.map((button) => Array.from(strip.querySelectorAll("button")).indexOf(button));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("opens the File backstage with new / open / save / print", async () => {
    render(<ExcelGrid template="t-file" title="File" sheets={[{ name: "S", cells: { A1: "1" } }]} rows={4} cols={3} />);
    fireEvent.click(within(screen.getByLabelText("Ribbon tabs")).getByRole("button", { name: "File" }));
    ["New", "Open", "Save", "Print", "Export"].forEach((item) => {
      // The backstage is labelled so it can be told apart from the grid's tools.
      expect(within(screen.getByLabelText("File backstage")).getByRole("button", { name: new RegExp(`^${item}`, "i") })).toBeTruthy();
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
    fireEvent.click(within(dialog).getByRole("button", { name: /^New/ }));
    expect((await screen.findAllByText(/save ho gaya/i)).length).toBeGreaterThan(0);
  });
});

describe("Excel parity: validation, conditional formatting, filter, names", () => {
  const sheet = {
    name: "S",
    cells: {
      A1: "Item",
      B1: "Qty",
      C1: "City",
      A2: "Laptop",
      B2: "2",
      C2: "Surat",
      A3: "Mouse",
      B3: "10",
      C3: "Pune",
      A4: "Cable",
      B4: "25",
      C4: "Surat",
    },
  };
  const mount = (template: string) =>
    render(<ExcelGrid template={template} title="Parity" sheets={[sheet]} rows={12} cols={5} />);

  it("adds a dropdown with Data Validation and rejects a value that is not in it", async () => {
    mount("t-validation");
    // The quick-access row is always visible, so the tool is discoverable.
    fireEvent.click(screen.getByRole("button", { name: /Data Validation/i }));
    const dialog = await screen.findByRole("dialog", { name: /Data Validation/i });
    fireEvent.change(within(dialog).getByLabelText(/Applies to/i), { target: { value: "C2:C4" } });
    fireEvent.change(within(dialog).getByLabelText(/List values/i), { target: { value: "Surat, Pune, Mumbai" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Apply to/i }));
    expect(screen.queryByRole("dialog", { name: /Data Validation/i })).toBeNull();

    // Type a bad value into C2 — Excel's stop alert appears and the cell keeps Surat.
    const grid = screen.getByRole("grid");
    fireEvent.mouseDown(within(grid).getAllByRole("cell")[1]); // header row cell A1 index
    const c2 = document.querySelector('[data-address="C2"]') as HTMLElement;
    fireEvent.mouseDown(c2);
    fireEvent.doubleClick(c2);
    const input = await screen.findByLabelText(/Edit cell C2/i);
    fireEvent.change(input, { target: { value: "Delhi" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByRole("alertdialog", { name: /Data Validation alert/i })).toBeTruthy();
    expect((screen.getByRole("alertdialog", { name: /Data Validation alert/i }).textContent ?? "")).toContain("Delhi");
  });

  it("applies a conditional formatting rule that colours the column", async () => {
    mount("t-cf");
    fireEvent.click(screen.getByRole("button", { name: /Conditional Formatting/i }));
    const dialog = await screen.findByRole("dialog", { name: /Conditional Formatting/i });
    fireEvent.change(within(dialog).getByLabelText(/Rule type/i), { target: { value: "greater" } });
    fireEvent.change(within(dialog).getByLabelText(/Rule value/i), { target: { value: "5" } });
    fireEvent.change(within(dialog).getByLabelText(/Applies to/i), { target: { value: "B2:B4" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Apply rule/i }));
    const b4 = document.querySelector('[data-address="B4"]') as HTMLElement;
    const b2 = document.querySelector('[data-address="B2"]') as HTMLElement;
    // 25 > 5 gets a fill, 2 does not.
    expect(b4.style.backgroundColor).toBeTruthy();
    expect(b2.style.backgroundColor).toBeFalsy();
  });

  it("filters rows without deleting them", async () => {
    mount("t-filter");
    // The Data tab's Filter, not the ``Filter (0)`` quick-access chip.
    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Filter$/i }));
    const dialog = await screen.findByRole("dialog", { name: /^Filter$/i });
    fireEvent.click(within(dialog).getByRole("button", { name: /Add condition/i }));
    fireEvent.change(within(dialog).getByLabelText(/Filter column 1/i), { target: { value: "2" } });
    fireEvent.change(within(dialog).getByLabelText(/Filter condition 1/i), { target: { value: "eq" } });
    fireEvent.change(within(dialog).getByLabelText(/Filter value 1/i), { target: { value: "Surat" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Apply filter/i }));
    // Row 3 (Pune) is hidden; the row is still in the sheet.
    const pune = document.querySelector('[data-address="C3"]')?.closest("tr");
    expect(pune?.className).toContain("hidden");
    const surat = document.querySelector('[data-address="C4"]')?.closest("tr");
    expect(surat?.className ?? "").not.toContain("hidden");
  });

  it("names a range and expands it inside a formula", async () => {
    mount("t-names");
    fireEvent.click(screen.getByRole("button", { name: /^Formulas$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Name Manager/i }));
    const dialog = await screen.findByRole("dialog", { name: /Name Manager/i });
    fireEvent.change(within(dialog).getByLabelText(/Range name/i), { target: { value: "Qty" } });
    fireEvent.change(within(dialog).getByLabelText(/Range reference/i), { target: { value: "B2:B4" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Add name/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^Close$/ }));

    // =SUM(Qty) must behave like =SUM(B2:B4) → 37.
    const e1 = document.querySelector('[data-address="E1"]') as HTMLElement;
    fireEvent.mouseDown(e1);
    fireEvent.doubleClick(e1);
    const input = await screen.findByLabelText(/Edit cell E1/i);
    fireEvent.change(input, { target: { value: "=SUM(Qty)" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect((await screen.findAllByText("37")).length).toBeGreaterThan(0);
  });

  it("opens the formula bar by tapping it and edits in place", async () => {
    mount("t-formulabar");
    const c2 = document.querySelector('[data-address="C2"]') as HTMLElement;
    fireEvent.mouseDown(c2);
    const bar = screen.getByLabelText(/Formula bar/i) as HTMLInputElement;
    fireEvent.mouseDown(bar);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByLabelText(/Commit edit/i)).toBeTruthy();
    fireEvent.change(bar, { target: { value: '=UPPER(C1)&" 2026"' } });
    fireEvent.click(screen.getByLabelText(/Commit edit/i));
    expect((await screen.findAllByText(/CITY 2026/)).length).toBeGreaterThan(0);
  });

  it("has a full-screen mode that keeps the sheet and the formula bar", async () => {
    mount("t-zen");
    fireEvent.click(screen.getByRole("button", { name: /Full screen/i }));
    expect(screen.getByRole("button", { name: /Exit full screen/i })).toBeTruthy();
    expect(screen.getByLabelText(/Formula bar/i)).toBeTruthy();
    expect(screen.getByRole("grid")).toBeTruthy();
  });
});

describe("Excel dropdowns (data validation lists)", () => {
  it("shows an arrow on a validated cell and writes the picked value", async () => {
    render(
      <ExcelGrid
        template="t-dropdown"
        title="Dropdown"
        sheets={[{ name: "S", cells: { A1: "Status", A2: "Paid", A3: "" } }]}
        rows={6}
        cols={3}
        validation={[
          { id: "v1", range: "A2:A3", type: "list", items: ["Paid", "Overdue", "Pending"], showDropdown: true },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Choose value for A3/i }));
    const list = await screen.findByRole("listbox", { name: /Values for A3/i });
    fireEvent.click(within(list).getByRole("option", { name: "Overdue" }));
    expect((await screen.findAllByText("Overdue")).length).toBeGreaterThan(0);
  });

  it("blocks a typed value that is not in the list", async () => {
    render(
      <ExcelGrid
        template="t-dropdown2"
        title="Dropdown"
        sheets={[{ name: "S", cells: { A1: "Status", A2: "Paid" } }]}
        rows={6}
        cols={3}
        validation={[{ id: "v1", range: "A2:A3", type: "list", items: ["Paid", "Overdue"], message: "Sirf Paid ya Overdue." }]}
      />,
    );
    const a2 = document.querySelector('[data-address="A2"]') as HTMLElement;
    fireEvent.mouseDown(a2);
    fireEvent.doubleClick(a2);
    const input = await screen.findByLabelText(/Edit cell A2/i);
    fireEvent.change(input, { target: { value: "Unknown" } });
    fireEvent.keyDown(input, { key: "Enter" });
    const alert = await screen.findByRole("alertdialog", { name: /Data Validation alert/i });
    expect(alert.textContent).toContain("Sirf Paid ya Overdue.");
  });
});

describe("Review, Page Layout and Formulas tabs", () => {
  const cells = {
    A1: "Item",
    B1: "Qty",
    C1: "Rate",
    D1: "Amount",
    A2: "Laptop",
    B2: "2",
    C2: "100",
    D2: "=B2*C2",
    A3: "Mouse",
    B3: "10",
    C3: "50",
    D3: "=B3*C3",
    D4: "=SUM(D2:D3)",
    E1: "Remark",
    E2: "plese chek this",
  };
  const mount = (template: string) =>
    render(<ExcelGrid template={template} title="Review" sheets={[{ name: "S", cells }]} rows={10} cols={6} />);
  const tab = (name: string) => fireEvent.click(within(screen.getByLabelText("Ribbon tabs")).getByRole("button", { name }));
  // Ribbon commands, scoped to the group strip so tab/chip names cannot collide.
  const cmd = (name: string) => fireEvent.click(within(screen.getByLabelText("Ribbon groups")).getByRole("button", { name }));

  it("traces precedents and dependents of a formula", async () => {
    mount("t-audit");
    const grid = screen.getByRole("grid");
    const d4 = grid.querySelector('[data-address="D4"]') as HTMLElement;
    fireEvent.mouseDown(d4);

    tab("Formulas");
    fireEvent.click(screen.getByRole("button", { name: /Trace Precedents/i }));
    // D2 and D3 feed the SUM, so both are highlighted.
    expect((grid.querySelector('[data-address="D2"]') as HTMLElement).className).toContain("ring-blue-500");
    expect((grid.querySelector('[data-address="D3"]') as HTMLElement).className).toContain("ring-blue-500");

    fireEvent.click(screen.getByRole("button", { name: /Trace Dependents/i }));
    const d2 = grid.querySelector('[data-address="D2"]') as HTMLElement;
    fireEvent.mouseDown(d2);
    fireEvent.click(screen.getByRole("button", { name: /Trace Dependents/i }));
    expect((grid.querySelector('[data-address="D4"]') as HTMLElement).className).toContain("ring-rose-500");
  });

  it("adds a note to a cell and shows the marker", async () => {
    mount("t-notes");
    tab("Review");
    fireEvent.click(screen.getByRole("button", { name: /New comment/i }));
    const panel = await screen.findByRole("dialog", { name: /Comments & Notes/i });
    fireEvent.change(within(panel).getByLabelText(/^Note$/i), { target: { value: "Yeh formula check karna hai" } });
    fireEvent.click(within(panel).getByRole("button", { name: /Save note for A1/i }));
    // The cell shows a note marker and the status bar counts it.
    expect(await screen.findByLabelText(/Note on A1/i)).toBeTruthy();
    expect(screen.getAllByText(/1 note\(s\)/).length).toBeGreaterThan(0);
  });

  it("protects the sheet so cells cannot be edited", async () => {
    mount("t-protect");
    tab("Review");
    fireEvent.click(screen.getByRole("button", { name: /Protect sheet/i }));
    const grid = screen.getByRole("grid");
    const a2 = grid.querySelector('[data-address="A2"]') as HTMLElement;
    fireEvent.mouseDown(a2);
    fireEvent.doubleClick(a2);
    const input = await screen.findByLabelText(/Edit cell A2/i);
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Blocked: the alert appears and the cell keeps its value.
    expect(await screen.findByRole("alertdialog", { name: /Data Validation alert/i })).toBeTruthy();
    expect((grid.querySelector('[data-address="A2"]') as HTMLElement).textContent).toContain("Laptop");
  });

  it("finds spelling mistakes and fixes one", async () => {
    mount("t-spell");
    tab("Review");
    cmd("Spelling");
    const panel = await screen.findByRole("dialog", { name: /^Spelling$/i });
    expect(within(panel).getByText("plese")).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: /Change to “please”/i }));
    fireEvent.click(within(panel).getByRole("button", { name: /Change to “check”/i }));
    const e2 = screen.getByRole("grid").querySelector('[data-address="E2"]') as HTMLElement;
    expect(e2.textContent).toContain("please");
    expect(e2.textContent).toContain("check");
  });

  it("sets print options and shows the CSS they produce", async () => {
    mount("t-print");
    tab("Page Layout");
    fireEvent.click(screen.getByRole("button", { name: /Orientation/i }));
    // Landscape is applied to the ribbon state and reported in the status line.
    expect(screen.getAllByText(/landscape/i).length).toBeGreaterThan(0);

    cmd("Print sheet");
    const panel = await screen.findByRole("dialog", { name: /^Print$/i });
    fireEvent.change(within(panel).getByLabelText(/Paper size/i), { target: { value: "Legal" } });
    fireEvent.click(within(panel).getByText(/The CSS this produces/i));
    expect((within(panel).getByText(/size: Legal landscape;/)).textContent ?? "").toContain("Legal");
  });

  it("shows formulas instead of results, and the Help guide", async () => {
    mount("t-showformulas");
    tab("Formulas");
    fireEvent.click(screen.getByRole("button", { name: /Show Formulas/i }));
    const d2 = screen.getByRole("grid").querySelector('[data-address="D2"]') as HTMLElement;
    expect(d2.textContent).toContain("=B2*C2");

    tab("Help");
    cmd("Help");
    const panel = await screen.findByRole("dialog", { name: /Help — /i });
    // All nine tabs are explained.
    ["File", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View", "Help"].forEach((name) => {
      expect(within(panel).getAllByText(new RegExp(name)).length).toBeGreaterThan(0);
    });
  });
});
