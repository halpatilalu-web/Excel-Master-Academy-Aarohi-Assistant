/** Math & trigonometry — the full Excel worksheet set. */
import {
  DIV0,
  NUM,
  VALUE,
  isErr,
  isBlank,
  scalarsIn,
  toMatrix,
  toNum,
  type Scalar,
  type XErr,
} from "../core";
import {
  bool,
  evalArg,
  fnTable,
  firstError,
  mapArray,
  matrix,
  num,
  numbersFromArgs,
  roundDown,
  roundHalfUp,
  roundUp,
  str,
  type FnImpl,
  type Val,
} from "../helpers";
import type { Node } from "../parser";

const fn = (f: FnImpl): FnImpl => f;

function unaryNum(f: (x: number) => number | XErr): FnImpl {
  return (args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    return f(v);
  };
}

function binaryNum(f: (x: number, y: number) => number | XErr, yFallback?: number): FnImpl {
  return (args, ctx) => {
    const a = num(args, ctx, 0);
    if (isErr(a)) return a;
    const b = num(args, ctx, 1, yFallback);
    if (isErr(b)) return b;
    return f(a, b);
  };
}

const safeNum = (x: number): number | XErr => (Number.isFinite(x) ? x : NUM);

function roundTo(mode: "half" | "up" | "down"): FnImpl {
  return (args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    const d = num(args, ctx, 1);
    if (isErr(d)) return d;
    if (mode === "half") return roundHalfUp(v, Math.trunc(d));
    if (mode === "up") return roundUp(v, Math.trunc(d));
    return roundDown(v, Math.trunc(d));
  };
}

function multipleOf(kind: "nearest" | "up" | "down", value: number, sig: number): number | XErr {
  if (sig === 0) return 0;
  if (value > 0 && sig < 0) return NUM;
  const ratio = Number((value / sig).toPrecision(12));
  const n =
    kind === "up" ? Math.ceil(ratio) : kind === "down" ? Math.floor(ratio) : Math.round(ratio);
  return Number((n * sig).toPrecision(15));
}

function multiRound(kind: "mround" | "ceiling" | "floor"): FnImpl {
  return (args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    const sig = num(args, ctx, 1);
    if (isErr(sig)) return sig;
    if (kind === "mround" && v > 0 && sig < 0) return NUM;
    if (kind === "mround") return multipleOf("nearest", v, sig);
    return multipleOf(kind === "ceiling" ? "up" : "down", v, sig);
  };
}

function gcd(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

function factorial(n: number): number | XErr {
  if (n < 0) return NUM;
  const v = Math.trunc(n);
  let out = 1;
  for (let i = 2; i <= v; i++) out *= i;
  return Number.isFinite(out) ? out : NUM;
}

function gamma(x: number): number {
  // Lanczos approximation
  const g = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  let a = g[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += g[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

function logGamma(x: number): number {
  return Math.log(Math.abs(gamma(x)));
}

function beta(a: number, b: number): number {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

/**
 * Regularised incomplete beta I_x(a,b) — the CDF of the beta distribution and,
 * via a change of variable, of the Student-t distribution. Continued fraction
 * (Numerical Recipes `betacf`), which is what makes T.DIST accurate in the tails;
 * naive Simpson integration loses precision exactly where a t-test needs it.
 */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (front * betaCf(x, a, b)) / a;
  return 1 - (front * betaCf(1 - x, b, a)) / b;
}

function betaCf(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}

export const mathFns: Record<string, FnImpl> = {
  ABS: unaryNum((x) => Math.abs(x)),
  ACOS: unaryNum((x) => (x < -1 || x > 1 ? NUM : Math.acos(x))),
  ACOSH: unaryNum((x) => (x < 1 ? NUM : Math.acosh(x))),
  ACOT: unaryNum((x) => Math.PI / 2 - Math.atan(x)),
  ACOTH: unaryNum((x) => (Math.abs(x) <= 1 ? NUM : 0.5 * Math.log((x + 1) / (x - 1)))),
  ARABIC: fn((args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    const up = s.toUpperCase().replace(/-/g, "");
    if (!/^[IVXLCDM]*$/.test(up)) return VALUE;
    let total = 0;
    for (let i = 0; i < up.length; i++) {
      const cur = map[up[i]];
      const next = map[up[i + 1]];
      total += next && cur < next ? -cur : cur;
    }
    return total;
  }),
  ASIN: unaryNum((x) => (x < -1 || x > 1 ? NUM : Math.asin(x))),
  ASINH: unaryNum((x) => Math.asinh(x)),
  ATAN: unaryNum((x) => Math.atan(x)),
  ATAN2: binaryNum((x, y) => (x === 0 && y === 0 ? DIV0 : Math.atan2(y, x))),
  ATANH: unaryNum((x) => (Math.abs(x) >= 1 ? NUM : Math.atanh(x))),
  BASE: fn((args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const radix = num(args, ctx, 1);
    if (isErr(radix)) return radix;
    const minLen = num(args, ctx, 2, 0);
    if (isErr(minLen)) return minLen;
    if (n < 0 || n >= 2 ** 53 || radix < 2 || radix > 36) return NUM;
    return Math.trunc(n).toString(Math.trunc(radix)).toUpperCase().padStart(Math.trunc(minLen), "0");
  }),
  AGGREGATE: fn((args, ctx) => {
    // AGGREGATE(function_num, options, ref1, …): options 0-7 skip errors and/or
    // hidden rows; functions 1-19 mirror AVERAGE…QUARTILE.
    const codeRaw = num(args, ctx, 0);
    if (isErr(codeRaw)) return codeRaw;
    const options = num(args, ctx, 1);
    if (isErr(options)) return options;
    const code = Math.trunc(codeRaw);
    const opt = Math.trunc(options);
    if (code < 1 || code > 19 || opt < 0 || opt > 7) return VALUE;
    const ignoreErrors = opt === 1 || opt === 2 || opt === 3 || opt === 6 || opt === 7;
    const rest = args.slice(2);
    const map: Record<number, string> = {
      1: "AVERAGE", 2: "COUNT", 3: "COUNTA", 4: "MAX", 5: "MIN", 6: "PRODUCT",
      7: "STDEV.S", 8: "STDEVP", 9: "SUM", 10: "VAR.S", 11: "VARP",
      12: "MEDIAN", 13: "MODE.SNGL", 14: "LARGE", 15: "SMALL",
      16: "PERCENTILE.INC", 17: "QUARTILE.INC", 18: "PERCENTILE.EXC", 19: "QUARTILE.EXC",
    };
    const target = map[code];
    const impl = fnTable[target.replace(/\./g, "_")];
    if (!impl) return VALUE;
    if (!ignoreErrors) return impl(rest, ctx);
    // Rebuild the arguments with #errors dropped, so the aggregate sees clean
    // numbers only (this is what students use AGGREGATE for).
    const cleaned: Node[] = [];
    for (const node of rest) {
      if (node.t === "range" || node.t === "ref") {
        const grid = toMatrix(ctx.evalNode(node));
        const rows = grid
          .map((row) => row.filter((cell) => !isErr(cell)))
          .filter((row) => row.length);
        if (rows.length) {
          cleaned.push({
            t: "array",
            rows: rows.map((row) =>
              row.map(
                (cell): Node =>
                  typeof cell === "number"
                    ? { t: "num", v: cell }
                    : { t: "str", v: String(cell ?? "") },
              ),
            ),
          });
        }
      } else {
        cleaned.push(node);
      }
    }
    return impl(cleaned, ctx);
  }),
  CEILING: multiRound("ceiling"),
  "CEILING.MATH": fn((args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const sig = num(args, ctx, 1, 1);
    if (isErr(sig)) return sig;
    const mode = num(args, ctx, 2, 0);
    if (isErr(mode)) return mode;
    if (sig === 0) return 0;
    const s = Math.abs(sig);
    if (n >= 0) return Math.ceil(n / s) * s;
    return mode !== 0 ? -Math.floor(Math.abs(n) / s) * s : -Math.ceil(Math.abs(n) / s) * s;
  }),
  "CEILING.PRECISE": fn((args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const sig = num(args, ctx, 1, 1);
    if (isErr(sig)) return sig;
    if (sig === 0) return 0;
    const s = Math.abs(sig);
    return Math.ceil(n / s) * s;
  }),
  COMBIN: binaryNum((n, k) => {
    if (n < 0 || k < 0 || k > n) return NUM;
    let out = 1;
    for (let i = 1; i <= Math.trunc(k); i++) out = (out * (Math.trunc(n) - i + 1)) / i;
    return Math.round(out);
  }),
  COMBINA: binaryNum((n, k) => {
    if (n < 0 || k < 0) return NUM;
    const N = Math.trunc(n) + Math.trunc(k) - 1;
    const K = Math.trunc(k);
    let out = 1;
    for (let i = 1; i <= K; i++) out = (out * (N - i + 1)) / i;
    return Math.round(out);
  }),
  COS: unaryNum((x) => Math.cos(x)),
  COSH: unaryNum((x) => Math.cosh(x)),
  COT: unaryNum((x) => (x === 0 ? DIV0 : 1 / Math.tan(x))),
  COTH: unaryNum((x) => (x === 0 ? DIV0 : 1 / Math.tanh(x))),
  CSC: unaryNum((x) => (Math.sin(x) === 0 ? DIV0 : 1 / Math.sin(x))),
  CSCH: unaryNum((x) => (Math.sinh(x) === 0 ? DIV0 : 1 / Math.sinh(x))),
  DECIMAL: fn((args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const radix = num(args, ctx, 1);
    if (isErr(radix)) return radix;
    if (radix < 2 || radix > 36 || s === "") return NUM;
    const parsed = parseInt(s, Math.trunc(radix));
    return Number.isNaN(parsed) ? NUM : parsed;
  }),
  DEGREES: unaryNum((x) => (x * 180) / Math.PI),
  EVEN: unaryNum((x) => {
    const r = Math.ceil(Math.abs(x) / 2) * 2;
    return x < 0 ? -r : r;
  }),
  EXP: unaryNum((x) => safeNum(Math.exp(x))),
  FACT: unaryNum((x) => factorial(x)),
  FACTDOUBLE: unaryNum((x) => {
    if (x < -1) return NUM;
    let out = 1;
    for (let i = Math.trunc(x); i > 1; i -= 2) out *= i;
    return out;
  }),
  FLOOR: multiRound("floor"),
  "FLOOR.MATH": fn((args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const sig = num(args, ctx, 1, 1);
    if (isErr(sig)) return sig;
    const mode = num(args, ctx, 2, 0);
    if (isErr(mode)) return mode;
    if (sig === 0) return 0;
    const s = Math.abs(sig);
    if (n >= 0) return Math.floor(n / s) * s;
    return mode !== 0 ? -Math.ceil(Math.abs(n) / s) * s : -Math.floor(Math.abs(n) / s) * s;
  }),
  "FLOOR.PRECISE": fn((args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const sig = num(args, ctx, 1, 1);
    if (isErr(sig)) return sig;
    if (sig === 0) return 0;
    const s = Math.abs(sig);
    return Math.floor(n / s) * s;
  }),
  GCD: fn((args, ctx) => {
    const nums = numbersFromArgs(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return VALUE;
    if (nums.some((n) => n < 0)) return NUM;
    return nums.reduce((a, b) => gcd(a, b), 0);
  }),
  INT: unaryNum((x) => Math.floor(x)),
  ISO_CEILING: fn((args, ctx) => mathFns["CEILING.MATH"](args, ctx)),
  LCM: fn((args, ctx) => {
    const nums = numbersFromArgs(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return VALUE;
    if (nums.some((n) => n < 0)) return NUM;
    return nums.reduce((a, b) => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b)), 1);
  }),
  LN: unaryNum((x) => (x <= 0 ? NUM : Math.log(x))),
  LOG: fn((args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    const base = num(args, ctx, 1, 10);
    if (isErr(base)) return base;
    if (v <= 0 || base <= 0 || base === 1) return NUM;
    return Math.log(v) / Math.log(base);
  }),
  LOG10: unaryNum((x) => (x <= 0 ? NUM : Math.log10(x))),
  MOD: binaryNum((n, d) => {
    if (d === 0) return DIV0;
    return n - d * Math.floor(n / d);
  }),
  MROUND: multiRound("mround"),
  MULTINOMIAL: fn((args, ctx) => {
    const nums = numbersFromArgs(args, ctx);
    if (isErr(nums)) return nums;
    if (nums.some((n) => n < 0)) return NUM;
    const total = nums.reduce((a, b) => a + Math.trunc(b), 0);
    let denom = 1;
    nums.forEach((n) => {
      denom *= Number(factorial(Math.trunc(n)) as number);
    });
    return (factorial(total) as number) / denom;
  }),
  ODD: unaryNum((x) => {
    const r = Math.ceil((Math.abs(x) - 1) / 2) * 2 + 1;
    return x < 0 ? -r : r;
  }),
  PI: () => Math.PI,
  POWER: binaryNum((x, y) => safeNum(x ** y)),
  PRODUCT: fn((args, ctx) => {
    const nums = numbersFromArgs(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a * b, 1);
  }),
  QUOTIENT: binaryNum((a, b) => (b === 0 ? DIV0 : Math.trunc(a / b))),
  RADIANS: unaryNum((x) => (x * Math.PI) / 180),
  RAND: () => Math.random(),
  RANDARRAY: fn((args, ctx) => {
    const rows = Math.max(1, Math.trunc(num(args, ctx, 0, 1) as number));
    const cols = Math.max(1, Math.trunc(num(args, ctx, 1, 1) as number));
    const min = Math.trunc(num(args, ctx, 2, 0) as number);
    const max = Math.trunc(num(args, ctx, 3, 1) as number);
    const whole = bool(args, ctx, 4, false);
    if (rows * cols > 20_000) return NUM;
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => {
        const r = min + Math.random() * (max - min);
        return whole === true ? Math.floor(r) : r;
      }),
    );
  }),
  RANDBETWEEN: binaryNum((bottom, top) => {
    const lo = Math.ceil(Math.min(bottom, top));
    const hi = Math.floor(Math.max(bottom, top));
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }),
  ROMAN: fn((args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    const form = num(args, ctx, 1, 0);
    if (isErr(form)) return form;
    if (v < 0 || v > 3999) return NUM;
    let n = Math.trunc(v);
    const table: [number, string][] = [
      [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
      [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
    ];
    let out = "";
    for (const [val, sym] of table) {
      while (n >= val) {
        out += sym;
        n -= val;
      }
    }
    if (form !== 0) {
      // Simplified forms (1-4) progressively drop subtractive notation.
      const simplify: Record<number, [RegExp, string][]> = {
        1: [[/CM/g, "DCD"], [/CD/g, "CCCC"], [/XC/g, "LXL"], [/XL/g, "XXXX"], [/IX/g, "VIV"], [/IV/g, "IIII"]],
        2: [[/CM/g, "DCD"], [/CD/g, "CCCC"], [/XC/g, "LXL"], [/XL/g, "XXXX"], [/IX/g, "VIV"], [/IV/g, "IIII"], [/XIX/g, "XVIIII"], [/LXL/g, "XXXXXX"]],
        3: [[/CM/g, "DCD"], [/CD/g, "CCCC"], [/XC/g, "LXL"], [/XL/g, "XXXX"], [/IX/g, "VIV"], [/IV/g, "IIII"], [/XIX/g, "XVIIII"]],
        4: [[/CM/g, "CCCCCCCC"], [/CD/g, "CCCC"], [/XC/g, "LXL"], [/XL/g, "XXXX"], [/IX/g, "VIV"], [/IV/g, "IIII"]],
      };
      for (const [re, rep] of simplify[Math.min(4, Math.trunc(form))] ?? []) out = out.replace(re, rep);
    }
    return out;
  }),
  ROUND: roundTo("half"),
  ROUNDDOWN: roundTo("down"),
  ROUNDUP: roundTo("up"),
  SEC: unaryNum((x) => (Math.cos(x) === 0 ? DIV0 : 1 / Math.cos(x))),
  SECH: unaryNum((x) => 1 / Math.cosh(x)),
  SERIESSUM: fn((args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const n = num(args, ctx, 1);
    if (isErr(n)) return n;
    const m = num(args, ctx, 2);
    if (isErr(m)) return m;
    const coeffs = scalarsIn(evalArg(args, ctx, 3)).map((c) => (typeof c === "number" ? c : Number(c)));
    if (coeffs.some((c) => Number.isNaN(c))) return VALUE;
    return coeffs.reduce((sum, c, i) => sum + c * x ** (n + i * m), 0);
  }),
  SIGN: unaryNum((x) => Math.sign(x)),
  SIN: unaryNum((x) => Math.sin(x)),
  SINH: unaryNum((x) => Math.sinh(x)),
  SQRT: unaryNum((x) => (x < 0 ? NUM : Math.sqrt(x))),
  SQRTPI: unaryNum((x) => (x < 0 ? NUM : Math.sqrt(x * Math.PI))),
  SUBTOTAL: fn((args, ctx) => {
    const codeArg = args[0] ? ctx.evalNode(args[0]) : null;
    const code = typeof codeArg === "number" ? Math.trunc(codeArg % 100) : -1;
    const rest = args.slice(1);
    const map: Record<number, string> = {
      1: "AVERAGE", 2: "COUNT", 3: "COUNTA", 4: "MAX", 5: "MIN", 6: "PRODUCT",
      7: "STDEV", 8: "STDEVP", 9: "SUM", 10: "VAR", 11: "VARP",
    };
    const target = map[code];
    if (!target) return VALUE;
    // Directly call the sibling implementation through the table.
    const impl = fnTable[target.replace(/\./g, "_")];
    if (!impl) return VALUE;
    return impl(rest, ctx);
  }),
  SUMPRODUCT: fn((args, ctx) => {
    if (!args.length) return VALUE;
    const grids = args.map((n) => matrix([n], ctx, 0));
    const rows = Math.max(...grids.map((g) => g.length));
    const cols = Math.max(...grids.map((g) => g[0]?.length ?? 1));
    let total = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let product = 0;
        for (const g of grids) {
          const cell = g[Math.min(r, g.length - 1)]?.[Math.min(c, (g[0]?.length ?? 1) - 1)] ?? 0;
          const n = toNum(cell);
          if (isErr(n)) return n;
          product = product === 0 ? n : product * n;
        }
        total += product;
      }
    }
    return Number(total.toPrecision(15));
  }),
  SEQUENCE: fn((args, ctx) => {
    const rows = Math.trunc(num(args, ctx, 0, 1) as number);
    const cols = Math.trunc(num(args, ctx, 1, 1) as number);
    const start = num(args, ctx, 2, 1);
    if (isErr(start)) return start;
    const step = num(args, ctx, 3, 1);
    if (isErr(step)) return step;
    if (rows < 1 || cols < 1 || rows * cols > 100_000) return NUM;
    let cursor = start;
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => {
        const out = cursor;
        cursor = Number((cursor + step).toPrecision(15));
        return out;
      }),
    );
  }),
  SUMSQ: fn((args, ctx) => {
    const nums = numbersFromArgs(args, ctx);
    if (isErr(nums)) return nums;
    return nums.reduce((a, b) => a + b * b, 0);
  }),
  SUM: fn((args, ctx) => {
    const nums = numbersFromArgs(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return 0;
    const total = nums.reduce((a, b) => a + b, 0);
    return Number(total.toPrecision(15));
  }),
  SUMX2MY2: (args, ctx) => pairwise(args, ctx, (a, b) => a * a - b * b),
  SUMX2PY2: (args, ctx) => pairwise(args, ctx, (a, b) => a * a + b * b),
  SUMXMY2: (args, ctx) => pairwise(args, ctx, (a, b) => (a - b) ** 2),
  TAN: unaryNum((x) => Math.tan(x)),
  TANH: unaryNum((x) => Math.tanh(x)),
  TRUNC: fn((args, ctx) => {
    const v = num(args, ctx, 0);
    if (isErr(v)) return v;
    const d = num(args, ctx, 1, 0);
    if (isErr(d)) return d;
    return roundDown(v, Math.trunc(d));
  }),
  // Statistics that behave like math and live here for the SUBTOTAL table.
  STDEV: (args, ctx) => statLookup.STDEV?.(args, ctx) ?? VALUE,
  STDEVP: (args, ctx) => statLookup.STDEVP?.(args, ctx) ?? VALUE,
  VAR: (args, ctx) => statLookup.VAR?.(args, ctx) ?? VALUE,
  VARP: (args, ctx) => statLookup.VARP?.(args, ctx) ?? VALUE,
  BETA_DIST: fn((args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const a = num(args, ctx, 1);
    if (isErr(a)) return a;
    const b = num(args, ctx, 2);
    if (isErr(b)) return b;
    if (x < 0 || x > 1 || a <= 0 || b <= 0) return NUM;
    // Cumulative flag defaults to TRUE, exactly like Excel's BETA.DIST.
    const cum = args[3] && args[3].t !== "missing" ? bool(args, ctx, 3, true) : true;
    if (isErr(cum)) return cum;
    if (!cum) return (x ** (a - 1) * (1 - x) ** (b - 1)) / beta(a, b);
    return incompleteBeta(x, a, b);
  }),
  GAMMA: unaryNum((x) => safeNum(gamma(x))),
  GAMMALN: unaryNum((x) => (x <= 0 ? NUM : logGamma(x))),
  "GAMMALN.PRECISE": unaryNum((x) => (x <= 0 ? NUM : logGamma(x))),
};

// Late-bound lookups so SUM/SUBTOTAL can see the statistics table without a
// circular import at module-evaluation time.
let statLookup: Record<string, FnImpl> = {};
export function bindStatFunctions(table: Record<string, FnImpl>): void {
  statLookup = table;
}

function pairwise(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], f: (a: number, b: number) => number): Val {
  const e = firstError(args, ctx);
  if (e) return e;
  const a = matrix(args, ctx, 0).flat();
  const b = matrix(args, ctx, 1).flat();
  const an = a.filter((x): x is number => typeof x === "number");
  const bn = b.filter((x): x is number => typeof x === "number");
  if (an.length !== bn.length || !an.length) return NUM;
  const total = an.reduce((s, x, i) => s + f(x, bn[i]), 0);
  return Number(total.toPrecision(15));
}
