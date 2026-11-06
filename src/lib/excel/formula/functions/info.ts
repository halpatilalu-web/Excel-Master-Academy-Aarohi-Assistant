/** IS* / information / cell inspection functions. */
import {
  NA,
  VALUE,
  isBlank,
  isErr,
  serialToDate,
  toNum,
  toStr,
  type Scalar,
  type XErr,
} from "../core";
import { num, str, type FnImpl } from "../helpers";

const firstScalar = (args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): Scalar | XErr => {
  const node = args[i];
  if (!node || node.t === "missing") return null;
  const v = ctx.evalNode(node);
  if (Array.isArray(v)) return v[0]?.[0] ?? null;
  if (typeof v === "object" && v !== null && "lambda" in v) return null;
  return v as Scalar;
};

function errorCodeText(v: Scalar): string {
  return isErr(v) ? v.err : "";
}

export const infoFns: Record<string, FnImpl> = {
  CELL: (args, ctx) => {
    const type = str(args, ctx, 0);
    if (isErr(type)) return type;
    const info = type.toLowerCase();
    const node = args[1];
    let row = ctx.row;
    let col = ctx.col;
    let sheet = ctx.sheet;
    if (node && node.t === "ref") {
      row = node.row;
      col = node.col;
      sheet = node.sheet ?? ctx.sheet;
    } else if (node && node.t === "range") {
      row = node.r1;
      col = node.c1;
      sheet = node.sheet ?? ctx.sheet;
    }
    const raw = ctx.host.raw(sheet, row, col);
    const value = ctx.host.value(sheet, row, col);
    switch (info) {
      case "address":
        return `$${colLetter(col)}$${row + 1}`;
      case "col":
        return col + 1;
      case "row":
        return row + 1;
      case "contents":
        return isErr(value) ? value : value === null ? 0 : value;
      case "filename":
        return "";
      case "type":
        if (isBlank(value) || raw === "") return "b";
        if (isErr(value)) return "e";
        if (typeof value === "string") return "l";
        return "v";
      case "width":
        return raw.length + 1;
      case "format":
        if (typeof value === "number") {
          const serial = value;
          const d = serialToDate(serial);
          if (serial >= 1 && d.getUTCFullYear() >= 1900) return "D1";
          return Number.isInteger(value) ? "G" : "F2";
        }
        if (typeof value === "boolean") return "G";
        if (isErr(value)) return "G";
        return "G";
      case "prefix": {
        const text = isBlank(value) ? "" : toStr(value);
        if (isErr(text)) return text;
        const quote = raw.match(/^(['"])(\s*)/);
        return quote ? quote[1] : "";
      }
      case "protect":
        return 1;
      case "color":
        return 0;
      case "parentheses":
        return 0;
      default:
        return VALUE;
    }
  },
  ERROR_TYPE: (args, ctx) => {
    const v = firstScalar(args, ctx, 0);
    if (isErr(v)) {
      const table: Record<string, number> = {
        "#NULL!": 1, "#DIV/0!": 2, "#VALUE!": 3, "#REF!": 4, "#NAME?": 5, "#NUM!": 6, "#N/A": 7,
        "#GETTING_DATA": 8, "#SPILL!": 9, "#CALC!": 14,
      };
      return table[v.err] ?? 7;
    }
    return NA;
  },
  INFO: (args, ctx) => {
    const type = str(args, ctx, 0);
    if (isErr(type)) return type;
    const t = type.toLowerCase();
    if (t === "numfile") return ctx.host.sheetNames().length;
    if (t === "recalc") return "Automatic";
    if (t === "release") return "16.0";
    if (t === "system") {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      if (/Win/.test(ua)) return "pcdos";
      if (/Mac/.test(ua)) return "mac";
      if (/Android/.test(ua)) return "pcdos";
      if (/Linux/.test(ua)) return "pcdos";
      return "pcdos";
    }
    if (t === "osversion") {
      if (typeof navigator === "undefined") return "Web";
      return `${navigator.userAgent.includes("Mac") ? "Mac" : "Windows (Web)"} · browser`;
    }
    if (t === "directory") return "/";
    return VALUE;
  },
  ISBLANK: (args, ctx) => {
    const node = args[0];
    if (!node) return VALUE;
    if (node.t === "ref" || node.t === "range") {
      const r = node.t === "ref" ? node.row : node.r1;
      const c = node.t === "ref" ? node.col : node.c1;
      const raw = ctx.host.raw(node.sheet ?? ctx.sheet, r, c);
      return raw === "" || raw === "null";
    }
    const v = node.t === "missing" ? null : ctx.evalNode(node);
    return isBlank(Array.isArray(v) ? v[0]?.[0] ?? null : v);
  },
  ISERR: (args, ctx) => {
    const v = firstScalar(args, ctx, 0);
    return isErr(v) && v.err !== "#N/A";
  },
  ISERROR: (args, ctx) => isErr(firstScalar(args, ctx, 0)),
  ISEVEN: (args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    return Math.trunc(v) % 2 === 0;
  },
  ISFORMULA: (args, ctx) => {
    const node = args[0];
    if (!node || node.t !== "ref") return false;
    const raw = ctx.host.raw(node.sheet ?? ctx.sheet, node.row, node.col);
    return raw.trimStart().startsWith("=");
  },
  ISLOGICAL: (args, ctx) => typeof firstScalar(args, ctx, 0) === "boolean",
  ISNA: (args, ctx) => {
    const v = firstScalar(args, ctx, 0);
    return isErr(v) && v.err === "#N/A";
  },
  ISNONTEXT: (args, ctx) => typeof firstScalar(args, ctx, 0) !== "string",
  ISNUMBER: (args, ctx) => typeof firstScalar(args, ctx, 0) === "number",
  ISODD: (args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    return Math.abs(Math.trunc(v) % 2) === 1;
  },
  ISREF: (args, ctx) => {
    const node = args[0];
    if (!node) return false;
    void ctx;
    return node.t === "ref" || node.t === "range";
  },
  ISTEXT: (args, ctx) => typeof firstScalar(args, ctx, 0) === "string",
  N: (args, ctx) => {
    const v = firstScalar(args, ctx, 0);
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    return 0;
  },
  NA: () => NA,
  SHEET: (args, ctx) => {
    const node = args[0];
    if (node && node.t === "ref" && node.sheet) {
      const names = ctx.host.sheetNames();
      const idx = names.indexOf(node.sheet);
      return idx === -1 ? NA : idx + 1;
    }
    return ctx.host.sheetNames().indexOf(ctx.sheet) + 1;
  },
  SHEETS: (args, ctx) => {
    void args;
    return ctx.host.sheetNames().length;
  },
  TYPE: (args, ctx) => {
    const v = firstScalar(args, ctx, 0);
    if (isErr(v)) return 16;
    if (Array.isArray(ctx.evalNode(args[0] ?? { t: "missing" }))) return 64;
    if (isBlank(v)) return 1;
    if (typeof v === "number") return 1;
    if (typeof v === "string") return 2;
    if (typeof v === "boolean") return 4;
    return 64;
  },
  "ERROR.TYPE": (args, ctx) => {
    const v = firstScalar(args, ctx, 0);
    if (!isErr(v)) return NA;
    const table: Record<string, number> = {
      "#NULL!": 1, "#DIV/0!": 2, "#VALUE!": 3, "#REF!": 4, "#NAME?": 5, "#NUM!": 6, "#N/A": 7,
      "#GETTING_DATA": 8, "#SPILL!": 9, "#CALC!": 14,
    };
    return table[v.err] ?? NA;
  },
};

function colLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export const infoHelpers = { errorCodeText, toNum, toStr };
