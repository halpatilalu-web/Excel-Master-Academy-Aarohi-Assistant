/** Statistical functions (Excel-compatible, including the 365 additions). */
import {
  NUM,
  isBlank,
  isErr,
  scalarsIn,
  type Scalar,
  type XErr,
} from "../core";
import { arrayBins } from "./arrays";
import { bindStatFunctions } from "./math";
import { bool, num, numbersFromArgs, type FnImpl } from "../helpers";
import { matchesCriteria, parseCriteria } from "../core";

function values(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1]): number[] | XErr {
  return numbersFromArgs(args, ctx);
}

/** Numbers from one specific argument only (LARGE/SMALL take a k as arg 2). */
function valuesOf(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number[] | XErr {
  return numbersFromArgs([args[i]], ctx);
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function variance(nums: number[], sample: boolean): number | XErr {
  if (nums.length < (sample ? 2 : 1)) return { err: "#DIV/0!" };
  const m = mean(nums);
  const ss = nums.reduce((a, b) => a + (b - m) ** 2, 0);
  return ss / (nums.length - (sample ? 1 : 0));
}

function stdev(nums: number[], sample: boolean): number | XErr {
  const v = variance(nums, sample);
  return isErr(v) ? v : Math.sqrt(v);
}

function quantileSorted(sorted: number[], p: number): number {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  return quantileSorted(s, 0.5);
}

function mode(nums: number[]): number | XErr {
  const counts = new Map<number, number>();
  nums.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
  let best = 0;
  let bestValue: number | null = null;
  let tie = false;
  counts.forEach((count, value) => {
    if (count > best) {
      best = count;
      bestValue = value;
      tie = false;
    } else if (count === best) tie = true;
  });
  if (best <= 1 || tie || bestValue === null) return { err: "#N/A" };
  return bestValue;
}

function kthLargest(nums: number[], k: number): number | XErr {
  if (k < 1 || k > nums.length) return NUM;
  const sorted = [...nums].sort((a, b) => b - a);
  return sorted[Math.trunc(k) - 1];
}

function percentileInclusive(nums: number[], p: number): number | XErr {
  if (p < 0 || p > 1) return NUM;
  const sorted = [...nums].sort((a, b) => a - b);
  return quantileSorted(sorted, p);
}

function percentileExclusive(nums: number[], p: number): number | XErr {
  const n = nums.length;
  if (p <= 0 || p >= 1 || n < 1) return NUM;
  const sorted = [...nums].sort((a, b) => a - b);
  const rank = p * (n + 1);
  if (rank < 1 || rank > n) return NUM;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo - 1] + (sorted[hi - 1] - sorted[lo - 1]) * (rank - lo);
}

/** Linear regression helpers shared by SLOPE/INTERCEPT/FORECAST/TREND/LINEST. */
export function linearFit(ys: number[], xs: number[]): { slope: number; intercept: number } | XErr {
  const n = xs.length;
  if (n !== ys.length || n === 0) return { err: "#REF!" };
  const mx = mean(xs);
  const my = mean(ys);
  let num_ = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num_ += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return { err: "#DIV/0!" };
  const slope = num_ / den;
  return { slope, intercept: my - slope * mx };
}

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

export const statFns: Record<string, FnImpl> = {
  AVEDEV: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return NUM;
    const m = mean(nums);
    return nums.reduce((a, b) => a + Math.abs(b - m), 0) / nums.length;
  },
  AVERAGE: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return { err: "#DIV/0!" };
    return mean(nums);
  },
  AVERAGEA: (args, ctx) => {
    const cells: Scalar[] = [];
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v)) return v;
      cells.push(...scalarsIn(v));
    }
    const used = cells.filter((c) => !isBlank(c));
    if (!used.length) return { err: "#DIV/0!" };
    const total = used.reduce<number>((acc, c) => {
      if (typeof c === "number") return acc + c;
      if (typeof c === "boolean") return acc + (c ? 1 : 0);
      if (typeof c === "string") {
        const n = Number(c);
        return acc + (Number.isNaN(n) ? 0 : n);
      }
      return acc;
    }, 0);
    return total / used.length;
  },
  AVERAGEIF: (args, ctx) => {
    const { criteria, cells } = sumIfParts(args, ctx);
    if (isErr(criteria)) return criteria;
    const matched = cells.filter((c) => c.match).map((c) => c.sumValue);
    const nums = matched.filter((v): v is number => typeof v === "number");
    if (!nums.length) return { err: "#DIV/0!" };
    return mean(nums);
  },
  AVERAGEIFS: (args, ctx) => {
    const numsOut: number[] = [];
    const pairs = collectIfsPairs(args, ctx, 1);
    if (isErr(pairs)) return pairs;
    const avgRange = ctx.evalNode(args[0]);
    const avgCells = scalarsIn(avgRange);
    const length = avgCells.length;
    const matched = new Array(length).fill(true);
    for (const [range, crit] of pairs) {
      const cells = range;
      for (let i = 0; i < length; i++) {
        if (!crit(i < cells.length ? cells[i] : null)) matched[i] = false;
      }
    }
    matched.forEach((ok, i) => {
      if (ok && typeof avgCells[i] === "number") numsOut.push(avgCells[i] as number);
    });
    if (!numsOut.length) return { err: "#DIV/0!" };
    return mean(numsOut);
  },
  BINOM_DIST: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const n = num(args, ctx, 1);
    if (isErr(n)) return n;
    const p = num(args, ctx, 2);
    if (isErr(p)) return p;
    const cum = bool(args, ctx, 3);
    if (isErr(cum)) return cum;
    const pmf = (k: number) => comb(n, k) * p ** k * (1 - p) ** (n - k);
    if (!cum) return pmf(Math.trunc(x));
    let total = 0;
    for (let k = 0; k <= Math.trunc(x); k++) total += pmf(k);
    return total;
  },
  BINOM_DIST_RANGE: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const p = num(args, ctx, 1);
    if (isErr(p)) return p;
    const k1 = num(args, ctx, 2);
    if (isErr(k1)) return k1;
    const k2 = args[3] && args[3].t !== "missing" ? num(args, ctx, 3) : k1;
    if (isErr(k2)) return k2;
    const pmf = (k: number) => comb(n, k) * p ** k * (1 - p) ** (n - k);
    let total = 0;
    for (let k = Math.trunc(k1); k <= Math.trunc(k2); k++) total += pmf(k);
    return total;
  },
  CHISQ_DIST_RT: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const df = num(args, ctx, 1);
    if (isErr(df)) return df;
    if (x < 0 || df < 1) return NUM;
    // Survival function of chi-square = regularised upper incomplete gamma.
    return 1 - lowerGammaRegularized(df / 2, x / 2);
  },
  CONFIDENCE_NORM: (args, ctx) => {
    const alpha = num(args, ctx, 0);
    if (isErr(alpha)) return alpha;
    const sd = num(args, ctx, 1);
    if (isErr(sd)) return sd;
    const n = num(args, ctx, 2);
    if (isErr(n)) return n;
    if (n < 1 || alpha <= 0 || alpha >= 1) return NUM;
    return normalInv(1 - alpha / 2) * (sd / Math.sqrt(n));
  },
  CORREL: (args, ctx) => {
    const a = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" }));
    const b = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" }));
    return pearson(a, b);
  },
  COUNT: (args, ctx) => {
    let count = 0;
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v)) return v;
      const isRange = node.t === "ref" || node.t === "range";
      for (const c of scalarsIn(v)) {
        if (typeof c === "number") count++;
        else if (!isRange && typeof c === "string" && c.trim() !== "" && !Number.isNaN(Number(c))) count++;
        else if (!isRange && typeof c === "boolean") count++;
      }
    }
    return count;
  },
  COUNTA: (args, ctx) => {
    let count = 0;
    for (const node of args) {
      const v = ctx.evalNode(node);
      if (isErr(v) && !Array.isArray(v)) return v;
      for (const c of scalarsIn(v)) if (!isBlank(c)) count++;
    }
    return count;
  },
  COUNTBLANK: (args, ctx) => {
    const cells = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" }));
    return cells.filter((c) => isBlank(c) || c === "").length;
  },
  COUNTIF: (args, ctx) => {
    const built = buildCriteria(args, ctx);
    if (isErr(built)) return built;
    const cells = scalarsIn(ctx.evalNode(args[0]));
    return cells.filter((c) => built(c)).length;
  },
  COUNTIFS: (args, ctx) => {
    const pairs = collectIfsPairs(args, ctx, 0);
    if (isErr(pairs)) return pairs;
    if (!pairs.length) return 0;
    const length = Math.max(...pairs.map(([range]) => range.length));
    const columns = pairs.map(([range, crit]) => {
      const cells = range;
      return (i: number) => crit(i < cells.length ? cells[i] : null);
    });
    let count = 0;
    for (let i = 0; i < length; i++) if (columns.every((f) => f(i))) count++;
    return count;
  },
  COVARIANCE_P: (args, ctx) => {
    const a = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).filter((x): x is number => typeof x === "number");
    const b = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" })).filter((x): x is number => typeof x === "number");
    const n = Math.min(a.length, b.length);
    if (!n) return { err: "#DIV/0!" };
    const ma = mean(a.slice(0, n));
    const mb = mean(b.slice(0, n));
    let total = 0;
    for (let i = 0; i < n; i++) total += (a[i] - ma) * (b[i] - mb);
    return total / n;
  },
  COVARIANCE_S: (args, ctx) => {
    const a = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).filter((x): x is number => typeof x === "number");
    const b = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" })).filter((x): x is number => typeof x === "number");
    const n = Math.min(a.length, b.length);
    if (n < 2) return { err: "#DIV/0!" };
    const ma = mean(a.slice(0, n));
    const mb = mean(b.slice(0, n));
    let total = 0;
    for (let i = 0; i < n; i++) total += (a[i] - ma) * (b[i] - mb);
    return total / (n - 1);
  },
  DEVSQ: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return NUM;
    const m = mean(nums);
    return nums.reduce((a, b) => a + (b - m) ** 2, 0);
  },
  EXPON_DIST: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const lambda = num(args, ctx, 1);
    if (isErr(lambda)) return lambda;
    const cum = bool(args, ctx, 2);
    if (isErr(cum)) return cum;
    if (x < 0 || lambda <= 0) return NUM;
    return cum ? 1 - Math.exp(-lambda * x) : lambda * Math.exp(-lambda * x);
  },
  FISHER: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    if (Math.abs(x) >= 1) return NUM;
    return 0.5 * Math.log((1 + x) / (1 - x));
  },
  FISHERINV: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    return Math.tanh(x);
  },
  FORECAST_LINEAR: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const ys = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" })).map(toNumFilter);
    const xs = scalarsIn(ctx.evalNode(args[2] ?? { t: "missing" })).map(toNumFilter);
    const y = ys.filter((v): v is number => v !== null);
    const xv = xs.filter((v): v is number => v !== null);
    const fit = linearFit(y, xv);
    return isErr(fit) ? fit : fit.intercept + fit.slope * x;
  },
  FREQUENCY: (args, ctx) => {
    const data = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).filter((v): v is number => typeof v === "number");
    const bins = arrayBins(ctx.evalNode(args[1] ?? { t: "missing" })).filter(
      (v): v is number => typeof v === "number",
    );
    const out = new Array(bins.length + 1).fill(0);
    data.forEach((d) => {
      let placed = false;
      for (let i = 0; i < bins.length; i++) {
        if (d <= bins[i]) {
          out[i]++;
          placed = true;
          break;
        }
      }
      if (!placed) out[bins.length]++;
    });
    return out.map((v) => [v]);
  },
  GEOMEAN: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length || nums.some((n) => n <= 0)) return NUM;
    return Math.exp(nums.reduce((a, b) => a + Math.log(b), 0) / nums.length);
  },
  HARMEAN: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length || nums.some((n) => n <= 0)) return NUM;
    return nums.length / nums.reduce((a, b) => a + 1 / b, 0);
  },
  INTERCEPT: (args, ctx) => {
    const ys = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).map(toNumFilter).filter((v): v is number => v !== null);
    const xs = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" })).map(toNumFilter).filter((v): v is number => v !== null);
    const fit = linearFit(ys, xs);
    return isErr(fit) ? fit : fit.intercept;
  },
  KURT: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    const n = nums.length;
    if (n < 4) return { err: "#DIV/0!" };
    const m = mean(nums);
    const s = Math.sqrt(variance(nums, true) as number);
    const sum = nums.reduce((a, b) => a + ((b - m) / s) ** 4, 0);
    return (n * (n + 1) * sum) / ((n - 1) * (n - 2) * (n - 3)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  },
  LARGE: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const k = num(args, ctx, 1);
    if (isErr(k)) return k;
    return kthLargest(nums, k);
  },
  MAX: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return nums.length ? Math.max(...nums) : 0;
  },
  MAXA: (args, ctx) => {
    const cells = args.flatMap((n) => scalarsIn(ctx.evalNode(n)));
    const nums = cells.map((c) => (typeof c === "boolean" ? (c ? 1 : 0) : typeof c === "string" ? Number(c) || 0 : c)).filter((v): v is number => typeof v === "number");
    return nums.length ? Math.max(...nums) : 0;
  },
  MAXIFS: (args, ctx) => filteredAgg(args, ctx, (nums) => (nums.length ? Math.max(...nums) : 0)),
  MEDIAN: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    if (!nums.length) return NUM;
    return median(nums);
  },
  MIN: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return nums.length ? Math.min(...nums) : 0;
  },
  MINA: (args, ctx) => {
    const cells = args.flatMap((n) => scalarsIn(ctx.evalNode(n)));
    const nums = cells.map((c) => (typeof c === "boolean" ? (c ? 1 : 0) : typeof c === "string" ? Number(c) || 0 : c)).filter((v): v is number => typeof v === "number");
    return nums.length ? Math.min(...nums) : 0;
  },
  MINIFS: (args, ctx) => filteredAgg(args, ctx, (nums) => (nums.length ? Math.min(...nums) : 0)),
  MODE_SNGL: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return mode(nums);
  },
  NORM_DIST: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const m = num(args, ctx, 1);
    if (isErr(m)) return m;
    const sd = num(args, ctx, 2);
    if (isErr(sd)) return sd;
    const cum = bool(args, ctx, 3);
    if (isErr(cum)) return cum;
    if (sd <= 0) return NUM;
    const z = (x - m) / sd;
    return cum ? normalCdf(z) : normalPdf(z) / sd;
  },
  NORM_INV: (args, ctx) => {
    const p = num(args, ctx, 0);
    if (isErr(p)) return p;
    const m = num(args, ctx, 1);
    if (isErr(m)) return m;
    const sd = num(args, ctx, 2);
    if (isErr(sd)) return sd;
    if (p <= 0 || p >= 1 || sd <= 0) return NUM;
    return m + sd * normalInv(p);
  },
  NORM_S_DIST: (args, ctx) => {
    const z = num(args, ctx, 0);
    if (isErr(z)) return z;
    const cum = bool(args, ctx, 1);
    if (isErr(cum)) return cum;
    return cum ? normalCdf(z) : normalPdf(z);
  },
  NORM_S_INV: (args, ctx) => {
    const p = num(args, ctx, 0);
    if (isErr(p)) return p;
    if (p <= 0 || p >= 1) return NUM;
    return normalInv(p);
  },
  PEARSON: (args, ctx) => {
    const a = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" }));
    const b = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" }));
    return pearson(a, b);
  },
  PERCENTILE_EXC: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const k = num(args, ctx, 1);
    if (isErr(k)) return k;
    return percentileExclusive(nums, k);
  },
  PERCENTILE_INC: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const k = num(args, ctx, 1);
    if (isErr(k)) return k;
    return percentileInclusive(nums, k);
  },
  PERCENTRANK_EXC: (args, ctx) => percentRank(args, ctx, false),
  PERCENTRANK_INC: (args, ctx) => percentRank(args, ctx, true),
  PERMUT: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const k = num(args, ctx, 1);
    if (isErr(k)) return k;
    if (n < 0 || k < 0 || k > n) return NUM;
    let out = 1;
    for (let i = 0; i < Math.trunc(k); i++) out *= Math.trunc(n) - i;
    return out;
  },
  PERMUTATIONA: (args, ctx) => {
    const n = num(args, ctx, 0);
    if (isErr(n)) return n;
    const k = num(args, ctx, 1);
    if (isErr(k)) return k;
    if (n < 0 || k < 0) return NUM;
    return Math.trunc(n) ** Math.trunc(k);
  },
  PHI: (args, ctx) => {
    const z = num(args, ctx, 0);
    if (isErr(z)) return z;
    return normalPdf(z);
  },
  POISSON_DIST: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const lambda = num(args, ctx, 1);
    if (isErr(lambda)) return lambda;
    const cum = bool(args, ctx, 2);
    if (isErr(cum)) return cum;
    const pmf = (k: number) => (Math.exp(-lambda) * lambda ** k) / factorialN(k);
    if (!cum) return pmf(Math.trunc(x));
    let total = 0;
    for (let k = 0; k <= Math.trunc(x); k++) total += pmf(k);
    return total;
  },
  QUARTILE_EXC: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const q = num(args, ctx, 1);
    if (isErr(q)) return q;
    return percentileExclusive(nums, Math.trunc(q) / 4);
  },
  QUARTILE_INC: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const q = num(args, ctx, 1);
    if (isErr(q)) return q;
    if (q < 0 || q > 4) return NUM;
    return percentileInclusive(nums, Math.trunc(q) / 4);
  },
  RANK_AVG: (args, ctx) => rankImpl(args, ctx, "avg"),
  RANK_EQ: (args, ctx) => rankImpl(args, ctx, "eq"),
  RSQ: (args, ctx) => {
    const a = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" }));
    const b = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" }));
    const r = pearson(a, b);
    return isErr(r) ? r : r * r;
  },
  SKEW: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    const n = nums.length;
    if (n < 3) return { err: "#DIV/0!" };
    const m = mean(nums);
    const s = Math.sqrt(variance(nums, true) as number);
    const sum = nums.reduce((a, b) => a + ((b - m) / s) ** 3, 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  },
  SKEW_P: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    const n = nums.length;
    if (n < 1) return { err: "#DIV/0!" };
    const m = mean(nums);
    const s = Math.sqrt(variance(nums, false) as number);
    return nums.reduce((a, b) => a + ((b - m) / s) ** 3, 0) / n;
  },
  SLOPE: (args, ctx) => {
    const ys = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).map(toNumFilter).filter((v): v is number => v !== null);
    const xs = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" })).map(toNumFilter).filter((v): v is number => v !== null);
    const fit = linearFit(ys, xs);
    return isErr(fit) ? fit : fit.slope;
  },
  SMALL: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const k = num(args, ctx, 1);
    if (isErr(k)) return k;
    const sorted = [...nums].sort((a, b) => a - b);
    return k < 1 || k > sorted.length ? NUM : sorted[Math.trunc(k) - 1];
  },
  STANDARDIZE: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const m = num(args, ctx, 1);
    if (isErr(m)) return m;
    const sd = num(args, ctx, 2);
    if (isErr(sd)) return sd;
    return sd <= 0 ? NUM : (x - m) / sd;
  },
  STDEV_P: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return stdev(nums, false);
  },
  STDEV_S: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return stdev(nums, true);
  },
  STDEVA: (args, ctx) => stdevA(args, ctx, true),
  STDEVPA: (args, ctx) => stdevA(args, ctx, false),
  STDEV: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return stdev(nums, true);
  },
  STDEVP: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return stdev(nums, false);
  },
  SUMIF: (args, ctx) => {
    const { criteria, cells, sumCells } = sumIfParts(args, ctx);
    if (isErr(criteria)) return criteria;
    let total = 0;
    cells.forEach((cell, i) => {
      if (!cell.match) return;
      const target = sumCells ? sumCells[i] : cell.value;
      if (typeof target === "number") total += target;
    });
    return Number(total.toPrecision(15));
  },
  SUMIFS: (args, ctx) => {
    const sumRange = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" }));
    const pairs = collectIfsPairs(args, ctx, 1);
    if (isErr(pairs)) return pairs;
    let total = 0;
    const length = sumRange.length;
    for (let i = 0; i < length; i++) {
      const ok = pairs.every(([range, crit]) => crit(i < range.length ? range[i] : null));
      if (!ok) continue;
      const v = sumRange[i];
      if (typeof v === "number") total += v;
    }
    return Number(total.toPrecision(15));
  },
  T_DIST: (args, ctx) => tDist(args, ctx, false),
  T_DIST_2T: (args, ctx) => tDist(args, ctx, true),
  T_DIST_RT: (args, ctx) => tDistRt(args, ctx),
  T_INV: (args, ctx) => tInv(args, ctx, false),
  T_INV_2T: (args, ctx) => tInv(args, ctx, true),
  TREND: (args, ctx) => {
    const ys = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).map(toNumFilter).filter((v): v is number => v !== null);
    const xsRaw = args[1] && args[1].t !== "missing" ? scalarsIn(ctx.evalNode(args[1])).map(toNumFilter).filter((v): v is number => v !== null) : ys.map((_, i) => i + 1);
    const fit = linearFit(ys, xsRaw);
    if (isErr(fit)) return fit;
    const newXs = args[2] && args[2].t !== "missing" ? scalarsIn(ctx.evalNode(args[2])).map(toNumFilter).filter((v): v is number => v !== null) : xsRaw;
    return newXs.map((x) => [fit.intercept + fit.slope * x]);
  },
  TRIMMEAN: (args, ctx) => {
    const nums = valuesOf(args, ctx, 0);
    if (isErr(nums)) return nums;
    const pct = num(args, ctx, 1);
    if (isErr(pct)) return pct;
    const sorted = [...nums].sort((a, b) => a - b);
    const cut = Math.floor((nums.length * pct) / 2);
    const kept = sorted.slice(cut, sorted.length - cut);
    return kept.length ? mean(kept) : NUM;
  },
  VAR_P: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return variance(nums, false);
  },
  VAR_S: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return variance(nums, true);
  },
  VARA: (args, ctx) => varA(args, ctx, true),
  VARPA: (args, ctx) => varA(args, ctx, false),
  VAR: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return variance(nums, true);
  },
  VARP: (args, ctx) => {
    const nums = values(args, ctx);
    if (isErr(nums)) return nums;
    return variance(nums, false);
  },
  WEIBULL_DIST: (args, ctx) => {
    const x = num(args, ctx, 0);
    if (isErr(x)) return x;
    const alpha = num(args, ctx, 1);
    if (isErr(alpha)) return alpha;
    const beta = num(args, ctx, 2);
    if (isErr(beta)) return beta;
    const cum = bool(args, ctx, 3);
    if (isErr(cum)) return cum;
    if (x < 0 || alpha <= 0 || beta <= 0) return NUM;
    return cum
      ? 1 - Math.exp(-((x / beta) ** alpha))
      : (alpha / beta ** alpha) * x ** (alpha - 1) * Math.exp(-((x / beta) ** alpha));
  },
  Z_TEST: (args, ctx) => {
    const arr = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" })).filter((v): v is number => typeof v === "number");
    const x = num(args, ctx, 1);
    if (isErr(x)) return x;
    const sigma = args[2] && args[2].t !== "missing" ? num(args, ctx, 2) : Math.sqrt(variance(arr, true) as number);
    if (isErr(sigma)) return sigma;
    return 1 - normalCdf((mean(arr) - x) / (sigma / Math.sqrt(arr.length)));
  },
};

/* --------------------------- local helpers --------------------------- */

function toNumFilter(v: Scalar): number | null {
  return typeof v === "number" ? v : null;
}

function factorialN(n: number): number {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

function comb(n: number, k: number): number {
  const N = Math.trunc(n);
  const K = Math.trunc(k);
  if (K < 0 || K > N) return 0;
  let out = 1;
  for (let i = 1; i <= K; i++) out = (out * (N - K + i)) / i;
  return out;
}

function normalInv(p: number): number {
  // Beasley-Springer-Moro
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - plow) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function lowerGammaRegularized(a: number, x: number): number {
  // Series then continued fraction (Numerical Recipes style).
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

function lgamma(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function tDist(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], twoTailed: boolean): number | XErr {
  const x = num(args, ctx, 0);
  if (isErr(x)) return x;
  const df = num(args, ctx, 1);
  if (isErr(df)) return df;
  const cum = twoTailed ? undefined : bool(args, ctx, 2);
  if (isErr(cum)) return cum;
  if (df < 1) return NUM;
  const tail = 0.5 * lowerGammaRegularized(df / 2, df / (df + x * x));
  if (twoTailed) return 2 * tail;
  if (cum) return x >= 0 ? 1 - tail : tail;
  // Probability density
  return (
    (Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) / Math.sqrt(df * Math.PI)) *
    (1 + (x * x) / df) ** (-(df + 1) / 2)
  );
}

function tDistRt(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1]): number | XErr {
  const x = num(args, ctx, 0);
  if (isErr(x)) return x;
  const df = num(args, ctx, 1);
  if (isErr(df)) return df;
  if (df < 1 || x < 0) return NUM;
  return 0.5 * lowerGammaRegularized(df / 2, df / (df + x * x));
}

function tInv(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], twoTailed: boolean): number | XErr {
  const p = num(args, ctx, 0);
  if (isErr(p)) return p;
  const df = num(args, ctx, 1);
  if (isErr(df)) return df;
  if (df < 1 || p <= 0 || p >= 1) return NUM;
  // Bisection on the CDF (fast enough for teaching use).
  let lo = -1e3;
  let hi = 1e3;
  const target = twoTailed ? 1 - p / 2 : p;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const cdf = tDist([{ t: "num", v: mid }, { t: "num", v: df }, { t: "bool", v: true }], ctx, false);
    const value = isErr(cdf) ? 0.5 : (cdf as number);
    if (value < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function pearson(a: Scalar[], b: Scalar[]): number | XErr {
  const xs: number[] = [];
  const ys: number[] = [];
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (typeof a[i] === "number" && typeof b[i] === "number") {
      xs.push(a[i] as number);
      ys.push(b[i] as number);
    }
  }
  if (xs.length < 2) return { err: "#DIV/0!" };
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < xs.length; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  if (vx === 0 || vy === 0) return { err: "#DIV/0!" };
  return cov / Math.sqrt(vx * vy);
}

function percentRank(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], inclusive: boolean): number | XErr {
  const nums = valuesOf(args, ctx, 0);
  if (isErr(nums)) return nums;
  const x = num(args, ctx, 1);
  if (isErr(x)) return x;
  const significance = args[2] && args[2].t !== "missing" ? num(args, ctx, 2) : 3;
  if (isErr(significance)) return significance;
  const sorted = [...nums].sort((a, b) => a - b);
  const exact = sorted.indexOf(x);
  if (exact !== -1) {
    return inclusive ? exact / (sorted.length - 1) : exact / (sorted.length + 1);
  }
  let below = 0;
  for (const n of sorted) if (n < x) below++;
  if (below === 0 || below === sorted.length) return { err: "#N/A" };
  const lo = sorted[below - 1];
  const hi = sorted[below];
  const base = inclusive ? (below - 1) / (sorted.length - 1) : below / (sorted.length + 1);
  const step = (inclusive ? 1 / (sorted.length - 1) : 1 / (sorted.length + 1)) * ((x - lo) / (hi - lo));
  const digits = Math.max(0, Math.trunc(significance));
  return Number((base + step).toFixed(digits));
}

function rankImpl(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], mode: "avg" | "eq"): number | XErr {
  const x = num(args, ctx, 0);
  if (isErr(x)) return x;
  const nums = scalarsIn(ctx.evalNode(args[1] ?? { t: "missing" })).filter(
    (v): v is number => typeof v === "number",
  );
  const order = args[2] && args[2].t !== "missing" ? num(args, ctx, 2) : 0;
  if (isErr(order)) return order;
  const sorted = [...nums].sort((a, b) => (order ? a - b : b - a));
  const first = sorted.indexOf(x);
  if (first === -1) return { err: "#N/A" };
  if (mode === "eq") return first + 1;
  const last = sorted.lastIndexOf(x);
  return (first + last) / 2 + 1;
}

function stdevA(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], sample: boolean): number | XErr {
  const cells = args.flatMap((n) => scalarsIn(ctx.evalNode(n)));
  const nums = cells
    .filter((c) => !isBlank(c))
    .map((c) => (typeof c === "number" ? c : typeof c === "boolean" ? (c ? 1 : 0) : Number(c) || 0));
  if (nums.length < (sample ? 2 : 1)) return { err: "#DIV/0!" };
  return stdev(nums, sample);
}

function varA(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], sample: boolean): number | XErr {
  const cells = args.flatMap((n) => scalarsIn(ctx.evalNode(n)));
  const nums = cells
    .filter((c) => !isBlank(c))
    .map((c) => (typeof c === "number" ? c : typeof c === "boolean" ? (c ? 1 : 0) : Number(c) || 0));
  return variance(nums, sample);
}

/** Shared SUMIF/AVERAGEIF plumbing. */
function sumIfParts(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1]) {
  const criteriaFn = buildCriteria(args, ctx, 1);
  const range = ctx.evalNode(args[0] ?? { t: "missing" });
  const critCells = scalarsIn(range);
  const sumCells = args[2] && args[2].t !== "missing" ? scalarsIn(ctx.evalNode(args[2])) : null;
  if (isErr(criteriaFn)) {
    const cells = critCells.map((value, i) => ({
      value,
      match: false,
      index: i,
      sumValue: sumCells ? sumCells[i] ?? null : value,
    }));
    return { criteria: criteriaFn, cells, sumCells, range: critCells };
  }
  const cells = critCells.map((value, i) => ({
    value,
    match: criteriaFn(value),
    index: i,
    sumValue: sumCells ? sumCells[i] ?? null : value,
  }));
  return { criteria: null as XErr | null, cells, sumCells, range: critCells };
}

function buildCriteria(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i = 1): ((cell: Scalar) => boolean) | XErr {
  const node = args[i];
  if (!node || node.t === "missing") return { err: "#VALUE!" };
  const raw = ctx.evalNode(node);
  const value = Array.isArray(raw) ? raw[0]?.[0] ?? null : raw;
  if (isErr(value)) return value;
  const crit = parseCriteria(value as Scalar);
  return (cell: Scalar) => matchesCriteria(cell, crit);
}

function collectIfsPairs(
  args: Parameters<FnImpl>[0],
  ctx: Parameters<FnImpl>[1],
  from: number,
): [Scalar[], (cell: Scalar) => boolean][] | XErr {
  const out: [Scalar[], (cell: Scalar) => boolean][] = [];
  for (let i = from; i + 1 < args.length; i += 2) {
    const fn = buildCriteria(args, ctx, i + 1);
    if (isErr(fn)) return fn;
    out.push([scalarsIn(ctx.evalNode(args[i])), fn]);
  }
  if (!out.length) return { err: "#VALUE!" };
  return out;
}

function filteredAgg(
  args: Parameters<FnImpl>[0],
  ctx: Parameters<FnImpl>[1],
  agg: (nums: number[]) => number,
): number | XErr {
  const target = scalarsIn(ctx.evalNode(args[0] ?? { t: "missing" }));
  const pairs = collectIfsPairs(args, ctx, 1);
  if (isErr(pairs)) return pairs;
  const nums: number[] = [];
  target.forEach((v, i) => {
    if (typeof v !== "number") return;
    const ok = pairs.every(([range, crit]) => crit(i < range.length ? range[i] : null));
    if (ok) nums.push(v);
  });
  return agg(nums);
}

bindStatFunctions(statFns);
