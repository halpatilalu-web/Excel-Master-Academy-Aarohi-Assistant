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
  Download,
  Eraser,
  HelpCircle,
  Info,
  Plus,
  Redo2,
  Save,
  Sigma,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
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
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 px-3.5 py-2 text-xs font-mono">
            💡 {brief.formulaHint}
          </div>
          {grade && (
            <div
              role="status"
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                grade.ok
                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : "border-amber-400/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
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
          className="overflow-auto max-h-[70vh] outline-none"
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
                    className={`min-w-[92px] py-1.5 border-r border-b border-(--color-border) text-center font-mono text-[11px] font-bold ${
                      index === selected.col ? "bg-(--color-accent-soft) text-(--color-accent-dark)" : ""
                    }`}
                  >
                    {label}
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
                        className={`p-0 border-r border-b border-(--color-border) relative ${
                          isActive ? "ring-2 ring-inset ring-(--color-accent) z-10" : ""
                        } ${isTarget && raw === "" ? "bg-amber-500/10" : ""} ${
                          isErr(value) ? "text-rose-600 dark:text-rose-300" : ""
                        } ${raw.startsWith("=") ? "text-(--color-accent-dark)" : ""} ${bold ? "font-bold" : ""}`}
                      >
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
            {typeof selectedValue === "number" && (
              <>
                <span>Sum: {displayValue(selectedValue)}</span>
                <span>Average: {displayValue(selectedValue)}</span>
              </>
            )}
            <span className="font-mono">{rawActive.startsWith("=") ? "Formula" : "Value"}</span>
          </div>
        </div>
      </div>

      {errorHint && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3.5 py-2 text-xs">
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
          <h3 className="font-display font-extrabold text-sm flex items-center gap-2 mb-2">
            <HelpCircle size={15} /> Open this workbook in desktop Excel / Office 365
          </h3>
          <div className="text-xs space-y-2 text-(--color-muted)">
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
