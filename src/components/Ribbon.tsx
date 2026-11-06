/**
 * @license MIT
 * Excel-style ribbon for the in-browser grid.
 *
 * The point of this file is parity: every group below is where a student would
 * look for it in Windows Excel (Home ▸ Clipboard/Font/Number/Styles/Cells,
 * Formulas ▸ Function Library, Data ▸ Sort & Filter/Data Tools, View ▸
 * Window). Buttons are data — the grid passes one `run(command)` handler — so
 * adding a feature never means inventing a new UI pattern.
 */
import { useState, type ReactNode } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bold,
  Brush,
  Calculator,
  Clipboard,
  Copy,
  Filter,
  Italic,
  PaintBucket,
  Percent,
  Plus,
  Scissors,
  ShieldCheck,
  Sigma,
  Strikethrough,
  Table2,
  Trash,
  Underline,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CellFormat } from "../lib/excel/useWorkbook";

export type RibbonCommand =
  | { type: "format"; patch: Partial<CellFormat> }
  | { type: "format-number"; code: string }
  | { type: "action"; id: string };

interface RibbonButton {
  id: string;
  label: string;
  hint: string;
  icon?: ReactNode;
  /** Highlighted when the active cell already has this property. */
  active?: boolean;
  command: RibbonCommand;
  wide?: boolean;
}

interface RibbonGroup {
  title: string;
  items: RibbonButton[];
}

const NUMBER_FORMATS: { code: string; label: string; hint: string }[] = [
  { code: "General", label: "General", hint: "General — koi format nahi" },
  { code: "#,##0", label: "1,000", hint: "Comma separator, no decimals" },
  { code: "#,##0.00", label: "1,000.00", hint: "Comma + 2 decimals (₹ amounts)" },
  { code: "0.00%", label: "%", hint: "Percent with 2 decimals" },
  { code: "0.00", label: "0.00", hint: "Two decimals, no separator" },
  { code: "\u20b9#,##0.00", label: "\u20b9", hint: "Rupee currency" },
  { code: "dd-mm-yyyy", label: "Date", hint: "dd-mm-yyyy (Indian format)" },
  { code: "hh:mm", label: "Time", hint: "hh:mm" },
];

export function Ribbon({
  run,
  format,
  message,
}: {
  run: (command: RibbonCommand) => void;
  /** Formatting of the active cell, so the buttons light up like Excel's. */
  format: CellFormat;
  /** One-line teaching text shown at the bottom of the ribbon. */
  message?: string;
}) {
  const [tab, setTab] = useState<"home" | "insert" | "formulas" | "data" | "view">("home");

  const btn = (
    id: string,
    label: string,
    hint: string,
    command: RibbonCommand,
    icon?: ReactNode,
    active?: boolean,
    wide?: boolean,
  ): RibbonButton => ({ id, label, hint, command, icon, active, wide });

  const clipboard: RibbonGroup = {
    title: "Clipboard",
    items: [
      btn("paste", "Paste", "Paste a block copied from Excel (Ctrl+V)", { type: "action", id: "paste" }, <Clipboard size={16} />, false, true),
      btn("copy", "Copy", "Copy the block as tab-separated text (Ctrl+C)", { type: "action", id: "copy" }, <Copy size={15} />),
      btn("cut", "Cut", "Cut the active cell (Ctrl+X)", { type: "action", id: "cut" }, <Scissors size={15} />),
      btn("clear", "Clear", "Clear the cell contents (Del)", { type: "action", id: "clear" }, <Trash size={15} />),
    ],
  };

  const font: RibbonGroup = {
    title: "Font",
    items: [
      btn("bold", "Bold", "Bold (Ctrl+B)", { type: "format", patch: { bold: !format.bold } }, <Bold size={15} />, format.bold),
      btn("italic", "Italic", "Italic (Ctrl+I)", { type: "format", patch: { italic: !format.italic } }, <Italic size={15} />, format.italic),
      btn("underline", "Underline", "Underline (Ctrl+U)", { type: "format", patch: { underline: !format.underline } }, <Underline size={15} />, format.underline),
      btn("strike", "Strike", "Strikethrough (Ctrl+5)", { type: "format", patch: { strike: !format.strike } }, <Strikethrough size={15} />, format.strike),
      btn("fill", "Fill", "Cell fill colour (Home ▸ Fill Color)", { type: "action", id: "fill" }, <Brush size={15} />, Boolean(format.fill)),
      btn("color", "Font colour", "Font colour", { type: "action", id: "color" }, <span className="font-extrabold text-[13px] leading-none">A</span>, Boolean(format.color)),
    ],
  };

  const alignment: RibbonGroup = {
    title: "Alignment",
    items: [
      btn("left", "Left", "Align left", { type: "format", patch: { align: "left" } }, <span className="text-[13px]">⯇</span>, format.align === "left"),
      btn("center", "Center", "Align centre", { type: "format", patch: { align: "center" } }, <span className="text-[13px]">≡</span>, format.align === "center"),
      btn("right", "Right", "Align right", { type: "format", patch: { align: "right" } }, <span className="text-[13px]">⯈</span>, format.align === "right"),
      btn("wrap", "Wrap", "Wrap text in the cell", { type: "format", patch: { wrap: !format.wrap } }, <span className="text-[12px]">↵</span>, format.wrap),
    ],
  };

  const number: RibbonGroup = {
    title: "Number",
    items: [
      ...NUMBER_FORMATS.map((entry) =>
        btn(
          `num-${entry.code}`,
          entry.label,
          entry.hint,
          { type: "format-number", code: entry.code },
          <span className="font-mono text-[11px]">{entry.label}</span>,
          (format.format ?? "General") === entry.code,
        ),
      ),
      btn("percent", "Percent", "Percent format (Ctrl+Shift+%)", { type: "format-number", code: "0.00%" }, <Percent size={15} />),
    ],
  };

  const styles: RibbonGroup = {
    title: "Styles",
    items: [
      btn("header-style", "Header", "Format as a table header row", { type: "action", id: "header-style" }, <Table2 size={15} />),
      btn("total-style", "Total", "Bold + top border, like a totals row", { type: "action", id: "total-style" }, <span className="text-[12px] font-extrabold">Σ</span>),
      btn("good-style", "Good", "Conditional format: green for good", { type: "action", id: "cf-good" }, <span className="text-[12px]">✓</span>),
      btn("bad-style", "Bad", "Conditional format: red for bad", { type: "action", id: "cf-bad" }, <span className="text-[12px]">✕</span>),
      btn("bars", "Data bars", "Conditional formatting data bars", { type: "action", id: "cf-bars" }, <span className="text-[12px]">▮▮</span>),
      btn("color-scale", "Colour scale", "Conditional formatting colour scale", { type: "action", id: "cf-scale" }, <span className="text-[12px]">◧</span>),
    ],
  };

  const cellsGroup: RibbonGroup = {
    title: "Cells & Editing",
    items: [
      btn("insert-row", "Insert row", "Insert a blank row above", { type: "action", id: "insert-row" }, <span className="text-[12px]">⤒</span>),
      btn("delete-row", "Delete row", "Delete this row and move up", { type: "action", id: "delete-row" }, <span className="text-[12px]">⤓</span>),
      btn("autosum", "AutoSum", "AutoSum (Alt+=)", { type: "action", id: "autosum" }, <Sigma size={15} />),
      btn("flash", "Flash Fill", "Flash Fill (Ctrl+E)", { type: "action", id: "flash" }, <Wand2 size={15} />),
      btn("fill-down", "Fill down", "Copy this cell down the block", { type: "action", id: "fill-down" }, <span className="text-[12px]">⇩</span>),
    ],
  };

  const functionLibrary: RibbonGroup = {
    title: "Function Library",
    items: [
      btn("insert-fn", "Insert Function", "Browse all 400 formulas (Shift+F3)", { type: "action", id: "insert-function" }, <Calculator size={15} />),
      btn("autosum2", "AutoSum", "AutoSum (Alt+=)", { type: "action", id: "autosum" }, <Sigma size={15} />),
      btn("recalc", "Calculate now", "Recalculate the sheet (F9)", { type: "action", id: "recalc" }, <span className="text-[12px]">⟳</span>),
      btn("fx-panel", "Formula help", "Show the Hindi explanation of the formula", { type: "action", id: "formula-help" }, <span className="font-serif italic text-[13px]">fx</span>),
    ],
  };

  const definedNames: RibbonGroup = {
    title: "Defined Names",
    items: [
      btn("name-box", "Go To", "Jump to a cell or range (Ctrl+G / F5)", { type: "action", id: "goto" }, <span className="text-[11px] font-mono">A1</span>),
      btn("fill-flash2", "Flash Fill", "Infer the pattern from your examples", { type: "action", id: "flash" }, <Wand2 size={15} />),
    ],
  };

  /** Data ▸ Data Validation / Filter / Get & Transform. */
  const dataValidation: RibbonGroup = {
    title: "Data Validation",
    items: [
      btn("validation", "Data Validation", "Allow only certain values / make a dropdown (Alt+A+V+V)", { type: "action", id: "validation" }, <ShieldCheck size={15} />, false, true),
      btn("validation-copy", "Circle invalid", "Check a cell against its validation rule", { type: "action", id: "validation-check" }, <span className="text-[12px]">◎</span>),
    ],
  };

  /** Home ▸ Conditional Formatting — the dialog plus the one-click rules. */
  const conditional: RibbonGroup = {
    title: "Conditional Formatting",
    items: [
      btn("cf-dialog", "Rules…", "Full conditional formatting dialog: greater than, top N, duplicates, data bars, scales", { type: "action", id: "cf-dialog" }, <PaintBucket size={15} />, false, true),
      btn("cf-good2", "Good", "Green for above average", { type: "action", id: "cf-good" }, <span className="text-[12px]">✓</span>),
      btn("cf-bad2", "Bad", "Red for below average", { type: "action", id: "cf-bad" }, <span className="text-[12px]">✕</span>),
      btn("cf-bars2", "Bars", "Data bars on this column", { type: "action", id: "cf-bars" }, <span className="text-[12px]">▮▮</span>),
      btn("cf-scale2", "Scale", "3-colour scale", { type: "action", id: "cf-scale" }, <span className="text-[12px]">◧</span>),
    ],
  };

  const formatCells: RibbonGroup = {
    title: "Format",
    items: [
      btn("format-cells", "Format Cells", "Number, fill, alignment, wrap (Ctrl+1)", { type: "action", id: "format-cells" }, <span className="text-[12px] font-mono">↔</span>, false, true),
      btn("undo", "Undo", "Undo (Ctrl+Z)", { type: "action", id: "undo" }, <span className="text-[12px]">↶</span>),
      btn("redo", "Redo", "Redo (Ctrl+Y)", { type: "action", id: "redo" }, <span className="text-[12px]">↷</span>),
    ],
  };

  const sheetTabs: RibbonGroup = {
    title: "Sheets",
    items: [
      btn("insert-sheet", "New sheet", "Insert a worksheet tab", { type: "action", id: "insert-sheet" }, <Plus size={15} />),
      btn("names", "Name Manager", "Name a range, then use =SUM(Sales)", { type: "action", id: "names" }, <span className="text-[12px] font-mono">fx</span>),
      btn("goto-dialog", "Go To", "Jump to a cell, range or name (F5)", { type: "action", id: "goto-dialog" }, <span className="text-[11px] font-mono">A1</span>),
    ],
  };

  const sortFilter: RibbonGroup = {
    title: "Sort & Filter",
    items: [
      btn("sort-asc", "A→Z", "Sort whole rows A→Z on this column", { type: "action", id: "sort-asc" }, <ArrowDownAZ size={15} />),
      btn("sort-desc", "Z→A", "Sort whole rows Z→A on this column", { type: "action", id: "sort-desc" }, <ArrowUpAZ size={15} />),
      btn("filter", "Filter", "Excel AutoFilter: condition chuno, failing rows chhup jaayengi", { type: "action", id: "filter" }, <Filter size={15} />, false, true),
      btn("filter-clear", "Clear", "Clear the filter — all rows visible", { type: "action", id: "filter:clear" }, <X size={14} />),
    ],
  };

  const dataTools: RibbonGroup = {
    title: "Data Tools",
    items: [
      btn("dedupe", "Remove duplicates", "Remove duplicate rows, keep the first", { type: "action", id: "dedupe" }, <Trash size={15} />),
      btn("find", "Find & Replace", "Find or replace text (Ctrl+F / Ctrl+H)", { type: "action", id: "find" }, <span className="text-[12px]">🔍</span>),
      btn("form", "Data form", "Open the data-entry form (Alt+D then O)", { type: "action", id: "data-form" }, <span className="text-[12px]">▤</span>, false, true),
      btn("text-to", "Text to columns", "Split a column on a delimiter", { type: "action", id: "text-to-columns" }, <span className="text-[12px]">⇹</span>),
    ],
  };

  const viewGroup: RibbonGroup = {
    title: "Window & View",
    items: [
      btn("freeze", "Freeze panes", "Freeze the header row while scrolling", { type: "action", id: "freeze" }, <span className="text-[12px]">▤</span>),
      btn("split", "Split", "Split the window like View ▸ Split", { type: "action", id: "split" }, <span className="text-[12px]">◫</span>),
      btn("keyboard", "Virtual keyboard", "On-screen Excel keyboard (Ctrl+Shift+F1)", { type: "action", id: "keyboard" }, <span className="text-[12px]">⌨</span>),
      btn("gridlines", "Gridlines", "Toggle the cell borders", { type: "action", id: "gridlines" }, <span className="text-[12px]">▦</span>),
      btn("zoom-in", "Zoom +", "Zoom in like View ▸ Zoom", { type: "action", id: "zoom-in" }, <ZoomIn size={14} />),
      btn("zoom-out", "Zoom −", "Zoom out", { type: "action", id: "zoom-out" }, <ZoomOut size={14} />),
      btn("wide", "Focus mode", "Hide the practice brief and maximise the grid", { type: "action", id: "focus" }, <span className="text-[12px]">⛶</span>),
    ],
  };

  const groups: Record<typeof tab, RibbonGroup[]> = {
    home: [clipboard, font, alignment, number, styles, conditional, cellsGroup, formatCells],
    insert: [
      { title: "Tables", items: [btn("table", "Table", "Format the range as a table", { type: "action", id: "header-style" }, <Table2 size={15} />)] },
      { title: "Charts", items: [btn("chart", "Chart", "Build a chart from the selection (F11)", { type: "action", id: "chart" }, <span className="text-[12px]">📊</span>)] },
      { title: "Illustrations", items: [btn("image", "Picture", "Insert an image in the cell (365-style)", { type: "action", id: "image" }, <span className="text-[12px]">🖼</span>)] },
      { title: "Links", items: [btn("link", "Link", "Insert a hyperlink", { type: "action", id: "link" }, <span className="text-[12px]">🔗</span>)] },
      { title: "Special", items: [btn("symbol", "Symbol", "Insert a currency or symbol", { type: "action", id: "symbol" }, <span className="text-[12px]">₹</span>)] },
      dataTools,
    ],
    formulas: [
      functionLibrary,
      definedNames,
      sheetTabs,
      { title: "Data", items: [btn("data-form2", "Data form", "Data-entry form", { type: "action", id: "data-form" }, <span className="text-[12px]">▤</span>)] },
    ],
    data: [sortFilter, dataValidation, dataTools, sheetTabs, { title: "Outline", items: [btn("subtotal", "Subtotal", "Insert SUBTOTAL rows", { type: "action", id: "subtotal" }, <Sigma size={15} />)] }],
    view: [viewGroup, styles, formatCells],
  };

  return (
    <div className="no-print border-b border-(--color-border) bg-(--color-surface)">
      {/* Tab strip */}
      <div className="flex items-center gap-0.5 px-2 pt-1.5 overflow-x-auto">
        {(
          [
            ["home", "Home"],
            ["insert", "Insert"],
            ["formulas", "Formulas"],
            ["data", "Data"],
            ["view", "View"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-t-lg border-b-2 transition whitespace-nowrap ${
              tab === id
                ? "border-(--color-accent) text-(--color-accent-dark) bg-(--color-accent-soft)"
                : "border-transparent text-(--color-muted) hover:text-(--color-ink)"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-(--color-muted) hidden sm:inline pr-1">Excel ribbon — wahi groups, wahi jagah</span>
      </div>

      {/* Groups */}
      <div className="flex gap-0 overflow-x-auto px-1 py-1.5 bg-(--color-surface-2)">
        {groups[tab].map((group) => (
          <div key={group.title} className="flex flex-col justify-between px-1.5 border-r border-(--color-border) last:border-r-0 shrink-0">
            <div className="flex items-start gap-0.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={`${item.label} — ${item.hint}`}
                  onClick={() => run(item.command)}
                  className={`flex ${item.wide ? "flex-row gap-1 px-2" : "flex-col"} items-center justify-center gap-0.5 min-w-8 px-1.5 py-1 rounded-md text-[10px] font-semibold transition ${
                    item.active
                      ? "bg-(--color-accent) text-white"
                      : "text-(--color-ink) hover:bg-(--color-accent-soft)"
                  }`}
                >
                  {item.icon}
                  <span className={item.wide ? "text-[10px]" : "text-[9px] leading-none text-center"}>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="text-[9px] text-center text-(--color-muted) mt-0.5">{group.title}</div>
          </div>
        ))}
      </div>

      {message && (
        <div className="px-2.5 py-1 text-[10px] text-(--color-muted) border-t border-(--color-border) truncate">{message}</div>
      )}
    </div>
  );
}
