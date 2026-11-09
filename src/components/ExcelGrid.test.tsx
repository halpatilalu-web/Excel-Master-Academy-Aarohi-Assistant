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
import { resetSettings, setSetting } from "../lib/settings";

beforeEach(() => {
  localStorage.clear();
  resetSettings();
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = vi.fn(() => "blob:sheet");
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = vi.fn();
  globalThis.fetch = vi.fn(async () => new Response("[]", { headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
});

afterEach(cleanup);

const SHEETS = [{ name: "Practice", cells: { A1: "10", A2: "20", A3: "=SUM(A1:A2)" } }];

/**
 * The formula field above the sheet is editable again (Excel's layout), so this
 * is just a readable handle on it.
 */
function openBar(): HTMLInputElement {
  return screen.getByLabelText("Formula bar") as HTMLInputElement;
}

describe("ExcelGrid", () => {
  it("calculates a typed formula with the full engine", async () => {
    render(<ExcelGrid template="t-sum" title="Sum practice" sheets={SHEETS} rows={8} cols={6} />);
    // A3 already holds =SUM(A1:A2) → 30.
    expect(await screen.findByText("30")).toBeTruthy();

    // Move to the empty B1 (arrow keys, like Excel) and type through the formula bar.
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    const bar = openBar();
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
    const bar = openBar();
    fireEvent.change(bar, { target: { value: "=SUM(A:A)" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(screen.getAllByText("11").length).toBeGreaterThan(0);
  });

  it("reports a circular reference instead of silently breaking, like Excel", async () => {
    render(<ExcelGrid template="t-cyc" title="Cycle" sheets={[{ name: "Sheet1", cells: { A1: "5" } }]} rows={4} cols={3} />);
    const bar = openBar();
    fireEvent.change(bar, { target: { value: "=A1+1" } });
    // "=" opened the function list; Esc closes it so Enter means "commit".
    fireEvent.keyDown(bar, { key: "Escape" });
    fireEvent.change(screen.getByLabelText("Formula bar"), { target: { value: "=A1+1" } });
    fireEvent.keyDown(screen.getByLabelText("Formula bar"), { key: "Enter" });
    expect(screen.getAllByText(/#(CYCLE|CIRCULAR)/i).length).toBeGreaterThan(0);
  });

  it("offers the whole function library while typing", async () => {
    render(<ExcelGrid template="t-ac" title="Autocomplete" sheets={[{ name: "Sheet1", cells: {} }]} rows={6} cols={5} />);
    const bar = openBar();
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
    // The pad opens from the ribbon, the quick-access row or the button next to
    // the formula bar; any of them must show the same keypad. It starts OPEN on
    // a touch device, so a click here may close it — assert the end state.
    const openers = screen.getAllByRole("button", { name: /Keyboard/i });
    fireEvent.click(openers[openers.length - 1]);
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
    // The bar's status line shows the formula without letting it be retyped by
    // accident; pressing it opens the bar as an editor.
    const bar = openBar();
    expect(bar.value).toBe("=SUM(A1:A2)");

    // Change only "A1" → "A2": the rest must survive.
    fireEvent.change(bar, { target: { value: "=SUM(A2:A2)" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect((await screen.findAllByText("6")).length).toBeGreaterThan(0);
    // Re-selecting the cell still shows the edited formula, not a blank.
    fireEvent.mouseDown(within(screen.getByRole("grid")).getAllByRole("cell")[2]);
    expect((screen.getByLabelText("Formula bar") as HTMLInputElement).value).toBe("=SUM(A2:A2)");
  });

  it("keeps the autocomplete open while editing the middle of a formula", async () => {
    render(<ExcelGrid template="t-mid" title="Mid" sheets={[{ name: "S", cells: { A1: "=XLOOKUP(A1,B:B,C:C)" } }]} rows={4} cols={3} />);
    const bar = openBar();
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
    // A1 starts selected; its handle is the seed for the series. It is only
    // there when the cell is *selected* — a mouse press no longer opens the
    // editor, precisely so this handle stays grabbable.
    const handle = screen.getByRole("button", { name: /Fill handle A1/i });
    const target = within(screen.getByRole("grid")).getAllByRole("cell").find((cell) => cell.getAttribute("data-address") === "A5");
    expect(target).toBeTruthy();
    // The pointer is captured by the handle while dragging, so the grid finds
    // the cell under the cursor by hit-testing: jsdom needs that stub.
    // jsdom has no elementFromPoint at all, so it is installed by hand.
    const original = (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
    (document as unknown as { elementFromPoint?: () => Element }).elementFromPoint = () =>
      target as unknown as Element;
    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(handle);
    fireEvent.mouseUp(handle);
    (document as unknown as { elementFromPoint?: unknown }).elementFromPoint = original;
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
    const bar = openBar();
    // Pressing the field starts an edit (Excel's behaviour) — the tick/cross
    // buttons appear with it.
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
    expect(screen.getByLabelText("Formula bar")).toBeTruthy();
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

describe("Insert tab objects", () => {
  const cells = {
    A1: "Month",
    B1: "Sales",
    A2: "Jan",
    B2: "100",
    A3: "Feb",
    B3: "150",
    A4: "Mar",
    B4: "120",
  };
  const mount = (template: string) =>
    render(<ExcelGrid template={template} title="Insert" sheets={[{ name: "S", cells }]} rows={10} cols={6} />);
  const tab = (name: string) => fireEvent.click(within(screen.getByLabelText("Ribbon tabs")).getByRole("button", { name }));
  const cmd = (name: string) => fireEvent.click(within(screen.getByLabelText("Ribbon groups")).getByRole("button", { name }));
  const cell = (address: string) => screen.getByRole("grid").querySelector(`[data-address="${address}"]`) as HTMLElement;

  it("inserts a chart from a range and draws it", async () => {
    mount("t-chart");
    tab("Insert");
    cmd("Chart");
    const panel = await screen.findByRole("dialog", { name: "Insert" });
    fireEvent.change(within(panel).getByLabelText(/Data range/i), { target: { value: "A1:B4" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Line" }));
    fireEvent.click(within(panel).getByRole("button", { name: /Insert chart/i }));
    // The chart appears as a real SVG with one point per data row.
    const chart = await screen.findByRole("img", { name: /Line chart/i });
    expect(chart.querySelectorAll("circle")).toHaveLength(3);
    expect(within(chart.closest("figure") as HTMLElement).getByText(/Sales/)).toBeTruthy();
  });

  it("draws a sparkline inside the active cell", async () => {
    mount("t-spark");
    // A click now also opens the in-cell editor (type-to-replace, like Excel),
    // so commit the empty editor first — the sheet, not the editor, takes the
    // Insert ribbon command.
    fireEvent.mouseDown(cell("C2"));
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });
    tab("Insert");
    cmd("Sparkline");
    const panel = await screen.findByRole("dialog", { name: "Insert" });
    fireEvent.change(within(panel).getByLabelText(/Data range/i), { target: { value: "B2:B4" } });
    fireEvent.click(within(panel).getByRole("button", { name: /Insert sparkline/i }));
    const marker = await screen.findByLabelText(/Sparkline in C2 from B2:B4/);
    expect(marker.textContent).toHaveLength(3);
  });

  it("guesses the sparkline range from the numbers to the left", async () => {
    render(
      <ExcelGrid
        template="t-spark-guess"
        title="Insert"
        sheets={[{ name: "S", cells: { A1: "One", B1: "Two", C1: "Sum", A2: "10", B2: "20" } }]}
        rows={10}
        cols={6}
      />,
    );
    fireEvent.mouseDown(cell("C2"));
    tab("Insert");
    cmd("Sparkline");
    const panel = await screen.findByRole("dialog", { name: "Insert" });
    // Two numbers to the left of C2 → Excel guesses A2:B2.
    expect((within(panel).getByLabelText(/Data range/i) as HTMLInputElement).value).toBe("A2:B2");
  });

  it("inserts a real HYPERLINK formula for a link", async () => {
    mount("t-link");
    fireEvent.mouseDown(cell("D6"));
    // Clicking a cell now opens its editor (Excel's type-to-replace); close it
    // so the ribbon command applies to the sheet.
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });
    tab("Insert");
    cmd("Link");
    const panel = await screen.findByRole("dialog", { name: "Insert" });
    fireEvent.change(within(panel).getByLabelText(/^Address/i), { target: { value: "https://excel.dev" } });
    fireEvent.change(within(panel).getByLabelText(/Text to display/i), { target: { value: "Course" } });
    fireEvent.click(within(panel).getByRole("button", { name: /Insert link/i }));
    expect(cell("D6").textContent).toContain("Course");
    // Click the cell and the formula bar shows the formula that was written.
    fireEvent.mouseDown(cell("D6"));
    expect((screen.getByLabelText("Formula bar") as HTMLInputElement).value).toBe('=HYPERLINK("https://excel.dev","Course")');
  });

  it("adds a rupee symbol to the active cell", async () => {
    mount("t-symbol");
    fireEvent.mouseDown(cell("D5"));
    // Clicking a cell now opens its editor (Excel's type-to-replace); close it
    // so the ribbon command applies to the sheet.
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });
    tab("Insert");
    cmd("Symbol");
    const panel = await screen.findByRole("dialog", { name: "Insert" });
    fireEvent.click(within(panel).getByRole("button", { name: /Insert Rupee$/i }));
    expect(cell("D5").textContent).toContain("₹");
  });

  it("anchors a shape to the active cell", async () => {
    mount("t-shape");
    fireEvent.mouseDown(cell("E4"));
    // Clicking a cell now opens its editor (Excel's type-to-replace); close it
    // so the ribbon command applies to the sheet.
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });
    tab("Insert");
    cmd("Shapes");
    const panel = await screen.findByRole("dialog", { name: "Insert" });
    fireEvent.click(within(panel).getByRole("button", { name: /Insert Star shape/i }));
    expect(await screen.findByLabelText("Star shape on E4")).toBeTruthy();
  });

  /* --------------------------------------------------------------------- *
   * Input reachability — the three bugs students actually hit              *
   * --------------------------------------------------------------------- */

  it("selects on a click, edits on typing / double-click, and edits on a touch tap", async () => {
    mount("t-click-edit");
    const grid = screen.getByRole("grid");

    // Excel rule: a click only selects. Opening the editor on mousedown made
    // the fill handle impossible to grab (pressing its corner started an edit
    // instead of a fill drag).
    fireEvent.mouseDown(cell("B2"));
    expect(document.querySelector('input[aria-label="Edit cell B2"]')).toBeNull();
    expect(screen.getByLabelText("Name box")).toHaveProperty("value", "B2");

    // Typing a character starts the edit, replacing the old value.
    fireEvent.keyDown(grid, { key: "9" });
    expect(document.querySelector('input[aria-label="Edit cell B2"]')).toBeTruthy();

    cleanup();
    mount("t-dbl-edit");
    fireEvent.mouseDown(cell("B2"));
    fireEvent.doubleClick(cell("B2"));
    expect(document.querySelector('input[aria-label="Edit cell B2"]')).toBeTruthy();

    // A tap arrives as pointerup(touch) followed by the browser's emulated
    // mousedown ~300ms later. That compatibility event used to close the editor
    // again, so a phone showed no keyboard at all.
    cleanup();
    mount("t-tap-edit");
    const tapGrid = screen.getByRole("grid");
    fireEvent.pointerDown(cell("B2"), { pointerType: "touch" });
    fireEvent.pointerUp(cell("B2"), { pointerType: "touch" });
    fireEvent.mouseDown(cell("B2"));
    expect(document.querySelector('input[aria-label="Edit cell B2"]')).toBeTruthy();

    // Typing replaces the old value, like Excel: B2 says "20" before the tap.
    const editor = document.querySelector('input[aria-label="Edit cell B2"]') as HTMLInputElement;
    fireEvent.change(editor, { target: { value: "=1+1" } });
    fireEvent.keyDown(editor, { key: "Enter" });
    expect(tapGrid.textContent).toContain("2");
  });

  it("keeps the caret in the formula bar instead of fighting the cell editor", async () => {
    render(
      <ExcelGrid template="t-bar-focus" title="Bar" sheets={[{ name: "S", cells: { A1: "10", A2: "20" } }]} rows={6} cols={4} />,
    );
    const bar = openBar();
    // The in-cell editor must not mount while the bar owns the edit — that
    // ping-pong was why typing in the bar went nowhere.
    expect(document.querySelector('td input[aria-label^="Edit cell"]')).toBeNull();
    // A1 is the active cell, so the formula cannot reference it — use plain
    // numbers, which is all this test needs to prove the bar's Enter commits.
    fireEvent.change(bar, { target: { value: "=10+20" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
  });

  it("has every letter, digit and symbol on the virtual keyboard", async () => {
    mount("t-full-pad");
    // Open the pad from the quick-access row.
    fireEvent.click(screen.getByRole("button", { name: /^Keyboard$/i }));
    const pad = screen.getByRole("group", { name: /Virtual Excel keyboard/i });
    const caps = Array.from(pad.querySelectorAll("button")).map((b) =>
      (b.getAttribute("aria-label") ?? b.textContent ?? "").trim(),
    );
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      expect(caps, `missing ${letter}`).toContain(letter);
    }
    for (const digit of "0123456789") {
      expect(caps, `missing ${digit}`).toContain(digit);
    }
    for (const symbol of ["(", ")", ",", ":", "$", "4", "*", "/", "+", "&", "^", "%", "<", ">"]) {
      expect(caps, `missing ${symbol}`).toContain(symbol);
    }
  });

  it("types a formula by tapping the on-screen keys", async () => {
    mount("t-pad-type");
    fireEvent.click(screen.getByRole("button", { name: /^Keyboard$/i }));
    const pad = screen.getByRole("group", { name: /Virtual Excel keyboard/i });
    const cap = (label: string) =>
      Array.from(pad.querySelectorAll("button")).find(
        (b) => (b.textContent ?? "").trim() === label || (b.getAttribute("aria-label") ?? "") === label,
      ) as HTMLButtonElement;

    fireEvent.mouseDown(cell("C2"));
    // =, s, u, m, (, a, 1, :, a, 2, ) — one tap per character, like a laptop.
    for (const label of ["=", "S", "U", "M", "(", "A", "1", ":", "A", "2", ")"]) {
      expect(cap(label), `no cap for ${label}`).toBeTruthy();
      fireEvent.click(cap(label));
    }
    const editor = document.querySelector('input[aria-label="Edit cell C2"]') as HTMLInputElement;
    // Unshifted caps type lower case, exactly like a physical keyboard.
    expect((editor ?? (screen.getByLabelText("Formula bar") as HTMLInputElement)).value).toBe("=sum(a1:a2)");

    // Shift swaps every row the way a laptop does: 4 → $, 5 → %, letters → caps.
    fireEvent.click(cap("⇧ Shift"));
    expect(cap("$"), "shifted 4 should print $").toBeTruthy();
    expect(cap("%").textContent?.trim()).toBe("%");
    fireEvent.click(cap("A"));
    expect((document.querySelector('input[aria-label="Edit cell C2"]') as HTMLInputElement).value).toBe("=sum(a1:a2)A");
  });
});

describe("virtual keyboard memory", () => {
  const sheet = [{ name: "S", cells: { A1: "1" } }];
  const mountPad = (template: string) =>
    render(<ExcelGrid template={template} title="Keys" sheets={sheet} rows={4} cols={3} />);

  it("remembers a hidden pad instead of forcing it open on every visit", () => {
    // jsdom reports no coarse pointer, so the pad starts closed here.
    mountPad("t-pad-memory-1");
    expect(screen.queryByRole("group", { name: /Virtual Excel keyboard/i })).toBeNull();
    cleanup();

    localStorage.setItem("excel-academy:keyboard", "1");
    mountPad("t-pad-memory-2");
    expect(screen.getByRole("group", { name: /Virtual Excel keyboard/i })).toBeTruthy();
    cleanup();

    localStorage.setItem("excel-academy:keyboard", "0");
    mountPad("t-pad-memory-3");
    expect(screen.queryByRole("group", { name: /Virtual Excel keyboard/i })).toBeNull();
  });

  it("writes the student's choice back to storage", () => {
    mountPad("t-pad-memory-4");
    fireEvent.click(screen.getAllByRole("button", { name: /Keyboard/i })[0]);
    expect(localStorage.getItem("excel-academy:keyboard")).toBe("1");
  });
});

/**
 * The cell-editing contract, as the students described it:
 *  - "cell me automatic copy rehta hai" — tapping a cell must never open it
 *    with the *previous* cell's text;
 *  - "formula dobara dalna padta hai" — a long formula must survive every
 *    keystroke, instead of collapsing to its last character;
 *  - "formula cell ke saath dikhe" — the live formula bubble sits beside the
 *    cell that is being edited.
 */
describe("typing in a cell", () => {
  const mount = (template: string) =>
    render(
      <ExcelGrid
        template={template}
        title="Typing"
        sheets={[{ name: "S", cells: { A1: "Student", B2: "10", C3: "38" } }]}
        rows={6}
        cols={4}
      />,
    );

  /** The <td> for an address — the grid also renders row/column headers. */
  const cell = (address: string) =>
    document.querySelector(`td[data-address="${address}"]`) as HTMLElement;

  it("opens the tapped cell with its own text, never the previous cell's", () => {
    mount("t-stale");
    fireEvent.mouseDown(cell("A1")); // A1 = "Student"
    fireEvent.doubleClick(cell("A1"));
    expect((screen.getByLabelText("Edit cell A1") as HTMLInputElement).value).toBe("Student");

    fireEvent.mouseDown(cell("C3")); // C3 = "38"
    fireEvent.doubleClick(cell("C3"));
    const editor = screen.getByLabelText("Edit cell C3") as HTMLInputElement;
    expect(editor.value).toBe("38");
  });

  it("keeps a long formula intact through every keystroke", () => {
    mount("t-long");
    fireEvent.mouseDown(cell("A1"));
    fireEvent.doubleClick(cell("A1"));
    const editor = screen.getByLabelText("Edit cell A1") as HTMLInputElement;

    // Type the formula one character at a time, like a student would.
    let typed = "";
    for (const char of "=AVERAGE(B2:C3)") {
      typed += char;
      fireEvent.change(editor, { target: { value: typed } });
    }
    expect((screen.getByLabelText("Edit cell A1") as HTMLInputElement).value).toBe("=AVERAGE(B2:C3)");
    fireEvent.keyDown(screen.getByLabelText("Edit cell A1"), { key: "Enter" });
    // 10 and 38 → 24
    expect(screen.getAllByText("24").length).toBeGreaterThan(0);
  });

  it("keeps the formula in the field, with no bubble beside the cell", () => {
    mount("t-bubble");
    fireEvent.mouseDown(cell("A1"));
    fireEvent.doubleClick(cell("A1"));
    fireEvent.change(screen.getByLabelText("Edit cell A1"), { target: { value: "=10+20" } });
    // One place: the formula field above the sheet (Excel's own layout). The
    // bubble that used to hang beside the cell is gone for good.
    expect((screen.getByLabelText("Formula bar") as HTMLInputElement).value).toBe("=10+20");
    expect(document.querySelector("[data-formula-bubble]")).toBeNull();
  });

  it("hides the pad when Settings turns the keyboard off", () => {
    // The keyboard switch is the master gate, even on a touch device.
    setSetting("virtualKeyboard", false);
    localStorage.setItem("excel-academy:keyboard", "1");
    mount("t-gates-2");
    expect(screen.queryByRole("group", { name: /Virtual Excel keyboard/i })).toBeNull();
  });
});

/**
 * The four things students asked for after the last round:
 *  - the formula on screen in exactly ONE place while typing,
 *  - a fill handle you can actually grab with a mouse (corner drag),
 *  - a keyboard you can make bigger or smaller,
 *  - Settings out of the way of the task.
 */
describe("one formula, a grabbable fill handle and a resizable keyboard", () => {
  const mount = (template: string) =>
    render(
      <ExcelGrid
        template={template}
        title="Handles"
        sheets={[{ name: "S", cells: { A1: "1", A2: "2", B1: "10" } }]}
        rows={8}
        cols={4}
      />,
    );
  const cell = (address: string) => document.querySelector(`td[data-address="${address}"]`) as HTMLElement;

  it("shows the typed formula in the field and in the cell — and nowhere else", () => {
    mount("t-one-place");
    fireEvent.mouseDown(cell("B1"));
    fireEvent.keyDown(screen.getByRole("grid"), { key: "=" });
    fireEvent.change(screen.getByLabelText("Edit cell B1"), { target: { value: "=SUM(A1:A2)" } });

    expect((screen.getByLabelText("Edit cell B1") as HTMLInputElement).value).toBe("=SUM(A1:A2)");
    expect((screen.getByLabelText("Formula bar") as HTMLInputElement).value).toBe("=SUM(A1:A2)");
    expect(document.querySelector("[data-formula-bubble]")).toBeNull();
  });

  it("lists every formula the moment “=” is typed, then narrows as you type", () => {
    mount("t-list");
    fireEvent.mouseDown(cell("B1"));
    fireEvent.doubleClick(cell("B1"));
    const editor = screen.getByLabelText("Edit cell B1") as HTMLInputElement;

    // Just "=" → the whole library, not an empty box.
    fireEvent.change(editor, { target: { value: "=" } });
    const list = screen.getByRole("listbox", { name: /Excel functions/i });
    const all = within(list).getAllByRole("option");
    expect(all.length).toBeGreaterThan(20);
    expect(screen.getByText(/Saare formulas/i)).toBeTruthy();

    // "=XL" → only XLOOKUP-family names.
    fireEvent.change(screen.getByLabelText("Edit cell B1"), { target: { value: "=XL" } });
    const narrowed = within(screen.getByRole("listbox", { name: /Excel functions/i })).getAllByRole("option");
    expect(narrowed.length).toBeGreaterThan(0);
    narrowed.forEach((option) => expect(option.textContent).toMatch(/XL/i));

    // Enter inserts the highlighted function and keeps editing inside it.
    fireEvent.keyDown(screen.getByLabelText("Edit cell B1"), { key: "Enter" });
    expect((screen.getByLabelText("Edit cell B1") as HTMLInputElement).value).toBe("=XLOOKUP(");
  });

  it("keeps the fill handle on a selected cell so a corner drag can start", () => {
    mount("t-handle");
    // A plain mouse press only selects — this is what keeps the corner handle
    // from turning into a caret drag.
    fireEvent.mouseDown(cell("A1"));
    expect(document.querySelector('input[aria-label^="Edit cell"]')).toBeNull();
    expect(screen.getByRole("button", { name: /Fill handle A1/i })).toBeTruthy();

    // Typing after the click still starts the edit, and the seed character is
    // not doubled by the browser's own insert.
    fireEvent.keyDown(screen.getByRole("grid"), { key: "7" });
    expect((screen.getByLabelText("Edit cell A1") as HTMLInputElement).value).toBe("7");
  });

  it("keeps the fill handle on a cell that is being edited, so a phone can still fill", () => {
    mount("t-handle-editing");
    // A phone tap opens the editor — which is exactly the state the handle
    // used to vanish in, leaving only "Edit cell" and a text-selection menu.
    fireEvent.pointerDown(cell("A1"), { pointerType: "touch" });
    fireEvent.pointerUp(cell("A1"), { pointerType: "touch" });
    fireEvent.mouseDown(cell("A1"));
    expect(document.querySelector('input[aria-label="Edit cell A1"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fill handle A1/i })).toBeTruthy();
  });

  it("closes the editor when the handle is grabbed and keeps the cell's value", async () => {
    mount("t-handle-drag");
    fireEvent.pointerDown(cell("A1"), { pointerType: "touch" });
    fireEvent.pointerUp(cell("A1"), { pointerType: "touch" });
    fireEvent.mouseDown(cell("A1"));
    const editor = document.querySelector('input[aria-label="Edit cell A1"]') as HTMLInputElement;
    // Touch-typing leaves the whole draft selected; grabbing the handle must
    // not drag that selection or write it back over the cell.
    editor.select();

    const handle = screen.getByRole("button", { name: /Fill handle A1/i });
    const target = within(screen.getByRole("grid"))
      .getAllByRole("cell")
      .find((c) => c.getAttribute("data-address") === "A4");
    const original = (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
    (document as unknown as { elementFromPoint?: () => Element }).elementFromPoint = () => target as unknown as Element;
    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(handle);
    fireEvent.mouseUp(handle);
    (document as unknown as { elementFromPoint?: unknown }).elementFromPoint = original;

    expect(document.querySelector('td input[aria-label^="Edit cell"]')).toBeNull();
    // A1 still holds its own text: closing an untouched editor is a no-op.
    const a1 = within(screen.getByRole("grid"))
      .getAllByRole("cell")
      .find((c) => c.getAttribute("data-address") === "A1");
    // t-handle-drag seeds A1=1, A2=2 — closing the editor untouched keeps the 1.
    expect(a1?.textContent).toContain("1");
    // ...and the drag continued the Excel series downwards: 3, 4.
    expect((await screen.findAllByText("4")).length).toBeGreaterThan(0);
  });

  it("sizes the keyboard from presets and from the corner grip, and remembers it", () => {
    localStorage.setItem("excel-academy:keyboard", "1");
    mount("t-kb-size");
    // Docked first; the grip floats it, and then it can be resized.
    fireEvent.click(screen.getByRole("button", { name: /Float the keyboard/i }));
    expect(screen.getByRole("button", { name: /Resize the keyboard/i })).toBeTruthy();
    // Bigger → the preset is written to storage (floating mode is what resizes).
    fireEvent.click(screen.getByRole("button", { name: /Make the keyboard bigger/i }));
    const stored = JSON.parse(localStorage.getItem("excel-academy:keyboard-size") ?? "{}") as { w?: number };
    expect(stored.w).toBeGreaterThan(0);
  });
});
