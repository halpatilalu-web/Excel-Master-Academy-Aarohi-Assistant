/**
 * Text functions, including a TEXT() format-code engine.
 *
 * Excel's format codes are a language of their own, so TEXT/DOLLAR/FIXED share
 * one implementation here: sections split on ";" (positive;negative;zero;text),
 * numeric placeholders 0 # ? . , % E+, literals in quotes, and the date/time
 * tokens students use in reports (dd-mm-yyyy, mmm, dddd, [h]).
 */
import {
  VALUE,
  isBlank,
  isErr,
  parseDateText,
  scalarsIn,
  serialToDate,
  toMatrix,
  toNum,
  toStr,
  type Scalar,
  type XErr,
} from "../core";
import { bool, evalArg, num, str, type FnImpl, type Val } from "../helpers";

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number, len = 2) => String(Math.abs(Math.trunc(n))).padStart(len, "0");

function groupThousands(intPart: string, sep = ","): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Splits a format code into its up-to-four sections. */
export function splitSections(format: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  let inBracket = false;
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "[" && !inQuote) inBracket = true;
    else if (ch === "]" && !inQuote) inBracket = false;
    if (ch === ";" && !inQuote && !inBracket) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const isDateCode = (format: string) =>
  /(^|[^\\])[ymdhs]/i.test(format.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, (m) => (/^\[(h|m|s)+\]$/i.test(m) ? "h" : ""))) &&
  !/^[#0?,.%E+\s]*$/.test(format.replace(/"[^"]*"/g, ""));

function stripQuoted(format: string): string {
  return format.replace(/"[^"]*"/g, "");
}

/** Renders a serial date using Excel date/time tokens. */
export function formatDate(serial: number, format: string): string {
  const date = serialToDate(serial);
  const totalSeconds = Math.round((serial - Math.floor(serial)) * 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const withAmPm = /AM\/PM|A\/P/i.test(format);

  let out = "";
  let i = 0;
  const upper = format.toUpperCase();

  while (i < format.length) {
    const ch = format[i];

    if (ch === '"') {
      const close = format.indexOf('"', i + 1);
      out += format.slice(i + 1, close === -1 ? format.length : close);
      i = close === -1 ? format.length : close + 1;
      continue;
    }
    if (ch === "\\" && i + 1 < format.length) {
      out += format[i + 1];
      i += 2;
      continue;
    }
    if (ch === "[") {
      const close = format.indexOf("]", i);
      const inner = format.slice(i + 1, close === -1 ? format.length : close).toLowerCase();
      if (/^h+$/.test(inner)) out += String(Math.floor(serial * 24));
      else if (/^m+$/.test(inner)) out += String(Math.floor(serial * 1440));
      else if (/^s+$/.test(inner)) out += String(Math.round(serial * 86400));
      i = close === -1 ? format.length : close + 1;
      continue;
    }

    const rest = upper.slice(i);

    if (rest.startsWith("AM/PM")) {
      out += hours < 12 ? "AM" : "PM";
      i += 5;
      continue;
    }
    if (rest.startsWith("A/P")) {
      out += hours < 12 ? "A" : "P";
      i += 3;
      continue;
    }

    const run = (len: number, text: string) => {
      out += text;
      i += len;
    };

    if (/^Y{4}/.test(rest)) {
      run(4, String(date.getUTCFullYear()));
      continue;
    }
    if (/^Y{2}/.test(rest)) {
      run(2, pad(date.getUTCFullYear() % 100));
      continue;
    }
    if (/^Y/.test(rest)) {
      run(1, String(date.getUTCFullYear()));
      continue;
    }
    if (/^D{4}/.test(rest)) {
      run(4, DAY_LONG[date.getUTCDay()]);
      continue;
    }
    if (/^D{3}/.test(rest)) {
      run(3, DAY_LONG[date.getUTCDay()].slice(0, 3));
      continue;
    }
    if (/^D{2}/.test(rest)) {
      run(2, pad(date.getUTCDate()));
      continue;
    }
    if (/^D/.test(rest)) {
      run(1, String(date.getUTCDate()));
      continue;
    }

    const monthRun = /^M+/.exec(rest);
    if (monthRun) {
      const token = monthRun[0];
      // "m" is minutes when it follows h/hh or precedes s/ss.
      const before = upper.slice(0, i).replace(/"[^"]*"|\[[^\]]*\]/g, " ");
      const after = rest.slice(token.length).replace(/"[^"]*"/g, " ");
      const prevToken = /([HMS])\s*[:.]?\s*$/.exec(before);
      const nextToken = /^\s*[:.]?\s*S/.exec(after);
      const isMinute = (prevToken && /[HS]/.test(prevToken[1])) || Boolean(nextToken && !prevToken);
      if (isMinute) {
        run(token.length, pad(minutes, token.length === 1 ? 1 : 2));
        continue;
      }
      if (token.length >= 5) run(5, MONTH_LONG[date.getUTCMonth()][0]);
      else if (token.length === 4) run(4, MONTH_LONG[date.getUTCMonth()]);
      else if (token.length === 3) run(3, MONTH_LONG[date.getUTCMonth()].slice(0, 3));
      else run(token.length, token.length === 2 ? pad(date.getUTCMonth() + 1) : String(date.getUTCMonth() + 1));
      continue;
    }

    const hourRun = /^H+/.exec(rest);
    if (hourRun) {
      const token = hourRun[0];
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      run(token.length, pad(withAmPm ? h12 : hours, token.length === 1 ? 1 : 2));
      continue;
    }

    const secondRun = /^S+/.exec(rest);
    if (secondRun) {
      const token = secondRun[0];
      run(token.length, pad(seconds, token.length === 1 ? 1 : 2));
      continue;
    }

    out += format[i];
    i++;
  }

  return out;
}

/** Renders a number with a numeric format code section. */
export function formatNumber(value: number, section: string): string {
  // Split the section into the numeric core and its literal decoration.
  const numericRe = /[#0?][#0?,.]*/;
  const coreMatch = numericRe.exec(section);

  if (!coreMatch) {
    // A pure-literal section such as " kg" or "₹"--"0"
    return section.replace(/"([^"]*)"/g, "$1").replace(/\\/g, "").replace(/_.?/g, " ").replace(/\*.?/g, "");
  }

  const core = coreMatch[0];
  const prefixRaw = section.slice(0, coreMatch.index);
  const suffixRaw = section.slice(coreMatch.index + core.length);
  const decorate = (raw: string) =>
    raw
      .replace(/"([^"]*)"/g, "$1")
      .replace(/\\(.)/g, "$1")
      .replace(/\[([^\]]*)\]/g, (_m, inner: string) => {
        const currency = /^\$([^-]*)/.exec(inner);
        return currency && currency[1] && currency[1] !== "$" ? currency[1] : "";
      })
      .replace(/_.?/g, " ")
      .replace(/\*.?/g, "")
      .replace(/[%‰]/g, "");

  const isPercent = section.includes("%");
  const perMille = section.includes("‰");
  let scaled = value;
  if (isPercent) scaled *= 100;
  if (perMille) scaled *= 1000;

  // Trailing commas (0,, or #,##0,) scale down by a thousand each. A comma
  // between placeholders is a thousands separator instead.
  const intCoreRaw = core.includes(".") ? core.slice(0, core.indexOf(".")) : core;
  const scaleMatch = /,+$/.exec(intCoreRaw);
  const scale = scaleMatch ? scaleMatch[0].length : 0;
  if (scale) scaled /= Math.pow(1000, scale);

  const dotIndex = core.indexOf(".");
  const intCore = (dotIndex === -1 ? core : core.slice(0, dotIndex)).replace(/[^#0?]/g, "");
  const decCore = dotIndex === -1 ? "" : core.slice(dotIndex + 1).replace(/[^#0?]/g, "");

  const negative = scaled < 0;
  const abs = Math.abs(scaled);
  const fixed = abs.toFixed(decCore.length);
  let [intPart, decPart = ""] = fixed.split(".");

  // "0" pads with zeros, "#" hides leading zeros, "?" pads with spaces.
  const minIntDigits = (intCore.match(/0/g) ?? []).length;
  if (intPart === "0" && minIntDigits === 0) intPart = "";
  if (intPart.length < minIntDigits) intPart = intPart.padStart(minIntDigits, "0");
  if (intPart === "" && intCore === "" && decPart === "") intPart = "0";

  // Thousands separators only when placeholders appear on both sides of a comma.
  const grouped = /[#0?],+[#0?]/.test(intCoreRaw);
  if (grouped && intPart.length > 3) intPart = groupThousands(intPart, ",");

  // Trailing "#" decimal zeros are dropped; "?" ones become spaces.
  let decimals = decPart;
  for (let i = decCore.length - 1; i >= 0; i--) {
    if (decimals[i] !== "0") break;
    if (decCore[i] === "0") break;
    decimals = decimals.slice(0, i) + (decCore[i] === "?" ? " " : "");
  }
  decimals = decimals.replace(/ +$/, (m) => (decCore.includes("?") ? m : ""));

  let body = decimals ? `${intPart}.${decimals}` : intPart;
  if (isPercent) body += "%";
  if (perMille) body += "‰";
  if (body === "" || body === ".") body = "0";

  const prefix = decorate(prefixRaw);
  const suffix = decorate(suffixRaw);
  return `${negative ? "-" : ""}${prefix}${body}${suffix}`;
}

/** TEXT(value, format) — the public entry point. */
export function formatValue(value: Scalar, format: string): string | XErr {
  if (isErr(value)) return value;
  if (typeof value === "boolean") value = value ? "TRUE" : "FALSE";
  const sections = splitSections(format);
  const textSection = sections[3];
  if (typeof value === "string") {
    if (textSection !== undefined) {
      return textSection === "@" ? value : textSection.replace(/@/g, value).replace(/"/g, "");
    }
    if (isDateCode(format) && parseDateText(value) !== null) {
      return formatDate(parseDateText(value) as number, sections[0] ?? format);
    }
    if (sections[0] && /^[^#0?]*[#0?]/.test(sections[0])) {
      const n = Number(value);
      if (!Number.isNaN(n) && value.trim() !== "") return formatNumber(n, sections[0]);
    }
    return value;
  }
  if (isBlank(value)) value = 0;
  const n = typeof value === "number" ? value : 0;
  const isDateish = /(^|[^\\])[ymdhs]/i.test(stripQuoted(format)) && !/[#0?]/.test(stripQuoted(format));
  if (isDateish && sections.length === 1) return formatDate(n, format);
  const pick = n > 0 ? sections[0] : n < 0 ? sections[1] ?? sections[0] : sections[2] ?? sections[0];
  const section = pick ?? "General";
  if (section.trim().toUpperCase() === "GENERAL" || section.trim() === "") {
    const { formatGeneral } = { formatGeneral: (x: number) => String(Number(x.toPrecision(15))) };
    return formatGeneral(n);
  }
  if (n < 0 && sections[1] !== undefined) return formatNumber(Math.abs(n), sections[1]).replace(/^-/, "");
  return formatNumber(n, section);
}

const text = (v: Scalar): string => {
  const s = toStr(v);
  return isErr(s) ? "" : s;
};

export const textFns: Record<string, FnImpl> = {
  CHAR: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    if (n < 1 || n > 255) return VALUE;
    return String.fromCharCode(n);
  },
  UNICHAR: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    if (n < 1 || n > 0x10ffff) return VALUE;
    return String.fromCodePoint(n);
  },
  CLEAN: (args, ctx) => {
    const s = str(args, ctx, 0);
    return isErr(s) ? s : s.replace(/[\u0000-\u001f]/g, "");
  },
  CODE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    return s.length ? s.charCodeAt(0) : VALUE;
  },
  UNICODE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    return s.length ? (s.codePointAt(0) as number) : VALUE;
  },
  CONCAT: (args, ctx) => {
    const parts: string[] = [];
    for (const node of args) {
      const v = evalArg(args, ctx, args.indexOf(node));
      if (isErr(v)) return v;
      for (const cell of scalarsIn(v)) {
        const s = toStr(cell);
        if (isErr(s)) return s;
        parts.push(s);
      }
    }
    return parts.join("");
  },
  CONCATENATE: (args, ctx) => {
    const parts: string[] = [];
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v)) return v;
      const s = toStr(toMatrix(v)[0][0]);
      if (isErr(s)) return s;
      parts.push(s);
    }
    return parts.join("");
  },
  TEXTJOIN: (args, ctx) => {
    // TEXTJOIN(delimiter, ignore_empty, text1, …)
    const delimiter = str(args, ctx, 0);
    if (isErr(delimiter)) return delimiter;
    const ignoreEmpty = bool(args, ctx, 1, true);
    if (isErr(ignoreEmpty)) return ignoreEmpty;
    const parts: string[] = [];
    for (let i = 2; i < args.length; i++) {
      const v = ctx.evalNode(args[i]);
      for (const cell of scalarsIn(v)) {
        const s = toStr(cell);
        if (isErr(s)) return s;
        if (ignoreEmpty && s === "") continue;
        parts.push(s);
      }
    }
    return parts.join(delimiter);
  },
  DOLLAR: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const d = num(args, ctx, 1, 2);
    if (isErr(d)) return d;
    const body = formatNumber(Math.abs(n), `#,##0${d > 0 ? `.${"0".repeat(Math.trunc(d))}` : ""}`);
    return `${n < 0 ? "-" : ""}$${body}`;
  },
  EXACT: (args, ctx) => {
    const a = str(args, ctx, 0);
    if (isErr(a)) return a;
    const b = str(args, ctx, 1);
    if (isErr(b)) return b;
    return a === b;
  },
  FIND: (args, ctx) => {
    const needle = str(args, ctx, 0);
    if (isErr(needle)) return needle;
    const hay = str(args, ctx, 1);
    if (isErr(hay)) return hay;
    const start = num(args, ctx, 2, 1);
    if (isErr(start)) return start;
    const idx = hay.indexOf(needle, Math.max(0, Math.trunc(start) - 1));
    return idx === -1 ? VALUE : idx + 1;
  },
  SEARCH: (args, ctx) => {
    const needle = str(args, ctx, 0);
    if (isErr(needle)) return needle;
    const hay = str(args, ctx, 1);
    if (isErr(hay)) return hay;
    const start = num(args, ctx, 2, 1);
    if (isErr(start)) return start;
    const from = Math.max(0, Math.trunc(start) - 1);
    const pattern = needle.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === "*" || m === "?" ? m : `\\${m}`))
      .replace(/\*/g, "[\\s\\S]*")
      .replace(/\?/g, "[\\s\\S]");
    const re = new RegExp(pattern, "i");
    const slice = hay.slice(from);
    const m = re.exec(slice);
    return m ? from + m.index + 1 : VALUE;
  },
  FIXED: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const d = num(args, ctx, 1, 2);
    if (isErr(d)) return d;
    const noCommas = bool(args, ctx, 2, false);
    if (isErr(noCommas)) return noCommas;
    const digits = Math.trunc(d);
    const pattern = noCommas ? `0${digits > 0 ? `.${"0".repeat(digits)}` : ""}` : `#,##0${digits > 0 ? `.${"0".repeat(digits)}` : ""}`;
    return formatNumber(n, pattern);
  },
  LEFT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const n = num(args, ctx, 1, 1);
    if (isErr(n)) return n;
    if (n < 0) return VALUE;
    return s.slice(0, Math.trunc(n));
  },
  RIGHT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const n = num(args, ctx, 1, 1);
    if (isErr(n)) return n;
    if (n < 0) return VALUE;
    const k = Math.trunc(n);
    return k === 0 ? "" : s.slice(Math.max(0, s.length - k));
  },
  LEFTB: (args, ctx) => textFns.LEFT(args, ctx),
  RIGHTB: (args, ctx) => textFns.RIGHT(args, ctx),
  MID: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const start = num(args, ctx, 1);
    if (isErr(start)) return start;
    const len = num(args, ctx, 2);
    if (isErr(len)) return len;
    if (start < 1 || len < 0) return VALUE;
    return s.slice(Math.trunc(start) - 1, Math.trunc(start) - 1 + Math.trunc(len));
  },
  MIDB: (args, ctx) => textFns.MID(args, ctx),
  LEN: (args, ctx) => {
    const s = str(args, ctx, 0);
    return isErr(s) ? s : s.length;
  },
  LOWER: (args, ctx) => {
    const s = str(args, ctx, 0);
    return isErr(s) ? s : s.toLowerCase();
  },
  UPPER: (args, ctx) => {
    const s = str(args, ctx, 0);
    return isErr(s) ? s : s.toUpperCase();
  },
  PROPER: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    return s
      .toLowerCase()
      .replace(/(^|[^A-Za-z\u0900-\u097F])([A-Za-z\u0900-\u097F])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
  },
  NUMBERVALUE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const dec = str(args, ctx, 1, ".");
    if (isErr(dec)) return dec;
    const grp = str(args, ctx, 2, ",");
    if (isErr(grp)) return grp;
    let cleaned = grp ? s.split(grp).join("") : s;
    cleaned = dec === "." ? cleaned : cleaned.replace(dec, ".");
    const pctSplit = cleaned.split("%");
    cleaned = pctSplit[0];
    const n = Number(cleaned);
    if (Number.isNaN(n)) return VALUE;
    return pctSplit.length > 1 ? n / 100 : n;
  },
  REPLACE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const start = num(args, ctx, 1);
    if (isErr(start)) return start;
    const count = num(args, ctx, 2);
    if (isErr(count)) return count;
    const replacement = str(args, ctx, 3);
    if (isErr(replacement)) return replacement;
    if (start < 1 || count < 0) return VALUE;
    const i = Math.trunc(start) - 1;
    return s.slice(0, i) + replacement + s.slice(i + Math.trunc(count));
  },
  REPT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const n = num(args, ctx, 1);
    if (isErr(n)) return n;
    if (n < 0) return VALUE;
    if (s.length * Math.trunc(n) > 32767) return VALUE;
    return s.repeat(Math.trunc(n));
  },
  SUBSTITUTE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const oldText = str(args, ctx, 1);
    if (isErr(oldText)) return oldText;
    const newText = str(args, ctx, 2);
    if (isErr(newText)) return newText;
    if (!oldText) return s;
    if (args[3] && args[3].t !== "missing") {
      const which = num(args, ctx, 3);
      if (isErr(which)) return which;
      const at = Math.trunc(which);
      if (at < 1) return VALUE;
      let seen = 0;
      let index = s.indexOf(oldText);
      while (index !== -1) {
        seen++;
        if (seen === at) return s.slice(0, index) + newText + s.slice(index + oldText.length);
        index = s.indexOf(oldText, index + oldText.length);
      }
      return s;
    }
    return s.split(oldText).join(newText);
  },
  T: (args, ctx) => {
    const v = ctx.evalNode(args[0] ?? { t: "missing" });
    return typeof v === "string" ? v : "";
  },
  TEXT: (args, ctx) => {
    if (!args[0]) return VALUE;
    const v = ctx.evalNode(args[0]);
    const format = str(args, ctx, 1);
    if (isErr(format)) return format;
    const apply = (cell: Scalar): Scalar => {
      const out = formatValue(cell, format);
      return out;
    };
    if (Array.isArray(v)) return toMatrix(v).map((row) => row.map(apply));
    return apply(v as Scalar);
  },
  TRIM: (args, ctx) => {
    const s = str(args, ctx, 0);
    return isErr(s) ? s : s.replace(/ +/g, " ").replace(/^ | $/g, "");
  },
  VALUE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const trimmed = s.trim();
    if (!trimmed) return 0;
    const asDate = parseDateText(trimmed);
    const n = toNum(trimmed);
    if (typeof n === "number") return n;
    return asDate !== null ? asDate : VALUE;
  },
  VALUETOTEXT: (args, ctx) => {
    const v = ctx.evalNode(args[0] ?? { t: "missing" });
    const s = toStr(Array.isArray(v) ? v[0]?.[0] ?? null : v);
    return isErr(s) ? v : s;
  },
  ARRAYTOTEXT: (args, ctx) => {
    const v = ctx.evalNode(args[0] ?? { t: "missing" });
    const fmt = num(args, ctx, 1, 0);
    if (isErr(fmt)) return fmt;
    const cells = scalarsIn(v).map((c) => {
      if (c === null) return "";
      const s = toStr(c);
      if (isErr(s)) return s.err;
      return typeof c === "string" ? `"${s}"` : s;
    });
    return fmt === 0 ? cells.join(", ") : `{${cells.join(",")}}`;
  },
  TEXTBEFORE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const delim = str(args, ctx, 1);
    if (isErr(delim)) return delim;
    const instance = num(args, ctx, 2, 1);
    if (isErr(instance)) return instance;
    const ifNotFound = args[5] && args[5].t !== "missing" ? ctx.evalNode(args[5]) : VALUE;
    const parts = s.split(delim);
    if (Math.abs(Math.trunc(instance)) >= parts.length) {
      return Math.trunc(instance) === 0 ? ifNotFound : parts.slice(0, -1).join(delim);
    }
    const n = Math.trunc(instance);
    if (n > 0) return parts.slice(0, n).join(delim);
    return parts.slice(0, n).join(delim);
  },
  TEXTAFTER: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const delim = str(args, ctx, 1);
    if (isErr(delim)) return delim;
    const instance = num(args, ctx, 2, 1);
    if (isErr(instance)) return instance;
    const ifNotFound = args[5] && args[5].t !== "missing" ? ctx.evalNode(args[5]) : VALUE;
    const parts = s.split(delim);
    const n = Math.trunc(instance);
    if (n === 0) return s;
    if (Math.abs(n) >= parts.length) return ifNotFound;
    return n > 0 ? parts.slice(n).join(delim) : parts.slice(n).join(delim);
  },
  TEXTSPLIT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const colDelim = args[1] && args[1].t !== "missing" ? str(args, ctx, 1) : "";
    if (isErr(colDelim)) return colDelim;
    const rowDelim = args[2] && args[2].t !== "missing" ? str(args, ctx, 2) : "";
    if (isErr(rowDelim)) return rowDelim;
    const ignoreEmpty = bool(args, ctx, 3, false);
    if (isErr(ignoreEmpty)) return ignoreEmpty;
    const rows = rowDelim ? s.split(rowDelim) : [s];
    const grid = rows.map((r) => (colDelim ? r.split(colDelim) : [r]));
    const filtered = ignoreEmpty ? grid.map((r) => r.filter((c) => c !== "")) : grid;
    const width = Math.max(...filtered.map((r) => r.length));
    return filtered.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
  },
  REGEXTEST: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const pattern = str(args, ctx, 1);
    if (isErr(pattern)) return pattern;
    try {
      return new RegExp(pattern).test(s);
    } catch {
      return VALUE;
    }
  },
  REGEXEXTRACT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const pattern = str(args, ctx, 1);
    if (isErr(pattern)) return pattern;
    try {
      const m = new RegExp(pattern).exec(s);
      return m ? (m[1] ?? m[0]) : { err: "#N/A" as const };
    } catch {
      return VALUE;
    }
  },
  REGEXREPLACE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const pattern = str(args, ctx, 1);
    if (isErr(pattern)) return pattern;
    const replacement = str(args, ctx, 2);
    if (isErr(replacement)) return replacement;
    try {
      return s.replace(new RegExp(pattern, "g"), replacement);
    } catch {
      return VALUE;
    }
  },
};

export type { Val };
