/**
 * Engineering functions: number-base conversion and bit operations.
 * BASE/DECIMAL live in math.ts; these complete the group.
 */
import { NUM, VALUE, isErr, type Scalar, type XErr } from "../core";
import { num, str, type FnImpl } from "../helpers";

const BIN_RE = /^[01]{1,10}$/;
const OCT_RE = /^[0-7]{1,10}$/;
const HEX_RE = /^[0-9A-Fa-f]{1,10}$/;

function toInt28(v: number): number {
  // Excel's engineering functions work in 10-bit two's complement.
  return v < 0 ? v + 1024 : v;
}

/**
 * Excel's DEC2HEX/DEC2BIN/DEC2OCT take a *decimal* argument, not an integer, and
 * truncate toward zero the way Excel does: DEC2HEX(255) = "FF", DEC2HEX(-1) =
 * "FFFFFFFFFF" (Excel pads negative values to the full 10 characters).
 */
function decPlaces(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number | null | XErr {
  if (!args[i] || args[i].t === "missing") return null;
  const places = num(args, ctx, i);
  if (isErr(places)) return places;
  return Math.trunc(places);
}

/**
 * Two's-complement digits for a negative value. Excel writes a negative result
 * with the full 10 digits for binary, 10 octal digits and 10 hex digits.
 */
function signedDigits(value: number, radix: number, width: number): string {
  const bits = radix === 2 ? 10 : radix === 8 ? 30 : 40;
  const modulus = 2 ** bits;
  const wrapped = ((value % modulus) + modulus) % modulus;
  const digits = wrapped.toString(radix).toUpperCase();
  return digits.padStart(width, "0");
}

function bits(v: number): string {
  const n = toInt28(Math.trunc(v));
  return (n & 0x3ff).toString(2).padStart(10, "0");
}

function fromBits(b: string): number | XErr {
  if (b.length > 10 || !/^[01]+$/.test(b)) return NUM;
  const n = parseInt(b, 2);
  return b.length === 10 && b[0] === "1" ? n - 1024 : n;
}


/** "3+4i" / "-2.5-1j" / "5" / a number → real + imaginary parts. */
function complexParts(value: unknown): { re: number; im: number; suffix: string } | null {
  if (typeof value === "number") return { re: value, im: 0, suffix: "i" };
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return null;
  const suffix = /[jJ]$/.test(text) ? "j" : "i";
  const body = /[ij]$/i.test(text) ? text.slice(0, -1) : text;
  const m = /^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)?([+-]\d*\.?\d+(?:[eE][+-]?\d+)?(?:[eE][+-]?\d+)?)?$/.exec(body);
  if (!m) return null;
  const reText = m[1];
  const imText = m[2];
  if (reText === undefined && imText === undefined) return null;
  let re = 0;
  let im = 0;
  if (imText === undefined) {
    if (reText === undefined || reText === "" || reText === "+" || reText === "-") return null;
    // No imaginary part written: a bare number, or an imaginary-only "3i".
    if (/[ij]$/i.test(text) && reText !== undefined) {
      im = Number(reText);
      re = 0;
    } else {
      re = Number(reText);
    }
  } else {
    re = reText === undefined || reText === "" ? 0 : Number(reText);
    im = imText === "+" ? 1 : imText === "-" ? -1 : Number(imText);
  }
  if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
  return { re, im, suffix };
}

/** Excel's display form: "4+2i", "4-2i", "4", "2i". */
function complexText(re: number, im: number, suffix: string): string {
  const round = (n: number) => Math.round(n * 1e10) / 1e10;
  const r = round(re);
  const i = round(im);
  if (i === 0) return String(r);
  if (r === 0) return `${i === 1 ? "" : i === -1 ? "-" : i}${suffix}`;
  return `${r}${i >= 0 ? "+" : "-"}${Math.abs(i) === 1 ? "" : Math.abs(i)}${suffix}`;
}

export const engineeringFns: Record<string, FnImpl> = {
  BIN2DEC: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!BIN_RE.test(s)) return NUM;
    return fromBits(s);
  },
  BIN2HEX: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!BIN_RE.test(s)) return NUM;
    const dec = fromBits(s);
    if (isErr(dec)) return dec;
    const placesRaw = args[1] && args[1].t !== "missing" ? num(args, ctx, 1) : null;
    if (placesRaw !== null && isErr(placesRaw)) return placesRaw;
    const n = toInt28(dec);
    const hex = n.toString(16).toUpperCase();
    return placesRaw === null ? hex : hex.padStart(Math.trunc(placesRaw), "0");
  },
  BIN2OCT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!BIN_RE.test(s)) return NUM;
    const dec = fromBits(s);
    if (isErr(dec)) return dec;
    const n = toInt28(dec);
    return n.toString(8);
  },
  BITAND: (args, ctx) => bitwise(args, ctx, (a, b) => a & b),
  BITLSHIFT: (args, ctx) => {
    const a = num(args, ctx, 0);
    if (isErr(a)) return a;
    const shift = num(args, ctx, 1);
    if (isErr(shift)) return shift;
    if (a < 0 || a > 2 ** 48 - 1) return NUM;
    const n = Math.trunc(shift);
    const out = n >= 0 ? a * 2 ** n : Math.floor(a / 2 ** -n);
    return out >= 2 ** 48 ? NUM : out;
  },
  BITOR: (args, ctx) => bitwise(args, ctx, (a, b) => a | b),
  BITRSHIFT: (args, ctx) => {
    const a = num(args, ctx, 0);
    if (isErr(a)) return a;
    const shift = num(args, ctx, 1);
    if (isErr(shift)) return shift;
    if (a < 0 || a > 2 ** 48 - 1) return NUM;
    const n = Math.trunc(shift);
    const out = n >= 0 ? Math.floor(a / 2 ** n) : a * 2 ** -n;
    return out >= 2 ** 48 ? NUM : out;
  },
  BITXOR: (args, ctx) => bitwise(args, ctx, (a, b) => a ^ b),
  DEC2BIN: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const value = Math.trunc(n);
    if (value < -512 || value > 511) return NUM;
    const places = decPlaces(args, ctx, 1);
    if (places !== null && isErr(places)) return places;
    const digits = value < 0 ? signedDigits(value, 2, 10) : value.toString(2);
    return places === null || places <= digits.length ? digits : digits.padStart(places, "0");
  },
  DEC2HEX: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const value = Math.trunc(n);
    if (value < -549755813888 || value > 549755813887) return NUM;
    const places = decPlaces(args, ctx, 1);
    if (places !== null && isErr(places)) return places;
    const digits = value < 0 ? signedDigits(value, 16, 10) : value.toString(16).toUpperCase();
    return places === null || places <= digits.length ? digits : digits.padStart(places, "0");
  },
  DEC2OCT: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const value = Math.trunc(n);
    if (value < -536870912 || value > 536870911) return NUM;
    const places = decPlaces(args, ctx, 1);
    if (places !== null && isErr(places)) return places;
    const digits = value < 0 ? signedDigits(value, 8, 10) : value.toString(8);
    return places === null || places <= digits.length ? digits : digits.padStart(places, "0");
  },
  DELTA: (args, ctx) => {
    const a = num(args, ctx, 0);
    if (isErr(a)) return a;
    const b = num(args, ctx, 1, 0);
    if (isErr(b)) return b;
    return a === b ? 1 : 0;
  },
  GESTEP: (args, ctx) => {
    const a = num(args, ctx, 0);
    if (isErr(a)) return a;
    const step = num(args, ctx, 1, 0);
    if (isErr(step)) return step;
    return a >= step ? 1 : 0;
  },
  HEX2BIN: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!HEX_RE.test(s) || s.length > 10) return NUM;
    const n = parseInt(s, 16);
    const dec = s.length === 10 && parseInt(s[0], 16) >= 8 ? n - 2 ** 40 : n;
    if (dec < -512 || dec > 511) return NUM;
    return bits(dec);
  },
  HEX2DEC: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!HEX_RE.test(s) || s.length > 10) return NUM;
    const n = parseInt(s, 16);
    return s.length === 10 && parseInt(s[0], 16) >= 8 ? n - 2 ** 40 : n;
  },
  HEX2OCT: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!HEX_RE.test(s) || s.length > 10) return NUM;
    const n = parseInt(s, 16);
    const dec = s.length === 10 && parseInt(s[0], 16) >= 8 ? n - 2 ** 40 : n;
    const v = dec < 0 ? dec + 2 ** 30 : dec;
    return Math.trunc(v).toString(8);
  },
  OCT2BIN: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!OCT_RE.test(s) || s.length > 10) return NUM;
    const n = parseInt(s, 8);
    const dec = s.length === 10 && n >= 2 ** 29 ? n - 2 ** 30 : n;
    if (dec < -512 || dec > 511) return NUM;
    return bits(dec);
  },
  OCT2DEC: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!OCT_RE.test(s) || s.length > 10) return NUM;
    const n = parseInt(s, 8);
    return s.length === 10 && n >= 2 ** 29 ? n - 2 ** 30 : n;
  },
  OCT2HEX: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    if (!OCT_RE.test(s) || s.length > 10) return NUM;
    const n = parseInt(s, 8);
    const dec = s.length === 10 && n >= 2 ** 29 ? n - 2 ** 30 : n;
    const v = dec < 0 ? dec + 2 ** 40 : dec;
    return Math.trunc(v).toString(16).toUpperCase();
  },
  ERF: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    return erfSeries(x);
  },
  ERF_PRECISE: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    return erfSeries(x);
  },
  ERFC: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    return 1 - erfSeries(x);
  },
  ERFC_PRECISE: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    return 1 - erfSeries(x);
  },
  IMSUM: (args, ctx) => {
    // IMSUM adds any number of complex numbers: "3+4i" + "1-2i" = "4+2i".
    let re = 0;
    let im = 0;
    let suffix = "i";
    let seen = 0;
    for (let i = 0; i < args.length; i++) {
      if (!args[i] || args[i].t === "missing") continue;
      const v = ctx.evalNode(args[i]);
      const parts = complexParts(v);
      if (parts === null) return VALUE;
      re += parts.re;
      im += parts.im;
      suffix = parts.suffix;
      seen += 1;
    }
    if (!seen) return VALUE;
    return complexText(re, im, suffix);
  },
  COMPLEX: (args, ctx) => {
    const re = num(args, ctx, 0);
    if (isErr(re)) return re;
    const im = num(args, ctx, 1);
    if (isErr(im)) return im;
    const suffix = args[2] && args[2].t !== "missing" ? str(args, ctx, 2, "i") : "i";
    if (isErr(suffix)) return suffix;
    if (suffix !== "i" && suffix !== "j") return VALUE;
    if (re === 0 && im === 0) return "0";
    if (re === 0) return `${im}${suffix}`;
    const sign = im < 0 ? "-" : "+";
    return `${re}${sign}${Math.abs(im)}${suffix}`;
  },
  IMREAL: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const m = /^([+-]?\d*\.?\d*)?[+-]?(\d*\.?\d*)?[ij]$/.exec(s.trim());
    if (!m) return VALUE;
    return Number(m[1] || 0);
  },
  IMAGINARY: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const m = /^([+-]?\d*\.?\d*)?([+-]?\d*\.?\d*)?[ij]$/.exec(s.trim());
    if (!m) return VALUE;
    const raw = m[2];
    if (raw === undefined || raw === "" || raw === "+") return 1;
    if (raw === "-") return -1;
    return Number(raw);
  },
};

function bitwise(
  args: Parameters<FnImpl>[0],
  ctx: Parameters<FnImpl>[1],
  f: (a: number, b: number) => number,
): number | XErr {
  const a = num(args, ctx, 0);
  if (isErr(a)) return a;
  const b = num(args, ctx, 1);
  if (isErr(b)) return b;
  if (a < 0 || b < 0 || a > 2 ** 48 - 1 || b > 2 ** 48 - 1) return NUM;
  return f(Math.trunc(a), Math.trunc(b));
}

function erfSeries(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export const engineeringHelpers = { bits, fromBits, type: null as unknown as Scalar };
