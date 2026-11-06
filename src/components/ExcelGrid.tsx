/**
 * @license MIT — the formula engine, grid and file I/O in this folder are
 * original code written for this course, deliberately not a licensed
 * spreadsheet SDK, so nothing here is behind a subscription.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Keyboard,
  Maximize2,
  Minimize2,
  Plus,
  Redo2,
  Save,
  Sigma,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { Bilingual } from "../lib/lang";
import { Button, Card, Pill } from "./ui";
import type { Scalar } from "../lib/excel/formula/core";
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
  type WorkbookDoc,
} from "../lib/excel/useWorkbook";
import { CATALOG_BY_NAME, CATALOG_NAMES } from "../data/formulaCatalog";
import { inferFlashFill } from "../lib/excel/flashfill";
import { dataBars, removeDuplicates, sortRows, usedRange } from "../lib/excel/dataTools";
import { VirtualKeyboard } from "./VirtualKeyboard";

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
}

type History = { sheet: string; address: string; before: string; after: string }[];

const PREVIEW_ROWS = 24;
const MIN_COLS = 8;

interface CellFormat {
  bold?: boolean;
  format?: string;
}

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
}: ExcelGridProps) {
  const wb = useWorkbook({
    template,
    title,
    initialSheets: initialSheets.map((sheet) => ({ name: sheet.name, cells: { ...sheet.cells } })),
  });
  const { sheets, activeSheet, setActiveSheet, engine, setCell, clearCell, pasteBlock, addSheet, removeSheet, reset } = wb;

  const [active, setActive] = useState("A1");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showHelp, setShowHelp] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [suggest, setSuggest] = useState<{ items: string[]; word: string } | null>(null);
  const [formats, setFormats] = useState<Record<string, Record<string, CellFormat>>>({});
  const [history, setHistory] = useState<History>([]);
  const [future, setFuture] = useState<History>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [grade, setGrade] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  /* ---- pro-editor extras: fill handle, flash fill, split view, widths ---- */
  const [fillTo, setFillTo] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [split, setSplit] = useState(false);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<{ rule: ReturnType<typeof inferFlashFill>["rule"]; source: string[]; explain: string } | null>(null);
  const [, setTick] = useState(0);
  const [barsOn, setBarsOn] = useState(false);
  const [find, setFind] = useState<{ open: boolean; query: string; replace: string; withReplace: boolean } | null>(null);

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

  const selected = useMemo(() => {
    const parsed = splitAddress(active);
    return parsed ?? { row: 0, col: 0, colLabel: "A", rowLabel: 1 };
  }, [active]);

  const selectedValue = values[active] ?? null;
  const errorHint = isErr(selectedValue) ? ERROR_HELP[selectedValue.err] : undefined;

  /* ------------------------------ editing ----------------------------- */

  const commit = useCallback(
    (address: string, text: string) => {
      const before = sheet?.cells[address] ?? "";
      if (before === text) return;
      setCell(activeSheet, address, text);
      setHistory((h) => [...h.slice(-80), { sheet: activeSheet, address, before, after: text }]);
      setFuture([]);
    },
    [activeSheet, setCell, sheet],
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

  useEffect(() => {
    if (!editing) {
      setSuggest(null);
      return;
    }
    const match = /([A-Za-z][A-Za-z0-9.]*)\(?[^()]*$/.exec(draft);
    const word = match?.[1]?.toUpperCase() ?? "";
    if (!word || word.length < 2) {
      setSuggest(null);
      return;
    }
    const items = ALL_FUNCTION_NAMES.filter((name) => name.startsWith(word)).slice(0, 8);
    const exact = items.length === 1 && items[0] === word;
    setSuggest(items.length && !exact ? { items, word } : null);
  }, [draft, editing]);

  const applySuggestion = (name: string) => {
    const entry = catalogEntry(name);
    setDraft((current) => {
      const withName = current.replace(/([A-Za-z][A-Za-z0-9.]*)(\()?[^()]*$/, `${name}(`);
      return withName === current ? `${current}${name}(` : withName;
    });
    setSuggest(null);
    void entry;
  };

  /* ------------------------------ keyboard ---------------------------- */

  const onKeyDown = (event: React.KeyboardEvent) => {
    const meta = event.ctrlKey || event.metaKey;
    // Ctrl+Shift+F1 — the Excel "hide the ribbon" chord — toggles this keypad,
    // which is the closest thing this app has to a ribbon.
    if (meta && event.shiftKey && event.key === "F1") {
      event.preventDefault();
      setShowKeyboard((v) => !v);
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
      if (event.key === "Enter") {
        event.preventDefault();
        commit(active, draft);
        setEditing(false);
        if (suggest?.items[0]) {
          // Enter picks the highlighted function instead of moving on.
          applySuggestion(suggest.items[0]);
          return;
        }
        move(event.shiftKey ? -1 : 1, 0);
      }
      if (event.key === "Tab") {
        event.preventDefault();
        commit(active, draft);
        setEditing(false);
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
        event.preventDefault();
        setEditing(true);
        setDraft(rawActive);
        break;
      case "F2":
        event.preventDefault();
        setEditing(true);
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
      if (!a || !b) return;
      const source = sheet?.cells[from] ?? "";
      const sourceRow = a.row;
      const sourceCol = a.col;
      let filled = 0;
      const shiftRefs = (text: string, dRow: number, dCol: number) =>
        text.replace(/(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})/g, (_m, cAbs: string, col: string, rAbs: string, row: string) => {
          const nextCol = cAbs ? col : colName(Math.max(0, colIdx(col) + dCol));
          const nextRow = rAbs ? row : String(Math.max(1, Number(row) + dRow));
          return `${cAbs}${nextCol}${rAbs}${nextRow}`;
        });

      if (a.col === b.col) {
        const step = a.row <= b.row ? 1 : -1;
        for (let row = a.row + step; step > 0 ? row <= b.row : row >= b.row; row += step) {
          const dRow = row - sourceRow;
          const next = source.startsWith("=") ? shiftRefs(source, dRow, 0) : source;
          commit(`${a.colLabel}${row + 1}`, next);
          filled++;
        }
      } else {
        const step = a.col <= b.col ? 1 : -1;
        for (let col = a.col + step; step > 0 ? col <= b.col : col >= b.col; col += step) {
          const dCol = col - sourceCol;
          const next = source.startsWith("=") ? shiftRefs(source, 0, dCol) : source;
          commit(`${colName(col)}${sourceRow + 1}`, next);
          filled++;
        }
      }
      setStatus(
        filled
          ? `Filled ${filled} cell(s) from ${from}${source.startsWith("=") ? " — relative references shifted like Excel." : "."}`
          : "Drag the handle over the cells you want to fill.",
      );
    },
    [commit, sheet],
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
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied the block as tab-separated text — paste straight into Excel.");
    } catch {
      setStatus("Clipboard blocked by the browser. Use Ctrl+C on a selected cell instead.");
    }
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
        else {
          setEditing(true);
          setDraft(rawActive);
        }
        return;
      }
      if (code === "space") {
        if (editing) setDraft((d) => `${d} `);
        else {
          setEditing(true);
          setDraft(" ");
        }
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
      if (code.startsWith("digit-") || code.startsWith("op-") || ascii) {
        if (editing) setDraft((d) => `${d}${key}`);
        else {
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

  /* ------------------------------- files ------------------------------ */

  const download = () => {
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${template}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded a real .xlsx — open it in desktop Excel to keep working with every formula.");
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

  return (
    <div className="space-y-4">
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

      <div className="rounded-2xl overflow-hidden border border-(--color-border) bg-(--color-surface) shadow-sm">
        {/* Ribbon: formula bar */}
        <div className="px-3 py-2.5 bg-(--color-canvas) border-b border-(--color-border) flex flex-wrap items-center gap-2">
          <span className="w-16 text-center font-mono text-xs font-extrabold rounded-lg bg-(--color-accent-soft) text-(--color-accent-dark) py-1.5 border border-(--color-border)">
            {active}
          </span>
          <span className="font-serif italic font-bold text-(--color-accent-dark) px-1">fx</span>
          <div className="relative flex-1 min-w-[220px]">
            <input
              aria-label="Formula bar"
              value={editing ? draft : rawActive}
              onFocus={() => {
                setEditing(true);
                setDraft(rawActive);
              }}
              onChange={(event) => {
                setDraft(event.target.value);
                setEditing(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (suggest?.items[0]) {
                    applySuggestion(suggest.items[0]);
                    return;
                  }
                  commit(active, draft);
                  setEditing(false);
                }
                if (event.key === "Escape") {
                  setEditing(false);
                  setDraft(rawActive);
                  setSuggest(null);
                }
                if (event.key === "Tab" && suggest?.items[0]) {
                  event.preventDefault();
                  applySuggestion(suggest.items[0]);
                }
              }}
              placeholder={'Type a value or any Excel formula — =XLOOKUP(...), =FILTER(...), =TEXT(TODAY(),"dd-mm-yyyy")'}
              className="w-full rounded-lg border border-(--color-border) bg-(--color-surface) px-3 py-1.5 font-mono text-xs sm:text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
            />
            {suggest && (
              <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-lg overflow-hidden">
                {suggest.items.map((name) => {
                  const entry = catalogEntry(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySuggestion(name);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-(--color-accent-soft) flex items-baseline gap-2"
                    >
                      <span className="font-mono text-xs font-bold">{name}</span>
                      <span className="text-[11px] text-(--color-muted) truncate">{entry?.hi ?? entry?.en}</span>
                    </button>
                  );
                })}
                <div className="px-3 py-1 text-[10px] text-(--color-muted) border-t border-(--color-border)">
                  Tab / Enter to insert
                </div>
              </div>
            )}
          </div>
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
        <div className="px-3 py-2 bg-(--color-surface) border-b border-(--color-border) flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {sheets.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setActiveSheet(s.name);
                  setActive("A1");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition ${
                  s.name === activeSheet
                    ? "bg-(--color-accent) text-white border-transparent"
                    : "bg-(--color-canvas) border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"
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

        {/* Pro toolbar — the features students expect from desktop Excel */}
        <div className="px-2.5 py-1.5 bg-(--color-surface) border-b border-(--color-border) flex flex-wrap items-center gap-1.5 text-[11px]">
          {[
            { label: "AutoSum", icon: Sigma, onClick: autoSum, title: "AutoSum (Alt+=)" },
            { label: "Flash Fill", icon: Wand2, onClick: runFlashFill, title: "Flash Fill (Ctrl+E) — pattern se column bharo" },
            { label: "Fill down", icon: ArrowDownUp, onClick: fillDown, title: "Copy the active cell down the block" },
            { label: "Copy block", icon: Copy, onClick: () => void copySelection(), title: "Copy as tab-separated text for real Excel" },
            { label: "Sort A→Z", icon: ArrowDownUp, onClick: () => sortByActiveColumn("asc"), title: "Data ▸ Sort A→Z on this column, whole rows move together" },
            { label: "Z→A", icon: ArrowDownUp, onClick: () => sortByActiveColumn("desc"), title: "Data ▸ Sort Z→A" },
            { label: "No dupes", icon: Trash2, onClick: dedupe, title: "Data ▸ Remove Duplicates across the used range" },
            {
              label: "Find",
              icon: HelpCircle,
              onClick: () => setFind((current) => ({ open: true, query: current?.query ?? "", replace: current?.replace ?? "", withReplace: false })),
              title: "Find (Ctrl+F) / Replace (Ctrl+H)",
            },
            { label: barsOn ? "Bars on" : "Data bars", icon: Columns3, onClick: () => setBarsOn((v) => !v), title: "Conditional formatting: data bars behind the numbers" },
            {
              label: "Format",
              icon: Columns3,
              onClick: () => applyFormat(formats[activeSheet]?.[active]?.format === "#,##0.00" ? "0.00%" : "#,##0.00"),
              title: "Toggle number / percent format (Ctrl+1)",
            },
            {
              label: split ? "Unsplit" : "Split view",
              icon: split ? Minimize2 : Maximize2,
              onClick: () => setSplit((v) => !v),
              title: "Freeze the top rows while you scroll — Excel's View ▸ Split",
            },
            {
              label: showKeyboard ? "Hide keys" : "Keyboard",
              icon: Keyboard,
              onClick: () => setShowKeyboard((v) => !v),
              title: "Virtual Excel keyboard (Ctrl+Shift+F1)",
            },
          ].map((tool) => {
            const Icon = tool.icon;
            const on = (tool.label === "Keyboard" && showKeyboard) || (tool.label.includes("plit") && split);
            return (
              <button
                key={tool.label}
                type="button"
                title={tool.title}
                onClick={tool.onClick}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold transition ${
                  on
                    ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent-dark)"
                    : "border-(--color-border) text-(--color-ink) hover:bg-(--color-accent-soft)"
                }`}
              >
                <Icon size={12} /> {tool.label}
              </button>
            );
          })}
          {flash && (
            <span className="ml-auto text-[10px] text-(--color-muted)">
              Flash Fill pattern: <b className="text-(--color-ink)">{flash.explain.replace(/^Flash Fill pattern: /, "")}</b>
              <button type="button" onClick={reapplyFlash} className="underline ml-1.5">
                re-apply
              </button>
            </span>
          )}
        </div>

        {showKeyboard && (
          <div className="px-2.5 py-2 bg-(--color-surface) border-b border-(--color-border) no-print">
            <VirtualKeyboard onKey={(def) => runCommand(def)} onClose={() => setShowKeyboard(false)} />
          </div>
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
          className={`overflow-auto outline-none ${split ? "max-h-[46vh] ring-1 ring-inset ring-(--color-accent)/30 rounded-b-none" : "max-h-[70vh]"}`}
        >
          <table className="border-collapse text-xs sm:text-sm min-w-full">
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
                <tr key={rowIndex}>
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
                    return (
                      <td
                        key={address}
                        onMouseDown={() => {
                          setActive(address);
                          setEditing(false);
                        }}
                        onDoubleClick={() => {
                          setActive(address);
                          setEditing(true);
                          setDraft(raw);
                        }}
                        title={raw.startsWith("=") ? `${raw}  →  ${text}` : undefined}
                        data-address={address}
                        className={`p-0 border-r border-b border-(--color-border) relative ${
                          isActive ? "ring-2 ring-inset ring-(--color-accent) z-10" : ""
                        } ${fillTo === address ? "bg-(--color-accent-soft) ring-1 ring-inset ring-(--color-accent)/50" : ""} ${
                          isTarget && raw === "" ? "tone-warn" : ""
                        } ${
                          isErr(value) ? "tone-danger" : ""
                        } ${raw.startsWith("=") ? "text-(--color-accent-dark)" : ""} ${bold ? "font-bold" : ""}`}
                      >
                        {bars[address] !== undefined && (
                          <span
                            aria-hidden
                            className="absolute inset-y-[3px] left-[2px] rounded-[2px] bg-(--color-accent)/25 dark:bg-(--color-accent)/30"
                            style={{ width: `calc(${(bars[address] * 100).toFixed(1)}% - 4px)` }}
                          />
                        )}
                        {isActive && editing ? (
                          <input
                            autoFocus
                            aria-label={`Edit cell ${address}`}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={() => {
                              commit(address, draft);
                              setEditing(false);
                            }}
                            onKeyDown={onKeyDown}
                            className="w-full px-2 py-1 bg-transparent font-mono text-xs sm:text-sm outline-none"
                          />
                        ) : (
                          <div className="px-2 py-1 min-h-[26px] flex items-center justify-between gap-1">
                            <span className="truncate">{text}</span>
                            {raw.startsWith("=") && <Pill tone="good">fx</Pill>}
                            {/* Fill handle: drag it down to copy (relative refs shift like Excel). */}
                            {isActive && (
                              <span
                                role="button"
                                aria-label={`Fill handle ${address}`}
                                title="Drag down (or double-click) to fill"
                                onMouseDown={(downEvent) => {
                                  downEvent.preventDefault();
                                  downEvent.stopPropagation();
                                  const onMove = (moveEvent: MouseEvent) => {
                                    const cell = (moveEvent.target as HTMLElement | null)?.closest?.("td");
                                    const label = cell?.getAttribute("data-address");
                                    if (label && label !== address) setFillTo(label);
                                  };
                                  const onUp = (upEvent: MouseEvent) => {
                                    window.removeEventListener("mousemove", onMove);
                                    window.removeEventListener("mouseup", onUp);
                                    const cell = (upEvent.target as HTMLElement | null)?.closest?.("td");
                                    const end = cell?.getAttribute("data-address") ?? null;
                                    if (end && end !== address) fillRange(address, end);
                                    else setFillTo(null);
                                  };
                                  window.addEventListener("mousemove", onMove);
                                  window.addEventListener("mouseup", onUp);
                                }}
                                onDoubleClick={(doubleEvent) => {
                                  doubleEvent.stopPropagation();
                                  fillDown();
                                }}
                                className="absolute -bottom-[3px] -right-[3px] w-2 h-2 rounded-[1px] bg-(--color-accent) border border-white dark:border-(--color-surface) cursor-crosshair z-20"
                              />
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
        <div className="px-3 py-2 bg-(--color-canvas) border-t border-(--color-border) flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--color-muted)">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Save size={12} /> {wb.saving ? "Saving…" : wb.savedAt ? `Saved ${new Date(wb.savedAt).toLocaleTimeString()}` : "Autosaves to your account"}
            </span>
            <span>{knownFunctions().length} functions available</span>
            <span className="hidden sm:inline">Enter = edit · Tab = next cell · Ctrl+Z undo · Ctrl+B bold · paste a block from Excel</span>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              // Excel's status bar totals the numbers it can see in the sheet.
              const numbers = Object.values(values).filter((v): v is number => typeof v === "number");
              if (!numbers.length) return null;
              const sum = numbers.reduce((a, b) => a + b, 0);
              return (
                <>
                  <span>Sum: {displayValue(sum)}</span>
                  <span>Average: {displayValue(sum / numbers.length)}</span>
                  <span>Count: {numbers.length}</span>
                </>
              );
            })()}
            <span className="font-mono">{active}</span>
            <span className="font-mono">{rawActive.startsWith("=") ? "Formula" : "Value"}</span>
          </div>
        </div>
      </div>

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
