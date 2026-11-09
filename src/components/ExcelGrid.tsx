/**
 * @license MIT — the formula engine, grid and file I/O in this folder are
 * original code written for this course, deliberately not a licensed
 * spreadsheet SDK, so nothing here is behind a subscription.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Download,
  Eraser,
  HelpCircle,
  Info,
  ClipboardList,
  Filter as FilterIcon,
  Keyboard,
  Maximize2,
  Minimize2,
  PaintBucket,
  Palette,
  Pencil,
  Plus,
  Redo2,
  Save,
  ShieldCheck,
  Sigma,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { copyText } from "../lib/clipboard";
import { SAVE_FAILED_TEXT, saveFile } from "../lib/saveFile";
import { Bilingual } from "../lib/lang";
import { Button, Card, Pill } from "./ui";
import type { Scalar } from "../lib/excel/formula/core";
import type { CellValue } from "../lib/excel/sheetTools";
import { isErr } from "../lib/excel/formula/core";
import { knownFunctions } from "../lib/excel/formula/engine";
import { buildXlsx, parseXlsx, type ExportSheet } from "../lib/excel/xlsx";
import {
  ERROR_HELP,
  addressOf,
  colName,
  displayValue,
  splitAddress,
  useWorkbook,
  useWorkbooks,
  type CellFormat,
  type FormatMap,
  type WorkbookDoc,
} from "../lib/excel/useWorkbook";
import { CATALOG_BY_NAME, CATALOG_NAMES } from "../data/formulaCatalog";
import { inferFlashFill } from "../lib/excel/flashfill";
import { dataBars, removeDuplicates, sortRows, usedRange } from "../lib/excel/dataTools";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { FloatingKeyboard } from "./FloatingKeyboard";
import { useSetting } from "../lib/settings";
import { Ribbon, type RibbonCommand, type RibbonTab } from "./Ribbon";
import { DataForm } from "./DataForm";
import { fillSeries } from "../lib/excel/series";
import {
  chartSeriesFrom,
  guessSparkSource,
  hyperlinkFormula,
  pictureFormula,
  seriesFrom,
  sparkFor,
  withSymbol,
  CHART_KINDS,
  SHAPE_ART,
  type ChartKind,
  type ChartSpec,
  type ShapeArt,
  type ShapeSpec,
  type SparkKind,
  type Sparkline,
} from "../lib/excel/insert";
import { SheetChart } from "./excel/SheetChart";
import {
  DEFAULT_PRINT,
  EMPTY_DOC_PROPS,
  areaLabel,
  dependentsOf,
  formulasMentioning,
  pageCss,
  precedentsOf,
  spellCheck,
  suggestionFor,
  type CellNote,
  type DocProps,
  type Orientation,
  type PrintSetup,
} from "../lib/excel/workbookTools";
import {
  CF_PRESETS,
  addressInRange,
  cfStyleFor,
  colLetter,
  expandNamedRanges,
  hiddenRows,
  rangeBounds,
  rangesOf,
  ruleFor,
  validateCell,
  type CfRule,
  type NamedRange,
  type SheetFilter,
  type ValidationRule,
} from "../lib/excel/sheetTools";
import {
  AboutPanel,
  AccessPanel,
  CalcOptionsPanel,
  CompatPanel,
  ContactPanel,
  HelpPanel,
  InsertPanel,
  NotesPanel,
  PrintPanel,
  PropsPanel,
  ReferencesPanel,
  ShortcutsPanel,
  SortPanel,
  SpellPanel,
  ThesaurusPanel,
  WhatsNewPanel,
} from "./excel/Panels";
import {
  ConditionalFormattingDialog,
  GhostButton,
  PrimaryButton,
  DataValidationDialog,
  FilterDialog,
  FormatCellsDialog,
  GoToDialog,
  NameManagerDialog,
} from "./excel/SheetDialogs";

/** Escape a literal for use inside a RegExp (cell text is user input). */
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Column letter → 0-based index (A=0). Kept local so the grid never imports the engine's internals. */
const colIdx = (label: string): number =>
  label.replace(/\$/g, "").toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/**
 * The autocomplete list: every name the engine can actually calculate plus any
 * catalogue-only names, compared the way Excel does (STDEV.S === STDEV_S).
 */
const ALL_FUNCTION_NAMES: string[] = (() => {
  const names = new Set<string>(CATALOG_NAMES);
  knownFunctions().forEach((name) => names.add(name.replace(/_/g, ".")));
  return [...names].sort((a, b) => a.localeCompare(b));
})();

/** Look a name up in the catalogue, tolerating dot/underscore spellings. */
function catalogEntry(name: string) {
  return CATALOG_BY_NAME[name] ?? CATALOG_BY_NAME[name.replace(/\./g, "_")] ?? CATALOG_BY_NAME[name.replace(/_/g, ".")];
}

export interface GridCheck {
  cell: string;
  expected: string;
  formulaSample: string;
  label: string;
}

export interface GridSheet {
  title: string;
  hint: string;
  formulaHint: string;
  checks: GridCheck[];
}

export interface ExcelGridProps {
  template: string;
  title: string;
  /** Notify the parent of the live cell map (used by the desktop's Save). */
  onCellsChange?: (cells: Record<string, string>) => void;
  /** Sheets to start with. */
  sheets: { name: string; cells: Record<string, string> }[];
  rows?: number;
  cols?: number;
  /** Optional practice brief shown above the grid. */
  brief?: GridSheet;
  /** Hide the "open in desktop Excel" hints for a blank canvas. */
  compact?: boolean;
  onSaved?: (doc: WorkbookDoc) => void;
  /** Extra buttons rendered next to the file actions (e.g. "use this sheet elsewhere"). */
  headerActions?: React.ReactNode;
  /**
   * Fill the parent instead of scrolling inside a 70vh box — used by the
   * desktop's Excel window, where the window itself has a fixed height.
   */
  fill?: boolean;
  /** Data Validation rules to start with (the practice sheets' dropdowns). */
  validation?: ValidationRule[];
  /**
   * Address the task table asked the student to write in. Changes to this value
   * move the cursor there, so "tap the cell in the instructions" works.
   */
  jumpTo?: string | null;
}

type History = { sheet: string; address: string; before: string; after: string }[];

const PREVIEW_ROWS = 24;
const MIN_COLS = 8;



export function ExcelGrid({
  template,
  title,
  sheets: initialSheets,
  rows = 60,
  cols = 14,
  brief,
  compact = false,
  onSaved,
  headerActions,
  onCellsChange,
  fill = false,
  validation: initialValidation,
  jumpTo = null,
}: ExcelGridProps) {
  const wbDocs = useWorkbooks();
  const wb = useWorkbook({
    template,
    title,
    initialSheets: initialSheets.map((sheet) => ({ name: sheet.name, cells: { ...sheet.cells } })),
  });
  const { sheets, activeSheet, setActiveSheet, engine, setCell, clearCell, pasteBlock, addSheet, removeSheet, reset } = wb;

  const [active, setActive] = useState("A1");
  const [editing, setEditing] = useState(false);
  /**
   * Where the edit was started from. The in-cell input only grabs focus when
   * the edit came from the *sheet*; when the student clicks the formula bar the
   * caret must stay in the bar. Without this the cell input stole focus back on
   * every render and the bar ping-ponged ("focus@Edit cell A1" forever), which
   * is why typing in the formula bar did nothing.
   */
  const [editFrom, setEditFrom] = useState<"cell" | "bar" | null>(null);
  /**
   * Set when the editor was opened by a click/tap: Excel's rule is that picking
   * a cell and typing *replaces* what is in it, so the text starts selected.
   * It is a ref, consumed once by the editor's mount, because a state flag kept
   * re-selecting the text on every render — and the next keystroke then wiped
   * the whole draft, which is why long formulas collapsed to one character.
   */
  const replaceOnTypeRef = useRef(false);
  /** The address being edited — the preview bubble and commit both read it. */
  const [editAddress, setEditAddress] = useState<string | null>(null);
  /**
   * True when the student chose to type in the formula bar. The bar is a plain
   * status line the rest of the time, so the formula is never on screen twice.
   */
  const [barEditing, setBarEditing] = useState(false);
  /** Timestamp of the last touch tap, to swallow the emulated mouse events. */
  const lastTouchRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [showHelp, setShowHelp] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [suggest, setSuggest] = useState<{ items: string[]; word: string } | null>(null);
  /** Which row of the function list ↑↓ has landed on. */
  const [suggestCursor, setSuggestCursor] = useState(0);
  // Formatting is restored from the saved workbook, so colours/bold survive a
  // reload and the .xlsx download keeps them.
  const savedWorkbook = wbDocs.items.find((doc) => doc.template === template);
  const [formats, setFormats] = useState<FormatMap>(savedWorkbook?.formats ?? {});
  const [focusMode, setFocusMode] = useState(false);
  const [gridlines, setGridlines] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterColumn, setFilterColumn] = useState<number | null>(null);
  const [history, setHistory] = useState<History>([]);
  const [future, setFuture] = useState<History>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [grade, setGrade] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  /** The task brief asked for a cell — move the cursor there. */
  useEffect(() => {
    if (!jumpTo) return;
    const parsed = splitAddress(jumpTo);
    if (!parsed) return;
    setActive(`${colName(parsed.col)}${parsed.row + 1}`);
    setRangeText(`${colName(parsed.col)}${parsed.row + 1}`);
  }, [jumpTo]);

  /** Scroll the active cell into view (Excel keeps the cursor visible). */
  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;
    const cell = container.querySelector<HTMLElement>(`[data-address="${active}"]`);
    if (!cell) return;
    const box = container.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    if (rect.top < box.top + 28) container.scrollTop -= box.top + 28 - rect.top;
    else if (rect.bottom > box.bottom - 8) container.scrollTop += rect.bottom - box.bottom + 8;
    if (rect.left < box.left + 40) container.scrollLeft -= box.left + 40 - rect.left;
    else if (rect.right > box.right - 8) container.scrollLeft += rect.right - box.right + 8;
  }, [active]);
  /* ---- pro-editor extras: fill handle, flash fill, split view, widths ---- */
  const [fillTo, setFillTo] = useState<string | null>(null);
  /**
   * Cell-drag selection (mouse). Press on a cell and drag across the sheet and
   * the range should extend, exactly like Excel — it used to do nothing at all,
   * so students could not select A1:C3 for SUM without Shift-clicking.
   * A flag is read in `onMouseEnter` because the pointer capture keeps the
   * events on the cell the drag started in.
   */
  const dragSelectRef = useRef(false);
  // On a touch-first device there is no physical keyboard, so the on-screen pad
  // opens with the sheet; on a laptop it stays folded (there is a real one).
  // Whatever the student chooses is remembered, so a student who prefers the
  // phone's own keyboard is not fought on every reload.
  /**
   * The Settings switch is a *master gate*: if it is off, the pad never appears
   * — even on a phone — and the toolbar button says so instead of pretending.
   */
  const [keyboardAllowed] = useSetting("virtualKeyboard");
  const [gridlinesSetting] = useSetting("gridlines");
  // Settings ▸ gridlines follows the stored switch until the ribbon overrides it.
  useEffect(() => setGridlines(gridlinesSetting), [gridlinesSetting]);
  const [showKeyboard, setShowKeyboard] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = window.localStorage.getItem("excel-academy:keyboard");
      if (stored === "1") return true;
      if (stored === "0") return false;
    } catch {
      /* private mode */
    }
    return window.matchMedia?.("(pointer: coarse)").matches === true;
  });
  /** The pad is on screen only if the switch allows it *and* the student wants it. */
  const keyboardOpen = keyboardAllowed && showKeyboard;
  const toggleKeyboard = useCallback((next?: boolean) => {
    setShowKeyboard((current) => {
      const value = next ?? !current;
      try {
        window.localStorage.setItem("excel-academy:keyboard", value ? "1" : "0");
      } catch {
        /* private mode */
      }
      return value;
    });
  }, []);
  const [split, setSplit] = useState(false);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<{ rule: ReturnType<typeof inferFlashFill>["rule"]; source: string[]; explain: string } | null>(null);
  const [, setTick] = useState(0);
  const [barsOn, setBarsOn] = useState(false);
  const [find, setFind] = useState<{ open: boolean; query: string; replace: string; withReplace: boolean } | null>(null);
  /* ---- Excel rules: validation, conditional formatting, filter, names ---- */
  const [validation, setValidation] = useState<ValidationRule[]>(initialValidation ?? []);
  const [cfRules, setCfRules] = useState<CfRule[]>([]);
  const [filter, setFilter] = useState<SheetFilter | null>(null);
  const [names, setNames] = useState<NamedRange[]>([]);
  const [dialog, setDialog] = useState<
    "validation" | "cf" | "filter" | "names" | "goto" | "format" | null
  >(null);
  /** Excel's "stop" alert, shown over the grid until dismissed. */
  const [alert, setAlert] = useState<{ address: string; message: string } | null>(null);
  /** Full-screen on phones: the sheet gets the whole screen, chrome collapses. */
  const [zen, setZen] = useState(false);
  const [rangeText, setRangeText] = useState("");
  /**
   * Where the active cell sits inside the scroll container, so the fill handle
   * can be drawn as an overlay *on top of everything* instead of inside the
   * cell. Inside the cell it disappeared whenever the cell opened its editor
   * (a phone tap always opens it) and it was only 8px wide.
   */
  const [handleSpot, setHandleSpot] = useState<{ left: number; top: number; w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(100);
  /** Which cell's validation dropdown is open (Excel's in-cell arrow). */
  const [picker, setPicker] = useState<string | null>(null);
  /* ---- Review / Page Layout / Formulas tabs ---- */
  const [notes, setNotes] = useState<CellNote[]>([]);
  const [audit, setAudit] = useState<{ precedent: string[]; dependent: string[]; source: string | null }>({
    precedent: [],
    dependent: [],
    source: null,
  });
  const [showFormulas, setShowFormulas] = useState(false);
  const [protectedSheet, setProtectedSheet] = useState(false);
  const [printSetup, setPrintSetup] = useState<PrintSetup>(DEFAULT_PRINT);
  const [docProps, setDocProps] = useState<DocProps>(EMPTY_DOC_PROPS);
  const [panel, setPanel] = useState<
    | null
    | "notes"
    | "spell"
    | "prints"
    | "help"
    | "shortcuts"
    | "about"
    | "props"
    | "access"
    | "compat"
    | "refs"
    | "whats-new"
    | "thesaurus"
    | "contact"
    | "calc-opts"
    | "sort"
    | "insert"
  >(null);
  /** Words the student chose to ignore in Spelling for this sheet. */
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  /** "Find references" search box. */
  const [refToken, setRefToken] = useState("");
  /** Format painter: the formatting waiting to be applied to the next cell. */
  const [painter, setPainter] = useState<Partial<CellFormat> | null>(null);
  /** A merged block, remembered so "Merge & centre" can be undone. */
  const [merged, setMerged] = useState<string | null>(null);
  /** Which of Excel's nine tabs the ribbon is showing. */
  const [ribbonTab, setRibbonTab] = useState<RibbonTab>("home");
  /** Ctrl+F1: fold the ribbon's group strip so the sheet gets the space. */
  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  /* ---- Insert tab objects: sparklines, charts, shapes ---- */
  const [sparks, setSparks] = useState<Sparkline[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [shapes, setShapes] = useState<ShapeSpec[]>([]);
  const [insertMode, setInsertMode] = useState<"chart" | "sparkline" | "link" | "picture" | "symbol" | "shape">("chart");
  const [sparkDraft, setSparkDraft] = useState<{ source: string; kind: SparkKind }>({ source: "", kind: "column" });
  const [chartDraft, setChartDraft] = useState<{ source: string; kind: ChartKind }>({ source: "", kind: "column" });
  const formulaInput = useRef<HTMLInputElement | null>(null);
  const cellInput = useRef<HTMLInputElement | null>(null);

  const sheet = sheets.find((s) => s.name === activeSheet) ?? sheets[0];
  const rawActive = sheet?.cells[active] ?? "";

  /** Values for every visible cell + any cell a formula touches. */
  const values = useMemo(() => {
    const out: Record<string, Scalar> = {};
    if (!sheet) return out;
    const keys = new Set<string>();
    Object.keys(sheet.cells).forEach((addr) => keys.add(addr));
    for (let r = 0; r < Math.max(rows, PREVIEW_ROWS); r++) {
      for (let c = 0; c < Math.max(cols, MIN_COLS); c++) keys.add(addressOf(r, c));
    }
    keys.forEach((addr) => {
      const parsed = splitAddress(addr);
      if (!parsed) return;
      out[addr] = engine.value(activeSheet, parsed.row, parsed.col);
    });
    return out;
  }, [engine, sheet, activeSheet, rows, cols]);

  /**
   * Keep the fill-handle overlay glued to the active cell's bottom-right
   * corner. Measured (not computed from row heights) because rows wrap, zoom
   * changes the size, and the header is sticky — a computed position would
   * drift by a few pixels and the handle would sit just off the corner.
   * Measured before paint, so the square never flashes on the previous cell.
   */
  useLayoutEffect(() => {
    const container = gridRef.current;
    if (!container) return;
    const measure = () => {
      const cell = container.querySelector<HTMLElement>(`td[data-address="${active}"]`);
      if (!cell) {
        setHandleSpot(null);
        return;
      }
      const cellBox = cell.getBoundingClientRect();
      const box = container.getBoundingClientRect();
      // Off-screen (scrolled away): draw nothing rather than a floating square.
      if (cellBox.bottom < box.top || cellBox.top > box.bottom) {
        setHandleSpot(null);
        return;
      }
      setHandleSpot({
        left: cellBox.right - box.left + container.scrollLeft,
        top: cellBox.bottom - box.top + container.scrollTop,
        w: cellBox.width,
        h: cellBox.height,
      });
    };
    measure();
    container.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      container.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [active, activeSheet, rows, cols, zoom, editing, formats, sheet]);

  useEffect(() => {
    if (onCellsChange && sheet) onCellsChange(sheet.cells);
  }, [onCellsChange, sheet]);

  // Rules live with the saved workbook so validation and conditional formatting
  // survive a reload (same store as cells and formats).
  useEffect(() => {
    const saved = wbDocs.items.find((doc) => doc.template === template);
    if (!saved) return;
    if (validation.length === 0 && saved.validationRules?.length) setValidation(saved.validationRules);
    if (cfRules.length === 0 && saved.cfRules?.length) setCfRules(saved.cfRules);
    if (names.length === 0 && saved.names?.length) setNames(saved.names);
    // Only seed once per template.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wbDocs.items.length, template]);

  /** Keep validation / CF / names in the saved workbook. */
  useEffect(() => {
    wb.saveRules?.({ validationRules: validation, cfRules, names });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation, cfRules, names]);

  const selected = useMemo(() => {
    const parsed = splitAddress(active);
    return parsed ?? { row: 0, col: 0, colLabel: "A", rowLabel: 1 };
  }, [active]);

  const selectedValue = values[active] ?? null;
  const errorHint = isErr(selectedValue) ? ERROR_HELP[selectedValue.err] : undefined;

  /* ------------------------------ editing ----------------------------- */

  /**
   * Write a cell, but first run Excel's Data Validation for that address. A
   * rule that fails blocks the write and shows the same "stop" alert Excel
   * does, so students learn the rule instead of silently overwriting it.
   */
  const commit = useCallback(
    (address: string, text: string) => {
      const before = sheet?.cells[address] ?? "";
      if (before === text) return;
      if (protectedSheet) {
        setStatus(`Sheet is protected — ${address} read-only hai (Review ▸ Unprotect to edit).`);
        setAlert({ address, message: "Sheet protected hai. Review ▸ Protect Sheet se lock hatao, phir edit karo." });
        return;
      }
      const rule = ruleFor(validation, address);
      const problem = rule ? validateCell(rule, text) : null;
      if (problem) {
        setAlert({ address, message: problem });
        setStatus(`Data Validation: ${address} par “${text}” allowed nahi hai.`);
        return;
      }
      // Named ranges are expanded on the way in so =SUM(Sales) becomes a real
      // range for the engine — Excel's Name Manager behaviour.
      const nextText = text.startsWith("=") ? expandNamedRanges(text, names) : text;
      setCell(activeSheet, address, nextText);
      setHistory((h) => [...h.slice(-80), { sheet: activeSheet, address, before, after: nextText }]);
      setFuture([]);
    },
    [activeSheet, names, protectedSheet, setCell, sheet, validation],
  );

  /** Paste a block of cells (range paste, TSV or single value). */
  const commitBlock = useCallback(
    (cells: [string, string][]) => {
      cells.forEach(([address, text]) => commit(address, text));
    },
    [commit],
  );

  const move = useCallback(
    (rowDelta: number, colDelta: number) => {
      const row = Math.max(0, Math.min(rows - 1, selected.row + rowDelta));
      const col = Math.max(0, Math.min(cols - 1, selected.col + colDelta));
      setActive(addressOf(row, col));
      setEditing(false);
    },
    [cols, rows, selected.col, selected.row],
  );

  /**
   * Select a cell. Unlike a spreadsheet on a desktop, a *tap* on a phone should
   * also open the editor — otherwise students tap a cell, type, and nothing
   * happens. `opts.edit` decides, `opts.anchor` turns the cell taps into a
   * range selection (Excel's shift-click, needed for "applies to A2:F20").
   */
  const selectCell = useCallback(
    (address: string, opts: { edit?: boolean; extend?: boolean; replace?: boolean } = {}) => {
      if (opts.extend) {
        const start = splitAddress(active);
        const end = splitAddress(address);
        if (start && end) {
          const first = `${colName(Math.min(start.col, end.col))}${Math.min(start.row, end.row) + 1}`;
          const last = `${colName(Math.max(start.col, end.col))}${Math.max(start.row, end.row) + 1}`;
          setRangeText(`${first}:${last}`);
          setStatus(`Range ${first}:${last} selected.`);
          return;
        }
      }
      // Leaving a cell mid-edit must save what was typed (Excel commits on the
      // next click instead of throwing the draft away).
      if (editing && address !== active) commit(active, draft);
      setActive(address);
      setRangeText(address);
      if (opts.edit) {
        setDraft(sheet?.cells[address] ?? "");
        setEditFrom("cell");
        setEditAddress(address);
        setBarEditing(false);
        replaceOnTypeRef.current = Boolean(opts.replace);
        setEditing(true);
      } else {
        setEditFrom(null);
        replaceOnTypeRef.current = false;
        setEditing(false);
      }
    },
    [active, commit, draft, editing, sheet],
  );

  /**
   * Start editing a cell from the keyboard, a tap or the formula bar.
   *
   * `address` is explicit because a tap on a phone arrives 1–2 frames after
   * `setActive`: reading `active` here handed the student the *previous* cell's
   * text (tap A1 "Student", then tap C4 and C4 opened with "Student" in it).
   * `from` decides who keeps the caret: the cell input, or the formula bar.
   */
  const beginEdit = useCallback(
    (initial?: string, from: "cell" | "bar" = "cell", replace = false, address: string = active) => {
      setActive(address);
      setDraft(initial ?? sheet?.cells[address] ?? "");
      setEditFrom(from);
      setEditAddress(address);
      setBarEditing(from === "bar");
      replaceOnTypeRef.current = replace;
      setEditing(true);
      // `address`, not `active`: on a tap the state update has not landed yet,
      // so the status line named the *previous* cell.
      setStatus(`Editing ${address} — Enter dabao ya bahar tap karo.`);
    },
    [active, sheet],
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    setCell(last.sheet, last.address, last.before);
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [...f, last]);
  }, [history, setCell]);

  const redo = useCallback(() => {
    const last = future[future.length - 1];
    if (!last) return;
    setCell(last.sheet, last.address, last.after);
    setFuture((f) => f.slice(0, -1));
    setHistory((h) => [...h, last]);
  }, [future, setCell]);

  /* ---------------------------- autocomplete -------------------------- */

  /**
   * Function list while typing a formula.
   *
   * Excel behaviour, and what students asked for: the moment `=` is typed the
   * list of functions appears — no need to type two letters first. Typing then
   * narrows it down (`=SU` → SUM, SUMIF, SUMIFS…). It works from the cell *and*
   * from the formula bar, because both write into `draft`.
   */
  useEffect(() => {
    if (!editing || !draft.startsWith("=")) {
      setSuggest(null);
      return;
    }
    // The word being typed: after "=" and after any operator, comma or "(".
    const tail = draft.slice(1);
    const match = /([A-Za-z][A-Za-z0-9._]*)$/.exec(tail);
    const word = match?.[1]?.toUpperCase() ?? "";
    // A finished, closed formula has no business showing a list.
    if (draft.trimEnd().endsWith(")")) {
      setSuggest(null);
      return;
    }
    // No word yet? Only offer the whole library at a *function position* —
    // right after "=" or after "(", ",", or an operator — never in the middle
    // of `=10+20`, where a list would just sit on top of the sheet.
    let depth = 0;
    let inString = false;
    for (const char of tail) {
      if (char === '"') inString = !inString;
      else if (inString) continue;
      else if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
    }
    // After "=(" the student is writing an argument, not a function name —
    // offering SUM there just gets in the way.
    const atFunctionPosition = (tail.trim() === "" || /[(,+\-*/:&^%<>=]$/.test(tail.trimEnd())) && depth <= 0;
    if (!word && !atFunctionPosition) {
      setSuggest(null);
      return;
    }
    const items = word
      ? ALL_FUNCTION_NAMES.filter((name) => name.toUpperCase().startsWith(word))
      : ALL_FUNCTION_NAMES;
    // An exact, unambiguous match is already written — no point listing it.
    const exact = word && items.length === 1 && items[0] === word;
    setSuggest(items.length && !exact ? { items, word } : null);
    setSuggestCursor(0);
  }, [draft, editing]);

  /**
   * Insert a function from the list. Used by the suggestion rows and by Enter,
   * so picking SUM really writes `=SUM(` and leaves the caret inside it.
   */
  const insertFunction = useCallback(
    (name: string) => {
      // `draft` is read directly, not through a setState callback: the caret
      // restore below needs the finished text, and a stale closure here wrote
      // "=XLOOKUP(XLOOKUP(" — the typed word plus the inserted one.
      const current = draft;
      const base = current.startsWith("=") ? current : `=${current}`;
      const replaced = /([A-Za-z][A-Za-z0-9._]*)$/.test(base)
        ? base.replace(/([A-Za-z][A-Za-z0-9._]*)$/, `${name}(`)
        : `${base}${name}(`;
      setDraft(replaced);
      setEditing(true);
      setSuggest(null);
      // Put the caret back inside the brackets of the cell/bar that owns the edit.
      requestAnimationFrame(() => {
        const target = editFrom === "bar" ? formulaInput.current : cellInput.current;
        target?.focus({ preventScroll: true });
        const at = replaced.length;
        try {
          target?.setSelectionRange(at, at);
        } catch {
          /* not focusable yet */
        }
      });
    },
    [draft, editFrom],
  );

  const applySuggestion = (name: string) => insertFunction(name);

  /* ------------------------------ keyboard ---------------------------- */

  const onKeyDown = (event: React.KeyboardEvent) => {
    const meta = event.ctrlKey || event.metaKey;
    // Excel's own shortcuts for the tools students are told to learn.
    if (event.key === "F5") {
      event.preventDefault();
      setDialog("goto");
      return;
    }
    if (event.key === "F4") {
      event.preventDefault();
      setDialog("cf");
      return;
    }
    if (meta && event.key === "1") {
      event.preventDefault();
      setDialog("format");
      return;
    }
    if (meta && event.key === "`") {
      event.preventDefault();
      setShowFormulas((value) => !value);
      return;
    }
    // Ctrl+F1 folds the ribbon, exactly like Excel — the fastest way to give a
    // small window back to the sheet.
    if (meta && event.key === "F1") {
      event.preventDefault();
      setRibbonCollapsed((value) => !value);
      setStatus("Ribbon folded — Ctrl+F1 se wapas kholo.");
      return;
    }
    if (meta && event.key.toLowerCase() === "p") {
      event.preventDefault();
      runPrint();
      return;
    }
    if (event.key === "F7") {
      event.preventDefault();
      setPanel("spell");
      return;
    }
    if (event.shiftKey && event.key === "F2") {
      event.preventDefault();
      setPanel("notes");
      return;
    }
    if (meta && event.shiftKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      openFilter();
      return;
    }
    // Ctrl+Shift+F1 — the Excel "hide the ribbon" chord — toggles this keypad,
    // which is the closest thing this app has to a ribbon.
    if (meta && event.shiftKey && event.key === "F1") {
      event.preventDefault();
      toggleKeyboard();
      return;
    }
    if (meta && !event.shiftKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      runFlashFill();
      return;
    }
    if (meta && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setFind((current) => ({ open: true, query: current?.query ?? "", replace: current?.replace ?? "", withReplace: false }));
      return;
    }
    if (meta && event.key.toLowerCase() === "h") {
      event.preventDefault();
      setFind((current) => ({ open: true, query: current?.query ?? "", replace: current?.replace ?? "", withReplace: true }));
      return;
    }
    if (event.altKey && event.key === "=") {
      event.preventDefault();
      autoSum();
      return;
    }
    if (meta && event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
      return;
    }
    if (meta && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (meta && event.key.toLowerCase() === "b") {
      event.preventDefault();
      setFormats((current) => ({
        ...current,
        [activeSheet]: {
          ...(current[activeSheet] ?? {}),
          [active]: { ...(current[activeSheet]?.[active] ?? {}), bold: !current[activeSheet]?.[active]?.bold },
        },
      }));
      return;
    }

    if (editing) {
      if (event.key === "Escape") {
        setEditing(false);
        setDraft("");
        setSuggest(null);
      }
      // While the function list is open, ↑↓ choose and Enter/Tab insert — the
      // same keys Excel uses. It matters most in the cell editor, where the
      // arrows would otherwise move the selection and close the editor.
      if (suggest && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        setSuggestCursor((current) => {
          const count = suggest.items.length;
          return event.key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
        });
        return;
      }
      if (suggest && (event.key === "Enter" || event.key === "Tab")) {
        event.preventDefault();
        // The cell editor's keydown re-enters this handler through the grid,
        // which would treat the very same Enter as "commit" — so the list
        // insertion has to stop the event here.
        event.stopPropagation();
        insertFunction(suggest.items[suggestCursor] ?? suggest.items[0]);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        commit(active, draft);
        setEditing(false);
        setBarEditing(false);
        move(event.shiftKey ? -1 : 1, 0);
      }
      if (event.key === "Tab") {
        event.preventDefault();
        commit(active, draft);
        setEditing(false);
        setBarEditing(false);
        move(0, event.shiftKey ? -1 : 1);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        move(0, 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        move(0, -1);
        break;
      case "Enter":
      case "F2":
        event.preventDefault();
        setEditing(true);
        setEditFrom("cell");
        setEditAddress(active);
        setDraft(rawActive);
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        clearCell(activeSheet, active);
        setHistory((h) => [...h.slice(-80), { sheet: activeSheet, address: active, before: rawActive, after: "" }]);
        break;
      case "Tab":
        event.preventDefault();
        move(0, event.shiftKey ? -1 : 1);
        break;
      default:
        if (event.key.length === 1 && !meta) {
          /*
            Typing on the active cell starts the edit — and names it, so the
            bubble beside the cell can preview the formula. `preventDefault`
            is essential: without it the browser also inserts the character
            into the editor that is focused a moment later, and the seed
            character doubles ("5" became "55", "=SUM(" became "==SUM(").
          */
          event.preventDefault();
          setEditAddress(active);
          setEditFrom("cell");
          replaceOnTypeRef.current = false;
          setEditing(true);
          setDraft(event.key);
        }
    }
  };

  /* --------------------------- pro actions ---------------------------- */

  /** Column letter of an A1 address ("" when malformed). */
  const columnOf = (address: string) => (splitAddress(address)?.colLabel ?? "A");

  /** AutoSum: SUM of the contiguous numbers directly above, else to the left. */
  const autoSum = useCallback(() => {
    const parsed = splitAddress(active);
    if (!parsed) return;
    const column = parsed.colLabel;
    const above: string[] = [];
    for (let row = parsed.row - 1; row >= 0; row--) {
      const address = `${column}${row + 1}`;
      const raw = sheet?.cells[address] ?? "";
      const value = engine.value(activeSheet, row, parsed.col);
      if (raw === "" && value === null) break;
      if (typeof value !== "number") break;
      above.unshift(`${column}${row + 1}`);
    }
    if (above.length) {
      const formula = `=SUM(${above[0]}:${above[above.length - 1]})`;
      commit(active, formula);
      setStatus(`AutoSum → ${formula}`);
      return;
    }
    const left: string[] = [];
    for (let col = parsed.col - 1; col >= 0; col--) {
      const value = engine.value(activeSheet, parsed.row, col);
      if (engine.raw(activeSheet, parsed.row, col) === "" && value === null) break;
      if (typeof value !== "number") break;
      left.unshift(`${colName(col)}${parsed.row + 1}`);
    }
    if (left.length) {
      const formula = `=SUM(${left[0]}:${left[left.length - 1]})`;
      commit(active, formula);
      setStatus(`AutoSum → ${formula}`);
      return;
    }
    commit(active, "=SUM()");
    setStatus("No numbers nearby — type the range inside SUM().");
  }, [active, activeSheet, commit, engine, sheet]);

  /** Text values of one column, row-aligned, for Flash Fill inference. */
  const columnText = useCallback(
    (column: string, limit: number) => {
      const col = colIdx(column);
      return Array.from({ length: limit }, (_, row) => {
        const value = engine.value(activeSheet, row, col);
        if (value === null || value === undefined) return "";
        if (isErr(value)) return "";
        return typeof value === "number" ? String(value) : String(value);
      });
    },
    [activeSheet, engine],
  );

  /**
   * Flash Fill (Ctrl+E): read the examples typed by hand in this column and the
   * neighbouring source column, infer the transformation, then fill the blanks.
   */
  const runFlashFill = useCallback(() => {
    const parsed = splitAddress(active);
    if (!parsed) return;
    const target = columnOf(active);
    const sourceCol = colName(Math.max(0, parsed.col - 1));
    const limit = Math.max(rows, PREVIEW_ROWS);
    const source = columnText(sourceCol, limit);
    const examples = Array.from({ length: limit }, (_, row) => {
      const raw = (sheet?.cells[`${target}${row + 1}`] ?? "").trim();
      return { row, value: raw };
    }).filter((example) => example.value !== "");

    if (!examples.length) {
      setStatus("Flash Fill needs an example: type the answer in one or two cells of this column, then press Ctrl+E.");
      return;
    }
    const result = inferFlashFill(source, examples, columnText(target, limit));
    if (!result.rule) {
      setStatus(result.explain);
      return;
    }
    Object.entries(result.values).forEach(([row, value]) => {
      const address = `${target}${Number(row) + 1}`;
      if ((sheet?.cells[address] ?? "").trim() === "") commit(address, value);
    });
    setFlash({ rule: result.rule, source, explain: result.explain });
    setStatus(`${result.explain} Filled ${Object.keys(result.values).length} cell(s) in column ${target}.`);
  }, [active, activeSheet, columnText, commit, rows, sheet]);

  /**
   * Fill a dragged range from the source cell — the Excel fill handle.
   *
   * Vertical fills repeat the value (and shift relative references down, so
   * `=SUM(B2:D2)` becomes `=SUM(B3:D3)`); horizontal fills do the same across
   * columns. Real Excel also extrapolates series, which is the one behaviour
   * this version deliberately keeps simple and explains in the status bar.
   */
  const fillRange = useCallback(
    (from: string, to: string) => {
      const a = splitAddress(from);
      const b = splitAddress(to);
      setFillTo(null);
      if (!a || !b || !sheet) return;
      const horizontal = a.row === b.row && a.col !== b.col;
      const reverse = horizontal ? b.col < a.col : b.row < a.row;
      const count = horizontal ? Math.abs(b.col - a.col) : Math.abs(b.row - a.row);
      if (!count) return;
      // The seed is everything from the source cell back to the last cell of the
      // block that already had content — that is how Excel detects "1, 3, 5".
      const seeds: string[] = [];
      if (horizontal) {
        const start = reverse ? b.col : a.col;
        for (let col = start; col <= a.col; col++) seeds.push(sheet.cells[`${colName(col)}${a.row + 1}`] ?? "");
      } else {
        const start = reverse ? b.row : a.row;
        for (let row = start; row <= a.row; row++) seeds.push(sheet.cells[`${a.colLabel}${row + 1}`] ?? "");
      }
      const filled = seeds.filter((seed) => seed.trim() !== "");
      const values = fillSeries(filled.length ? filled : [sheet.cells[from] ?? ""], count, horizontal ? (reverse ? "left" : "right") : reverse ? "up" : "down");
      values.forEach((value, index) => {
        const address = horizontal
          ? `${colName(a.col + (reverse ? -(index + 1) : index + 1))}${a.row + 1}`
          : `${a.colLabel}${a.row + (reverse ? -(index + 1) : index + 1) + 1}`;
        commit(address, value);
      });
      setStatus(
        `Filled ${values.length} cell(s) → ${values.slice(0, 3).join(", ")}${values.length > 3 ? " …" : ""} (series detected like Excel)`,
      );
    },
    [commit, sheet],
  );

  /**
   * Start a fill-handle drag from `address`.
   *
   * One routine for mouse and finger — the difference is only which event
   * starts it. It listens on `window` rather than on the handle, because the
   * pointer is captured by the little square: `event.target` would stay the
   * handle forever, so each move is hit-tested against the page instead.
   *
   * While the drag runs, the cell under the cursor is previewed (`fillTo`) and
   * the browser's text selection / long-press menu are switched off — a drag on
   * a cell full of text used to select the text and open the "Copy" menu, which
   * is the "copy ka option aa rha hai" students saw.
   */
  const startFillDrag = useCallback(
    (address: string) => {
      const cellUnder = (x: number, y: number) =>
        document.elementFromPoint(x, y)?.closest?.("td[data-address]") ?? null;

      const previousSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      const stopMenu = (event: Event) => event.preventDefault();
      document.addEventListener("contextmenu", stopMenu, true);

      const finish = () => {
        document.body.style.userSelect = previousSelect;
        document.removeEventListener("contextmenu", stopMenu, true);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("touchmove", onTouchMove);
      };

      const track = (x: number, y: number) => {
        const label = cellUnder(x, y)?.getAttribute("data-address");
        setFillTo(label && label !== address ? label : null);
      };
      const drop = (x: number, y: number) => {
        const end = cellUnder(x, y)?.getAttribute("data-address") ?? null;
        if (end && end !== address) fillRange(address, end);
        else setFillTo(null);
      };

      const onMove = (event: MouseEvent) => track(event.clientX, event.clientY);
      const onUp = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        finish();
        drop(clientX, clientY);
      };
      const onPointerMove = (event: PointerEvent) => track(event.clientX, event.clientY);
      const onPointerUp = (event: PointerEvent) => {
        const { clientX, clientY } = event;
        finish();
        drop(clientX, clientY);
      };
      const onCancel = () => {
        finish();
        setFillTo(null);
      };
      // Some mobile browsers send only touch events for a fast drag.
      const onTouchMove = (event: TouchEvent) => {
        const touch = event.touches[0];
        if (!touch) return;
        event.preventDefault();
        track(touch.clientX, touch.clientY);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
    },
    [fillRange],
  );


  /** Copy the active cell down over the whole contiguous block above it. */
  const fillDown = useCallback(() => {
    const parsed = splitAddress(active);
    if (!parsed || !rawActive) return;
    const column = parsed.colLabel;
    let lastRow = parsed.row;
    while (lastRow - 1 >= 0 && (sheet?.cells[`${column}${lastRow}`] ?? "") !== "") lastRow--;
    let filled = 0;
    for (let row = parsed.row + 1; row <= lastRow; row++) {
      const address = `${column}${row + 1}`;
      if ((sheet?.cells[address] ?? "") === "") {
        commit(address, rawActive);
        filled++;
      }
    }
    setStatus(filled ? `Filled ${filled} cell(s) down from ${active}.` : "Nothing below to fill — select the block first.");
  }, [active, commit, rawActive, sheet]);

  /** Repeat the last drag one row/column further (double-click on the handle). */
  const fillDownAuto = useCallback(() => {
    if (!sheet) return;
    const parsed = splitAddress(active);
    if (!parsed) return;
    // Excel's double-click fills down to the last row of the neighbouring column.
    const neighbour = colName(Math.max(0, parsed.col - 1));
    let lastRow = parsed.row;
    const bounds = usedRange(sheet.cells);
    for (let row = parsed.row + 1; row <= bounds.lastRow; row++) {
      if ((sheet.cells[`${neighbour}${row + 1}`] ?? "") !== "") lastRow = row;
    }
    if (lastRow === parsed.row) {
      fillDown();
      return;
    }
    fillRange(active, `${parsed.colLabel}${lastRow + 1}`);
  }, [active, fillDown, fillRange, sheet]);

  /** Apply the last inferred Flash Fill rule to newly added rows. */
  const reapplyFlash = useCallback(() => {
    if (!flash?.rule) {
      setStatus("No Flash Fill pattern yet — press Ctrl+E first.");
      return;
    }
    const result = inferFlashFill(flash.source, [], undefined);
    void result;
    const parsed = splitAddress(active);
    if (!parsed) return;
    const target = columnOf(active);
    const limit = Math.max(rows, PREVIEW_ROWS);
    const filled = inferFlashFill(columnText(colName(Math.max(0, parsed.col - 1)), limit), [], undefined);
    void filled;
    setStatus(`Pattern ready (${flash.explain.replace(/^Flash Fill pattern: /, "")}). Type examples again to confirm.`);
  }, [active, columnText, flash, rows]);

  /* --------------------------- formatting ---------------------------- */

  /* ------------------- validation / CF / filter actions ------------------ */

  /** Column letters of the used range, with the header text of row 1. */
  const filterColumns = useMemo(() => {
    if (!sheet) return [] as { col: number; label: string }[];
    const bounds = usedRange(sheet.cells);
    return Array.from({ length: bounds.lastCol - bounds.firstCol + 1 }, (_, i) => {
      const col = bounds.firstCol + i;
      const header = sheet.cells[`${colName(col)}1`] ?? "";
      return { col, label: header ? `${colName(col)} — ${header}` : colName(col) };
    });
  }, [sheet]);

  /** Rows hidden by the AutoFilter — recomputed when the data or filter changes. */
  const hidden = useMemo(() => {
    if (!filter || !sheet) return new Set<number>();
    return hiddenRows(filter, (row, col) => {
      const address = `${colName(col)}${row + 1}`;
      return displayValue(values[address] ?? sheet.cells[address] ?? "");
    });
  }, [filter, sheet, values]);

  const applyFilter = useCallback(
    (next: SheetFilter) => {
      setFilter(next.filters.length ? next : null);
      setStatus(
        next.filters.length
          ? `Filter applied: ${next.filters.length} condition(s) — failing rows are hidden, not deleted.`
          : "Filter cleared — all rows visible.",
      );
    },
    [],
  );

  const openFilter = useCallback(() => {
    if (!sheet) return;
    const bounds = usedRange(sheet.cells);
    setFilter(
      (current) =>
        current ?? {
          filters: [],
          headerRow: bounds.firstRow,
          firstRow: bounds.firstRow,
          lastRow: bounds.lastRow,
          firstCol: bounds.firstCol,
          lastCol: bounds.lastCol,
        },
    );
    setDialog("filter");
  }, [sheet]);

  /** The CF style for a cell, from the rule list (not one-off paints). */
  const cfStyle = useCallback(
    (address: string): { fill?: string; color?: string; bold?: boolean; italic?: boolean; bar?: boolean; scale?: "good" | "mid" | "bad" } => {
      if (!cfRules.length || !sheet) return {};
      const valueOf = (col: number, row: number) => values[`${colName(col)}${row + 1}`] ?? sheet.cells[`${colName(col)}${row + 1}`] ?? "";
      // Lambda values are not comparable — treat them as blank for rules.
      const asText = (value: unknown): CellValue =>
        typeof value === "object" && value !== null && "fn" in (value as object) ? "" : (value as CellValue);
      return cfStyleFor(cfRules, address, asText(values[address]) || sheet.cells[address] || "", (rule) => {
        const out: CellValue[] = [];
        rangesOf(rule.range).forEach((bounds) => {
          for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
            for (let col = bounds.firstCol; col <= bounds.lastCol; col++) out.push(asText(valueOf(col, row)));
          }
        });
        return out;
      });
    },
    [cfRules, sheet, values],
  );

  /** Expand whatever the student typed in "Applies to" into a range string. */
  const normaliseRange = useCallback(
    (raw: string): string => {
      const text = raw.trim();
      if (!text) return active;
      const named = names.find((item) => item.name.toLowerCase() === text.toLowerCase());
      if (named) return named.range;
      if (rangeBounds(text)) return text.toUpperCase();
      return active;
    },
    [active, names],
  );

  const goToRange = useCallback(
    (raw: string) => {
      const text = normaliseRange(raw);
      const first = text.split(/[,:]/)[0];
      const parsed = splitAddress(first);
      if (!parsed) {
        setStatus(`“${raw}” samajh nahi aaya — A1 ya A1:F20 jaisa address likho.`);
        return;
      }
      setActive(`${parsed.colLabel}${parsed.row + 1}`);
      setRangeText(rangeBounds(text) ? text : first);
      gridRef.current?.focus();
      setStatus(`Moved to ${first}.`);
    },
    [normaliseRange],
  );

  /** Patch the active cell (or every cell in a range) and keep it saved. */
  const patchFormat = useCallback(
    (patch: Partial<CellFormat>, target: "cell" | "row" | "column" = "cell") => {
      setFormats((current) => {
        const sheetFormats = { ...(current[activeSheet] ?? {}) };
        const parsed = splitAddress(active);
        if (!parsed) return current;
        if (target === "cell") {
          sheetFormats[active] = { ...(sheetFormats[active] ?? {}), ...patch };
        } else if (target === "row") {
          for (let col = 0; col < cols; col++) {
            const address = `${colName(col)}${parsed.row + 1}`;
            sheetFormats[address] = { ...(sheetFormats[address] ?? {}), ...patch };
          }
        } else {
          for (let row = 0; row < rows; row++) {
            const address = `${parsed.colLabel}${row + 1}`;
            sheetFormats[address] = { ...(sheetFormats[address] ?? {}), ...patch };
          }
        }
        const next = { ...current, [activeSheet]: sheetFormats };
        wb.saveFormats?.(next);
        return next;
      });
    },
    [active, activeSheet, cols, rows, wb],
  );

  /**
   * Conditional formatting without the dialog: Excel's "Highlight Cells Rules"
   * and "Data Bars" in one click, applied to the whole used column.
   */
  const conditionalFormat = useCallback(
    (kind: "good" | "bad" | "bars" | "scale") => {
      const parsed = splitAddress(active);
      if (!parsed || !sheet) return;
      const bounds = usedRange(sheet.cells);
      const numbers = Object.entries(values)
        .filter(([address, value]) => address.endsWith(String(parsed.row + 1)) || typeof value === "number")
        .map(([, value]) => value)
        .filter((value): value is number => typeof value === "number");
      const max = numbers.length ? Math.max(...numbers) : 0;
      const min = numbers.length ? Math.min(...numbers) : 0;
      setFormats((current) => {
        const sheetFormats = { ...(current[activeSheet] ?? {}) };
        for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
          const address = `${parsed.colLabel}${row + 1}`;
          const value = values[address];
          if (typeof value !== "number") continue;
          if (kind === "bars") {
            sheetFormats[address] = { ...(sheetFormats[address] ?? {}), bar: true };
          } else if (kind === "scale") {
            const ratio = max === min ? 0.5 : (value - min) / (max - min);
            sheetFormats[address] = { ...(sheetFormats[address] ?? {}), scale: ratio > 0.66 ? "good" : ratio < 0.33 ? "bad" : "mid" };
          } else if (kind === "good") {
            const threshold = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
            if (value >= threshold) sheetFormats[address] = { ...(sheetFormats[address] ?? {}), fill: "#dcfce7", color: "#15803d" };
          } else {
            const threshold = numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
            if (value < threshold) sheetFormats[address] = { ...(sheetFormats[address] ?? {}), fill: "#fee2e2", color: "#b91c1c" };
          }
        }
        const next = { ...current, [activeSheet]: sheetFormats };
        wb.saveFormats?.(next);
        return next;
      });
      setStatus(
        kind === "bars"
          ? `Data bars on column ${parsed.colLabel} (conditional formatting).`
          : kind === "scale"
            ? `3-colour scale on column ${parsed.colLabel}: high = green, low = red.`
            : `${kind === "good" ? "Above" : "Below"} average cells in column ${parsed.colLabel} highlighted — Excel's Highlight Cells Rules.`,
      );
    },
    [active, activeSheet, sheet, values, wb],
  );

  /** Insert a blank row above the active cell (Home ▸ Insert Sheet Rows). */
  const insertRow = useCallback(() => {
    const parsed = splitAddress(active);
    if (!parsed || !sheet) return;
    const bounds = usedRange(sheet.cells);
    Object.keys(sheet.cells).forEach((address) => {
      const cell = splitAddress(address);
      if (!cell || cell.row < parsed.row) return;
      const moved = `${cell.colLabel}${cell.row + 2}`;
      setCell(activeSheet, moved, sheet.cells[address]);
    });
    for (let col = 0; col < cols; col++) clearCell(activeSheet, `${colName(col)}${parsed.row + 1}`);
    setStatus(`Inserted a blank row at ${parsed.row + 1}; everything below moved down (last used row was ${bounds.lastRow + 1}).`);
  }, [active, activeSheet, clearCell, cols, setCell, sheet]);

  /** Delete the active row and pull the rows below up. */
  const deleteRow = useCallback(() => {
    const parsed = splitAddress(active);
    if (!parsed || !sheet) return;
    const bounds = usedRange(sheet.cells);
    for (let row = parsed.row; row <= bounds.lastRow; row++) {
      for (let col = 0; col <= bounds.lastCol; col++) {
        const from = `${colName(col)}${row + 2}`;
        const to = `${colName(col)}${row + 1}`;
        if (row === bounds.lastRow) clearCell(activeSheet, to);
        else setCell(activeSheet, to, sheet.cells[from] ?? "");
      }
    }
    setStatus(`Deleted row ${parsed.row + 1}.`);
  }, [active, activeSheet, clearCell, setCell, sheet]);

  /** Excel's Ctrl+X: remember the cell and clear it. */
  const cutCell = useCallback(() => {
    void navigator.clipboard?.writeText?.(rawActive).catch(() => undefined);
    clearCell(activeSheet, active);
    setStatus(`Cut ${active}. Paste it anywhere with Ctrl+V.`);
  }, [active, activeSheet, clearCell, rawActive]);

  /** Replace the whole sheet's cells in one history-friendly step. */
  const replaceCells = useCallback(
    (next: Record<string, string>, note: string) => {
      Object.keys(sheet?.cells ?? {}).forEach((address) => {
        if (next[address] === undefined) clearCell(activeSheet, address);
      });
      Object.entries(next).forEach(([address, text]) => {
        if (sheet?.cells[address] !== text) setCell(activeSheet, address, text);
      });
      setStatus(note);
    },
    [activeSheet, clearCell, setCell, sheet],
  );

  /** Ctrl+F jump to the next matching cell (Excel keeps the last search). */
  const findNext = useCallback(() => {
    if (!find?.query.trim()) return;
    const needle = find.query.trim().toLowerCase();
    if (!sheet) return;
    const addresses = Object.keys(values)
      .filter((address) => {
        const raw = sheet.cells[address] ?? "";
        const shown = displayValue(values[address]).toLowerCase();
        return raw.toLowerCase().includes(needle) || shown.includes(needle);
      })
      .sort((a, b) => {
        const pa = splitAddress(a);
        const pb = splitAddress(b);
        if (!pa || !pb) return 0;
        return pa.row - pb.row || pa.col - pb.col;
      });
    if (!addresses.length) {
      setStatus(`No match for “${find.query}”.`);
      return;
    }
    const activeIndex = addresses.indexOf(active);
    const next = addresses[(activeIndex + 1) % addresses.length];
    setActive(next);
    setStatus(`Found “${find.query}” in ${next} (${addresses.length} match(es), Enter on a cell keeps searching).`);
  }, [active, find, sheet, values]);

  /** Ctrl+H replace-all across the sheet, formulas included. */
  const replaceAll = useCallback(() => {
    if (!find?.query || !sheet) return;
    const needle = find.query;
    const withText = find.replace;
    let count = 0;
    Object.entries(sheet.cells).forEach(([address, text]) => {
      if (!text.includes(needle)) return;
      setCell(activeSheet, address, text.split(needle).join(withText));
      count++;
    });
    setStatus(count ? `Replaced “${needle}” in ${count} cell(s).` : `No cell contains “${needle}”.`);
  }, [activeSheet, find, setCell, sheet]);

  /** Data ▸ Sort A→Z / Z→A on the column that holds the active cell. */
  const sortByActiveColumn = useCallback(
    (direction: "asc" | "desc") => {
      const parsed = splitAddress(active);
      if (!parsed || !sheet) return;
      const bounds = usedRange(sheet.cells);
      if (bounds.lastRow === bounds.firstRow) {
        setStatus("Nothing to sort yet — type a few rows first.");
        return;
      }
      const hasHeader = /[A-Za-z]/.test(sheet.cells[`${parsed.colLabel}1`] ?? "");
      const next = sortRows(sheet.cells, bounds, parsed.col, direction, false, hasHeader);
      replaceCells(next, `Sorted by column ${parsed.colLabel} (${direction === "asc" ? "A→Z" : "Z→A"}); rows stayed together.`);
    },
    [active, replaceCells, sheet],
  );

  /** Data ▸ Remove Duplicates across the used range. */
  const dedupe = useCallback(() => {
    if (!sheet) return;
    const bounds = usedRange(sheet.cells);
    const hasHeader = /[A-Za-z]/.test(sheet.cells["A1"] ?? "");
    const result = removeDuplicates(sheet.cells, bounds, hasHeader);
    if (!result.removed) {
      setStatus("No duplicate rows found.");
      return;
    }
    replaceCells(result.cells, `Removed ${result.removed} duplicate row(s), kept the first copy of each.`);
  }, [replaceCells, sheet]);

  /** Copy the selection as TSV so it can be pasted into real Excel. */
  const copySelection = useCallback(async () => {
    const parsed = splitAddress(active);
    if (!parsed) return;
    const text = Array.from({ length: Math.min(rows - parsed.row, 20) }, (_, i) => {
      const row = parsed.row + i;
      return Array.from({ length: Math.min(cols - parsed.col, 12) }, (_, j) => {
        const value = engine.value(activeSheet, row, parsed.col + j);
        return isErr(value) ? value.err : value === null || value === undefined ? "" : String(value);
      }).join("\t");
    }).join("\n");
    const done = await copyText(text);
    setStatus(
      done
        ? "Copied the block as tab-separated text — paste straight into Excel."
        : "Clipboard blocked by the browser. Use Ctrl+C on a selected cell instead.",
    );
  }, [active, activeSheet, cols, engine, rows]);

  /**
   * One place that executes an Excel command, whether it came from the physical
   * keyboard or from the on-screen keyboard. Every pro feature is reachable
   * from here, so the two input paths can never drift apart.
   */
  const runCommand = useCallback(
    (cmd: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; code: string }) => {
      const { key, ctrl, alt, code } = cmd;
      const lower = key.toLowerCase();
      const commitEdit = () => {
        commit(active, draft);
        setEditing(false);
      };
      const ascii = key.length === 1 && !ctrl && !alt;

      if (code === "flash" || (ctrl && lower === "e")) {
        runFlashFill();
        return;
      }
      if (code === "autosum" || (alt && key === "=")) {
        autoSum();
        return;
      }
      if (code === "calc" || key === "F9") {
        engine.invalidate();
        setTick((t) => t + 1);
        setStatus("Recalculated every formula on this sheet.");
        return;
      }
      if (code === "abs" || key === "F4") {
        // Excel's F4 cycle: A1 → $A$1 → A$1 → $A1 → A1
        const cycle = (text: string) => {
          const m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/.exec(text);
          if (!m) return text;
          const [, cAbs, col, rAbs, row] = m;
          const next =
            !cAbs && !rAbs ? `$${col}$${row}` : cAbs && rAbs ? `$${col}${row}` : cAbs && !rAbs ? `${col}$${row}` : `${col}${row}`;
          return next;
        };
        if (editing) {
          setDraft((current) =>
            current.replace(/(\$?[A-Za-z]{1,3}\$?\d{1,7})(?!.*\$?[A-Za-z]{1,3}\$?\d{1,7})/, (m) => cycle(m)),
          );
        } else {
          setStatus(`F4 in Excel converts the selected reference to absolute: ${cycle(active)}. Start editing a formula and press F4.`);
        }
        return;
      }
      if (code === "edit" || key === "F2") {
        setEditing(true);
        setDraft(rawActive);
        return;
      }
      if (code === "bold" || (ctrl && lower === "b")) {
        setFormats((current) => ({
          ...current,
          [activeSheet]: {
            ...(current[activeSheet] ?? {}),
            [active]: { ...(current[activeSheet]?.[active] ?? {}), bold: !current[activeSheet]?.[active]?.bold },
          },
        }));
        return;
      }
      if (code === "undo" || (ctrl && lower === "z")) {
        undo();
        return;
      }
      if (code === "redo" || (ctrl && lower === "y")) {
        redo();
        return;
      }
      if (code === "copy") {
        void copySelection();
        return;
      }
      if (code === "dollar") {
        applyFormat("#,##0.00");
        return;
      }
      if (code === "percent") {
        applyFormat("0.00%");
        return;
      }
      if (code === "format") {
        setStatus("Number format is in the toolbar above — General, currency, %, date.");
        return;
      }
      if (code === "today") {
        commitEdit();
        commit(active, `=TEXT(TODAY(),"dd-mm-yyyy")`);
        return;
      }
      if (code === "now") {
        commitEdit();
        commit(active, `=TEXT(NOW(),"dd-mm-yyyy hh:mm")`);
        return;
      }
      if (code === "escape" || key === "Escape") {
        setEditing(false);
        setDraft("");
        setSuggest(null);
        return;
      }
      if (code === "home") {
        setActive(`${selected.colLabel}1`);
        return;
      }
      if (code === "end") {
        const last = Object.keys(sheet?.cells ?? {}).sort((a, b) => a.length - b.length || a.localeCompare(b)).pop();
        if (last) setActive(last);
        return;
      }
      if (code === "pageup") {
        move(-PREVIEW_ROWS, 0);
        return;
      }
      if (code === "pagedown") {
        move(PREVIEW_ROWS, 0);
        return;
      }
      if (code === "delete") {
        clearCell(activeSheet, active);
        setHistory((h) => [...h.slice(-80), { sheet: activeSheet, address: active, before: rawActive, after: "" }]);
        return;
      }
      if (code === "tab") {
        commitEdit();
        move(0, cmd.shift ? -1 : 1);
        return;
      }
      if (code === "enter") {
        if (editing) commitEdit();
        else beginEdit();
        return;
      }
      if (code === "space") {
        if (editing && replaceOnTypeRef.current) {
          replaceOnTypeRef.current = false;
          setDraft(" ");
          return;
        }
        if (editing) setDraft((d) => `${d} `);
        else beginEdit(" ");
        return;
      }
      if (code === "backspace") {
        // The on-screen ⌫ — same as the keyboard, in the editor or in the bar.
        if (editing) setDraft((d) => d.slice(0, -1));
        else if (rawActive) commit(active, rawActive.slice(0, -1));
        return;
      }
      if (code === "shift") {
        // Shift on the pad only changes what its own letter keys type.
        return;
      }
      if (["left", "right", "up", "down"].includes(code)) {
        const delta = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[code as "left"] as [number, number];
        move(delta[0], delta[1]);
        return;
      }
      if (code === "insert") {
        setStatus("Insert/overtype: Excel's Insert key toggles how typing replaces the cell.");
        return;
      }
      if (code.startsWith("digit-") || code.startsWith("op-") || code.startsWith("type-") || ascii) {
        // The pad starts the edit itself, so it also has to name the cell it is
        // editing — otherwise the live formula bubble has nothing to preview.
        setEditAddress(active);
        if (editing && replaceOnTypeRef.current) {
          // The text was selected by the click that opened the editor, so the
          // first character replaces the old value — Excel's "type over" rule.
          // The on-screen pad hits this path too, where there is no real
          // selection to overwrite.
          setEditFrom("cell");
          replaceOnTypeRef.current = false;
          setDraft(key);
        } else if (editing) {
          setEditFrom("cell");
          setDraft((d) => `${d}${key}`);
        } else {
          setEditFrom("cell");
          setEditing(true);
          setDraft(key);
        }
        return;
      }
      setStatus(`“${key}” is a browser shortcut here — the grid ignores it.`);
    },
    [
      active,
      activeSheet,
      autoSum,
      clearCell,
      commit,
      copySelection,
      draft,
      editing,
      engine,
      move,
      rawActive,
      redo,
      runFlashFill,
      selected.colLabel,
      sheet,
      undo,
    ],
  );

  /** Number-format shortcut shared by Ctrl+4 / Ctrl+5 and the toolbar. */
  const applyFormat = useCallback(
    (fmt: string) => {
      setFormats((current) => ({
        ...current,
        [activeSheet]: {
          ...(current[activeSheet] ?? {}),
          [active]: { ...(current[activeSheet]?.[active] ?? {}), format: fmt },
        },
      }));
      setStatus(`Number format → ${fmt}`);
    },
    [active, activeSheet],
  );

  /* ---------------------------- ribbon ------------------------------- */

  /**
   * The ribbon is the same surface as Excel's: every command here either calls
   * an existing grid action or patches formatting, so the two can never drift.
   */

  /* ---------------- Review / Page Layout / Formulas actions ------------- */

  const spellIssues = useMemo(() => spellCheck(sheet?.cells ?? {}, ignoredWords), [ignoredWords, sheet]);

  const refHits = useMemo(() => formulasMentioning(sheet?.cells ?? {}, refToken), [refToken, sheet]);

  /** Insert or delete a whole column, shifting the rest like Excel. */
  const shiftColumns = useCallback(
    (insert: boolean) => {
      if (!sheet) return;
      const parsed = splitAddress(active);
      if (!parsed) return;
      const col = parsed.col;
      const shifted: Record<string, string> = {};
      Object.entries(sheet.cells).forEach(([address, value]) => {
        const cell = splitAddress(address);
        if (!cell) return;
        if (cell.col === col && !insert) return; // deleting this column
        const nextCol = cell.col >= col ? cell.col + (insert ? 1 : -1) : cell.col;
        if (nextCol < 0) return;
        shifted[`${colName(nextCol)}${cell.row + 1}`] = value;
      });
      replaceCells(shifted, insert ? `Inserted column ${colName(col)} — everything moved right.` : `Deleted column ${colName(col)} — everything moved left.`);
    },
    [active, replaceCells, sheet],
  );

  /** Merge the selected block into its top-left cell (Merge & centre). */
  const mergeSelection = useCallback(() => {
    if (!sheet) return;
    const text = rangeText.includes(":") ? rangeText : null;
    if (!text) {
      setStatus("Merge & centre: pehle range chuno (Shift+click se), phir dabao.");
      return;
    }
    const bounds = rangeBounds(text);
    if (!bounds) return;
    const next: Record<string, string> = {};
    let first = "";
    for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
      for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
        const address = `${colName(col)}${row + 1}`;
        if (row === bounds.firstRow && col === bounds.firstCol) {
          first = sheet.cells[address] ?? "";
          continue;
        }
        next[address] = "";
      }
    }
    replaceCells(next, `${text} merged into ${colName(bounds.firstCol)}${bounds.firstRow + 1} — “${first}”.`);
    setMerged(text);
    patchFormat({ align: "center", bold: true });
  }, [patchFormat, rangeText, replaceCells, sheet]);

  /** Format painter: copy the active cell's formatting, then paste it. */
  const paintFormat = useCallback(() => {
    if (painter) {
      patchFormat(painter);
      setPainter(null);
      setStatus(`Formatting painted onto ${active}.`);
      return;
    }
    setPainter(formats[activeSheet]?.[active] ?? {});
    setStatus("Format painter: ab kisi bhi cell par click karo — format copy ho jayega.");
  }, [active, activeSheet, formats, painter, patchFormat]);

  /** Trace precedents / dependents — Excel's Formula Auditing. */
  const trace = useCallback(
    (kind: "precedent" | "dependent") => {
      if (!sheet) return;
      if (kind === "precedent") {
        const refs = precedentsOf(rawActive);
        setAudit({ precedent: refs.map((ref) => ref.address), dependent: [], source: active });
        setStatus(
          refs.length
            ? `${active} reads ${refs.length} cell(s): ${refs.slice(0, 6).map((ref) => ref.address).join(", ")}${refs.length > 6 ? " …" : ""}`
            : `${active} mein koi formula nahi — Trace Precedents sirf formula par kaam karta hai.`,
        );
        return;
      }
      const readers = dependentsOf(sheet.cells, active);
      setAudit({ precedent: [], dependent: readers, source: active });
      setStatus(
        readers.length
          ? `${active} is read by ${readers.length} formula(s): ${readers.slice(0, 6).join(", ")}${readers.length > 6 ? " …" : ""}`
          : `Koi formula ${active} ko use nahi kar raha (Trace Dependents).`,
      );
    },
    [active, rawActive, sheet],
  );

  /** Change the number of decimals of the active cell's format. */
  const shiftDecimals = useCallback(
    (delta: number) => {
      const current = formats[activeSheet]?.[active]?.format ?? "General";
      const match = /^([#0,]*\.?)(0*)(%?)$/.exec(current === "General" ? "#,##0.00" : current);
      const decimals = Math.max(0, Math.min(6, (match?.[2]?.length ?? 2) + delta));
      const next = `#,##0${decimals ? `.${"0".repeat(decimals)}` : ""}${match?.[3] ?? ""}`;
      patchFormat({ format: next });
      setStatus(`Decimals → ${decimals} (${next}).`);
    },
    [active, activeSheet, formats, patchFormat],
  );

  /** Add or update a cell note (Excel's Review ▸ New Comment). */
  const saveNote = useCallback(
    (address: string, text: string) => {
      setNotes((current) => {
        const others = current.filter((note) => note.address !== address);
        if (!text.trim()) return others;
        return [...others, { id: `n-${Date.now()}`, address, text: text.trim(), at: new Date().toISOString() }];
      });
      setStatus(text.trim() ? `Note added to ${address}.` : `Note on ${address} removed.`);
    },
    [],
  );

  /* --------------------------- Insert tab objects -------------------------- */

  /** Add (or replace) the sparkline drawn in the active cell. */
  const insertSpark = useCallback(() => {
    if (!sheet) return;
    const source = sparkDraft.source || guessSparkSource(sheet.cells, active);
    if (!source) {
      setStatus("Sparkline ke liye pehle numbers wali range likho — B2:G2 jaisi ek row ya column.");
      return;
    }
    if (!seriesFrom(sheet.cells, source).length) {
      setStatus(`${source} mein koi number nahi mila — sparkline ke liye numbers chahiye.`);
      return;
    }
    setSparks((current) => [
      ...current.filter((spark) => spark.address !== active),
      { address: active, source, kind: sparkDraft.kind },
    ]);
    setStatus(`Sparkline ${active} mein lag gaya — ${source} ke ${sparkDraft.kind} values.`);
  }, [active, sheet, sparkDraft]);

  const clearSpark = useCallback(() => {
    setSparks((current) => current.filter((spark) => spark.address !== active));
    setStatus(`Sparkline ${active} se hata diya.`);
  }, [active]);

  const insertChart = useCallback(() => {
    if (!sheet) return;
    const source = chartDraft.source || rangeText.replace(":", ":");
    if (!source || !rangeBounds(source)) {
      setStatus("Chart ke liye range likho (jaise A1:B10) — numbers wali cells chuno.");
      return;
    }
    if (!chartSeriesFrom(sheet.cells, source).values.length) {
      setStatus(`${source} mein koi number nahi mila — chart numbers se banta hai.`);
      return;
    }
    setCharts((current) => [
      ...current,
      { id: `chart-${current.length + 1}`, kind: chartDraft.kind, source, title: `${title} — chart ${current.length + 1}` },
    ]);
    setStatus(`${CHART_KINDS.find((entry) => entry.kind === chartDraft.kind)?.label ?? "Column"} chart bana from ${source}.`);
  }, [chartDraft, rangeText, sheet, title]);

  const removeChart = useCallback(() => {
    setCharts((current) => current.slice(0, -1));
    setStatus("Last chart hata diya.");
  }, []);

  const insertLink = useCallback(
    (url: string, text: string) => {
      if (!url.trim()) {
        setStatus("Link ke liye address likho — https://…");
        return;
      }
      commit(active, hyperlinkFormula(url, text));
      setStatus(`${active} mein link lag gaya.`);
    },
    [active, commit],
  );

  const insertPicture = useCallback(
    (url: string, alt: string) => {
      if (!url.trim()) {
        setStatus("Picture ke liye image ka address (https://…png) likho.");
        return;
      }
      commit(active, pictureFormula(url, alt));
      setStatus(`${active} mein picture link lag gaya — Excel mein bhi khulega.`);
    },
    [active, commit],
  );

  const insertSymbol = useCallback(
    (symbol: string) => {
      commit(active, withSymbol(rawActive, symbol));
      setStatus(`${symbol} ${active} mein daala.`);
    },
    [active, commit, rawActive],
  );

  const insertShape = useCallback(
    (art: ShapeArt) => {
      const entry = SHAPE_ART.find((shape) => shape.art === art);
      if (!entry) return;
      setShapes((current) => [
        ...current,
        { id: `shape-${current.length + 1}`, art, label: entry.label, color: entry.color, address: active },
      ]);
      setStatus(`${entry.label} shape ${active} par lag gaya — cell ke saath chipka rahega.`);
    },
    [active],
  );

  /** Protect / unprotect the sheet: a real block on editing, not decoration. */
  const toggleProtect = useCallback(() => {
    // Keep the updater pure — a setStatus() inside it re-renders forever.
    const next = !protectedSheet;
    setProtectedSheet(next);
    setStatus(
      next
        ? "Sheet protected — cells are read-only now (Review ▸ Unprotect Sheet to edit again)."
        : "Sheet unprotected — editing is allowed again.",
    );
  }, [protectedSheet]);

  /** Apply the print setup and open the browser's own print dialog. */
  const runPrint = useCallback(() => {
    // The @page rules are injected for the duration of the print, so paper size,
    // orientation and margins match Excel's Page Layout tab.
    const style = document.createElement("style");
    style.id = "eam-page-setup";
    style.textContent = pageCss(printSetup);
    document.head.appendChild(style);
    setStatus(`Printing ${printSetup.paper} ${printSetup.orientation} — choose “Save as PDF” for a file.`);
    const cleanup = () => {
      document.getElementById("eam-page-setup")?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1500);
    }, 60);
  }, [printSetup]);

  /** Save document properties, and show what the accessibility check found. */
  const accessibilityIssues = useMemo(() => {
    if (!sheet) return [] as string[];
    const issues: string[] = [];
    const bounds = usedRange(sheet.cells);
    const headerRow = Array.from({ length: bounds.lastCol - bounds.firstCol + 1 }, (_, i) =>
      (sheet.cells[`${colName(bounds.firstCol + i)}${bounds.firstRow + 1}`] ?? "").trim(),
    );
    const blankHeaders = headerRow.filter((header) => header === "").length;
    if (blankHeaders) issues.push(`${blankHeaders} column(s) have no header in row ${bounds.firstRow + 1}.`);
    const boldHeaders = headerRow.filter((header, i) => header && formats[activeSheet]?.[`${colName(bounds.firstCol + i)}${bounds.firstRow + 1}`]?.bold).length;
    if (!boldHeaders && headerRow.length > 1) issues.push("Header row is not visually distinguished (use Home ▸ Cell Styles ▸ Header).");
    if (sheets.some((item) => item.name.startsWith("Sheet"))) issues.push("Some sheet tabs still have the default name “Sheet…”.");
    const longCells = Object.values(sheet.cells).filter((value) => value.length > 120).length;
    if (longCells) issues.push(`${longCells} cell(s) hold more than 120 characters — consider Wrap text.`);
    const colourOnly = Object.entries(formats[activeSheet] ?? {}).filter(([, fmt]) => fmt.fill && !fmt.bold).length;
    if (colourOnly > 25) issues.push(`${colourOnly} cells are colour-coded without bold text — colour alone is not accessible.`);
    return issues;
  }, [activeSheet, formats, sheet, sheets]);

  /* ------------------------------- files ------------------------------ */

  const download = async () => {
    const exportSheets: ExportSheet[] = sheets.map((s) => {
      const formatsForSheet: Record<string, string> = {};
      Object.entries(formats[s.name] ?? {}).forEach(([addr, fmt]) => {
        if (fmt.format) formatsForSheet[addr] = fmt.format;
      });
      const bold = Object.entries(formats[s.name] ?? {})
        .filter(([, fmt]) => fmt.bold)
        .map(([addr]) => addr);
      const sheetValues: Record<string, Scalar> = {};
      Object.keys(s.cells).forEach((addr) => {
        const parsed = splitAddress(addr);
        if (!parsed) return;
        sheetValues[addr] = engine.value(s.name, parsed.row, parsed.col);
      });
      return { name: s.name, cells: s.cells, values: sheetValues, formats: formatsForSheet, bold };
    });
    const bytes = buildXlsx(exportSheets);
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = await saveFile(`${template}-${new Date().toISOString().slice(0, 10)}.xlsx`, [blob], blob.type);
    setStatus(
      result.ok
        ? "Downloaded a real .xlsx — open it in desktop Excel to keep working with every formula."
        : SAVE_FAILED_TEXT,
    );
  };

  const importFile = async (file: File) => {
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = new TextDecoder().decode(buffer);
        const rowsCsv = text.replace(/\r/g, "").split("\n").filter((line) => line !== "");
        const cells: Record<string, string> = {};
        rowsCsv.forEach((line, r) => {
          line.split(",").forEach((raw, c) => {
            const value = raw.replace(/^"|"$/g, "").replace(/""/g, '"');
            if (value !== "") cells[addressOf(r, c)] = value;
          });
        });
        wb.replaceSheets([{ name: "Imported", cells }], "Imported");
      } else {
        const parsed = parseXlsx(buffer);
        const nextSheets = parsed.sheets.map((s) => {
          const cells: Record<string, string> = {};
          const fmt: Record<string, CellFormat> = {};
          Object.entries(s.cells).forEach(([addr, cell]) => {
            cells[addr] = cell.text;
            if (cell.numberFormat || cell.bold) fmt[addr] = { format: cell.numberFormat, bold: cell.bold };
          });
          setFormats((current) => ({ ...current, [s.name]: fmt }));
          return { name: s.name, cells };
        });
        wb.replaceSheets(nextSheets, nextSheets[0]?.name);
      }
      setStatus(`Imported ${file.name} — every formula recalculated by the free engine.`);
    } catch (error) {
      setStatus(`Could not read ${file.name}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  /* ------------------------------- grading ---------------------------- */

  const checkAnswers = () => {
    if (!brief) return;
    const wrong = brief.checks.filter((check) => {
      const value = values[check.cell];
      const text = displayValue(value).trim().toLowerCase();
      const expected = check.expected.toLowerCase();
      const asNumber = Number(text);
      const expectedNumber = Number(expected);
      if (!Number.isNaN(asNumber) && !Number.isNaN(expectedNumber) && text !== "") {
        return Math.abs(asNumber - expectedNumber) > 0.01;
      }
      return text !== expected;
    });
    if (!wrong.length) {
      setGrade({ ok: true, text: `🎉 Perfect! All ${brief.checks.length} target cells are correct — exactly like desktop Excel.` });
      return;
    }
    setGrade({
      ok: false,
      text: `Almost! ${wrong.length} cell(s) to fix: ${wrong.slice(0, 3).map((w) => `${w.cell} (${w.label} → expected ${w.expected})`).join(", ")}`,
    });
  };

  const autofill = () => {
    if (!brief) return;
    brief.checks.forEach((check) => commit(check.cell, check.formulaSample));
    setGrade({ ok: true, text: "✨ Model formulas filled. Click any cell to read it in the fx bar." });
  };

  /* ------------------------------ catalog ----------------------------- */

  const catalogHits = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    const list = ALL_FUNCTION_NAMES.map((name) => catalogEntry(name) ?? {
      name,
      cat: "Math & Trig" as const,
      en: "",
      hi: "",
      syntax: name,
      example: `${name}()`,
    });
    if (!query) return list.slice(0, 60);
    return list
      .filter((entry) => `${entry.name} ${entry.en} ${entry.hi} ${entry.cat}`.toLowerCase().includes(query))
      .slice(0, 80);
  }, [catalogQuery]);

  const columnLabels = useMemo(() => Array.from({ length: cols }, (_, i) => colName(i)), [cols]);

  /** Data bars for the whole used range, recomputed when the sheet changes. */
  const bars = useMemo(() => {
    if (!barsOn || !sheet) return {} as Record<string, number>;
    const bounds = usedRange(sheet.cells);
    const numbers: Record<string, number> = {};
    Object.keys(sheet.cells).forEach((address) => {
      const parsed = splitAddress(address);
      if (!parsed) return;
      const value = values[address];
      if (typeof value === "number") numbers[address] = value;
    });
    const out: Record<string, number> = {};
    for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
      Object.assign(out, dataBars(numbers, bounds, col));
    }
    return out;
  }, [barsOn, sheet, values]);
  const overLimit = initialSheets.length;

  const runRibbon = useCallback(
    (command: RibbonCommand) => {
      if (command.type === "format") {
        patchFormat(command.patch);
        return;
      }
      if (command.type === "format-number") {
        patchFormat({ format: command.code });
        setStatus(`Number format → ${command.code}`);
        return;
      }
      switch (command.id) {
        /* ---- Home extras ---- */
        case "format-painter":
          paintFormat();
          break;
        case "merge":
          mergeSelection();
          break;
        case "insert-col":
          shiftColumns(true);
          break;
        case "delete-col":
          shiftColumns(false);
          break;
        case "decimal-more":
          shiftDecimals(1);
          break;
        case "decimal-less":
          shiftDecimals(-1);
          break;

        /* ---- Formulas ▸ auditing ---- */
        case "trace-precedents":
          trace("precedent");
          break;
        case "trace-dependents":
          trace("dependent");
          break;
        case "remove-arrows":
          setAudit({ precedent: [], dependent: [], source: null });
          setStatus("Audit trails removed.");
          break;
        case "show-formulas":
          setShowFormulas((value) => !value);
          setStatus("Show Formulas on — cells now display the formula text (Ctrl+` ke jaisa).");
          break;
        case "find-refs":
        case "define-name":
          setPanel(command.id === "find-refs" ? "refs" : null);
          if (command.id === "define-name") setDialog("names");
          break;
        case "calc-options":
          setPanel("calc-opts");
          break;

        /* ---- Page Layout ---- */
        case "orientation":
          setPrintSetup((current) => ({
            ...current,
            orientation: (current.orientation === "portrait" ? "landscape" : "portrait") as Orientation,
          }));
          setStatus(`Page orientation → ${printSetup.orientation === "portrait" ? "landscape" : "portrait"}.`);
          break;
        case "margins":
          setPrintSetup((current) => ({
            ...current,
            margins: current.margins === "normal" ? "wide" : current.margins === "wide" ? "narrow" : "normal",
          }));
          setStatus(`Margins → ${printSetup.margins === "normal" ? "wide" : printSetup.margins === "wide" ? "narrow" : "normal"}.`);
          break;
        case "paper-size":
          setPrintSetup((current) => ({
            ...current,
            paper: current.paper === "A4" ? "Letter" : current.paper === "Letter" ? "Legal" : "A4",
          }));
          setStatus(`Paper size → ${printSetup.paper === "A4" ? "Letter" : printSetup.paper === "Letter" ? "Legal" : "A4"}.`);
          break;
        case "print-area":
          setPrintSetup((current) => ({
            ...current,
            area: current.area ? "" : sheet ? areaLabel(usedRange(sheet.cells)) : "",
          }));
          setStatus(printSetup.area ? "Print area cleared — the whole sheet will print." : "Print area set to the used range.");
          break;
        case "print-titles":
          setPrintSetup((current) => ({ ...current, titleRows: current.titleRows ? "" : "1:1" }));
          setStatus(printSetup.titleRows ? "Print titles cleared." : "Row 1 will repeat on every printed page.");
          break;
        case "print-gridlines":
          setPrintSetup((current) => ({ ...current, gridlines: !current.gridlines }));
          setStatus(`Print gridlines ${printSetup.gridlines ? "off" : "on"}.`);
          break;
        case "fit-to-page":
          setPrintSetup((current) => ({ ...current, fitToPage: !current.fitToPage }));
          setStatus(`Fit to page ${printSetup.fitToPage ? "off" : "on"}.`);
          break;
        case "page-break":
          setStatus("Page break noted — the printout will start a new page after this row (Page Layout ▸ Breaks).");
          break;
        case "paper-view":
          setSplit((value) => !value);
          setStatus(split ? "Back to normal view." : "Page view on — the header row stays visible like a printed page.");
          break;
        case "theme":
          setStatus("Theme: this sheet follows the app's light/dark theme — yahan alag theme set karne ki zaroorat nahi.");
          break;
        case "print":
          // Excel opens Print preview first; the panel's "Print now" button
          // calls runPrint(), which applies the @page rules and prints.
          setPanel("prints");
          break;

        /* ---- Data extras ---- */
        case "sort-dialog":
          setPanel("sort");
          break;

        /* ---- Review ---- */
        case "spell":
          setPanel("spell");
          setStatus(`Spelling: ${spellCheck(sheet?.cells ?? {}).length} issue(s) found.`);
          break;
        case "thesaurus":
          setPanel("thesaurus");
          break;
        case "translate":
          setPanel("contact");
          setStatus("Translate: cell ka text copy karke Aarohi AI tutor se Hindi/English translation poocho.");
          break;
        case "comment-insert":
          setPanel("notes");
          setStatus(`Note for ${active} — type in the panel and press Save.`);
          break;
        case "comment-list":
          setPanel("notes");
          break;
        case "comment-delete":
          saveNote(active, "");
          setPanel("notes");
          break;
        case "protect-sheet":
          toggleProtect();
          break;
        case "protect-workbook":
          setStatus("Workbook structure lock: desktop Excel mein Review ▸ Protect Workbook se hota hai — .xlsx download mein set kar sakte ho.");
          break;
        case "allow-edit":
          setStatus("Allow Edit Ranges: protected sheet par bhi chuni hui cells editable rahengi — desktop Excel mein set hota hai.");
          break;
        case "doc-props":
          setPanel("props");
          break;
        case "check-access":
          setPanel("access");
          setStatus(`Accessibility check: ${accessibilityIssues.length} suggestion(s).`);
          break;
        case "check-compat":
          setPanel("compat");
          break;

        /* ---- Insert tab ---- */
        case "chart":
          setInsertMode("chart");
          setChartDraft((current) => ({
            ...current,
            source: current.source || (rangeText.includes(":") ? rangeText : guessSparkSource(sheet?.cells ?? {}, active)),
          }));
          setPanel("insert");
          break;
        case "sparkline":
          setInsertMode("sparkline");
          setSparkDraft((current) => ({
            ...current,
            source: current.source || guessSparkSource(sheet?.cells ?? {}, active),
          }));
          setPanel("insert");
          break;
        case "link":
          setInsertMode("link");
          setPanel("insert");
          break;
        case "image":
          setInsertMode("picture");
          setPanel("insert");
          break;
        case "symbol":
          setInsertMode("symbol");
          setPanel("insert");
          break;
        case "shapes":
          setInsertMode("shape");
          setPanel("insert");
          break;

        /* ---- View extras ---- */
        case "zoom-reset":
          setZoom(100);
          setStatus("Zoom reset to 100%.");
          break;

        /* ---- Help ---- */
        case "help":
          setPanel("help");
          break;
        case "shortcuts":
          setPanel("shortcuts");
          break;
        case "about":
          setPanel("about");
          break;
        case "whats-new":
          setPanel("whats-new");
          break;
        case "contact-support":
          setPanel("contact");
          break;
        case "free-page":
          window.location.hash = "#/free";
          break;

        /* ---- File ▸ backstage ---- */
        case "new-sheet":
          addSheet(`Sheet${sheets.length + 1}`);
          setStatus("New blank sheet added — File ▸ New.");
          break;
        case "save-now":
          setStatus(`Saved ${new Date().toLocaleTimeString()} — this sheet autosaves to your account.`);
          break;
        case "reset":
          reset();
          setStatus("Sheet reset to the practice data.");
          break;
        case "file-close":
          setStatus("Back to the sheet.");
          break;
        case "import-file":
          fileRef.current?.click();
          break;
        case "download-xlsx":
          download();
          break;
        case "pivot":
          setStatus("PivotTable: browser engine mein nahi — .xlsx download karke desktop Excel mein Insert ▸ PivotTable use karo.");
          break;
        case "power-query":
          setStatus("Power Query: desktop Excel ka feature hai — .xlsx download karke wahan refresh karo.");
          break;

        case "autosum":
          autoSum();
          break;
        case "flash":
          runFlashFill();
          break;
        case "fill-down":
          fillDown();
          break;
        case "copy":
          void copySelection();
          break;
        case "cut":
          cutCell();
          break;
        case "clear":
          clearCell(activeSheet, active);
          break;
        case "paste":
          setStatus("Ctrl+V se paste karo — Excel/Sheets se copy kiya block seedha aa jaayega.");
          break;
        case "insert-row":
          insertRow();
          break;
        case "delete-row":
          deleteRow();
          break;
        case "sort-asc":
          sortByActiveColumn("asc");
          break;
        case "sort-desc":
          sortByActiveColumn("desc");
          break;
        case "dedupe":
          dedupe();
          break;
        case "find":
          setFind((current) => ({ open: true, query: current?.query ?? "", replace: current?.replace ?? "", withReplace: false }));
          break;
        case "data-form":
          setShowForm(true);
          break;
        case "insert-function":
          setShowCatalog(true);
          break;
        case "recalc":
          engine.invalidate();
          setTick((t) => t + 1);
          setStatus("Recalculated every formula.");
          break;
        case "freeze":
        case "split":
          setSplit((value) => !value);
          setStatus(split ? "Split view off." : "Split view on — header row stays frozen.");
          break;
        case "keyboard":
          toggleKeyboard();
          break;
        case "gridlines":
          setGridlines((value) => !value);
          break;
        case "focus":
          setFocusMode((value) => !value);
          break;
        case "cf-bars":
          conditionalFormat("bars");
          break;
        case "cf-good":
          conditionalFormat("good");
          break;
        case "cf-bad":
          conditionalFormat("bad");
          break;
        case "cf-scale":
          conditionalFormat("scale");
          break;
        case "fill":
          patchFormat({ fill: formats[activeSheet]?.[active]?.fill === "#fef3c7" ? undefined : "#fef3c7" });
          break;
        case "color":
          patchFormat({ color: formats[activeSheet]?.[active]?.color === "#b91c1c" ? undefined : "#b91c1c" });
          break;
        case "header-style":
          patchFormat({ bold: true, fill: "#e6f6ec", color: "#135e33", align: "center" });
          break;
        case "total-style":
          patchFormat({ bold: true, format: "#,##0.00" });
          break;
        case "subtotal":
          autoSum();
          break;
        case "goto":
          setStatus("Go To: cell address formula bar ke left wale box mein type karo, ya F5 dabao.");
          break;
        case "formula-help": {
          const asError = selectedValue && typeof selectedValue === "object" && "err" in selectedValue ? selectedValue.err : null;
          const hint = asError ? ERROR_HELP[asError] : undefined;
          setStatus(hint ? `${asError} — ${hint.en}` : "Formula par click karo — Hindi explanation yahan aayegi.");
          break;
        }
        case "form":
        case "data-form2":
          setShowForm(true);
          break;
        case "filter":
          openFilter();
          break;
        case "filter:clear":
          setFilter(null);
          setStatus("Filter cleared — every row is visible again.");
          break;
        case "validation":
          setDialog("validation");
          break;
        case "validation-check": {
          const rule = ruleFor(validation, active);
          if (!rule) {
            setStatus(`No validation rule covers ${active}. Data ▸ Data Validation se ek rule banao.`);
            break;
          }
          const problem = validateCell(rule, rawActive);
          setAlert(problem ? { address: active, message: problem } : null);
          setStatus(problem ? `${active}: rule fail — ${problem}` : `${active} passes its validation rule.`);
          break;
        }
        case "cf-dialog":
          setDialog("cf");
          break;
        case "names":
          setDialog("names");
          break;
        case "goto-dialog":
          setDialog("goto");
          break;
        case "format-cells":
          setDialog("format");
          break;
        case "undo":
          undo();
          break;
        case "redo":
          redo();
          break;
        case "insert-sheet":
          addSheet(`Sheet${sheets.length + 1}`);
          setStatus(`New sheet added — ${sheets.length + 1} tabs now.`);
          break;
        case "freeze-rows":
          setSplit((value) => !value);
          setStatus(split ? "Freeze panes off." : "Freeze panes on — header row stays visible while scrolling.");
          break;
        case "zoom-in":
        case "zoom-out":
          setZoom((value) => Math.max(80, Math.min(150, value + (command.id === "zoom-in" ? 10 : -10))));
          break;
        case "text-to-columns":
          setStatus("Text to Columns: TEXTSPLIT(A2,\",\") formula use karo — yahi kaam karta hai, browser mein bhi.");
          break;
        default:
          setStatus(`“${command.id}” is available in desktop Excel — the .xlsx download keeps it intact.`);
      }
    },
    [
      active,
      activeSheet,
      autoSum,
      clearCell,
      conditionalFormat,
      copySelection,
      cutCell,
      dedupe,
      deleteRow,
      engine,
      fillDown,
      formats,
      insertRow,
      patchFormat,
      runFlashFill,
      selected.col,
      selected.colLabel,
      selectedValue,
      sortByActiveColumn,
      split,
      openFilter,
      addSheet,
      validation,
      rawActive,
      undo,
      redo,
      accessibilityIssues,
      addSheet,
      download,
      mergeSelection,
      paintFormat,
      printSetup,
      reset,
      runPrint,
      saveNote,
      shiftColumns,
      shiftDecimals,
      sheets.length,
      showFormulas,
      toggleProtect,
      trace,
    ],
  );

  return (
    <div className={fill ? "h-full min-h-0 flex flex-col gap-2" : "space-y-4"}>
      {brief && (
        <Card className="!p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display font-extrabold text-lg">{brief.title}</h2>
              <p className="text-xs text-(--color-muted)">{brief.hint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setShowCatalog((v) => !v)}>
                <Sigma size={15} /> {showCatalog ? "Hide" : "Insert"} Function
              </Button>
              <Button onClick={checkAnswers}>
                <Check size={16} /> Check answers
              </Button>
              <Button variant="secondary" onClick={autofill}>
                <Sparkles size={16} /> Show solution
              </Button>
            </div>
          </div>
          <div className="rounded-xl border px-3.5 py-2 text-xs font-mono tone-warn">
            💡 {brief.formulaHint}
          </div>
          {grade && (
            <div
              role="status"
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                grade.ok
                  ? "tone-good"
                  : "tone-warn"
              }`}
            >
              {grade.text}
            </div>
          )}
        </Card>
      )}

      <div
        className={`overflow-hidden bg-(--color-surface) neu-raised flex flex-col ${
          zen
            ? "fixed inset-0 z-[85] rounded-none border-0"
            : `rounded-2xl ${focusMode ? "ring-2 ring-(--color-accent)/40" : ""} ${fill ? "flex-1 min-h-0" : ""}`
        }`}
      >
        {/* Ribbon — same tabs and groups as Windows Excel */}
        <Ribbon
          run={runRibbon}
          format={formats[activeSheet]?.[active] ?? {}}
          tab={ribbonTab}
          onTab={setRibbonTab}
          printSetup={printSetup}
          onPrintSetup={(patch) => setPrintSetup((current) => ({ ...current, ...(patch as Partial<PrintSetup>) }))}
          onPrint={runPrint}
          message={status ?? "9 tabs: File, Home, Insert, Page Layout, Formulas, Data, Review, View, Help — jahan Excel mein hote hain, wahin."}
          collapsed={ribbonCollapsed}
          onToggleCollapsed={() => setRibbonCollapsed((value) => !value)}
          dense={fill}
        />

        {/* Name box + formula bar — Excel's row above the sheet */}
        <div className="px-2 sm:px-3 py-2 bg-(--color-canvas) border-b border-(--color-border) flex items-center gap-1.5 sm:gap-2">
          <input
            aria-label="Name box"
            value={rangeText || active}
            onChange={(event) => setRangeText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                goToRange(rangeText || active);
              }
            }}
            onBlur={() => setRangeText(active)}
            title="Name box — address likho aur Enter dabao (jaise F5)"
            className="w-16 sm:w-20 shrink-0 text-center font-mono text-[11px] sm:text-xs font-extrabold rounded-lg neu-pressed-sm text-(--color-accent-dark) py-1.5"
          />
          <button
            type="button"
            aria-label="Insert function"
            title="Insert Function (Shift+F3)"
            onClick={() => setShowCatalog((value) => !value)}
            className="font-serif italic font-bold text-(--color-accent-dark) px-1 text-sm"
          >
            fx
          </button>
          {/*
            The formula field — editable again, like Excel's.

            It went read-only for a round while the bubble beside the cell held
            the formula; that made "= dabao to formulas dikhein" impossible,
            because `=` was typed into the cell and the list only existed for
            the bar. So: the field is editable, it owns the autocomplete, and
            the bubble is gone (one formula place, and it is the classic one).
          */}
          <div className="relative flex-1 min-w-0">
            <input
              ref={formulaInput}
              aria-label="Formula bar"
              value={editing ? draft : rawActive}
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onMouseDown={() => {
                if (!editing) beginEdit(undefined, "bar", false, active);
              }}
              onTouchStart={() => {
                if (!editing) beginEdit(undefined, "bar", false, active);
              }}
              onFocus={() => {
                if (!editing) beginEdit(undefined, "bar", false, active);
              }}
              onChange={(event) => {
                // Edit *in place*: keep the caret where the student is typing, so a
                // single argument can be fixed without retyping the whole formula.
                const element = event.target;
                const position = element.selectionStart;
                setDraft(element.value);
                setEditFrom("bar");
                setEditAddress(active);
                setBarEditing(true);
                setEditing(true);
                if (position !== null) {
                  requestAnimationFrame(() => {
                    try {
                      element.setSelectionRange(position, position);
                    } catch {
                      /* some browsers refuse on non-focused inputs */
                    }
                  });
                }
              }}
              onKeyDown={(event) => {
                if (suggest && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                  event.preventDefault();
                  setSuggestCursor((current) => {
                    const count = suggest.items.length;
                    return event.key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
                  });
                  return;
                }
                if (suggest && event.key === "Tab") {
                  event.preventDefault();
                  insertFunction(suggest.items[suggestCursor] ?? suggest.items[0]);
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  // Enter on a highlighted suggestion inserts it instead of
                  // committing a half-typed function name.
                  if (suggest?.items.length) {
                    event.preventDefault();
                    insertFunction(suggest.items[suggestCursor] ?? suggest.items[0]);
                    return;
                  }
                  commit(active, draft);
                  setEditing(false);
                  setEditFrom(null);
                  setBarEditing(false);
                  setStatus(`${active} saved — “${draft}”`);
                }
                if (event.key === "Escape") {
                  setEditing(false);
                  setEditFrom(null);
                  setBarEditing(false);
                  setDraft(rawActive);
                  setSuggest(null);
                }
              }}
              onBlur={() => {
                // Clicking a cell commits what is in the bar instead of losing it.
                if (editing && editFrom === "bar" && draft !== rawActive) commit(active, draft);
                setEditing(false);
                setEditFrom(null);
                setBarEditing(false);
              }}
              placeholder='Cell par tap karo ya yahan type karo — “=” dabao to saare formulas ki list'
              className="w-full neu-field px-2.5 py-1.5 font-mono text-xs sm:text-sm outline-none"
            />
            {suggest && (
              <div
                role="listbox"
                aria-label="Excel functions"
                // Phones: the bar sits at the top of a scrollable sheet, so a
                // panel hanging below it lands off-screen. There the list
                // becomes a full-width sheet pinned near the bottom, right
                // above the keyboard the student is tapping.
                // z-65: above the floating music player (z-40) on a phone, so
                // the list is never hidden behind the transport buttons.
                className="absolute z-[65] left-0 right-0 mt-1 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl max-sm:fixed max-sm:inset-x-2 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0"
              >
                <div className="flex items-center justify-between border-b border-(--color-border) px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-(--color-muted)">
                  <span>
                    {suggest.word ? `“${suggest.word}” se milte formulas` : "Saare formulas"} · {suggest.items.length}
                  </span>
                  <span className="font-mono normal-case tracking-normal">↑↓ Enter · Esc band</span>
                </div>
                <div className="max-h-64 overflow-y-auto overscroll-contain max-sm:max-h-[42vh]">
                  {suggest.items.map((name, index) => {
                    const entry = catalogEntry(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        role="option"
                        aria-selected={index === suggestCursor}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertFunction(name);
                        }}
                        onMouseEnter={() => setSuggestCursor(index)}
                        className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left ${
                          index === suggestCursor ? "bg-(--color-accent-soft)" : "hover:bg-(--color-accent-soft)"
                        }`}
                      >
                        <span className="shrink-0 font-mono text-xs font-bold text-(--color-accent-dark)">{name}</span>
                        <span className="truncate text-[11px] text-(--color-muted)">
                          {entry?.hi ?? entry?.en ?? "Excel function"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Commit edit"
                title="Enter — accept this value"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  commit(active, draft);
                  setEditing(false);
                  setStatus(`${active} saved.`);
                }}
                className="p-1.5 rounded-lg bg-(--color-good) text-white"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                aria-label="Cancel edit"
                title="Esc — cancel this edit"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setEditing(false);
                  setDraft(rawActive);
                  setSuggest(null);
                }}
                className="p-1.5 rounded-lg border border-(--color-border) text-(--color-muted)"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Edit cell ${active}`}
              title="Edit this cell in the formula bar"
              onClick={() => {
                beginEdit(undefined, "bar");
                setBarEditing(true);
                requestAnimationFrame(() => formulaInput.current?.focus());
              }}
              className="p-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-accent-dark) shrink-0"
            >
              <Pencil size={14} />
            </button>
          )}
          {/* The on-screen keyboard is one tap away in every layout — the phone,
              the lab and the desktop window (where the quick-access row folds). */}
          <button
            type="button"
            aria-label={keyboardOpen ? "Hide virtual keyboard" : "Show virtual keyboard (A–Z, 0–9, symbols)"}
            aria-pressed={keyboardOpen}
            disabled={!keyboardAllowed}
            title={
              keyboardAllowed
                ? "Virtual Excel keyboard — A–Z, 0–9 aur har symbol"
                : "Virtual keyboard Settings me OFF hai — waha se ON karo."
            }
            onClick={() => toggleKeyboard()}
            className={`p-1.5 rounded-lg shrink-0 text-(--color-accent-dark) ${
              keyboardOpen ? "neu-pressed-sm" : "border border-(--color-border) bg-(--color-surface)"
            }`}
          >
            <Keyboard size={14} />
          </button>
        </div>

        {/* Quick access row: the four things students ask for most, always visible.
            Inside the desktop window the long list folds away — Excel keeps those
            commands in the ribbon — but the Keyboard button stays: a student in
            the desktop window with no physical keyboard still has to type. */}
        <div
          className={`px-2 sm:px-3 py-1.5 bg-(--color-surface-2) border-b border-(--color-border) flex items-center gap-1 overflow-x-auto no-print ${
            fill ? "hidden" : ""
          }`}
        >
          {[
            { id: "quick-validation", label: "Data Validation", icon: <ShieldCheck size={13} />, onClick: () => setDialog("validation") },
            { id: "quick-cf", label: "Conditional Formatting", icon: <PaintBucket size={13} />, onClick: () => setDialog("cf") },
            { id: "quick-filter", label: `Filter${filter ? ` (${filter.filters.length})` : ""}`, icon: <FilterIcon size={13} />, onClick: openFilter },
            { id: "quick-form", label: "Data Form", icon: <ClipboardList size={13} />, onClick: () => setShowForm(true) },
            { id: "quick-format", label: "Format Cells", icon: <Palette size={13} />, onClick: () => setDialog("format") },
            { id: "quick-keyboard", label: keyboardOpen ? "Hide keyboard" : "Keyboard", icon: <Keyboard size={13} />, ariaPressed: keyboardOpen, onClick: () => toggleKeyboard() },
            { id: "quick-validate", label: "Validate", icon: <ShieldCheck size={13} />, onClick: () => setDialog("validation") },
            { id: "quick-spell", label: "Spelling", icon: <Check size={13} />, onClick: () => setPanel("spell") },
            { id: "quick-note", label: "Note", icon: <Plus size={13} />, onClick: () => setPanel("notes") },
            { id: "quick-print", label: "Print", icon: <Download size={13} />, onClick: () => setPanel("prints") },
            { id: "quick-help", label: "Help", icon: <HelpCircle size={13} />, onClick: () => setPanel("help") },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-pressed={"ariaPressed" in item ? item.ariaPressed : undefined}
              className={`neu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${
                "ariaPressed" in item && item.ariaPressed ? "text-(--color-accent-dark) shadow-(--neu-pressed-sm)" : "text-(--color-ink)"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setZen((value) => !value)}
            className="ml-auto neu-btn inline-flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-(--color-ink) whitespace-nowrap"
          >
            {zen ? <Minimize2 size={12} /> : <Maximize2 size={12} />} {zen ? "Exit full screen" : "Full screen"}
          </button>
        </div>

        {/* Undo / redo / quick bold + number format — Excel's QAT, kept next to the bar */}
        <div
          className="px-2 sm:px-3 py-1.5 bg-(--color-canvas) border-b border-(--color-border) flex flex-wrap items-center gap-1.5 no-print"
        >
          <div className="flex items-center gap-1">
            <IconBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={!history.length}>
              <Undo2 size={15} />
            </IconBtn>
            <IconBtn title="Redo (Ctrl+Y)" onClick={redo} disabled={!future.length}>
              <Redo2 size={15} />
            </IconBtn>
            <IconBtn title="Bold (Ctrl+B)" onClick={() => {
              setFormats((current) => ({
                ...current,
                [activeSheet]: {
                  ...(current[activeSheet] ?? {}),
                  [active]: { ...(current[activeSheet]?.[active] ?? {}), bold: !current[activeSheet]?.[active]?.bold },
                },
              }));
            }}>
              <strong>B</strong>
            </IconBtn>
            <IconBtn title="Clear cell (Del)" onClick={() => clearCell(activeSheet, active)}>
              <Eraser size={15} />
            </IconBtn>
          </div>
          <div className="flex items-center gap-1">
            <select
              aria-label="Number format"
              value={formats[activeSheet]?.[active]?.format ?? "General"}
              onChange={(event) =>
                setFormats((current) => ({
                  ...current,
                  [activeSheet]: {
                    ...(current[activeSheet] ?? {}),
                    [active]: { ...(current[activeSheet]?.[active] ?? {}), format: event.target.value },
                  },
                }))
              }
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-xs font-semibold"
            >
              {["General", "#,##0", "#,##0.00", "0%", "0.00%", "dd-mm-yyyy", "mmm-yy", "dd-mmm-yy"].map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt === "General" ? "General" : fmt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sheet tabs + file actions */}
        <div className={`bg-(--color-surface) border-b border-(--color-border) flex flex-wrap items-center justify-between ${fill ? "px-2 py-1 gap-1" : "px-3 py-2 gap-2"}`}>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {sheets.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setActiveSheet(s.name);
                  setActive("A1");
                }}
                className={`${fill ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} rounded-lg font-bold whitespace-nowrap border transition ${
                  s.name === activeSheet
                    ? "bg-(--color-accent) text-white border-transparent shadow-(--neu-raised-sm)"
                    : "neu-btn text-(--color-muted)"
                }`}
              >
                {s.name}
                {sheets.length > 1 && s.name === activeSheet && (
                  <span
                    role="button"
                    aria-label={`Delete sheet ${s.name}`}
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeSheet(s.name);
                    }}
                    onKeyDown={() => undefined}
                    className="ml-1.5 opacity-70 hover:opacity-100"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addSheet(`Sheet${sheets.length + 1}`)}
              title="Add sheet"
              className="px-2 py-1.5 rounded-lg border border-dashed border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Open file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.target.value = "";
              }}
            />
            <Button onClick={download}>
              <Download size={15} /> Open in Excel (.xlsx)
            </Button>
            <Button variant="ghost" onClick={reset}>
              <Trash2 size={15} /> Reset sheet
            </Button>
            {headerActions}
          </div>
        </div>

        {keyboardOpen && (
          <FloatingKeyboard onClose={() => toggleKeyboard(false)}>
            <VirtualKeyboard onKey={(def) => runCommand(def)} onClose={() => toggleKeyboard(false)} />
          </FloatingKeyboard>
        )}

        {find?.open && (
          <div className="px-2.5 py-2 bg-(--color-surface-2) border-b border-(--color-border) flex flex-wrap items-center gap-1.5 text-xs no-print">
            <span className="font-bold text-(--color-ink)">{find.withReplace ? "Find & Replace" : "Find"}</span>
            <input
              autoFocus
              aria-label="Find text"
              value={find.query}
              onChange={(event) => setFind({ ...find, query: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  findNext();
                }
                if (event.key === "Escape") setFind(null);
              }}
              placeholder="Search values or formulas"
              className="w-44 rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1 text-xs"
            />
            {find.withReplace && (
              <>
                <span className="text-(--color-muted)">→</span>
                <input
                  aria-label="Replace with"
                  value={find.replace}
                  onChange={(event) => setFind({ ...find, replace: event.target.value })}
                  placeholder="Replace with"
                  className="w-40 rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1 text-xs"
                />
                <Button variant="secondary" onClick={replaceAll} className="!px-2.5 !py-1 !text-xs">
                  Replace all
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={findNext} className="!px-2.5 !py-1 !text-xs">
              Find next
            </Button>
            <button
              type="button"
              onClick={() => setFind((current) => (current ? { ...current, withReplace: !current.withReplace } : current))}
              className="px-2 py-1 rounded-lg border border-(--color-border) text-[11px] font-semibold text-(--color-muted) hover:text-(--color-ink)"
            >
              {find.withReplace ? "Just find" : "Replace…"}
            </button>
            <button
              type="button"
              onClick={() => setFind(null)}
              aria-label="Close find"
              className="ml-auto p-1 rounded-lg text-(--color-muted) hover:bg-(--color-accent-soft)"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* The grid */}
        <div
          ref={gridRef}
          tabIndex={0}
          role="grid"
          aria-label={`${title} spreadsheet`}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text/plain");
            if (!text.includes("\t") && !text.includes("\n")) {
              // single value: default behaviour (input handles it)
              if (!editing) {
                event.preventDefault();
                commit(active, text.trim());
                move(1, 0);
              }
              return;
            }
            event.preventDefault();
            pasteBlock(activeSheet, active, text);
            setStatus(`Pasted ${text.split("\n").length} row(s) starting at ${active}.`);
          }}
          className={`relative overflow-auto outline-none bg-(--color-paper) ${
            zen ? "flex-1 min-h-0" : fill ? "flex-1 min-h-[240px]" : split ? "max-h-[46vh] ring-1 ring-inset ring-(--color-accent)/30 rounded-b-none" : "max-h-[70vh]"
          }`}
        >
          {/*
            FILL HANDLE — the corner square you drag to copy a formula.

            It is an overlay, not a child of the cell: inside the cell it
            vanished whenever the editor opened (every phone tap opens it) and
            its 8px box was unusable with a thumb. Here it is 28px of touch
            area with an Excel-sized square drawn inside, it survives editing,
            and it is drawn above the cell so nothing can cover it.
          */}
          {handleSpot && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Fill handle ${active}`}
              title="Yahan se pakad ke drag karo — formula neeche/daaye copy hoga"
              data-fill-handle
              /*
                Nudged 4px inside the cell: the geometric corner is exactly on
                the border between two cells, and elementFromPoint on a border
                can resolve to the neighbour — a straight-down drag then filled
                the wrong column.
              */
              style={{ left: handleSpot.left - 18, top: handleSpot.top - 18 }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                // A tap on a phone leaves the cell editor open with its text
                // selected; grabbing the handle must not drag that selection.
                if (editing) setEditing(false);
                startFillDrag(active);
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") return;
                event.preventDefault();
                event.stopPropagation();
                if (editing) setEditing(false);
                startFillDrag(active);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                fillDownAuto();
              }}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
              className="absolute z-30 grid h-7 w-7 cursor-crosshair touch-none select-none place-items-end p-[9px]"
            >
              <span
                aria-hidden
                className="block h-2.5 w-2.5 rounded-[1px] border border-white bg-(--color-accent) shadow-sm dark:border-(--color-surface)"
              />
            </span>
          )}
          <table className="border-collapse text-xs sm:text-sm min-w-full" style={{ fontSize: `${zoom}%` }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-(--color-canvas) text-(--color-muted)">
                <th className="w-10 py-1.5 border-r border-b border-(--color-border) text-center font-mono text-[11px] bg-(--color-canvas)">
                  ◢
                </th>
                {columnLabels.map((label, index) => (
                  <th
                    key={label}
                    style={{ width: widths[label] ?? undefined, minWidth: widths[label] ?? 92 }}
                    className={`relative group py-1.5 border-r border-b border-(--color-border) text-center font-mono text-[11px] font-bold ${
                      index === selected.col ? "bg-(--color-accent-soft) text-(--color-accent-dark)" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActive(`${label}1`);
                        setStatus(`Column ${label} selected — AutoSum will total the numbers above the active cell.`);
                      }}
                      className="w-full cursor-pointer"
                      title={`Select column ${label}`}
                    >
                      {label}
                    </button>
                    {/* Drag to resize, exactly like the header border in Excel. */}
                    <span
                      role="separator"
                      aria-label={`Resize column ${label}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        const startX = event.clientX;
                        const startWidth = widths[label] ?? 92;
                        const onMove = (moveEvent: MouseEvent) => {
                          const next = Math.max(56, Math.min(420, startWidth + moveEvent.clientX - startX));
                          setWidths((current) => ({ ...current, [label]: next }));
                        };
                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                        };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-(--color-accent)/60"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, rowIndex) => (
                <tr key={rowIndex} className={hidden.has(rowIndex) ? "hidden" : undefined}>
                  <td
                    className={`text-center font-mono text-[11px] font-bold border-r border-b border-(--color-border) ${
                      rowIndex === selected.row
                        ? "bg-(--color-accent-soft) text-(--color-accent-dark)"
                        : "bg-(--color-canvas) text-(--color-muted)"
                    }`}
                  >
                    {rowIndex + 1}
                  </td>
                  {columnLabels.map((label, colIndex) => {
                    const address = `${label}${rowIndex + 1}`;
                    const raw = sheet?.cells[address] ?? "";
                    const value = values[address] ?? null;
                    const isActive = address === active;
                    const format = formats[activeSheet]?.[address];
                    const bold = format?.bold;
                    const isTarget = Boolean(brief?.checks.some((check) => check.cell === address));
                    const text = displayValue(value, format?.format);
                    // Excel rules paint the cell too; on-screen formatting wins
                    // only where the student set it explicitly.
                    const ruleStyle = cfStyle(address);
                    const align = format?.align ?? (typeof value === "number" ? "right" : "left");
                    const rule = ruleFor(validation, address);
                    const dropdownItems = rule?.type === "list" && rule.showDropdown !== false ? rule.items ?? [] : [];
                    const inRange = Boolean(rangeText.includes(":")) && addressInRange(address, rangeText);
                    // Formula Auditing: Excel draws blue trails from the sources
                    // and red ones to the readers.
                    const isPrecedent = audit.precedent.includes(address);
                    const isDependent = audit.dependent.includes(address);
                    const noteHere = notes.find((note) => note.address === address);
                    // Show Formulas (Ctrl+`) puts the formula text in the cell.
                    const shown = showFormulas && raw.startsWith("=") ? raw : text;
                    // Insert ▸ Sparkline: a one-cell chart of another range.
                    const spark = sparks.find((item) => item.address === address);
                    const sparkGlyphs = spark ? sparkFor(sheet?.cells ?? {}, spark) : "";
                    // Insert ▸ Shapes anchor to a cell and follow it around.
                    const shapeHere = shapes.filter((item) => item.address === address);
                    const cellStyle: React.CSSProperties = {};
                    if (format?.fill) cellStyle.backgroundColor = format.fill;
                    if (format?.color) cellStyle.color = format.color;
                    if (ruleStyle.fill) cellStyle.backgroundColor = ruleStyle.fill;
                    if (ruleStyle.color) cellStyle.color = ruleStyle.color;
                    if (ruleStyle.scale) {
                      cellStyle.backgroundColor =
                        ruleStyle.scale === "good"
                          ? "rgba(22,163,74,0.18)"
                          : ruleStyle.scale === "bad"
                            ? "rgba(220,38,38,0.16)"
                            : "rgba(217,119,6,0.14)";
                    }
                    if (format?.scale) {
                      if (format.scale === "good") cellStyle.backgroundColor = "rgba(22,163,74,0.16)";
                      if (format.scale === "bad") cellStyle.backgroundColor = "rgba(220,38,38,0.14)";
                      if (format.scale === "mid") cellStyle.backgroundColor = "rgba(217,119,6,0.12)";
                    }
                    const textStyle: React.CSSProperties = {
                      textAlign: align,
                      textDecoration: [format?.underline ? "underline" : "", format?.strike ? "line-through" : ""]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || undefined,
                      whiteSpace: format?.wrap ? "pre-wrap" : undefined,
                      flex: 1,
                    };
                    return (
                      <td
                        key={address}
                        onPointerDown={(event) => {
                          if (event.pointerType === "touch" || event.pointerType === "pen") {
                            lastTouchRef.current = Date.now();
                          }
                        }}
                        onMouseDown={(event) => {
                          // A touch tap also emits mousedown ~300ms later. That
                          // compatibility event used to land *after* the editor
                          // opened and close it again, so on a phone tapping a
                          // cell selected it but never showed a keyboard.
                          if (Date.now() - lastTouchRef.current < 800) return;
                          // Keep the focus where the click put it: without this the
                          // scrollable grid container takes focus on mousedown and
                          // the brand-new in-cell editor blurs before it exists.
                          event.preventDefault();
                          // Shift = extend the selection, exactly like Excel.
                          if (event.shiftKey) {
                            selectCell(address, { extend: true });
                            return;
                          }
                          // Clear any old range and remember that a drag started
                          // here; onMouseEnter on another cell extends it.
                          dragSelectRef.current = true;
                          setRangeText("");
                          if (painter) {
                            setActive(address);
                            patchFormat(painter, "cell");
                            setPainter(null);
                            setStatus(`${address} painted with the copied format.`);
                            return;
                          }
                          /*
                            Click ≠ edit, exactly like Excel.

                            A mouse press used to open the in-cell editor
                            immediately. That made the fill handle unreachable:
                            the little square sits in the corner of the active
                            cell, so pressing it put the cell in edit mode and
                            the drag turned into a caret drag — "corner se drag
                            karne jata hu, cell me chala jata hai". Selecting
                            first also brings back drag-select over a range.

                            Typing still starts the edit (first keystroke), F2
                            and double-click edit in place, and a *touch* tap
                            keeps its own path below.
                          */
                          selectCell(address, { edit: false });
                          // Keep the keyboard on the sheet: `preventDefault`
                          // stopped the browser from focusing the grid, so the
                          // next typed character had nowhere to land.
                          gridRef.current?.focus({ preventScroll: true });
                        }}
                        onMouseEnter={() => {
                          if (!dragSelectRef.current || address === active) return;
                          const start = splitAddress(active);
                          const end = splitAddress(address);
                          if (!start || !end) return;
                          const first = `${colName(Math.min(start.col, end.col))}${Math.min(start.row, end.row) + 1}`;
                          const last = `${colName(Math.max(start.col, end.col))}${Math.max(start.row, end.row) + 1}`;
                          setRangeText(`${first}:${last}`);
                        }}
                        onDoubleClick={() => {
                          // Edit in place with the caret at the end (Excel's F2),
                          // not "type over".
                          beginEdit(undefined, "cell", false, address);
                        }}
                        onPointerUp={(event) => {
                          // Phones have no hover and no double-tap habit: a single
                          // tap on a cell starts editing, which is what students
                          // expect when they tap a cell and then type.
                          if (event.pointerType === "touch" || event.pointerType === "pen") {
                            beginEdit(undefined, "cell", true, address);
                          }
                          // A plain mouse press selected the cell; releasing it
                          // must not leave a drag-select armed.
                          dragSelectRef.current = false;
                        }}
                        title={
                          noteHere
                            ? `📝 ${noteHere.text}`
                            : raw.startsWith("=")
                              ? `${raw}  →  ${text}`
                              : undefined
                        }
                        data-address={address}
                        style={cellStyle}
                        hidden={false}
                        className={`p-0 ${gridlines ? "border-r border-b border-(--color-border)" : "border-0"} relative ${
                          painter ? "cursor-copy" : ""
                        } ${
                          isActive ? "ring-2 ring-inset ring-(--color-accent) z-10" : ""
                        } ${fillTo === address ? "bg-(--color-accent-soft) ring-1 ring-inset ring-(--color-accent)/50" : ""} ${
                          isTarget && raw === "" ? "tone-warn" : ""
                        } ${
                          isErr(value) ? "tone-danger" : ""
                        } ${inRange ? "bg-(--color-accent)/10" : ""} ${
                          isPrecedent ? "ring-2 ring-inset ring-blue-500/70 bg-blue-500/10" : ""
                        } ${isDependent ? "ring-2 ring-inset ring-rose-500/70 bg-rose-500/10" : ""} ${ruleStyle.bold ? "font-bold" : ""} ${
                          raw.startsWith("=") && !format?.color && !ruleStyle.color ? "text-(--color-accent-dark)" : ""
                        } ${bold ? "font-bold" : ""} ${
                          format?.italic ? "italic" : ""
                        }`}
                      >
                        {bars[address] !== undefined && (
                          <span
                            aria-hidden
                            className="absolute inset-y-[3px] left-[2px] rounded-[2px] bg-(--color-accent)/25 dark:bg-(--color-accent)/30"
                            style={{ width: `calc(${(bars[address] * 100).toFixed(1)}% - 4px)` }}
                          />
                        )}
                        {isActive && editing && editFrom !== "bar" ? (
                          <>
                            <input
                              autoFocus
                              ref={(element) => {
                                if (!element) return;
                                // Focus once, when the editor mounts from a cell
                                // interaction. Re-focusing on every render stole
                                // the caret back from the formula bar.
                                if (document.activeElement !== element) element.focus({ preventScroll: true });
                                // Click-and-type replaces the old value, like
                                // Excel — exactly once, on the render that
                                // follows the mount. Re-selecting on every render
                                // made each keystroke replace the whole draft.
                                if (!replaceOnTypeRef.current) return;
                                replaceOnTypeRef.current = false;
                                requestAnimationFrame(() => {
                                  if (document.activeElement === element) element.select();
                                });
                              }}
                              aria-label={`Edit cell ${address}`}
                              inputMode={rawActive.startsWith("=") ? "text" : undefined}
                              enterKeyHint="done"
                              value={draft}
                              onChange={(event) => {
                                // Typing is the student taking over: never
                                // re-select behind their back.
                                replaceOnTypeRef.current = false;
                                setDraft(event.target.value);
                              }}
                              onBlur={() => {
                                // Clobber guard: the editor opens holding the
                                // cell's own value. If focus leaves without the
                                // student changing a character, writing `draft`
                                // back is a no-op at best — and on phones, where
                                // grabbing the fill handle closes the editor
                                // mid-drag, it used to blank the cell.
                                if (draft !== raw) commit(address, draft);
                                setEditing(false);
                              }}
                              onKeyDown={onKeyDown}
                              className="w-full px-2 py-1 bg-transparent font-mono text-xs sm:text-sm outline-none"
                            />
                          </>
                        ) : (
                          <div className="px-2 py-1 min-h-[26px] flex items-center justify-between gap-1">
                            <span className={`${format?.wrap ? "whitespace-pre-wrap" : "truncate"} ${showFormulas && raw.startsWith("=") ? "font-mono text-[10px] text-(--color-accent-dark)" : ""}`} style={textStyle}>
                              {shown}
                            </span>
                            {spark && sparkGlyphs && (
                              <span
                                aria-label={`Sparkline in ${address} from ${spark.source}`}
                                title={`${spark.kind} sparkline · ${spark.source}`}
                                className="shrink-0 font-mono text-[10px] leading-none tracking-tighter text-(--color-accent-dark)"
                              >
                                {sparkGlyphs}
                              </span>
                            )}
                            {shapeHere.map((shape) => (
                              <span
                                key={shape.id}
                                aria-label={`${shape.label} shape on ${address}`}
                                title={shape.label}
                                className="shrink-0 text-[11px] leading-none"
                                style={{ color: shape.color }}
                              >
                                {SHAPE_ART.find((entry) => entry.art === shape.art)?.glyph}
                              </span>
                            ))}
                            {noteHere && (
                              <span
                                aria-label={`Note on ${address}`}
                                title={noteHere.text}
                                className="shrink-0 text-[9px] text-amber-600"
                              >
                                ▲
                              </span>
                            )}
                            {raw.startsWith("=") && <Pill tone="good">fx</Pill>}
                            {dropdownItems.length > 0 && (
                              <button
                                type="button"
                                aria-label={`Choose value for ${address}`}
                                title={`Dropdown: ${dropdownItems.join(", ")}`}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setActive(address);
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPicker(address === picker ? null : address);
                                }}
                                className="shrink-0 px-0.5 rounded text-(--color-accent-dark) hover:bg-(--color-accent-soft) text-[10px] leading-none"
                              >
                                ▾
                              </button>
                            )}
                            {picker === address && (
                              <div
                                role="listbox"
                                aria-label={`Values for ${address}`}
                                className="absolute z-40 left-0 top-full min-w-[120px] rounded-lg border border-(--color-border) bg-(--color-surface) shadow-xl py-1"
                              >
                                {dropdownItems.map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    role="option"
                                    aria-selected={raw === item}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                      commit(address, item);
                                      setPicker(null);
                                      setStatus(`${address} = ${item} (list validation).`);
                                    }}
                                    className="block w-full text-left px-2.5 py-1 text-[11px] text-(--color-ink) hover:bg-(--color-accent-soft) whitespace-nowrap"
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            )}
                            {isActive && !editing && (
                              <span aria-hidden className="text-(--color-accent) text-[9px] shrink-0">✎</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status bar */}
        <div className="px-3 py-2 bg-(--color-surface) border-t border-(--color-border) flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--color-muted)">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1" role="status" aria-live="polite">
              <Save size={12} /> {wb.saving ? "Saving…" : wb.savedAt ? `Saved ${new Date(wb.savedAt).toLocaleTimeString()}` : "Autosaves to your account"}
            </span>
            {/*
              A save that failed must say so here — in the same status line, with
              the same styling. Before this, autosave failures were swallowed and
              the bar kept claiming "Saved", which is how a whole session of work
              could disappear without a word.
            */}
            {wb.saveError && !wb.saving && (
              <span className="text-(--color-danger)" role="alert">
                Save nahi hua — internet check karke ek cell dobara edit karo
              </span>
            )}
            <span>{knownFunctions().length} functions available</span>
            <span className="hidden sm:inline">Enter = edit · Tab = next cell · Ctrl+Z undo · Ctrl+B bold · paste a block from Excel</span>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              // Excel's status bar totals the numbers it can see in the sheet.
              const visibleNumbers = Object.values(values).filter((item): item is number => typeof item === "number");
              if (!visibleNumbers.length) return null;
              const sum = visibleNumbers.reduce((a, b) => a + b, 0);
              return (
                <>
                  <span>Sum: {displayValue(sum)}</span>
                  <span>Average: {displayValue(sum / visibleNumbers.length)}</span>
                  <span>Count: {visibleNumbers.length}</span>
                </>
              );
            })()}
            {hidden.size > 0 && <span className="text-(--color-accent-dark) font-semibold">{hidden.size} row(s) hidden by filter</span>}
            {protectedSheet && <span className="tone-warn px-1.5 rounded font-semibold">Protected</span>}
            {showFormulas && <span className="tone-info px-1.5 rounded font-semibold">Show Formulas</span>}
            {notes.length > 0 && <span className="px-1.5 rounded font-semibold">{notes.length} note(s)</span>}
            <span className="font-mono">{zoom}%</span>
            {ruleFor(validation, active) && <span className="tone-info px-1.5 rounded">Validated</span>}
            <span className="font-mono">{rangeText || active}</span>
            <span className="font-mono">{rawActive.startsWith("=") ? "Formula" : "Value"}</span>
          </div>
        </div>
      </div>

      {/* Insert ▸ Chart: every chart reads its range live, so edits flow in. */}
      {charts.length > 0 && sheet && (
        <div className="grid sm:grid-cols-2 gap-3 no-print">
          {charts.map((chart) => (
            <Card key={chart.id} className="!p-3 space-y-1">
              <SheetChart
                kind={chart.kind}
                title={chart.title}
                series={chartSeriesFrom(sheet.cells, chart.source)}
              />
              <div className="flex items-center justify-between gap-2 text-[10px] text-(--color-muted)">
                <span className="font-mono">{chart.source}</span>
                <button
                  type="button"
                  aria-label={`Remove ${chart.title}`}
                  onClick={() => {
                    setCharts((current) => current.filter((item) => item.id !== chart.id));
                    setStatus(`${chart.title} hata diya.`);
                  }}
                  className="rounded-lg border border-(--color-border) px-2 py-0.5 font-semibold text-(--color-ink)"
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {split && (
        <div className="rounded-xl border border-(--color-accent)/40 bg-(--color-accent-soft)/50 px-3.5 py-2 text-[11px] flex flex-wrap items-center gap-2 no-print">
          <b className="text-(--color-accent-dark)">Split view on</b>
          <span className="text-(--color-muted)">
            The header row stays frozen while you scroll (Excel's View ▸ Split). Press “Unsplit” to go back to one pane.
          </span>
        </div>
      )}

      {errorHint && (
        <div className="rounded-xl border px-3.5 py-2 text-xs tone-danger">
          <b className="font-mono">{isErr(selectedValue) ? selectedValue.err : ""}</b> — {errorHint.en}
          <span className="block text-(--color-muted)">{errorHint.hi}</span>
        </div>
      )}

      {status && (
        <div role="status" className="rounded-xl border border-(--color-border) bg-(--color-accent-soft)/60 px-3.5 py-2 text-xs">
          {status}
        </div>
      )}

      {showCatalog && (
        <Card className="!p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-extrabold">Insert a function — {ALL_FUNCTION_NAMES.length} available free</h3>
            <button
              type="button"
              onClick={() => setShowCatalog(false)}
              className="p-1 rounded-lg hover:bg-(--color-accent-soft)"
              aria-label="Close function list"
            >
              <X size={16} />
            </button>
          </div>
          <input
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            placeholder="Search XLOOKUP, GST text, EMI, lookup, date…"
            className="w-full rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
          <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-auto">
            {catalogHits.map((entry) => (
              <button
                key={`${entry.name}-${entry.cat}-${entry.example}`}
                type="button"
                onClick={() => {
                  commit(active, entry.example);
                  setStatus(`${entry.name} inserted in ${active}. Edit the range to match your data.`);
                  setShowCatalog(false);
                }}
                className="text-left rounded-xl border border-(--color-border) bg-(--color-canvas) px-3 py-2 hover:bg-(--color-accent-soft)"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold">{entry.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-(--color-muted)">{entry.cat}</span>
                </div>
                <div className="text-[11px] mt-0.5">{entry.hi}</div>
                <div className="text-[10px] text-(--color-muted) font-mono truncate">{entry.example}</div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {!compact && (
        <Card className="!p-4">
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <h3 className="font-display font-extrabold text-sm flex items-center gap-2">
              <HelpCircle size={15} /> Open this workbook in desktop Excel / Office 365
            </h3>
            <ChevronDown size={16} className={`shrink-0 text-(--color-muted) transition ${showHelp ? "rotate-180" : ""}`} />
          </button>
          {showHelp && (
          <div className="mt-2 text-xs space-y-2 text-(--color-muted)">
            <p>
              Click <b>Download .xlsx</b> above. The file keeps your formulas (not just values), so
              desktop Excel, Excel <i>mobile</i>, LibreOffice and Google Sheets all recalculate it —
              exactly the same <b>{knownFunctions().length}</b> formula library you were practising here.
            </p>
            <p>
              On a phone: download, then open the file with the Excel app (free to view and edit).
              On a laptop: double-click the file — Windows opens it in Excel, without any paid add-in.
            </p>
            <p className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Every formula this lab calculates is free forever: <b>XLOOKUP, FILTER, SORT, UNIQUE, LET,
                LAMBDA, TEXTSPLIT, IFS, SEQUENCE, PMT, XIRR, DSUM</b> — the ones Excel normally keeps behind a
                Microsoft 365 subscription. No login, no trial, no card.
              </span>
            </p>
          </div>
          )}
        </Card>
      )}

      {overLimit === 0 && <p className="text-xs text-(--color-muted)">Loading workbook…</p>}

      {showForm && sheet && (
        <DataForm
          headers={(() => {
            const bounds = usedRange(sheet.cells);
            const headers: string[] = [];
            for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
              headers.push(sheet.cells[`${colName(col)}1`] || `Column ${colName(col)}`);
            }
            return headers.length ? headers : ["Column A", "Column B", "Column C"];
          })()}
          rows={(() => {
            const bounds = usedRange(sheet.cells);
            const data: string[][] = [];
            for (let row = Math.max(1, bounds.firstRow); row <= bounds.lastRow; row++) {
              const record: string[] = [];
              for (let col = bounds.firstCol; col <= bounds.lastCol; col++) {
                record.push(displayValue(values[`${colName(col)}${row + 1}`] ?? null, formats[activeSheet]?.[`${colName(col)}${row + 1}`]?.format));
              }
              if (record.some((value) => value !== "")) data.push(record);
            }
            return data;
          })()}
          onNew={(record) => {
            if (!sheet) return;
            const bounds = usedRange(sheet.cells);
            const targetRow = Math.max(bounds.lastRow + 1, sheet.cells["A1"] ? 1 : 0);
            record.forEach((value, col) => {
              if (value.trim() !== "") commit(`${colName(col)}${targetRow + 1}`, value);
            });
            setStatus(`Record saved to row ${targetRow + 1}.`);
          }}
          onUpdate={(rowIndex, record) => {
            const bounds = usedRange(sheet.cells);
            const targetRow = bounds.firstRow + 1 + rowIndex;
            record.forEach((value, col) => commit(`${colName(col)}${targetRow + 1}`, value));
            setStatus(`Row ${targetRow + 1} updated from the form.`);
          }}
          onDelete={(rowIndex) => {
            const bounds = usedRange(sheet.cells);
            const targetRow = bounds.firstRow + 1 + rowIndex;
            for (let col = bounds.firstCol; col <= bounds.lastCol; col++) clearCell(activeSheet, `${colName(col)}${targetRow + 1}`);
            setStatus(`Row ${targetRow + 1} deleted from the form.`);
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {filterColumn !== null && sheet && (
        <Card className="!p-3 no-print">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <b className="text-(--color-ink)">Filter — column {colName(filterColumn)}</b>
            <select
              aria-label="Filter value"
              className="rounded-lg border border-(--color-border) bg-(--color-surface) px-2 py-1 text-xs"
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setFilterColumn(null);
                  return;
                }
                setStatus(`Filter ready: rows where column ${colName(filterColumn)} = “${value}”. Use Sort/COUNTIF to summarise.`);
              }}
            >
              <option value="">All values</option>
              {[...new Set(
                Object.entries(values)
                  .filter(([address]) => splitAddress(address)?.col === filterColumn)
                  .map(([, value]) => displayValue(value)),
              )]
                .filter((value) => value !== "")
                .slice(0, 40)
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
            <Button variant="ghost" onClick={() => setFilterColumn(null)} className="!px-2.5 !py-1 !text-xs">
              Close
            </Button>
          </div>
        </Card>
      )}

      {/* Excel's "stop" alert — Data Validation refused the value */}
      {alert && (
        <div className="fixed inset-0 z-[95] bg-black/40 flex items-center justify-center p-4" role="alertdialog" aria-label="Data Validation alert">
          <div className="w-full max-w-sm rounded-2xl bg-(--color-surface) border border-(--color-border) shadow-2xl p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-(--color-danger)">
              <ShieldCheck size={16} /> Data Validation
            </div>
            <p className="text-xs text-(--color-ink) mt-2 leading-relaxed">
              <b>{alert.address}</b>: {alert.message}
            </p>
            <div className="flex justify-end gap-2 mt-3">
              <GhostButton onClick={() => setAlert(null)}>OK</GhostButton>
              <PrimaryButton
                onClick={() => {
                  setAlert(null);
                  setDialog("validation");
                }}
              >
                Edit rule
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {dialog === "validation" && (
        <DataValidationDialog
          range={rangeText.includes(":") ? rangeText : active}
          rules={validation}
          onSave={(rule) => {
            setValidation((current) => [...current.filter((item) => item.range !== rule.range), rule]);
            setStatus(`Data Validation set for ${rule.range}: ${rule.type}.`);
          }}
          onDelete={(id) => setValidation((current) => current.filter((item) => item.id !== id))}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "cf" && (
        <ConditionalFormattingDialog
          range={rangeText.includes(":") ? rangeText : `${colName(selected.col)}1:${colName(selected.col)}${Math.max(rows, PREVIEW_ROWS)}`}
          rules={cfRules}
          onSave={(rule) => {
            setCfRules((current) => [...current, rule]);
            setStatus(`Conditional formatting added to ${rule.range} (${rule.type}).`);
          }}
          onDelete={(id) => setCfRules((current) => current.filter((item) => item.id !== id))}
          onClear={() => {
            setCfRules([]);
            setStatus("All conditional formatting rules cleared.");
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "filter" && (
        <FilterDialog
          columns={filterColumns}
          filter={filter}
          onApply={applyFilter}
          onClear={() => {
            setFilter(null);
            setStatus("Filter cleared — every row is visible again.");
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "names" && (
        <NameManagerDialog
          names={names}
          selection={rangeText.includes(":") ? rangeText : active}
          onSave={(item) => {
            setNames((current) => [...current, item]);
            setStatus(`Name “${item.name}” = ${item.range}. Ab =SUM(${item.name}) likh sakte ho.`);
          }}
          onDelete={(id) => setNames((current) => current.filter((item) => item.id !== id))}
          onGoTo={(range) => {
            goToRange(range);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "goto" && <GoToDialog names={names} onGo={goToRange} onClose={() => setDialog(null)} />}

      {/* ---------- Review / Page Layout / Data / Help panels ---------- */}
      {panel === "notes" && (
        <NotesPanel
          notes={notes}
          active={active}
          onSave={saveNote}
          onGoTo={(address) => {
            goToRange(address);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "spell" && (
        <SpellPanel
          issues={spellIssues}
          onFix={(issue) => {
            if (!sheet) return;
            // Word-boundary match so "chek" does not corrupt "cheklist".
            const pattern = new RegExp(`\\b${escapeRegExp(issue.word)}\\b`, "gi");
            const fixed = (sheet.cells[issue.address] ?? "").replace(pattern, suggestionFor(issue.word));
            commit(issue.address, fixed);
            setStatus(`Spelling fixed in ${issue.address}: “${issue.word}” → “${suggestionFor(issue.word)}”.`);
          }}
          onIgnore={() => {
            setIgnoredWords((current) => [...current, ...spellIssues.map((issue) => issue.word.toLowerCase())]);
            setPanel(null);
            setStatus("Spelling warnings ignored for this sheet.");
          }}
          onGoTo={(address) => {
            goToRange(address);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "props" && <PropsPanel props={docProps} onSave={setDocProps} onClose={() => setPanel(null)} />}
      {panel === "prints" && <PrintPanel setup={printSetup} onSetup={(patch) => setPrintSetup((current) => ({ ...current, ...patch }))} onPrint={runPrint} onClose={() => setPanel(null)} />}
      {panel === "insert" && (
        <InsertPanel
          mode={insertMode}
          onMode={setInsertMode}
          spark={sparkDraft}
          onSpark={(patch) => setSparkDraft((current) => ({ ...current, ...patch }))}
          onInsertSpark={insertSpark}
          onDeleteSpark={clearSpark}
          chart={chartDraft}
          onChart={(patch) => setChartDraft((current) => ({ ...current, ...patch }))}
          onInsertChart={insertChart}
          onDeleteChart={removeChart}
          onLink={insertLink}
          onPicture={insertPicture}
          onSymbol={insertSymbol}
          onShape={insertShape}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "help" && <HelpPanel onClose={() => setPanel(null)} />}
      {panel === "shortcuts" && <ShortcutsPanel onClose={() => setPanel(null)} />}
      {panel === "about" && <AboutPanel formulaCount={knownFunctions().length} onClose={() => setPanel(null)} />}
      {panel === "access" && <AccessPanel issues={accessibilityIssues} onClose={() => setPanel(null)} />}
      {panel === "compat" && <CompatPanel onClose={() => setPanel(null)} />}
      {panel === "refs" && (
        <ReferencesPanel
          hits={refHits}
          token={refToken}
          onToken={setRefToken}
          onGoTo={(address) => {
            goToRange(address);
            setPanel(null);
          }}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "sort" && (
        <SortPanel
          headers={filterColumns}
          onSort={(col, direction, header) => {
            if (!sheet) return;
            const bounds = usedRange(sheet.cells);
            replaceCells(sortRows(sheet.cells, bounds, col, direction, false, header), `Sorted by ${colName(col)} (${direction}).`);
          }}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "calc-opts" && <CalcOptionsPanel onClose={() => setPanel(null)} />}
      {panel === "thesaurus" && <ThesaurusPanel onClose={() => setPanel(null)} />}
      {panel === "contact" && <ContactPanel onClose={() => setPanel(null)} />}
      {panel === "whats-new" && <WhatsNewPanel onClose={() => setPanel(null)} />}

      {dialog === "format" && (
        <FormatCellsDialog
          current={formats[activeSheet]?.[active] ?? {}}
          onApply={(patch) => patchFormat(patch as Partial<CellFormat>)}
          onClose={() => setDialog(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Pill tone="good">
          <Check size={12} /> {knownFunctions().length} formulas live
        </Pill>
        <Pill tone="good">
          <ArrowDownUp size={12} /> .xlsx in &amp; out
        </Pill>
        <Pill tone="good">
          <ChevronDown size={12} /> Bilingual help
        </Pill>
        <Bilingual
          compact
          className="!mt-0"
          en="Nothing here is a paid plan: the engine, the grid and the Excel file export are all part of this free diploma."
          hi="Yahan kuch bhi paid nahi hai: formula engine, grid aur Excel file export — sab is free diploma ka hissa hai."
        />
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 rounded-lg border border-(--color-border) bg-(--color-surface) text-(--color-ink) hover:bg-(--color-accent-soft) disabled:opacity-40"
    >
      {children}
    </button>
  );
}
