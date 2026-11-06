/**
 * Minimal, dependency-light .xlsx reader/writer.
 *
 * Why hand-rolled instead of the SheetJS `xlsx` package: that package is
 * Apache-2.0-with-a-licence-trap for commercial use, and this project promises
 * students a *free* workbook that opens in the real desktop Excel. Since an
 * .xlsx is just a zip of XML, we read/write only the parts Excel needs:
 * workbook.xml (sheet order), sharedStrings.xml, worksheet XML with `f`/`v`/`is`
 * cells, plus a couple of styles for numbers and header bold.
 *
 * Anything Excel writes that we do not understand is ignored on import (the
 * values still land in the grid), and on export we keep the formulas as text so
 * desktop Excel, LibreOffice and Google Sheets all recalculate them themselves.
 */
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import type { Scalar } from "./formula/core";
import { isErr } from "./formula/core";

export interface XlsxCell {
  /** Raw content: "=SUM(A1:A2)" for formulas, plain text otherwise. */
  text: string;
  /** Cached/display value when importing (used for dates & numbers). */
  cached?: Scalar;
  /** Number format code found in styles.xml, e.g. "dd-mm-yyyy". */
  numberFormat?: string;
  bold?: boolean;
}

export interface XlsxSheet {
  name: string;
  cells: Record<string, XlsxCell>;
  cols?: number;
  rows?: number;
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
}

const xmlEscape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Excel rejects control characters in shared strings.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

const xmlUnescape = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");

function attr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}="([^"]*)"`);
  return re.exec(tag)?.[1];
}

export function parseXlsx(bytes: Uint8Array): XlsxWorkbook {
  const files = unzipSync(bytes);
  const read = (path: string): string | null => {
    const data = files[path];
    return data ? strFromU8(data) : null;
  };

  // 1. Shared strings
  const shared: string[] = [];
  const sharedXml = read("xl/sharedStrings.xml");
  if (sharedXml) {
    const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m: RegExpExecArray | null;
    while ((m = siRe.exec(sharedXml))) {
      const texts = [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => xmlUnescape(x[1]));
      shared.push(texts.join(""));
    }
  }

  // 2. Styles → number format code per style index
  const stylesXml = read("xl/styles.xml") ?? "";
  const customFormats = new Map<number, string>();
  for (const m of stylesXml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    customFormats.set(Number(m[1]), xmlUnescape(m[2]));
  }
  const builtinFormats: Record<number, string> = {
    0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00",
    9: "0%", 10: "0.00%", 11: "0.00E+00", 14: "dd-mm-yy", 15: "d-mmm-yy",
    16: "d-mmm", 17: "mmm-yy", 18: "h:mm AM/PM", 19: "h:mm:ss AM/PM",
    20: "h:mm", 21: "h:mm:ss", 22: "dd-mm-yy h:mm", 37: "#,##0 ;(#,##0)",
    38: "#,##0 ;[Red](#,##0)", 39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)",
    45: "mm:ss", 46: "[h]:mm:ss", 47: "mmss.0", 48: "##0.0E+0", 49: "@",
  };
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? "";
  const xfFormats: string[] = [];
  const xfBold: boolean[] = [];
  const fontsXml = /<fonts\b[^>]*>([\s\S]*?)<\/fonts>/.exec(stylesXml)?.[1] ?? "";
  const boldFonts = new Set<number>();
  [...fontsXml.matchAll(/<font\b[\s\S]*?(?:\/>|<\/font>)/g)].forEach((m, i) => {
    if (/<b\s*\/>|<b>/.test(m[0])) boldFonts.add(i);
  });
  for (const m of cellXfs.matchAll(/<xf\b[^>]*?\/>/g)) {
    const numFmtId = Number(attr(m[0], "numFmtId") ?? 0);
    const fontId = Number(attr(m[0], "fontId") ?? 0);
    xfFormats.push(customFormats.get(numFmtId) ?? builtinFormats[numFmtId] ?? "General");
    xfBold.push(boldFonts.has(fontId));
  }

  // 3. Sheet list (workbook.xml + rels)
  const workbookXml = read("xl/workbook.xml") ?? "";
  const relsXml = read("xl/_rels/workbook.xml.rels") ?? "";
  const relTargets = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) relTargets.set(id, target);
  }
  const sheets: { name: string; path: string }[] = [];
  for (const m of workbookXml.matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = xmlUnescape(attr(m[0], "name") ?? "Sheet");
    const rid = attr(m[0], "r:id") ?? attr(m[0], "id");
    const target = rid ? relTargets.get(rid) : undefined;
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`.replace(/\/\.\//g, "/");
    sheets.push({ name, path });
  }
  // Fallback: no workbook.xml (some exporters) → read every worksheet file.
  if (!sheets.length) {
    Object.keys(files)
      .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
      .sort()
      .forEach((path, i) => sheets.push({ name: `Sheet${i + 1}`, path }));
  }

  const result: XlsxWorkbook = { sheets: [] };

  for (const { name, path } of sheets) {
    const sheetXml = read(path);
    if (!sheetXml) continue;
    const cells: Record<string, XlsxCell> = {};
    let maxRow = 0;
    let maxCol = 0;

    const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRe.exec(sheetXml))) {
      const rowNumber = Number(attr(`<row ${rowMatch[1]}>`, "r") ?? 0);
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRe.exec(rowMatch[2]))) {
        const attrs = `<c ${cellMatch[1]}>`;
        const ref = attr(attrs, "r");
        if (!ref) continue;
        const type = attr(attrs, "t");
        const styleIndex = Number(attr(attrs, "s") ?? -1);
        const body = cellMatch[2] ?? "";
        const formula = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
        const rawValue = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        const inlineText = [...body.matchAll(/<is\b[^>]*>([\s\S]*?)<\/is>/g)]
          .map((m) => [...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => xmlUnescape(t[1])).join(""))
          .join("");

        let text = "";
        let cached: Scalar = null;
        if (inlineText) {
          text = inlineText;
          cached = inlineText;
        } else if (rawValue !== undefined) {
          if (type === "s") {
            text = shared[Number(rawValue)] ?? "";
            cached = text;
          } else if (type === "str" || type === "inlineStr") {
            text = xmlUnescape(rawValue);
            cached = text;
          } else if (type === "b") {
            text = rawValue === "1" ? "TRUE" : "FALSE";
            cached = rawValue === "1";
          } else if (type === "e") {
            text = xmlUnescape(rawValue);
            cached = { err: text as never };
          } else {
            text = rawValue;
            cached = Number(rawValue);
            if (Number.isNaN(cached)) cached = rawValue;
          }
        }

        if (formula !== undefined) {
          text = `=${xmlUnescape(formula)}`;
        }
        if (text === "" && formula === undefined) continue;
        cells[ref] = {
          text,
          cached,
          numberFormat: styleIndex >= 0 ? xfFormats[styleIndex] : undefined,
          bold: styleIndex >= 0 ? xfBold[styleIndex] : false,
        };
        const parsed = /^([A-Z]+)(\d+)$/.exec(ref);
        if (parsed) {
          maxRow = Math.max(maxRow, Number(parsed[2]));
          maxCol = Math.max(maxCol, colIndex(parsed[1]) + 1);
        }
      }
    }
    result.sheets.push({ name, cells, rows: maxRow, cols: maxCol });
  }

  if (!result.sheets.length) {
    result.sheets.push({ name: "Sheet1", cells: {}, rows: 1, cols: 1 });
  }
  return result;
}

function colIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function colName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export interface ExportSheet {
  name: string;
  /** Raw text per cell (formulas start with "="). */
  cells: Record<string, string>;
  /** Display value per cell, so files opened with "show formulas" off look right. */
  values?: Record<string, Scalar>;
  /** Number format per cell ("dd-mm-yyyy", "#,##0.00", "0%"). */
  formats?: Record<string, string>;
  /** A1 addresses that should be bold (headers). */
  bold?: string[];
  colWidths?: Record<string, number>;
}

/** Builds a real .xlsx Excel opens with live formulas and formatting. */
export function buildXlsx(sheets: ExportSheet[]): Uint8Array {
  const shared: string[] = [];
  const sharedIndex = new Map<string, number>();
  const intern = (text: string): number => {
    const hit = sharedIndex.get(text);
    if (hit !== undefined) return hit;
    const index = shared.length;
    sharedIndex.set(text, index);
    shared.push(text);
    return index;
  };

  // Style table: 0 = default, 1 = bold, 2..n = number formats.
  const formats = new Map<string, number>();
  let nextFormatId = 164;
  const styleFor = (format: string | undefined, bold: boolean): number => {
    const key = `${format ?? "General"}|${bold ? "b" : ""}`;
    let id = styleIds.get(key);
    if (id !== undefined) return id;
    id = styleIds.size + 1;
    styleIds.set(key, id);
    styleRows.push({ format: format ?? "General", bold, index: id });
    if (format && format !== "General" && !formats.has(format)) formats.set(format, nextFormatId++);
    return id;
  };
  const styleIds = new Map<string, number>();
  const styleRows: { format: string; bold: boolean; index: number }[] = [];

  const sheetXmls: string[] = [];
  sheets.forEach((sheet) => {
    const rows = new Map<number, string[]>();
    Object.entries(sheet.cells).forEach(([ref, text]) => {
      const parsed = /^([A-Z]+)(\d+)$/.exec(ref);
      if (!parsed) return;
      const row = Number(parsed[2]);
      const style = styleFor(sheet.formats?.[ref], Boolean(sheet.bold?.includes(ref)));
      const isFormula = text.startsWith("=");
      let cellXml = `<c r="${ref}" s="${style}"`;
      if (isFormula) {
        const value = sheet.values?.[ref];
        const cached =
          typeof value === "number" && Number.isFinite(value)
            ? `<v>${value}</v>`
            : typeof value === "boolean"
              ? `<v>${value ? 1 : 0}</v>`
              : typeof value === "string"
                ? `<v>${xmlEscape(value)}</v>`
                : "";
        const tAttr = typeof value === "string" ? ' t="str"' : typeof value === "boolean" ? ' t="b"' : "";
        cellXml += `${tAttr}><f>${xmlEscape(text.slice(1))}</f>${cached}</c>`;
      } else if (text === "") {
        cellXml += "/>";
      } else if (typeof sheet.values?.[ref] === "number" && sheet.values?.[ref] !== null) {
        cellXml += `><v>${sheet.values[ref]}</v></c>`;
      } else if (typeof sheet.values?.[ref] === "boolean") {
        cellXml += ` t="b"><v>${sheet.values[ref] ? 1 : 0}</v></c>`;
      } else {
        cellXml += ` t="s"><v>${intern(text)}</v></c>`;
      }
      const list = rows.get(row) ?? [];
      list.push(cellXml);
      rows.set(row, list);
    });

    const cols = sheet.colWidths
      ? `<cols>${Object.entries(sheet.colWidths)
          .map(
            ([col, width]) =>
              `<col min="${colIndex(col) + 1}" max="${colIndex(col) + 1}" width="${width}" customWidth="1"/>`,
          )
          .join("")}</cols>`
      : "";
    const rowXml = [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row, cells]) => `<row r="${row}">${cells.join("")}</row>`)
      .join("");
    sheetXmls.push(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${cols}<sheetData>${rowXml}</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`,
    );
  });

  const numFmts = formats.size
    ? `<numFmts count="${formats.size}">${[...formats.entries()]
        .map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${xmlEscape(code)}"/>`)
        .join("")}</numFmts>`
    : "";
  const xfRows = [{ format: "General", bold: false, index: 0 }, ...styleRows]
    .map((row) => {
      const numFmtId = row.format === "General" ? 0 : (formats.get(row.format) ?? 0);
      const fontId = row.bold ? 1 : 0;
      return `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="0" borderId="0" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ""}${fontId ? ' applyFont="1"' : ""}/>`;
    })
    .join("");

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfRows.split("</xf>").length - 1}">${xfRows}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const sharedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared
    .map((text) => `<si><t xml:space="preserve">${xmlEscape(text)}</t></si>`)
    .join("")}</sst>`;

  const sheetEntries = sheets
    .map(
      (sheet) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${sheets.indexOf(sheet) + 1}" r:id="rId${sheets.indexOf(sheet) + 1}"/>`,
    )
    .join("");
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`;

  const sheetRelEntries = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("");
  const stylesRelId = sheets.length + 1;
  const sharedRelId = sheets.length + 2;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRelEntries}<Relationship Id="rId${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${sharedRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
    "xl/styles.xml": strToU8(stylesXml),
    "xl/sharedStrings.xml": strToU8(sharedXml),
  };
  sheetXmls.forEach((xml, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml);
  });

  return zipSync(files, { level: 6 });
}

/** A CSV fallback for very old phones that choke on .xlsx downloads. */
export function buildCsv(cells: Record<string, string>, values: Record<string, Scalar>): string {
  const rows = new Map<number, string[]>();
  let maxCol = 0;
  Object.keys(cells).forEach((ref) => {
    const parsed = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!parsed) return;
    const row = Number(parsed[2]);
    const col = colIndex(parsed[1]);
    maxCol = Math.max(maxCol, col);
    const list = rows.get(row) ?? [];
    const text = cells[ref] ?? "";
    const value = values[ref];
    const display = isErr(value)
      ? value.err
      : value === null || value === undefined
        ? text
        : String(value);
    list[col] = display;
    rows.set(row, list);
  });
  return [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) =>
      Array.from({ length: maxCol + 1 }, (_, i) => {
        const text = list[i] ?? "";
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      }).join(","),
    )
    .join("\n");
}

export { colName, colIndex };
