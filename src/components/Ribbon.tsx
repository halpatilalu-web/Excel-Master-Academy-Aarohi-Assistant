/**
 * @license MIT
 * The full Excel ribbon: all nine tabs, in Excel's order and with Excel's
 * groups — File, Home, Insert, Page Layout, Formulas, Data, Review, View, Help.
 *
 * Two deliberate choices:
 *  - Every button carries a Hindi label next to the English one, because this
 *    course is taught in Hinglish. The accessible name stays the English label
 *    (`btn(label, hint, command)`), so tests and screen readers keep a stable
 *    handle while the student sees both.
 *  - Buttons are data. A tab is a list of groups, a group is a list of buttons,
 *    and one `run(command)` handler in the grid executes them. A feature that
 *    the browser truly cannot do answers honestly instead of disappearing.
 */
import { useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowUpAZ,
  Bold,
  Brush,
  Calculator,
  Clipboard,
  Copy,
  Eraser,
  FileSpreadsheet,
  Filter,
  Grid3x3,
  HelpCircle,
  Italic,
  Languages,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Minus,
  Monitor,
  PaintBucket,
  Percent,
  Plus,
  Printer,
  Scissors,
  Search,
  ShieldCheck,
  Sigma,
  Sparkles,
  Strikethrough,
  Table2,
  Trash,
  TrendingUp,
  Underline,
  Wand2,
  WrapText,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CellFormat } from "../lib/excel/useWorkbook";

export type RibbonCommand =
  | { type: "format"; patch: Partial<CellFormat> }
  | { type: "format-number"; code: string }
  | { type: "action"; id: string };

/** The nine tabs, in Excel's own order. `file` renders the backstage panel. */
export type RibbonTab = "file" | "home" | "insert" | "pageLayout" | "formulas" | "data" | "review" | "view" | "help";

export const RIBBON_TABS: { id: RibbonTab; label: string; hindi: string }[] = [
  { id: "file", label: "File", hindi: "फ़ाइल" },
  { id: "home", label: "Home", hindi: "होम" },
  { id: "insert", label: "Insert", hindi: "इन्सर्ट" },
  { id: "pageLayout", label: "Page Layout", hindi: "पेज लेआउट" },
  { id: "formulas", label: "Formulas", hindi: "फ़ॉर्मूला" },
  { id: "data", label: "Data", hindi: "डेटा" },
  { id: "review", label: "Review", hindi: "रिव्यू" },
  { id: "view", label: "View", hindi: "व्यू" },
  { id: "help", label: "Help", hindi: "हेल्प" },
];

interface RibbonButton {
  id: string;
  /** English label — also the accessible name. */
  label: string;
  /** Hindi/Hinglish label shown under the English one. */
  hindi?: string;
  hint: string;
  icon?: ReactNode;
  active?: boolean;
  command: RibbonCommand;
  wide?: boolean;
}

interface RibbonGroup {
  title: string;
  items: RibbonButton[];
}

const NUMBER_FORMATS: { code: string; label: string; hint: string; hindi: string }[] = [
  { code: "General", label: "General", hint: "General — koi format nahi", hindi: "सामान्य" },
  { code: "#,##0", label: "1,000", hint: "Comma separator, no decimals", hindi: "हज़ार" },
  { code: "#,##0.00", label: "1,000.00", hint: "Comma + 2 decimals (₹ amounts)", hindi: "दशमलव" },
  { code: "0.00%", label: "%", hint: "Percent with 2 decimals", hindi: "प्रतिशत" },
  { code: "0.00", label: "0.00", hint: "Two decimals, no separator", hindi: "अंक" },
  { code: "\u20b9#,##0.00", label: "\u20b9", hint: "Rupee currency", hindi: "रुपया" },
  { code: "dd-mm-yyyy", label: "Date", hint: "dd-mm-yyyy (Indian format)", hindi: "तारीख़" },
  { code: "hh:mm", label: "Time", hint: "hh:mm", hindi: "समय" },
];

export function Ribbon({
  run,
  format,
  message,
  tab,
  onTab,
  printSetup,
  onPrintSetup,
  onPrint,
}: {
  run: (command: RibbonCommand) => void;
  /** Formatting of the active cell, so the buttons light up like Excel's. */
  format: CellFormat;
  /** One-line teaching text shown at the bottom of the ribbon. */
  message?: string;
  /** Controlled tab (null/undefined while the student has not chosen yet). */
  tab?: RibbonTab | null;
  onTab?: (tab: RibbonTab) => void;
  printSetup?: { orientation: "portrait" | "landscape"; paper: string; fitToPage: boolean; titleRows: string; margins: string; gridlines: boolean };
  onPrintSetup?: (patch: Record<string, unknown>) => void;
  onPrint?: () => void;
}) {
  const [localTab, setLocalTab] = useState<RibbonTab>("home");
  const activeTab = tab ?? localTab;
  const setTab = (next: RibbonTab) => {
    setLocalTab(next);
    onTab?.(next);
  };

  const btn = (
    id: string,
    label: string,
    hint: string,
    command: RibbonCommand,
    icon?: ReactNode,
    isActive?: boolean,
    wide?: boolean,
    hindi?: string,
  ): RibbonButton => ({ id, label, hint, command, icon, active: isActive, wide, hindi });

  /* ============================== HOME ============================== */

  const clipboard: RibbonGroup = {
    title: "Clipboard · क्लिपबोर्ड",
    items: [
      btn("paste", "Paste", "Paste a block copied from Excel (Ctrl+V)", { type: "action", id: "paste" }, <Clipboard size={16} />, false, true, "पेस्ट"),
      btn("copy", "Copy", "Copy the block as tab-separated text (Ctrl+C)", { type: "action", id: "copy" }, <Copy size={15} />, false, false, "कॉपी"),
      btn("cut", "Cut", "Cut the active cell (Ctrl+X)", { type: "action", id: "cut" }, <Scissors size={15} />, false, false, "कट"),
      btn("format-painter", "Format painter", "Copy this cell's formatting to other cells", { type: "action", id: "format-painter" }, <Brush size={15} />, false, false, "फ़ॉर्मैट"),
      btn("clear", "Clear", "Clear the cell contents (Del)", { type: "action", id: "clear" }, <Trash size={15} />, false, false, "साफ़"),
    ],
  };

  const font: RibbonGroup = {
    title: "Font · फ़ॉन्ट",
    items: [
      btn("bold", "Bold", "Bold (Ctrl+B)", { type: "format", patch: { bold: !format.bold } }, <Bold size={15} />, format.bold, false, "मोटा"),
      btn("italic", "Italic", "Italic (Ctrl+I)", { type: "format", patch: { italic: !format.italic } }, <Italic size={15} />, format.italic, false, "तिरछा"),
      btn("underline", "Underline", "Underline (Ctrl+U)", { type: "format", patch: { underline: !format.underline } }, <Underline size={15} />, format.underline, false, "रेखा"),
      btn("strike", "Strike", "Strikethrough (Ctrl+5)", { type: "format", patch: { strike: !format.strike } }, <Strikethrough size={15} />, format.strike, false, "काटो"),
      btn("fill", "Fill colour", "Cell fill colour (Home ▸ Fill Color)", { type: "action", id: "fill" }, <PaintBucket size={15} />, Boolean(format.fill), false, "भरें"),
      btn("color", "Font colour", "Font colour", { type: "action", id: "color" }, <span className="font-extrabold text-[13px] leading-none">A</span>, Boolean(format.color), false, "रंग"),
    ],
  };

  const alignment: RibbonGroup = {
    title: "Alignment · संरेखण",
    items: [
      btn("left", "Left", "Align left", { type: "format", patch: { align: "left" } }, <AlignLeft size={15} />, format.align === "left", false, "बाएँ"),
      btn("center", "Center", "Align centre", { type: "format", patch: { align: "center" } }, <AlignCenter size={15} />, format.align === "center", false, "मध्य"),
      btn("right", "Right", "Align right", { type: "format", patch: { align: "right" } }, <AlignRight size={15} />, format.align === "right", false, "दाएँ"),
      btn("wrap", "Wrap text", "Wrap text in the cell", { type: "format", patch: { wrap: !format.wrap } }, <WrapText size={15} />, format.wrap, false, "लपेटो"),
      btn("merge", "Merge & centre", "Merge the selected cells into one", { type: "action", id: "merge" }, <Grid3x3 size={15} />, false, false, "मिलाओ"),
    ],
  };

  const number: RibbonGroup = {
    title: "Number · संख्या",
    items: [
      ...NUMBER_FORMATS.map((entry) =>
        btn(
          `num-${entry.code}`,
          entry.label,
          entry.hint,
          { type: "format-number", code: entry.code },
          <span className="font-mono text-[11px]">{entry.label}</span>,
          (format.format ?? "General") === entry.code,
          false,
          entry.hindi,
        ),
      ),
      btn("percent", "Percent", "Percent format (Ctrl+Shift+%)", { type: "format-number", code: "0.00%" }, <Percent size={15} />, false, false, "प्रतिशत"),
      btn("increase-decimal", "Add decimal", "Show one more decimal place", { type: "action", id: "decimal-more" }, <Plus size={12} />, false, false, "अंक +"),
      btn("decrease-decimal", "Remove decimal", "Show one fewer decimal place", { type: "action", id: "decimal-less" }, <Minus size={12} />, false, false, "अंक −"),
    ],
  };

  /** Home ▸ Conditional Formatting — dialog plus the one-click rules. */
  const conditional: RibbonGroup = {
    title: "Conditional Formatting · सशर्त फ़ॉर्मैट",
    items: [
      btn("cf-dialog", "Rules…", "Full dialog: greater than, top N, duplicates, data bars, scales", { type: "action", id: "cf-dialog" }, <PaintBucket size={15} />, false, true, "नियम"),
      btn("cf-good2", "Good", "Green for above average", { type: "action", id: "cf-good" }, <span className="text-[12px]">✓</span>, false, false, "अच्छा"),
      btn("cf-bad2", "Bad", "Red for below average", { type: "action", id: "cf-bad" }, <span className="text-[12px]">✕</span>, false, false, "ख़राब"),
      btn("cf-bars2", "Bars", "Data bars on this column", { type: "action", id: "cf-bars" }, <span className="text-[12px]">▮▮</span>, false, false, "बार"),
      btn("cf-scale2", "Scale", "3-colour scale", { type: "action", id: "cf-scale" }, <span className="text-[12px]">◧</span>, false, false, "स्केल"),
    ],
  };

  const styles: RibbonGroup = {
    title: "Cell Styles · सेल स्टाइल",
    items: [
      btn("header-style", "Header", "Format as a table header row", { type: "action", id: "header-style" }, <Table2 size={15} />, false, false, "शीर्षक"),
      btn("total-style", "Total", "Bold + a number format, like a totals row", { type: "action", id: "total-style" }, <Sigma size={15} />, false, false, "कुल"),
    ],
  };

  const cellsGroup: RibbonGroup = {
    title: "Cells · सेल",
    items: [
      btn("insert-row", "Insert row", "Insert a blank row above", { type: "action", id: "insert-row" }, <span className="text-[12px]">⤒</span>, false, false, "पंक्ति जोड़ो"),
      btn("delete-row", "Delete row", "Delete this row and move up", { type: "action", id: "delete-row" }, <span className="text-[12px]">⤓</span>, false, false, "पंक्ति हटाओ"),
      btn("insert-col", "Insert column", "Insert a column to the left", { type: "action", id: "insert-col" }, <span className="text-[12px]">⇤</span>, false, false, "कॉलम जोड़ो"),
      btn("delete-col", "Delete column", "Delete this column", { type: "action", id: "delete-col" }, <span className="text-[12px]">⇥</span>, false, false, "कॉलम हटाओ"),
      btn("format-cells", "Format Cells", "Number, fill, alignment, wrap (Ctrl+1)", { type: "action", id: "format-cells" }, <span className="text-[12px] font-mono">↔</span>, false, true, "फ़ॉर्मैट सेल"),
    ],
  };

  const editing: RibbonGroup = {
    title: "Editing · एडिटिंग",
    items: [
      btn("autosum", "AutoSum", "AutoSum (Alt+=)", { type: "action", id: "autosum" }, <Sigma size={15} />, false, true, "ऑटोसम"),
      btn("flash", "Flash Fill", "Flash Fill (Ctrl+E)", { type: "action", id: "flash" }, <Wand2 size={15} />, false, false, "फ़्लैश फ़िल"),
      btn("fill-down", "Fill down", "Copy this cell down the block (Ctrl+D)", { type: "action", id: "fill-down" }, <span className="text-[12px]">⇩</span>, false, false, "नीचे भरो"),
      btn("sort-asc", "A→Z", "Sort whole rows A→Z on this column", { type: "action", id: "sort-asc" }, <ArrowDownAZ size={15} />, false, false, "अ→ज्ञ"),
      btn("sort-desc", "Z→A", "Sort whole rows Z→A on this column", { type: "action", id: "sort-desc" }, <ArrowUpAZ size={15} />, false, false, "ज्ञ→अ"),
      btn("filter", "Filter", "Excel AutoFilter — failing rows hide", { type: "action", id: "filter" }, <Filter size={15} />, false, true, "फ़िल्टर"),
      btn("find", "Find & Replace", "Find or replace text (Ctrl+F / Ctrl+H)", { type: "action", id: "find" }, <Search size={15} />, false, true, "खोजो"),
    ],
  };

  /* ============================= INSERT ============================= */

  const tables: RibbonGroup = {
    title: "Tables · टेबल",
    items: [
      btn("table", "Table", "Format the range as a table", { type: "action", id: "header-style" }, <Table2 size={15} />, false, true, "टेबल"),
      btn("pivot", "PivotTable", "Summarise this data (needs the desktop Excel engine)", { type: "action", id: "pivot" }, <LayoutGrid size={15} />, false, true, "पिवट"),
    ],
  };

  const illustrations: RibbonGroup = {
    title: "Illustrations · चित्र",
    items: [
      btn("chart", "Chart", "Build a chart from the selection (F11)", { type: "action", id: "chart" }, <TrendingUp size={15} />, false, true, "चार्ट"),
      btn("image", "Picture", "Insert an image in the cell", { type: "action", id: "image" }, <span className="text-[12px]">🖼</span>, false, false, "तस्वीर"),
      btn("shapes", "Shapes", "Insert a shape or arrow", { type: "action", id: "shapes" }, <span className="text-[12px]">◻</span>, false, false, "आकृति"),
      btn("sparkline", "Sparkline", "One-cell mini chart of this row", { type: "action", id: "sparkline" }, <span className="text-[12px]">▁▄█</span>, false, false, "स्पार्क"),
    ],
  };

  const links: RibbonGroup = {
    title: "Links & Text · लिंक",
    items: [
      btn("link", "Link", "Insert a hyperlink", { type: "action", id: "link" }, <span className="text-[12px]">🔗</span>, false, false, "लिंक"),
      btn("comment-insert", "Comment", "Add a note to this cell (Shift+F2)", { type: "action", id: "comment-insert" }, <MessageSquare size={15} />, false, false, "टिप्पणी"),
      btn("symbol", "Symbol", "Insert a currency or symbol", { type: "action", id: "symbol" }, <span className="text-[12px]">₹</span>, false, false, "चिह्न"),
      btn("insert-function", "Function", "Browse all formulas (Shift+F3)", { type: "action", id: "insert-function" }, <Calculator size={15} />, false, false, "फ़ंक्शन"),
    ],
  };

  /* =========================== PAGE LAYOUT ========================== */

  const themesGroup: RibbonGroup = {
    title: "Themes · थीम",
    items: [
      btn("theme-system", "Theme", "Follow the app's light/dark theme", { type: "action", id: "theme" }, <span className="text-[12px]">◐</span>, false, true, "थीम"),
      btn("theme-print", "Print look", "A4 paper preview, like Excel's page view", { type: "action", id: "paper-view" }, <span className="text-[12px]">▤</span>, false, false, "प्रिंट"),
    ],
  };

  const pageSetup: RibbonGroup = {
    title: "Page Setup · पेज सेटअप",
    items: [
      btn(
        "margins",
        "Margins",
        "Normal / Wide / Narrow margins",
        { type: "action", id: "margins" },
        <span className="text-[12px]">▭</span>,
        false,
        false,
        "मार्जिन",
      ),
      btn(
        "orientation",
        "Orientation",
        printSetup?.orientation === "landscape" ? "Landscape (click for portrait)" : "Portrait (click for landscape)",
        { type: "action", id: "orientation" },
        <span className="text-[12px]">{printSetup?.orientation === "landscape" ? "▭" : "▯"}</span>,
        printSetup?.orientation === "landscape",
        false,
        "दिशा",
      ),
      btn("paper-size", "Size", "Paper size: A4 / Letter / Legal", { type: "action", id: "paper-size" }, <span className="text-[12px]">A4</span>, false, false, "काग़ज़"),
      btn("print-area", "Print Area", "Set the range that prints", { type: "action", id: "print-area" }, <span className="text-[12px]">⎙</span>, false, false, "प्रिंट क्षेत्र"),
      btn("page-breaks", "Breaks", "Insert a page break in the printout", { type: "action", id: "page-break" }, <span className="text-[12px]">┆</span>, false, false, "ब्रेक"),
    ],
  };

  const sheetOptions: RibbonGroup = {
    title: "Sheet Options · शीट विकल्प",
    items: [
      btn("gridlines-view", "Gridlines", "Show or hide gridlines", { type: "action", id: "gridlines" }, <Grid3x3 size={15} />, false, false, "ग्रिड"),
      btn("print-gridlines", "Print gridlines", "Print the cell borders too", { type: "action", id: "print-gridlines" }, <Printer size={15} />, printSetup?.gridlines, false, "प्रिंट ग्रिड"),
      btn("print-titles", "Print titles", "Repeat the header row on every page", { type: "action", id: "print-titles" }, <span className="text-[12px]">1:1</span>, Boolean(printSetup?.titleRows), false, "शीर्षक"),
    ],
  };

  const scaleGroup: RibbonGroup = {
    title: "Scale to Fit · फ़िट",
    items: [
      btn(
        "fit-to-page",
        "Fit to page",
        "Shrink the sheet so it fits one page wide",
        { type: "action", id: "fit-to-page" },
        <span className="text-[12px]">⤢</span>,
        printSetup?.fitToPage,
        false,
        "फ़िट",
      ),
      btn("print-preview", "Print sheet", "Print or save as PDF (Ctrl+P)", { type: "action", id: "print" }, <Printer size={15} />, false, true, "प्रिंट"),
    ],
  };

  /* ============================ FORMULAS ============================ */

  const functionLibrary: RibbonGroup = {
    title: "Function Library · फ़ंक्शन लाइब्रेरी",
    items: [
      btn("insert-fn", "Insert Function", "Browse all 400+ formulas (Shift+F3)", { type: "action", id: "insert-function" }, <Calculator size={15} />, false, true, "फ़ंक्शन"),
      btn("autosum2", "AutoSum", "AutoSum (Alt+=)", { type: "action", id: "autosum" }, <Sigma size={15} />, false, false, "ऑटोसम"),
      btn("recalc", "Calculate now", "Recalculate the sheet (F9)", { type: "action", id: "recalc" }, <span className="text-[12px]">⟳</span>, false, false, "गणना"),
      btn("fx-panel", "Formula help", "Hindi explanation of the selected formula", { type: "action", id: "formula-help" }, <span className="font-serif italic text-[13px]">fx</span>, false, false, "मदद"),
    ],
  };

  const definedNames: RibbonGroup = {
    title: "Defined Names · नाम",
    items: [
      btn("names", "Name Manager", "Name a range, then use =SUM(Sales)", { type: "action", id: "names" }, <span className="text-[12px] font-mono">fx</span>, false, true, "नाम"),
      btn("name-box2", "Define Name", "Create a name from the selection", { type: "action", id: "define-name" }, <span className="text-[11px] font-mono">A1</span>, false, false, "नाम दो"),
    ],
  };

  const auditGroup: RibbonGroup = {
    title: "Formula Auditing · जाँच",
    items: [
      btn("trace-precedents", "Trace Precedents", "Which cells feed this formula?", { type: "action", id: "trace-precedents" }, <span className="text-[12px]">◀</span>, false, true, "स्रोत"),
      btn(
        "trace-dependents",
        "Trace Dependents",
        "Which formulas use this cell?",
        { type: "action", id: "trace-dependents" },
        <span className="text-[12px]">▶</span>,
        false,
        true,
        "उपयोग",
      ),
      btn("remove-arrows", "Remove Arrows", "Hide the audit trails", { type: "action", id: "remove-arrows" }, <span className="text-[12px]">✕</span>, false, false, "हटाओ"),
      btn("show-formulas", "Show Formulas", "Show every formula instead of its result (Ctrl+`)", { type: "action", id: "show-formulas" }, <span className="text-[12px]">=</span>, false, true, "फ़ॉर्मूले"),
      btn("show-references", "Find references", "List formulas that mention a word", { type: "action", id: "find-refs" }, <Search size={14} />, false, false, "संदर्भ"),
    ],
  };

  const calculation: RibbonGroup = {
    title: "Calculation · गणना",
    items: [
      btn("calc-options", "Calculation options", "Automatic vs manual recalculation", { type: "action", id: "calc-options" }, <span className="text-[12px]">⚙</span>, false, false, "विकल्प"),
      btn("goto-f5", "Go To", "Jump to a cell, range or name (F5)", { type: "action", id: "goto-dialog" }, <span className="text-[11px] font-mono">F5</span>, false, false, "जाओ"),
    ],
  };

  /* ============================== DATA ============================== */

  const sortFilter: RibbonGroup = {
    title: "Sort & Filter · क्रम",
    items: [
      btn("sort-asc2", "A→Z", "Sort whole rows A→Z on this column", { type: "action", id: "sort-asc" }, <ArrowDownAZ size={15} />, false, true, "अ→ज्ञ"),
      btn("sort-desc2", "Z→A", "Sort whole rows Z→A on this column", { type: "action", id: "sort-desc" }, <ArrowUpAZ size={15} />, false, true, "ज्ञ→अ"),
      btn("filter2", "AutoFilter", "Excel AutoFilter: condition chuno, failing rows chhup jaayengi", { type: "action", id: "filter" }, <Filter size={15} />, false, true, "फ़िल्टर"),
      btn("filter-clear", "Clear", "Clear the filter — all rows visible", { type: "action", id: "filter:clear" }, <X size={14} />, false, false, "हटाओ"),
      btn("sort-dialog", "Sort", "Sort by any column, with headers", { type: "action", id: "sort-dialog" }, <span className="text-[12px]">⇅</span>, false, false, "क्रम"),
    ],
  };

  const dataValidation: RibbonGroup = {
    title: "Data Validation · डेटा वैलिडेशन",
    items: [
      btn("validation", "Data Validation", "Allow only certain values / make a dropdown (Alt+A+V+V)", { type: "action", id: "validation" }, <ShieldCheck size={15} />, false, true, "वैलिडेशन"),
      btn("validation-check", "Circle invalid", "Check a cell against its validation rule", { type: "action", id: "validation-check" }, <span className="text-[12px]">◎</span>, false, false, "जाँच"),
    ],
  };

  const dataTools: RibbonGroup = {
    title: "Data Tools · डेटा टूल्स",
    items: [
      btn("text-to", "Text to columns", "Split a column on a delimiter", { type: "action", id: "text-to-columns" }, <span className="text-[12px]">⇹</span>, false, false, "बाँटो"),
      btn("flash-fill2", "Flash Fill", "Infer the pattern from your examples (Ctrl+E)", { type: "action", id: "flash" }, <Wand2 size={15} />, false, false, "फ़्लैश"),
      btn("dedupe", "Remove duplicates", "Remove duplicate rows, keep the first", { type: "action", id: "dedupe" }, <Trash size={15} />, false, true, "डुप्लिकेट"),
      btn("data-form", "Data form", "Open the data-entry form (Alt+D then O)", { type: "action", id: "data-form" }, <span className="text-[12px]">▤</span>, false, true, "फ़ॉर्म"),
    ],
  };

  const connections: RibbonGroup = {
    title: "Get & Transform · डेटा लाओ",
    items: [
      btn("import", "From file", "Open an .xlsx or .csv into this sheet", { type: "action", id: "import-file" }, <FileSpreadsheet size={15} />, false, true, "फ़ाइल"),
      btn("power-query", "Power Query", "Clean and combine data (desktop Excel feature)", { type: "action", id: "power-query" }, <span className="text-[12px]">⛁</span>, false, false, "क्वेरी"),
      btn("sort-outline", "Subtotal", "Insert SUBTOTAL rows", { type: "action", id: "subtotal" }, <Sigma size={15} />, false, false, "उप-योग"),
    ],
  };

  /* ============================= REVIEW ============================= */

  const proofing: RibbonGroup = {
    title: "Proofing · जाँच",
    items: [
      btn("spell", "Spelling", "Check the sheet for spelling mistakes (F7)", { type: "action", id: "spell" }, <ListChecks size={15} />, false, true, "वर्तनी"),
      btn("thesaurus", "Thesaurus", "Hindi/English word suggestions", { type: "action", id: "thesaurus" }, <Languages size={15} />, false, false, "समानार्थी"),
      btn("translate", "Translate", "Translate a cell with the AI tutor", { type: "action", id: "translate" }, <Languages size={15} />, false, false, "अनुवाद"),
    ],
  };

  const comments: RibbonGroup = {
    title: "Comments · टिप्पणी",
    items: [
      btn("comment-new", "New comment", "Leave a note on this cell (Shift+F2)", { type: "action", id: "comment-insert" }, <MessageSquare size={15} />, false, true, "टिप्पणी"),
      btn("comment-list", "Show comments", "See every note in this sheet", { type: "action", id: "comment-list" }, <span className="text-[12px]">▥</span>, false, false, "सूची"),
      btn("comment-delete", "Delete comment", "Remove this cell's note", { type: "action", id: "comment-delete" }, <X size={14} />, false, false, "हटाओ"),
    ],
  };

  const protect: RibbonGroup = {
    title: "Protect · सुरक्षा",
    items: [
      btn("protect-sheet", "Protect sheet", "Lock the sheet so cells cannot be edited", { type: "action", id: "protect-sheet" }, <ShieldCheck size={15} />, false, true, "लॉक"),
      btn("protect-workbook", "Protect workbook", "Lock the sheet tabs", { type: "action", id: "protect-workbook" }, <span className="text-[12px]">🔒</span>, false, false, "वर्कबुक"),
      btn("allow-edit", "Allow edit ranges", "Unlock just the input cells", { type: "action", id: "allow-edit" }, <span className="text-[12px]">✎</span>, false, false, "छूट"),
    ],
  };

  const reviewInfo: RibbonGroup = {
    title: "Workbook · वर्कबुक",
    items: [
      btn("doc-props", "Properties", "Author, title, company — the file's own details", { type: "action", id: "doc-props" }, <FileSpreadsheet size={15} />, false, true, "विवरण"),
      btn("check-access", "Check accessibility", "Missing headers, colours or labels", { type: "action", id: "check-access" }, <ListChecks size={15} />, false, true, "पहुँच"),
      btn("check-compat", "Check compatibility", "What desktop Excel still needs", { type: "action", id: "check-compat" }, <span className="text-[12px]">ⓘ</span>, false, false, "संगतता"),
    ],
  };

  /* ============================== VIEW ============================== */

  const viewGroup: RibbonGroup = {
    title: "Window & View · व्यू",
    items: [
      btn("freeze", "Freeze panes", "Freeze the header row while scrolling", { type: "action", id: "freeze" }, <span className="text-[12px]">▤</span>, false, true, "फ़्रीज़"),
      btn("split", "Split", "Split the window like View ▸ Split", { type: "action", id: "split" }, <span className="text-[12px]">◫</span>, false, false, "बाँटो"),
      btn("keyboard", "Virtual keyboard", "On-screen Excel keyboard (Ctrl+Shift+F1)", { type: "action", id: "keyboard" }, <span className="text-[12px]">⌨</span>, false, false, "कीबोर्ड"),
      btn("gridlines2", "Gridlines", "Toggle the cell borders", { type: "action", id: "gridlines" }, <Grid3x3 size={15} />, false, false, "ग्रिड"),
      btn("zoom-in", "Zoom +", "Zoom in like View ▸ Zoom", { type: "action", id: "zoom-in" }, <ZoomIn size={14} />, false, false, "ज़ूम +"),
      btn("zoom-out", "Zoom −", "Zoom out", { type: "action", id: "zoom-out" }, <ZoomOut size={14} />, false, false, "ज़ूम −"),
      btn("wide", "Full screen", "Hide the brief and give the sheet the whole screen", { type: "action", id: "focus" }, <Monitor size={15} />, false, true, "फ़ुल स्क्रीन"),
    ],
  };

  const showGroup: RibbonGroup = {
    title: "Show · दिखाओ",
    items: [
      btn("formulas-view", "Show formulas", "See the formulas instead of results", { type: "action", id: "show-formulas" }, <span className="text-[12px]">=</span>, false, false, "फ़ॉर्मूले"),
      btn("notes-view", "Show notes", "Display the cell notes", { type: "action", id: "comment-list" }, <MessageSquare size={15} />, false, false, "नोट्स"),
      btn("sheet-tabs", "Sheet tabs", "New sheet tab", { type: "action", id: "insert-sheet" }, <Plus size={14} />, false, false, "नई शीट"),
    ],
  };

  /* ============================== HELP ============================== */

  const helpGroup: RibbonGroup = {
    title: "Help · सहायता",
    items: [
      btn("help", "Help", "What every tab does, in Hinglish", { type: "action", id: "help" }, <HelpCircle size={15} />, false, true, "मदद"),
      btn("contact", "Contact support", "Ask Aarohi, the AI tutor", { type: "action", id: "contact-support" }, <Sparkles size={15} />, false, true, "सहायता"),
      btn("whats-new", "What's new", "Recently added Excel features", { type: "action", id: "whats-new" }, <Sparkles size={15} />, false, false, "नया"),
      btn("keyboard-help", "Shortcuts", "Every keyboard shortcut this sheet supports", { type: "action", id: "shortcuts" }, <span className="text-[12px]">⌨</span>, false, false, "शॉर्टकट"),
    ],
  };

  const aboutGroup: RibbonGroup = {
    title: "About · परिचय",
    items: [
      btn("about", "About this sheet", "Formula engine, limits and how the .xlsx hand-off works", { type: "action", id: "about" }, <FileSpreadsheet size={15} />, false, true, "परिचय"),
      btn("excel-help", "Open in Excel", "Download the .xlsx and continue in real Excel", { type: "action", id: "download-xlsx" }, <FileSpreadsheet size={15} />, false, true, "एक्सेल"),
      btn("free", "Everything free", "What is free here, itemised", { type: "action", id: "free-page" }, <span className="text-[12px]">✓</span>, false, false, "फ़्री"),
    ],
  };

  const groups: Record<Exclude<RibbonTab, "file">, RibbonGroup[]> = {
    home: [clipboard, font, alignment, number, styles, conditional, cellsGroup, editing],
    insert: [tables, illustrations, links, { title: "Data · डेटा", items: [btn("data-form2", "Data form", "Data-entry form", { type: "action", id: "data-form" }, <span className="text-[12px]">▤</span>, false, false, "फ़ॉर्म"), btn("chart2", "Recommended chart", "Chart from the selection", { type: "action", id: "chart" }, <TrendingUp size={15} />, false, false, "चार्ट")] }],
    pageLayout: [themesGroup, pageSetup, sheetOptions, scaleGroup],
    formulas: [functionLibrary, definedNames, auditGroup, calculation, { title: "Sheets · शीट", items: [btn("insert-sheet2", "New sheet", "Insert a worksheet tab", { type: "action", id: "insert-sheet" }, <Plus size={14} />, false, false, "नई शीट")] }],
    data: [connections, sortFilter, dataValidation, dataTools, { title: "Outline · रूपरेखा", items: [btn("subtotal", "Subtotal", "Insert SUBTOTAL rows", { type: "action", id: "subtotal" }, <Sigma size={15} />, false, false, "उप-योग")] }],
    review: [proofing, comments, protect, reviewInfo],
    view: [viewGroup, showGroup, { title: "Zoom · ज़ूम", items: [btn("zoom-100", "100%", "Reset the zoom to 100%", { type: "action", id: "zoom-reset" }, <span className="text-[11px]">100%</span>, false, false, "सामान्य")] }],
    help: [helpGroup, aboutGroup],
  };

  /* ---------------------------- backstage ---------------------------- */

  const fileItems: { id: string; label: string; hindi: string; hint: string; icon: ReactNode }[] = [
    { id: "new", label: "New", hindi: "नया", hint: "Blank sheet", icon: <FileSpreadsheet size={15} /> },
    { id: "open", label: "Open", hindi: "खोलो", hint: "Open an .xlsx or .csv", icon: <Clipboard size={15} /> },
    { id: "save", label: "Save", hindi: "सेव", hint: "Saved automatically to your account", icon: <span className="text-[12px]">💾</span> },
    { id: "print", label: "Print", hindi: "प्रिंट", hint: "Print or save as PDF", icon: <Printer size={15} /> },
    { id: "download", label: "Export", hindi: "डाउनलोड", hint: "Download as a real .xlsx", icon: <FileSpreadsheet size={15} /> },
    { id: "reset", label: "Reset sheet", hindi: "रीसेट", hint: "Restore the practice data", icon: <Eraser size={15} /> },
    { id: "props", label: "Properties", hindi: "विवरण", hint: "Title, author, company", icon: <span className="text-[12px]">ⓘ</span> },
    { id: "close", label: "Close", hindi: "बंद", hint: "Back to the sheet", icon: <X size={15} /> },
  ];

  const fileActions: Record<string, RibbonCommand> = {
    new: { type: "action", id: "new-sheet" },
    open: { type: "action", id: "import-file" },
    save: { type: "action", id: "save-now" },
    print: { type: "action", id: "print" },
    download: { type: "action", id: "download-xlsx" },
    reset: { type: "action", id: "reset" },
    props: { type: "action", id: "doc-props" },
    close: { type: "action", id: "file-close" },
  };

  return (
    <div className="no-print border-b border-(--color-border) bg-(--color-surface)">
      {/* Tab strip — all nine, in Excel's order */}
      <div aria-label="Ribbon tabs" role="tablist" className="flex items-center gap-0.5 px-2 pt-1.5 overflow-x-auto">
        {RIBBON_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={activeTab === item.id}
            aria-label={item.label}
            title={`${item.label} · ${item.hindi}`}
            className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-t-lg border-b-2 transition whitespace-nowrap ${
              activeTab === item.id
                ? "border-(--color-accent) text-(--color-accent-dark) bg-(--color-accent-soft)"
                : "border-transparent text-(--color-muted) hover:text-(--color-ink)"
            }`}
          >
            {item.label}
            <span className="hidden md:inline text-[10px] font-normal text-(--color-muted) ml-1">{item.hindi}</span>
          </button>
        ))}
        <span className="ml-auto text-[10px] text-(--color-muted) hidden lg:inline pr-1">Excel ke 9 tabs — wahi groups, wahi jagah</span>
      </div>

      {activeTab === "file" ? (
        /* File ▸ backstage: a full panel, like Excel's */
        <div aria-label="File backstage" className="bg-(--color-surface-2) border-t border-(--color-border) p-2 sm:p-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {fileItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => {
                  run(fileActions[item.id]);
                  if (item.id === "close") setTab("home");
                }}
                className="flex flex-col items-start gap-0.5 rounded-lg border border-(--color-border) bg-(--color-surface) px-2.5 py-2 text-left hover:border-(--color-accent) hover:bg-(--color-accent-soft)"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-(--color-ink)">
                  {item.icon}
                  {item.label}
                </span>
                <span className="text-[10px] font-semibold text-(--color-accent-dark)">{item.hindi}</span>
                <span className="text-[9px] text-(--color-muted) leading-tight">{item.hint}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-(--color-muted) mt-2">
            Excel ka <b>File</b> tab (Backstage view) — नया, खोलो, सेव, प्रिंट, डाउनलोड. Aapka kaam har edit par
            apne aap save hota hai.
          </p>
        </div>
      ) : (
        /* Groups */
        <div role="group" aria-label="Ribbon groups" className="flex gap-0 overflow-x-auto px-1 py-1.5 bg-(--color-surface-2) border-t border-(--color-border)">
          {groups[activeTab].map((group) => (
            <div key={group.title} className="flex flex-col justify-between px-1.5 border-r border-(--color-border) last:border-r-0 shrink-0">
              <div className="flex items-start gap-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    title={`${item.label}${item.hindi ? ` · ${item.hindi}` : ""} — ${item.hint}`}
                    onClick={() => run(item.command)}
                    className={`flex ${item.wide ? "flex-row gap-1 px-2" : "flex-col"} items-center justify-center gap-0.5 min-w-8 px-1.5 py-1 rounded-md text-[10px] font-semibold transition ${
                      item.active ? "bg-(--color-accent) text-white" : "text-(--color-ink) hover:bg-(--color-accent-soft)"
                    }`}
                  >
                    {item.icon}
                    <span className="flex flex-col items-center leading-none">
                      <span className={item.wide ? "text-[10px]" : "text-[9px] text-center"}>{item.label}</span>
                      {item.hindi && (
                        <span className={`text-[8px] text-center ${item.active ? "text-white/80" : "text-(--color-muted)"}`}>{item.hindi}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-center text-(--color-muted) mt-0.5">{group.title}</div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div className="px-2.5 py-1 text-[10px] text-(--color-muted) border-t border-(--color-border) truncate">{message}</div>
      )}
    </div>
  );
}
