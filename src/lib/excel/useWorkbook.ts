/**
 * Workbook state shared by the practice sheets, the free Excel workbook and the
 * "open in Excel" buttons.
 *
 * The grid is stored per sheet as raw text ("=SUM(B2:D2)"), autosaved to the
 * student's own server-side store (the same `createStore` every other feature
 * uses, which also falls back to localStorage offline), and evaluated through
 * the full formula engine on every keystroke.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createStore } from "../store";
import type { CfRule, NamedRange, ValidationRule } from "./sheetTools";
import {
  Workbook,
  type SheetData,
  type WorkbookData,
} from "./formula/engine";
import { formatGeneral, isErr, parseDateText, type Scalar } from "./formula/core";

/**
 * Per-cell formatting that survives a reload and travels to the .xlsx.
 * Mirrors the Format Cells dialog in Excel (Ctrl+1).
 */
export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  align?: "left" | "center" | "right";
  wrap?: boolean;
  /** Raw number format code: General, #,##0.00, 0.00%, dd-mm-yyyy … */
  format?: string;
  /** Hex fill colour, e.g. #fef3c7. */
  fill?: string;
  /** Hex font colour. */
  color?: string;
  /** Conditional formatting data bars. */
  bar?: boolean;
  /** Colour scale, first/last colour already resolved to a tint. */
  scale?: "good" | "bad" | "mid";
}

/** Formatting map: sheet name → address → format. */
export type FormatMap = Record<string, Record<string, CellFormat>>;

export interface WorkbookDoc {
  id: string;
  /** Which sheet template this copy came from ("sheet-marks", "blank", …). */
  template: string;
  title: string;
  sheets: SheetData[];
  activeSheet: string;
  updatedAt: string;
  /** Optional so old saved workbooks still load. */
  formats?: FormatMap;
  /** Excel rules saved with the book: validation, conditional formats, names. */
  validationRules?: ValidationRule[];
  cfRules?: CfRule[];
  names?: NamedRange[];
}

export type { ValidationRule, CfRule, NamedRange };

/** One saved workbook per student is enough for the free lab; later copies get suffixes. */
const workbooks = createStore<WorkbookDoc>("excelWorkbooks");

export function useWorkbooks() {
  return workbooks();
}

/** Date-ish number formats we keep so imported cells still look like dates. */
export function looksLikeDateFormat(format: string | undefined): boolean {
  if (!format) return false;
  return /(^|[^\\])[ymdhs]/i.test(format.replace(/"[^"]*"/g, "")) && !/[#0?]/.test(format);
}

/** Excel-ish display text for a value (dates become dd-mm-yyyy). */
export function displayValue(value: Scalar, format?: string, dark = false): string {
  void dark;
  if (value === null || value === undefined) return "";
  if (isErr(value)) return value.err;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (looksLikeDateFormat(format)) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000));
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      return `${day}-${month}-${d.getUTCFullYear()}`;
    }
    if (format && /%/.test(format)) {
      const decimals = (format.split(".")[1] ?? "").replace(/[^0]/g, "").length;
      return `${(value * 100).toFixed(decimals)}%`;
    }
    if (format && /[#0?]/.test(format)) {
      const decimals = (format.split(".")[1] ?? "").replace(/[^#0?]/g, "").length;
      if (/[,]/.test(format)) {
        const fixed = value.toFixed(decimals);
        const [whole, fraction] = fixed.split(".");
        const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return fraction !== undefined ? `${grouped}.${fraction}` : grouped;
      }
      return value.toFixed(decimals);
    }
    return formatGeneral(value);
  }
  if (typeof value === "string") return value;
  return "";
}

export interface UseWorkbookOptions {
  template: string;
  title: string;
  initialSheets: SheetData[];
  /** Load a previously saved copy for this template when the student returns. */
  restore?: boolean;
}

/** Saved formatting for one template (used by the grid and the Office shell). */
export function useWorkbookFormats(template: string) {
  const { items } = useWorkbooks();
  const doc = items.find((item) => item.template === template);
  return (doc?.formats ?? {}) as FormatMap;
}

export function useWorkbook({ template, title, initialSheets, restore = true }: UseWorkbookOptions) {
  const { items, add, update, loading } = workbooks();
  const saved = useMemo(
    () => (restore ? items.find((item) => item.template === template) : undefined),
    [items, template, restore],
  );

  const [sheets, setSheets] = useState<SheetData[]>(initialSheets);
  const [activeSheet, setActiveSheet] = useState(initialSheets[0]?.name ?? "Sheet1");
  const [dirty, setDirty] = useState(false);
  const hydrated = useRef(false);
  const docId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Hydrate from the saved copy once the store has loaded.
  useEffect(() => {
    if (hydrated.current || loading) return;
    hydrated.current = true;
    if (saved && saved.sheets?.length) {
      setSheets(saved.sheets);
      setActiveSheet(saved.activeSheet ?? saved.sheets[0].name);
      docId.current = saved.id;
      setSavedAt(saved.updatedAt);
    }
  }, [loading, saved]);

  const engine = useMemo(() => {
    const data: WorkbookData = { sheets };
    return new Workbook(data);
  }, [sheets]);

  /** Latest formatting, kept in a ref so cell edits also save the colours. */
  const formatsRef = useRef<FormatMap>(saved?.formats ?? {});
  /** Latest Excel rules (validation / conditional formatting / names). */
  const rulesRef = useRef<{
    validationRules?: ValidationRule[];
    cfRules?: CfRule[];
    names?: NamedRange[];
  }>({
    validationRules: saved?.validationRules,
    cfRules: saved?.cfRules,
    names: saved?.names,
  });

  const persist = useCallback(
    (nextSheets: SheetData[], nextActive: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const payload: WorkbookDoc = {
          id: docId.current ?? "",
          template,
          title,
          sheets: nextSheets,
          activeSheet: nextActive,
          updatedAt: new Date().toISOString(),
          formats: formatsRef.current,
          ...rulesRef.current,
        };
        setSaving(true);
        const write = async () => {
          try {
            const record = await add(payload);
            if (record?.id) docId.current = record.id;
            setSavedAt(new Date().toISOString());
          } catch {
            /* the store already keeps an offline copy */
          } finally {
            setSaving(false);
          }
        };
        void write();
      }, 900);
    },
    [add, template, title],
  );

  /** Editing a cell: raw text in, everything downstream recalculates. */
  const setCell = useCallback(
    (sheetName: string, address: string, text: string) => {
      setDirty(true);
      setSheets((current) => {
        const next = current.map((sheet) =>
          sheet.name === sheetName ? { ...sheet, cells: { ...sheet.cells, [address]: text } } : sheet,
        );
        persist(next, activeSheet);
        return next;
      });
    },
    [activeSheet, persist],
  );

  /**
   * Save the formatting map. Called by the grid whenever a format changes so
   * bold/fill/number formats survive a reload and reach the .xlsx download.
   */
  /** Save the Excel rules (validation, conditional formats, names) with the book. */
  const saveRules = useCallback(
    (patch: { validationRules?: ValidationRule[]; cfRules?: CfRule[]; names?: NamedRange[] }) => {
      rulesRef.current = { ...rulesRef.current, ...patch };
      setSheets((current) => {
        persist(current, activeSheet);
        return current;
      });
    },
    [activeSheet, persist],
  );

  const saveFormats = useCallback(
    (next: FormatMap) => {
      formatsRef.current = next;
      setSheets((current) => {
        persist(current, activeSheet);
        return current;
      });
    },
    [activeSheet, persist],
  );

  const clearCell = useCallback(
    (sheetName: string, address: string) => {
      setDirty(true);
      setSheets((current) => {
        const next = current.map((sheet) => {
          if (sheet.name !== sheetName) return sheet;
          const cells = { ...sheet.cells };
          delete cells[address];
          return { ...sheet, cells };
        });
        persist(next, activeSheet);
        return next;
      });
    },
    [activeSheet, persist],
  );

  /** Paste a block of text (tab/newline separated) starting at `address`. */
  const pasteBlock = useCallback(
    (sheetName: string, startAddress: string, text: string) => {
      const start = /^([A-Z]+)(\d+)$/.exec(startAddress);
      if (!start) return;
      const startCol = start[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const startRow = Number(start[2]);
      const rows = text.replace(/\r/g, "").split("\n");
      if (rows.length && rows[rows.length - 1] === "") rows.pop();
      setDirty(true);
      setSheets((current) => {
        const next = current.map((sheet) => {
          if (sheet.name !== sheetName) return sheet;
          const cells = { ...sheet.cells };
          rows.forEach((line, r) => {
            line.split("\t").forEach((cellText, c) => {
              const col = startCol + c;
              const address = `${colName(col)}${startRow + r}`;
              if (cellText === "") delete cells[address];
              else cells[address] = cellText;
            });
          });
          return { ...sheet, cells };
        });
        persist(next, activeSheet);
        return next;
      });
    },
    [activeSheet, persist],
  );

  const replaceSheets = useCallback(
    (nextSheets: SheetData[], nextActive?: string) => {
      setDirty(true);
      setSheets(nextSheets);
      const active = nextActive ?? nextSheets[0]?.name ?? "Sheet1";
      setActiveSheet(active);
      persist(nextSheets, active);
    },
    [persist],
  );

  const addSheet = useCallback(
    (name: string) => {
      const safe = name.trim() || `Sheet${sheets.length + 1}`;
      if (sheets.some((sheet) => sheet.name === safe)) return;
      replaceSheets([...sheets, { name: safe, cells: {} }], safe);
    },
    [replaceSheets, sheets],
  );

  const removeSheet = useCallback(
    (name: string) => {
      if (sheets.length <= 1) return;
      const next = sheets.filter((sheet) => sheet.name !== name);
      replaceSheets(next, next[0].name);
    },
    [replaceSheets, sheets],
  );

  const reset = useCallback(() => {
    setSheets(initialSheets);
    setActiveSheet(initialSheets[0]?.name ?? "Sheet1");
    setDirty(false);
    persist(initialSheets, initialSheets[0]?.name ?? "Sheet1");
  }, [initialSheets, persist]);

  return {
    sheets,
    activeSheet,
    setActiveSheet,
    engine,
    setCell,
    clearCell,
    pasteBlock,
    replaceSheets,
    addSheet,
    removeSheet,
    reset,
    saveFormats,
    saveRules,
    saving,
    savedAt,
    dirty,
    loading,
    docId: docId.current,
  };
}

/** "B12" → { row: 11, col: 1 } (rows 1-based in the returned `rowLabel`). */
export function splitAddress(address: string): { col: number; row: number; colLabel: string; rowLabel: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) return null;
  return {
    col: match[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1,
    row: Number(match[2]) - 1,
    colLabel: match[1],
    rowLabel: Number(match[2]),
  };
}

export function colName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export const addressOf = (row: number, col: number) => `${colName(col)}${row + 1}`;

/** Best-effort value for a cell, used by CSV/knowledge exports. */
export function isDateText(text: string): boolean {
  return parseDateText(text) !== null && /[-/]/.test(text);
}

/** A one-line explanation of an error, shown under the formula bar. */
export const ERROR_HELP: Record<string, { en: string; hi: string }> = {
  "#DIV/0!": { en: "Dividing by zero or by an empty cell.", hi: "Zero ya khali cell se bhaag diya." },
  "#VALUE!": { en: "The wrong type of value (text where a number is needed).", hi: "Galat type — jahan number chahiye wahan text." },
  "#REF!": { en: "A reference points to a deleted cell or a column outside the table.", hi: "Reference galat — cell delete ho gaya ya range se bahar." },
  "#NAME?": { en: "A function or range name is misspelled (or unsupported).", hi: "Function/naam ki spelling galat hai." },
  "#NUM!": { en: "A number is out of range (e.g. SQRT of a negative).", hi: "Number range se bahar (jaise negative ka SQRT)." },
  "#N/A": { en: "Lookup did not find a match.", hi: "Lookup ko value nahi mili." },
  "#SPILL!": { en: "The result needs empty cells below/right.", hi: "Result ke liye neeche khali cells chahiye." },
  "#CALC!": { en: "Empty result (e.g. FILTER found nothing).", hi: "Khali result (jaise FILTER ko kuch nahi mila)." },
  "#CYCLE!": { en: "Circular reference: the formula needs its own result.", hi: "Circular reference — formula apne aap par depend kar raha hai." },
  "#BLOCKED!": { en: "Needs a live internet/service that the browser lab cannot provide.", hi: "Internet service chahiye jo browser lab nahi de sakta." },
};
