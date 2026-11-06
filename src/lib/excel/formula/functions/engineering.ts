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

function bits(v: number): string {
  const n = toInt28(Math.trunc(v));
  return (n & 0x3ff).toString(2).padStart(10, "0");
}

function fromBits(b: string): number | XErr {
  if (b.length > 10 || !/^[01]+$/.test(b)) return NUM;
  const n = parseInt(b, 2);
  return b.length === 10 && b[0] === "1" ? n - 1024 : n;
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
    if (n < -512 || n > 511) return NUM;
    const out = bits(n);
    return out;
  },
  DEC2HEX: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    if (n < -549755813888 || n > 549755813887) return NUM;
    const places = args[1] && args[1].t !== "missing" ? num(args, ctx, 1) : null;
    if (isErr(places)) return places;
    const v = n < 0 ? n + 2 ** 40 : n;
    const hex = Math.trunc(v).toString(16).toUpperCase();
    return places === null ? hex : hex.padStart(Math.trunc(places), "0").slice(-Math.max(10, Math.trunc(places)));
  },
  DEC2OCT: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    if (n < -536870912 || n > 536870911) return NUM;
    const v = n < 0 ? n + 2 ** 30 : n;
    return Math.trunc(v).toString(8);
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
  IMSUM: () => VALUE,
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
