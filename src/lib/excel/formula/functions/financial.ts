/**
 * Financial functions: loans/EMI, NPV/IRR, depreciation and bond maths.
 *
 * These are the ones Indian students actually bill for — PMT for a home loan,
 * RATE for a chit fund, XIRR for SIPs, SLN/WDV for depreciation schedules — so
 * they are first-class here instead of being an Excel-only privilege.
 */
import { NUM, VALUE, isErr, scalarsIn, serialToDate, toNum, type Scalar, type XErr } from "../core";
import { bool, num, type FnImpl } from "../helpers";

const fvType = (type: number) => (type === 0 ? 0 : 1);

function pmt(rate: number, nper: number, pv: number, fv: number, type: number): number {
  if (rate === 0) return -(pv + fv) / nper;
  const pow = (1 + rate) ** nper;
  return -(rate * (pv * pow + fv)) / ((1 + rate * fvType(type)) * (pow - 1));
}

function fv(rate: number, nper: number, pmtArg: number, pv: number, type: number): number {
  if (rate === 0) return -(pv + pmtArg * nper);
  const pow = (1 + rate) ** nper;
  return -(pv * pow + pmtArg * (1 + rate * fvType(type)) * ((pow - 1) / rate));
}

function pv(rate: number, nper: number, pmtArg: number, fvArg: number, type: number): number {
  if (rate === 0) return -(fvArg + pmtArg * nper);
  const pow = (1 + rate) ** nper;
  return -(fvArg + pmtArg * (1 + rate * fvType(type)) * ((pow - 1) / rate)) / pow;
}

function balanceAt(rate: number, periodsPaid: number, nper: number, pvArg: number, fvArg: number, type: number): number {
  const payment = pmt(rate, nper, pvArg, fvArg, type);
  if (rate === 0) return pvArg + payment * periodsPaid;
  const pow = (1 + rate) ** periodsPaid;
  return pvArg * pow + payment * (1 + rate * fvType(type)) * ((pow - 1) / rate);
}

function ipmt(rate: number, per: number, nper: number, pvArg: number, fvArg: number, type: number): number {
  const balance = balanceAt(rate, Math.trunc(per) - 1, nper, pvArg, fvArg, type);
  const interest = balance * rate;
  return type === 1 && per === 1 ? 0 : -interest;
}

function ppmt(rate: number, per: number, nper: number, pvArg: number, fvArg: number, type: number): number {
  const payment = pmt(rate, nper, pvArg, fvArg, type);
  return payment - ipmt(rate, per, nper, pvArg, fvArg, type);
}

function irrCalc(values: number[], guess = 0.1): number | XErr {
  if (values.length < 2) return NUM;
  const hasPositive = values.some((v) => v > 0);
  const hasNegative = values.some((v) => v < 0);
  if (!hasPositive || !hasNegative) return NUM;
  const npv = (rate: number) =>
    values.reduce((acc, v, i) => acc + v / (1 + rate) ** i, 0);

  // Newton-Raphson, then bisection fallback — Excel behaves the same way.
  let rate = guess;
  for (let i = 0; i < 60; i++) {
    const f = npv(rate);
    const h = 1e-6;
    const df = (npv(rate + h) - f) / h;
    if (!Number.isFinite(df) || df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-10) return next;
    rate = next;
    if (rate <= -1) rate = -0.999999;
  }
  let lo = -0.999999;
  let hi = 10;
  let flo = npv(lo);
  let fhi = npv(hi);
  if (flo * fhi > 0) return NUM;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

function xnpv(rate: number, flows: number[], days: number[]): number {
  const base = days[0];
  return flows.reduce((acc, f, i) => acc + f / (1 + rate) ** ((days[i] - base) / 365), 0);
}

function xirr(flows: number[], days: number[]): number | XErr {
  if (!flows.some((f) => f > 0) || !flows.some((f) => f < 0)) return NUM;
  let lo = -0.999999;
  let hi = 10;
  let flo = xnpv(lo, flows, days);
  let fhi = xnpv(hi, flows, days);
  if (flo * fhi > 0) return NUM;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fm = xnpv(mid, flows, days);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}


/* ------------------------------------------------------------------ *
 * Bond maths — coupon calendar, price, yield, duration.
 *
 * Excel's bond functions share one engine: work out the coupon dates from the
 * maturity date and frequency, then discount the remaining coupons. Everything
 * below is that engine, so ACCRINT("2026-01-01","2026-07-01",…) agrees with
 * COUPNUM / PRICE / YIELD for the same bond instead of inventing its own dates.
 * ------------------------------------------------------------------ */

type BondBasis = 0 | 1 | 2 | 3 | 4;

/** Add whole months, clamping the day like Excel's EDATE (31 Jan + 1 = 28 Feb). */
function addMonths(serial: number, months: number): number {
  const d = serialToDate(serial);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const target = new Date(Date.UTC(year, month, 1));
  const daysInTarget = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), daysInTarget));
  return Math.round((target.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000);
}

const daysBetween = (from: number, to: number) => to - from;

/** Days in the coupon period that contains `settlement`, and the two boundaries. */
function couponWindow(settlement: number, maturity: number, frequency: number) {
  const months = 12 / frequency;
  // Walk back from maturity until the previous coupon is on/before settlement.
  let next = maturity;
  let prev = addMonths(maturity, -months);
  let guard = 0;
  while (prev > settlement && guard++ < 400) {
    next = prev;
    prev = addMonths(prev, -months);
  }
  return { prev, next };
}

/** Year fraction between two serials under an Excel day-count basis. */
function yearFrac(start: number, end: number, basis: BondBasis, frequency = 2): number {
  if (basis === 0) {
    // US (NASD) 30/360 — Excel's default.
    const a = serialToDate(start);
    const b = serialToDate(end);
    let d1 = a.getUTCDate();
    let d2 = b.getUTCDate();
    if (d1 === 31) d1 = 30;
    if (d2 === 31 && d1 === 30) d2 = 30;
    const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    return (months * 30 + (d2 - d1)) / 360;
  }
  if (basis === 1) {
    // Actual/actual: split across calendar years.
    const a = serialToDate(start);
    const b = serialToDate(end);
    if (a.getUTCFullYear() === b.getUTCFullYear()) {
      const yearDays = daysInYear(a.getUTCFullYear());
      return daysBetween(start, end) / yearDays;
    }
    let total = 0;
    let cursor = start;
    while (serialToDate(cursor).getUTCFullYear() < b.getUTCFullYear()) {
      const yearEnd = Math.round(Date.UTC(serialToDate(cursor).getUTCFullYear() + 1, 0, 1) / 86_400_000 - Date.UTC(1899, 11, 30) / 86_400_000) - 1;
      total += daysBetween(cursor, yearEnd + 1) / daysInYear(serialToDate(cursor).getUTCFullYear());
      cursor = yearEnd + 1;
    }
    total += daysBetween(cursor, end) / daysInYear(b.getUTCFullYear());
    return total;
  }
  if (basis === 2) return daysBetween(start, end) / 360;
  if (basis === 3) return daysBetween(start, end) / 365;
  // Basis 4: European 30/360.
  const a = serialToDate(start);
  const b = serialToDate(end);
  const d1 = Math.min(a.getUTCDate(), 30);
  const d2 = Math.min(b.getUTCDate(), 30);
  const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  void frequency;
  return (months * 30 + (d2 - d1)) / 360;
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/** Serial date arguments as used by every financial function. */
function serialArg(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number | XErr {
  const n = num(args, ctx, i);
  if (isErr(n)) return n;
  return Math.trunc(n);
}

function basisArg(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): BondBasis | XErr {
  if (!args[i] || args[i].t === "missing") return 0;
  const b = num(args, ctx, i, 0);
  if (isErr(b)) return b;
  const basis = Math.trunc(b);
  if (basis < 0 || basis > 4) return NUM;
  return basis as BondBasis;
}



/** Basis-aware day count between two serials (Excel's `DSC`, `A`, `DFC` …). */
function basisDays(from: number, to: number, basis: BondBasis): number {
  if (basis === 0 || basis === 2 || basis === 4) return Math.round(yearFrac(from, to, basis) * 360);
  if (basis === 3) return Math.round(yearFrac(from, to, basis) * 365);
  return Math.round(daysBetween(from, to));
}

/** Coupon dates from `firstCoupon` forward to `maturity`, inclusive. */
function couponSchedule(firstCoupon: number, maturity: number, frequency: number): number[] {
  const months = 12 / frequency;
  const dates: number[] = [];
  let cursor = firstCoupon;
  let guard = 0;
  while (cursor < maturity && guard++ < 2000) {
    dates.push(cursor);
    cursor = addMonths(cursor, months);
  }
  dates.push(maturity);
  return dates;
}

/**
 * Discounted-cash-flow price for a bond with an odd (stub) first coupon — the
 * engine behind ODDFPRICE/ODDFYIELD. With a full first period it reduces to the
 * ordinary PRICE formula, which is exactly what Excel does.
 */
function oddFirstPrice(
  settlement: number,
  maturity: number,
  issue: number,
  firstCoupon: number,
  rate: number,
  yld: number,
  redemption: number,
  frequency: number,
  basis: BondBasis,
): number {
  const months = 12 / frequency;
  const coupon = (100 * rate) / frequency;
  const schedule = couponSchedule(firstCoupon, maturity, frequency);
  const n = schedule.length;
  // E: days in a standard coupon period (the one ending on the first coupon).
  const E = periodDays(basis, frequency, addMonths(firstCoupon, -months), firstCoupon);
  const DFC = basisDays(issue, firstCoupon, basis);
  const A = basisDays(issue, settlement, basis);
  const DSC = basisDays(settlement, firstCoupon, basis);
  const base = 1 + yld / frequency;
  const stubProration = E > 0 ? DFC / E : 1;

  let dirty = 0;
  schedule.forEach((date, index) => {
    const t = index + DSC / E;
    const cash = index === 0 ? coupon * stubProration : coupon;
    dirty += cash / base ** t;
  });
  dirty += redemption / base ** (n - 1 + DSC / E);
  const accrued = coupon * (E > 0 ? A / E : 0);
  return dirty - accrued;
}

/** Price of a bond whose *last* coupon period is odd (ODDLPRICE). */
function oddLastPrice(
  settlement: number,
  maturity: number,
  lastInterest: number,
  rate: number,
  yld: number,
  redemption: number,
  frequency: number,
  basis: BondBasis,
): number {
  const months = 12 / frequency;
  const coupon = (100 * rate) / frequency;
  const E = periodDays(basis, frequency, addMonths(maturity, -months), maturity);
  const DSC = basisDays(settlement, maturity, basis);
  const DLC = basisDays(lastInterest, maturity, basis);
  const A = basisDays(lastInterest, settlement, basis);
  if (E <= 0) return NaN;
  const quote = (redemption + (DLC / E) * coupon) / (1 + (DSC / E) * (yld / frequency));
  return quote - (A / E) * coupon;
}

/** Bisection over any monotonic price→yield curve. */
function solveByPrice(f: (yld: number) => number): number | XErr {
  let lo = -0.99;
  let hi = 5;
  let flo = f(lo);
  let fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return NUM;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (!Number.isFinite(fm)) return NUM;
    if (Math.abs(fm) < 1e-10) return mid;
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Days in one coupon period under a basis (Excel's `E`). */
function periodDays(basis: BondBasis, frequency: number, prev: number, next: number): number {
  const months = 12 / frequency;
  if (basis === 2) return 360 / frequency;
  if (basis === 3) return 365 / frequency;
  if (basis === 0 || basis === 4) return months * 30;
  return daysBetween(prev, next);
}

/** Days from the start of the coupon period to settlement (Excel's `A`). */
function accruedDays(settlement: number, prev: number, next: number, basis: BondBasis, frequency: number): number {
  const E = periodDays(basis, frequency, prev, next);
  if (basis === 0 || basis === 4) {
    const a = serialToDate(prev);
    const b = serialToDate(settlement);
    const d1 = Math.min(a.getUTCDate(), 30);
    const d2 = Math.min(b.getUTCDate(), 30);
    const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    return Math.min(months * 30 + (d2 - d1), E);
  }
  if (basis === 2 || basis === 3) return Math.max(0, Math.round(E - daysBetween(settlement, next)));
  return Math.max(0, daysBetween(prev, settlement));
}

/** How many coupon payments remain after settlement. */
function remainingCoupons(settlement: number, maturity: number, frequency: number): number {
  const months = 12 / frequency;
  let count = 1;
  while (count < 1000 && addMonths(maturity, -months * count) > settlement) count += 1;
  return count;
}

/** Excel's clean bond price — the formula PRICE documents. */
function cleanPrice(
  settlement: number,
  maturity: number,
  rate: number,
  yld: number,
  redemption: number,
  frequency: number,
  basis: BondBasis,
): number {
  const { prev, next } = couponWindow(settlement, maturity, frequency);
  const E = periodDays(basis, frequency, prev, next);
  const dsc = Math.max(0, E - accruedDays(settlement, prev, next, basis, frequency));
  const n = remainingCoupons(settlement, maturity, frequency);
  const coupon = (100 * rate) / frequency;
  const base = 1 + yld / frequency;
  let dirty = redemption / base ** (n - 1 + dsc / E);
  for (let k = 1; k <= n; k++) dirty += coupon / base ** (k - 1 + dsc / E);
  return dirty - (coupon * accruedDays(settlement, prev, next, basis, frequency)) / E;
}

/** Solve PRICE(yld) = target by bisection — Excel's YIELD does the same. */
function solveYield(settlement: number, maturity: number, rate: number, price: number, redemption: number, frequency: number, basis: BondBasis): number | XErr {
  let lo = -0.99;
  let hi = 5;
  const f = (y: number) => cleanPrice(settlement, maturity, rate, y, redemption, frequency, basis) - price;
  let flo = f(lo);
  let fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return NUM;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-10) return mid;
    if (flo * fm <= 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Macaulay duration in years; MDURATION divides this by (1 + yld/frequency). */
function macaulayDuration(
  settlement: number,
  maturity: number,
  rate: number,
  yld: number,
  frequency: number,
  basis: BondBasis,
): number {
  const { prev, next } = couponWindow(settlement, maturity, frequency);
  const E = periodDays(basis, frequency, prev, next);
  const dsc = Math.max(0, E - accruedDays(settlement, prev, next, basis, frequency));
  const n = remainingCoupons(settlement, maturity, frequency);
  const coupon = (100 * rate) / frequency;
  const base = 1 + yld / frequency;
  let weighted = 0;
  let dirty = 0;
  for (let k = 1; k <= n; k++) {
    const t = k - 1 + dsc / E;
    const pv = coupon / base ** t;
    weighted += (t * pv) / frequency;
    dirty += pv;
  }
  const t = n - 1 + dsc / E;
  const redemptionPv = 100 / base ** t;
  weighted += (t * redemptionPv) / frequency;
  dirty += redemptionPv;
  return weighted / dirty;
}
function numberSeries(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number[] {
  const v = ctx.evalNode(args[i] ?? { t: "missing" });
  const cells = scalarsIn(v);
  return cells
    .map((c: Scalar) => (typeof c === "number" ? c : toNum(c)))
    .filter((n): n is number => typeof n === "number");
}

function daySeries(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number[] {
  const v = ctx.evalNode(args[i] ?? { t: "missing" });
  return scalarsIn(v)
    .map((c: Scalar) => (typeof c === "number" ? c : toNum(c)))
    .filter((n): n is number => typeof n === "number");
}

/**
 * Bond/pricing functions that need a full day-count calendar. They exist so a
 * student's formula resolves (instead of a scary #NAME?) and knows why.
 */
const bondNotAvailable: FnImpl = () => ({
  err: "#NUM!",
  hint: "Odd (short/long) first or last coupon periods need a full coupon calendar this lab does not model — use PRICE, YIELD, DURATION, ACCRINT or COUPNUM for the regular cases.",
});

export const financialFns: Record<string, FnImpl> = {
  ACCRINT: (args, ctx) => {
    const issue = serialArg(args, ctx, 0);
    if (isErr(issue)) return issue;
    const firstInterest = serialArg(args, ctx, 1);
    if (isErr(firstInterest)) return firstInterest;
    const settlement = serialArg(args, ctx, 2);
    if (isErr(settlement)) return settlement;
    const rate = num(args, ctx, 3);
    if (isErr(rate)) return rate;
    const par = args[4] && args[4].t !== "missing" ? num(args, ctx, 4, 1000) : 1000;
    if (isErr(par)) return par;
    const frequency = args[5] && args[5].t !== "missing" ? num(args, ctx, 5, 2) : 2;
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 6);
    if (isErr(basis)) return basis;
    const calcMethod = args[7] && args[7].t !== "missing" ? bool(args, ctx, 7, true) : true;
    if (isErr(calcMethod)) return calcMethod;
    if (rate <= 0 || par <= 0 || ![1, 2, 4].includes(Math.trunc(frequency))) return NUM;
    if (settlement <= issue) return NUM;
    void calcMethod;
    return par * rate * yearFrac(issue, settlement, basis, frequency);
  },
  AMORDEGRC: (args, ctx) => {
    const cost = num(args, ctx, 0);
    if (isErr(cost)) return cost;
    const purchased = num(args, ctx, 1);
    if (isErr(purchased)) return purchased;
    const firstPeriod = num(args, ctx, 2);
    if (isErr(firstPeriod)) return firstPeriod;
    const salvage = num(args, ctx, 3);
    if (isErr(salvage)) return salvage;
    const period = num(args, ctx, 4);
    if (isErr(period)) return period;
    const rate = num(args, ctx, 5);
    if (isErr(rate)) return rate;
    void purchased;
    const life = Math.ceil(1 / rate);
    let remaining = cost - salvage;
    let dep = 0;
    for (let p = 1; p <= Math.trunc(period); p++) {
      const factor = p === life ? 0.5 : p === life - 1 ? 1 : p === 1 ? 1.5 : 2;
      dep = Math.round((remaining * rate * factor) / 1) * 1;
      remaining -= dep;
    }
    return firstPeriod >= 0 ? dep : 0;
  },
  COUPDAYBS: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const frequency = num(args, ctx, 2);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 3);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || settlement >= maturity) return NUM;
    const { prev } = couponWindow(settlement, maturity, Math.trunc(frequency));
    return Math.round(daysBetween(prev, settlement));
  },
  COUPDAYS: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const frequency = num(args, ctx, 2);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 3);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || settlement >= maturity) return NUM;
    const months = 12 / Math.trunc(frequency);
    if (basis === 2) return 360 / Math.trunc(frequency);
    if (basis === 3) return 365 / Math.trunc(frequency);
    if (basis === 0 || basis === 4) return months * 30;
    const { prev, next } = couponWindow(settlement, maturity, Math.trunc(frequency));
    return daysBetween(prev, next);
  },
  COUPDAYSNC: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const frequency = num(args, ctx, 2);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 3);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || settlement >= maturity) return NUM;
    if (basis === 2) {
      const { prev } = couponWindow(settlement, maturity, Math.trunc(frequency));
      return 360 / Math.trunc(frequency) - daysBetween(prev, settlement);
    }
    if (basis === 3) {
      const { prev } = couponWindow(settlement, maturity, Math.trunc(frequency));
      return 365 / Math.trunc(frequency) - daysBetween(prev, settlement);
    }
    const { next } = couponWindow(settlement, maturity, Math.trunc(frequency));
    return daysBetween(settlement, next);
  },
  COUPNCD: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const frequency = num(args, ctx, 2);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 3);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || settlement >= maturity) return NUM;
    return couponWindow(settlement, maturity, Math.trunc(frequency)).next;
  },
  COUPNUM: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const frequency = num(args, ctx, 2);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 3);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || settlement >= maturity) return NUM;
    const months = 12 / Math.trunc(frequency);
    let count = 0;
    let cursor = maturity;
    while (cursor > settlement && count < 1000) {
      cursor = addMonths(cursor, -months);
      count += 1;
    }
    return count;
  },
  COUPPCD: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const frequency = num(args, ctx, 2);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 3);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || settlement >= maturity) return NUM;
    return couponWindow(settlement, maturity, Math.trunc(frequency)).prev;
  },
  CUMIPMT: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const nper = num(args, ctx, 1);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 2);
    if (isErr(pvArg)) return pvArg;
    const start = num(args, ctx, 3);
    if (isErr(start)) return start;
    const end = num(args, ctx, 4);
    if (isErr(end)) return end;
    const type = num(args, ctx, 5);
    if (isErr(type)) return type;
    if (rate <= 0 || nper <= 0 || pvArg <= 0 || start < 1 || end < start) return NUM;
    let total = 0;
    for (let p = Math.trunc(start); p <= Math.trunc(end); p++) total += ipmt(rate, p, nper, pvArg, 0, type);
    return total;
  },
  CUMPRINC: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const nper = num(args, ctx, 1);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 2);
    if (isErr(pvArg)) return pvArg;
    const start = num(args, ctx, 3);
    if (isErr(start)) return start;
    const end = num(args, ctx, 4);
    if (isErr(end)) return end;
    const type = num(args, ctx, 5);
    if (isErr(type)) return type;
    if (rate <= 0 || nper <= 0 || pvArg <= 0 || start < 1 || end < start) return NUM;
    const total = pmt(rate, nper, pvArg, 0, type) * (Math.trunc(end) - Math.trunc(start) + 1);
    let interest = 0;
    for (let p = Math.trunc(start); p <= Math.trunc(end); p++) interest += ipmt(rate, p, nper, pvArg, 0, type);
    return total - interest;
  },
  DB: (args, ctx) => {
    const cost = num(args, ctx, 0);
    if (isErr(cost)) return cost;
    const salvage = num(args, ctx, 1);
    if (isErr(salvage)) return salvage;
    const life = num(args, ctx, 2);
    if (isErr(life)) return life;
    const period = num(args, ctx, 3);
    if (isErr(period)) return period;
    const month = args[4] && args[4].t !== "missing" ? num(args, ctx, 4) : 12;
    if (isErr(month)) return month;
    if (cost < 0 || salvage < 0 || life <= 0 || period <= 0) return NUM;
    const rate = Math.round((1 - (salvage / cost) ** (1 / life)) * 1000) / 1000;
    let book = cost;
    let dep = 0;
    for (let p = 1; p <= Math.trunc(period); p++) {
      dep = p === 1 ? (book * rate * month) / 12 : (book * rate);
      if (p === Math.trunc(period)) return dep;
      book -= dep;
    }
    return dep;
  },
  DDB: (args, ctx) => {
    const cost = num(args, ctx, 0);
    if (isErr(cost)) return cost;
    const salvage = num(args, ctx, 1);
    if (isErr(salvage)) return salvage;
    const life = num(args, ctx, 2);
    if (isErr(life)) return life;
    const period = num(args, ctx, 3);
    if (isErr(period)) return period;
    const factor = args[4] && args[4].t !== "missing" ? num(args, ctx, 4) : 2;
    if (isErr(factor)) return factor;
    if (cost < 0 || salvage < 0 || life <= 0 || period <= 0 || factor <= 0) return NUM;
    let book = cost;
    let dep = 0;
    for (let p = 1; p <= Math.trunc(period); p++) {
      dep = Math.min((book * factor) / life, book - salvage);
      dep = Math.max(dep, 0);
      if (p === Math.trunc(period)) return dep;
      book -= dep;
    }
    return dep;
  },
  DISC: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const price = num(args, ctx, 2);
    if (isErr(price)) return price;
    const redemption = num(args, ctx, 3);
    if (isErr(redemption)) return redemption;
    const basis = basisArg(args, ctx, 4);
    if (isErr(basis)) return basis;
    if (price <= 0 || redemption <= 0 || settlement >= maturity) return NUM;
    return (redemption - price) / redemption / yearFrac(settlement, maturity, basis);
  },
  DOLLARDE: (args, ctx) => {
    const dollars = num(args, ctx, 0);
    if (isErr(dollars)) return dollars;
    const fraction = num(args, ctx, 1);
    if (isErr(fraction)) return fraction;
    if (fraction < 0) return NUM;
    const f = Math.trunc(fraction);
    const int = Math.trunc(dollars);
    return int + ((dollars - int) * 10 ** Math.ceil(Math.log10(f))) / f;
  },
  DOLLARFR: (args, ctx) => {
    const dollars = num(args, ctx, 0);
    if (isErr(dollars)) return dollars;
    const fraction = num(args, ctx, 1);
    if (isErr(fraction)) return fraction;
    if (fraction < 0) return NUM;
    const f = Math.trunc(fraction);
    const int = Math.trunc(dollars);
    return int + ((dollars - int) * f) / 10 ** Math.ceil(Math.log10(f));
  },
  DURATION: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const couponRate = num(args, ctx, 2);
    if (isErr(couponRate)) return couponRate;
    const yld = num(args, ctx, 3);
    if (isErr(yld)) return yld;
    const frequency = num(args, ctx, 4);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 5);
    if (isErr(basis)) return basis;
    if (couponRate < 0 || yld < 0 || ![1, 2, 4].includes(Math.trunc(frequency))) return NUM;
    if (settlement >= maturity) return NUM;
    return macaulayDuration(settlement, maturity, couponRate, yld, Math.trunc(frequency), basis);
  },
  EFFECT: (args, ctx) => {
    const nominal = num(args, ctx, 0);
    if (isErr(nominal)) return nominal;
    const periods = num(args, ctx, 1);
    if (isErr(periods)) return periods;
    if (nominal <= 0 || periods < 1) return NUM;
    return (1 + nominal / Math.trunc(periods)) ** Math.trunc(periods) - 1;
  },
  FV: (args, ctx) => {
    const rate = num(args, ctx, 0, 0);
    if (isErr(rate)) return rate;
    const nper = num(args, ctx, 1);
    if (isErr(nper)) return nper;
    const pmtArg = num(args, ctx, 2, 0);
    if (isErr(pmtArg)) return pmtArg;
    const pvArg = num(args, ctx, 3, 0);
    if (isErr(pvArg)) return pvArg;
    const type = num(args, ctx, 4, 0);
    if (isErr(type)) return type;
    return fv(rate, nper, pmtArg, pvArg, type);
  },
  FVSCHEDULE: (args, ctx) => {
    const principal = num(args, ctx, 0);
    if (isErr(principal)) return principal;
    const rates = numberSeries(args, ctx, 1);
    return rates.reduce((acc, r) => acc * (1 + r), principal);
  },
  INTRATE: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const investment = num(args, ctx, 2);
    if (isErr(investment)) return investment;
    const redemption = num(args, ctx, 3);
    if (isErr(redemption)) return redemption;
    const basis = basisArg(args, ctx, 4);
    if (isErr(basis)) return basis;
    if (investment <= 0 || settlement >= maturity) return NUM;
    return (redemption - investment) / investment / yearFrac(settlement, maturity, basis);
  },
  IPMT: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const per = num(args, ctx, 1);
    if (isErr(per)) return per;
    const nper = num(args, ctx, 2);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 3);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 4, 0);
    if (isErr(fvArg)) return fvArg;
    const type = num(args, ctx, 5, 0);
    if (isErr(type)) return type;
    if (per < 1 || per > nper) return NUM;
    return ipmt(rate, per, nper, pvArg, fvArg, type);
  },
  IRR: (args, ctx) => {
    const flows = numberSeries(args, ctx, 0);
    const guess = args[1] && args[1].t !== "missing" ? num(args, ctx, 1, 0.1) : 0.1;
    if (isErr(guess)) return guess;
    return irrCalc(flows, guess);
  },
  ISPMT: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const per = num(args, ctx, 1);
    if (isErr(per)) return per;
    const nper = num(args, ctx, 2);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 3);
    if (isErr(pvArg)) return pvArg;
    return pvArg * rate * (per / nper - 1);
  },
  MDURATION: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const couponRate = num(args, ctx, 2);
    if (isErr(couponRate)) return couponRate;
    const yld = num(args, ctx, 3);
    if (isErr(yld)) return yld;
    const frequency = num(args, ctx, 4);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 5);
    if (isErr(basis)) return basis;
    if (couponRate < 0 || yld < 0 || ![1, 2, 4].includes(Math.trunc(frequency))) return NUM;
    if (settlement >= maturity) return NUM;
    const freq = Math.trunc(frequency);
    return macaulayDuration(settlement, maturity, couponRate, yld, freq, basis) / (1 + yld / freq);
  },
  MIRR: (args, ctx) => {
    const flows = numberSeries(args, ctx, 0);
    const financeRate = num(args, ctx, 1);
    if (isErr(financeRate)) return financeRate;
    const reinvestRate = num(args, ctx, 2);
    if (isErr(reinvestRate)) return reinvestRate;
    const n = flows.length;
    const positives = flows.reduce((acc, f, i) => (f > 0 ? acc + f * (1 + reinvestRate) ** (n - 1 - i) : acc), 0);
    const negatives = flows.reduce((acc, f, i) => (f < 0 ? acc + f / (1 + financeRate) ** i : acc), 0);
    if (negatives === 0) return NUM;
    return (positives / -negatives) ** (1 / (n - 1)) - 1;
  },
  NOMINAL: (args, ctx) => {
    const effect = num(args, ctx, 0);
    if (isErr(effect)) return effect;
    const periods = num(args, ctx, 1);
    if (isErr(periods)) return periods;
    if (effect <= 0 || periods < 1) return NUM;
    return ((1 + effect) ** (1 / Math.trunc(periods)) - 1) * Math.trunc(periods);
  },
  NPER: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const pmtArg = num(args, ctx, 1);
    if (isErr(pmtArg)) return pmtArg;
    const pvArg = num(args, ctx, 2);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 3, 0);
    if (isErr(fvArg)) return fvArg;
    const type = num(args, ctx, 4, 0);
    if (isErr(type)) return type;
    if (rate === 0) return -(pvArg + fvArg) / pmtArg;
    const num_ = pmtArg * (1 + rate * fvType(type)) - fvArg * rate;
    const den = pvArg * rate + pmtArg * (1 + rate * fvType(type));
    if (den === 0) return NUM;
    return Math.log(num_ / den) / Math.log(1 + rate);
  },
  NPV: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const flows: number[] = [];
    for (let i = 1; i < args.length; i++) flows.push(...numberSeries(args, ctx, i));
    return flows.reduce((acc, f, i) => acc + f / (1 + rate) ** (i + 1), 0);
  },
  ODDFPRICE: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const issue = serialArg(args, ctx, 2);
    if (isErr(issue)) return issue;
    const firstCoupon = serialArg(args, ctx, 3);
    if (isErr(firstCoupon)) return firstCoupon;
    const rate = num(args, ctx, 4);
    if (isErr(rate)) return rate;
    const yld = num(args, ctx, 5);
    if (isErr(yld)) return yld;
    const redemption = num(args, ctx, 6);
    if (isErr(redemption)) return redemption;
    const frequency = num(args, ctx, 7);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 8);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || rate < 0 || yld < 0 || redemption <= 0) return NUM;
    if (!(issue < settlement && settlement < firstCoupon && firstCoupon <= maturity)) return NUM;
    const price = oddFirstPrice(settlement, maturity, issue, firstCoupon, rate, yld, redemption, Math.trunc(frequency), basis);
    return Number.isFinite(price) ? price : NUM;
  },
  ODDFYIELD: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const issue = serialArg(args, ctx, 2);
    if (isErr(issue)) return issue;
    const firstCoupon = serialArg(args, ctx, 3);
    if (isErr(firstCoupon)) return firstCoupon;
    const rate = num(args, ctx, 4);
    if (isErr(rate)) return rate;
    const price = num(args, ctx, 5);
    if (isErr(price)) return price;
    const redemption = num(args, ctx, 6);
    if (isErr(redemption)) return redemption;
    const frequency = num(args, ctx, 7);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 8);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || rate < 0 || price <= 0 || redemption <= 0) return NUM;
    if (!(issue < settlement && settlement < firstCoupon && firstCoupon <= maturity)) return NUM;
    const freq = Math.trunc(frequency);
    return solveByPrice(
      (yld) => oddFirstPrice(settlement, maturity, issue, firstCoupon, rate, yld, redemption, freq, basis) - price,
    );
  },
  ODDLPRICE: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const lastInterest = serialArg(args, ctx, 2);
    if (isErr(lastInterest)) return lastInterest;
    const rate = num(args, ctx, 3);
    if (isErr(rate)) return rate;
    const yld = num(args, ctx, 4);
    if (isErr(yld)) return yld;
    const redemption = num(args, ctx, 5);
    if (isErr(redemption)) return redemption;
    const frequency = num(args, ctx, 6);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 7);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || rate < 0 || yld < 0 || redemption <= 0) return NUM;
    if (!(lastInterest < settlement && settlement < maturity)) return NUM;
    const price = oddLastPrice(settlement, maturity, lastInterest, rate, yld, redemption, Math.trunc(frequency), basis);
    return Number.isFinite(price) ? price : NUM;
  },
  ODDLYIELD: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const lastInterest = serialArg(args, ctx, 2);
    if (isErr(lastInterest)) return lastInterest;
    const rate = num(args, ctx, 3);
    if (isErr(rate)) return rate;
    const price = num(args, ctx, 4);
    if (isErr(price)) return price;
    const redemption = num(args, ctx, 5);
    if (isErr(redemption)) return redemption;
    const frequency = num(args, ctx, 6);
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 7);
    if (isErr(basis)) return basis;
    if (![1, 2, 4].includes(Math.trunc(frequency)) || rate < 0 || price <= 0 || redemption <= 0) return NUM;
    if (!(lastInterest < settlement && settlement < maturity)) return NUM;
    const freq = Math.trunc(frequency);
    return solveByPrice(
      (yld) => oddLastPrice(settlement, maturity, lastInterest, rate, yld, redemption, freq, basis) - price,
    );
  },
  PDURATION: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const pvArg = num(args, ctx, 1);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 2);
    if (isErr(fvArg)) return fvArg;
    if (rate <= 0 || pvArg <= 0 || fvArg <= 0) return NUM;
    return Math.log(fvArg / pvArg) / Math.log(1 + rate);
  },
  PMT: (args, ctx) => {
    const rate = num(args, ctx, 0, 0);
    if (isErr(rate)) return rate;
    const nper = num(args, ctx, 1);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 2);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 3, 0);
    if (isErr(fvArg)) return fvArg;
    const type = num(args, ctx, 4, 0);
    if (isErr(type)) return type;
    if (nper === 0) return NUM;
    return pmt(rate, nper, pvArg, fvArg, type);
  },
  PPMT: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const per = num(args, ctx, 1);
    if (isErr(per)) return per;
    const nper = num(args, ctx, 2);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 3);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 4, 0);
    if (isErr(fvArg)) return fvArg;
    const type = num(args, ctx, 5, 0);
    if (isErr(type)) return type;
    if (per < 1 || per > nper) return NUM;
    return ppmt(rate, per, nper, pvArg, fvArg, type);
  },
  PRICE: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const rate = num(args, ctx, 2);
    if (isErr(rate)) return rate;
    const yld = num(args, ctx, 3);
    if (isErr(yld)) return yld;
    const redemption = args[4] && args[4].t !== "missing" ? num(args, ctx, 4, 100) : 100;
    if (isErr(redemption)) return redemption;
    const frequency = args[5] && args[5].t !== "missing" ? num(args, ctx, 5, 2) : 2;
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 6);
    if (isErr(basis)) return basis;
    if (rate < 0 || yld < 0 || redemption <= 0 || ![1, 2, 4].includes(Math.trunc(frequency))) return NUM;
    if (settlement >= maturity) return NUM;
    return cleanPrice(settlement, maturity, rate, yld, redemption, Math.trunc(frequency), basis);
  },
  PRICEDISC: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const discount = num(args, ctx, 2);
    if (isErr(discount)) return discount;
    const redemption = args[3] && args[3].t !== "missing" ? num(args, ctx, 3, 100) : 100;
    if (isErr(redemption)) return redemption;
    const basis = basisArg(args, ctx, 4);
    if (isErr(basis)) return basis;
    if (discount <= 0 || redemption <= 0 || settlement >= maturity) return NUM;
    return redemption - discount * redemption * yearFrac(settlement, maturity, basis);
  },
  PRICEMAT: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const issue = serialArg(args, ctx, 2);
    if (isErr(issue)) return issue;
    const rate = num(args, ctx, 3);
    if (isErr(rate)) return rate;
    const yld = args[4] && args[4].t !== "missing" ? num(args, ctx, 4, 0) : 0;
    if (isErr(yld)) return yld;
    const basis = basisArg(args, ctx, 5);
    if (isErr(basis)) return basis;
    if (rate < 0 || yld < 0 || settlement >= maturity) return NUM;
    const dim = yearFrac(issue, maturity, basis);
    const dsm = yearFrac(settlement, maturity, basis);
    const a = yearFrac(issue, settlement, basis);
    return (100 + dim * rate * 100) / (1 + dsm * yld) - a * rate * 100;
  },
  PV: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const nper = num(args, ctx, 1);
    if (isErr(nper)) return nper;
    const pmtArg = num(args, ctx, 2);
    if (isErr(pmtArg)) return pmtArg;
    const fvArg = num(args, ctx, 3, 0);
    if (isErr(fvArg)) return fvArg;
    const type = num(args, ctx, 4, 0);
    if (isErr(type)) return type;
    return pv(rate, nper, pmtArg, fvArg, type);
  },
  RATE: (args, ctx) => {
    const nper = num(args, ctx, 0);
    if (isErr(nper)) return nper;
    const pmtArg = num(args, ctx, 1);
    if (isErr(pmtArg)) return pmtArg;
    const pvArg = num(args, ctx, 2);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 3, 0);
    if (isErr(fvArg)) return fvArg;
    const type = num(args, ctx, 4, 0);
    if (isErr(type)) return type;
    const guess = args[5] && args[5].t !== "missing" ? num(args, ctx, 5, 0.1) : 0.1;
    if (isErr(guess)) return guess;
    if (nper <= 0) return NUM;
    let rate = guess;
    for (let i = 0; i < 100; i++) {
      const f = fv(rate, nper, pmtArg, pvArg, type) - fvArg;
      const h = 1e-7;
      const df = (fv(rate + h, nper, pmtArg, pvArg, type) - fvArg - f) / h;
      if (!Number.isFinite(df) || df === 0) break;
      const next = rate - f / df;
      if (!Number.isFinite(next)) break;
      if (Math.abs(next - rate) < 1e-10) return next;
      rate = next;
      if (rate <= -1) rate = -0.99999;
    }
    // Bisection fallback
    let lo = -0.99999;
    let hi = 10;
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2;
      const fm = fv(mid, nper, pmtArg, pvArg, type) - fvArg;
      const flo = fv(lo, nper, pmtArg, pvArg, type) - fvArg;
      if (Math.abs(fm) < 1e-9) return mid;
      if (flo * fm <= 0) hi = mid;
      else lo = mid;
    }
    return NUM;
  },
  RECEIVED: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const investment = num(args, ctx, 2);
    if (isErr(investment)) return investment;
    const discount = num(args, ctx, 3);
    if (isErr(discount)) return discount;
    const basis = basisArg(args, ctx, 4);
    if (isErr(basis)) return basis;
    if (investment <= 0 || discount <= 0 || settlement >= maturity) return NUM;
    const fraction = yearFrac(settlement, maturity, basis);
    if (discount * fraction >= 1) return NUM;
    return investment / (1 - discount * fraction);
  },
  RRI: (args, ctx) => {
    const nper = num(args, ctx, 0);
    if (isErr(nper)) return nper;
    const pvArg = num(args, ctx, 1);
    if (isErr(pvArg)) return pvArg;
    const fvArg = num(args, ctx, 2);
    if (isErr(fvArg)) return fvArg;
    if (nper <= 0 || pvArg === 0) return NUM;
    return (fvArg / pvArg) ** (1 / nper) - 1;
  },
  SLN: (args, ctx) => {
    const cost = num(args, ctx, 0);
    if (isErr(cost)) return cost;
    const salvage = num(args, ctx, 1);
    if (isErr(salvage)) return salvage;
    const life = num(args, ctx, 2);
    if (isErr(life)) return life;
    if (life === 0) return { err: "#DIV/0!" };
    return (cost - salvage) / life;
  },
  SYD: (args, ctx) => {
    const cost = num(args, ctx, 0);
    if (isErr(cost)) return cost;
    const salvage = num(args, ctx, 1);
    if (isErr(salvage)) return salvage;
    const life = num(args, ctx, 2);
    if (isErr(life)) return life;
    const period = num(args, ctx, 3);
    if (isErr(period)) return period;
    if (life <= 0 || period <= 0 || period > life) return NUM;
    return ((cost - salvage) * (life - period + 1) * 2) / (life * (life + 1));
  },
  TBILLEQ: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const discount = num(args, ctx, 2);
    if (isErr(discount)) return discount;
    const days = maturity - settlement;
    if (discount <= 0 || days <= 0 || days > 365) return NUM;
    return (365 * discount) / (360 - discount * days);
  },
  TBILLPRICE: (args, ctx) => {
    const settlement = num(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = num(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const discount = num(args, ctx, 2);
    if (isErr(discount)) return discount;
    const days = maturity - settlement;
    if (days > 365 || discount <= 0) return NUM;
    return 100 * (1 - (discount * days) / 360);
  },
  TBILLYIELD: (args, ctx) => {
    const settlement = num(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = num(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const price = num(args, ctx, 2);
    if (isErr(price)) return price;
    const days = maturity - settlement;
    if (days > 365 || price <= 0) return NUM;
    return ((100 - price) / price) * (360 / days);
  },
  VDB: (args, ctx) => {
    const cost = num(args, ctx, 0);
    if (isErr(cost)) return cost;
    const salvage = num(args, ctx, 1);
    if (isErr(salvage)) return salvage;
    const life = num(args, ctx, 2);
    if (isErr(life)) return life;
    const start = num(args, ctx, 3);
    if (isErr(start)) return start;
    const end = num(args, ctx, 4);
    if (isErr(end)) return end;
    const factor = args[5] && args[5].t !== "missing" ? num(args, ctx, 5) : 2;
    if (isErr(factor)) return factor;
    const noSwitch = args[6] && args[6].t !== "missing" ? bool(args, ctx, 6, false) : false;
    if (isErr(noSwitch)) return noSwitch;
    let book = cost;
    let total = 0;
    for (let p = 1; p <= Math.ceil(end); p++) {
      let dep = Math.min((book * factor) / life, Math.max(book - salvage, 0));
      if (!noSwitch) {
        const straight = Math.max(book - salvage, 0) / Math.max(1, life - (p - 1));
        if (straight > dep) dep = straight;
      }
      const from = Math.max(p - 1, start);
      const to = Math.min(p, end);
      if (to > from) total += dep * (to - from);
      book -= dep * (to > from ? to - from : 0);
    }
    return total;
  },
  XIRR: (args, ctx) => {
    const flows = numberSeries(args, ctx, 0);
    const days = daySeries(args, ctx, 1);
    if (flows.length !== days.length || flows.length < 2) return NUM;
    const guess = args[2] && args[2].t !== "missing" ? num(args, ctx, 2, 0.1) : 0.1;
    if (isErr(guess)) return guess;
    void guess;
    return xirr(flows, days);
  },
  XNPV: (args, ctx) => {
    const rate = num(args, ctx, 0);
    if (isErr(rate)) return rate;
    const flows = numberSeries(args, ctx, 1);
    const days = daySeries(args, ctx, 2);
    if (flows.length !== days.length || !flows.length) return NUM;
    return xnpv(rate, flows, days);
  },
  YIELD: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const rate = num(args, ctx, 2);
    if (isErr(rate)) return rate;
    const price = num(args, ctx, 3);
    if (isErr(price)) return price;
    const redemption = args[4] && args[4].t !== "missing" ? num(args, ctx, 4, 100) : 100;
    if (isErr(redemption)) return redemption;
    const frequency = args[5] && args[5].t !== "missing" ? num(args, ctx, 5, 2) : 2;
    if (isErr(frequency)) return frequency;
    const basis = basisArg(args, ctx, 6);
    if (isErr(basis)) return basis;
    if (rate < 0 || price <= 0 || redemption <= 0 || ![1, 2, 4].includes(Math.trunc(frequency))) return NUM;
    if (settlement >= maturity) return NUM;
    return solveYield(settlement, maturity, rate, price, redemption, Math.trunc(frequency), basis);
  },
  YIELDDISC: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const price = num(args, ctx, 2);
    if (isErr(price)) return price;
    const redemption = args[3] && args[3].t !== "missing" ? num(args, ctx, 3, 100) : 100;
    if (isErr(redemption)) return redemption;
    const basis = basisArg(args, ctx, 4);
    if (isErr(basis)) return basis;
    if (price <= 0 || redemption <= 0 || settlement >= maturity) return NUM;
    return (redemption - price) / price / yearFrac(settlement, maturity, basis);
  },
  YIELDMAT: (args, ctx) => {
    const settlement = serialArg(args, ctx, 0);
    if (isErr(settlement)) return settlement;
    const maturity = serialArg(args, ctx, 1);
    if (isErr(maturity)) return maturity;
    const issue = serialArg(args, ctx, 2);
    if (isErr(issue)) return issue;
    const rate = num(args, ctx, 3);
    if (isErr(rate)) return rate;
    const price = args[4] && args[4].t !== "missing" ? num(args, ctx, 4, 100) : 100;
    if (isErr(price)) return price;
    const basis = basisArg(args, ctx, 5);
    if (isErr(basis)) return basis;
    if (rate < 0 || price <= 0 || settlement >= maturity) return NUM;
    const dim = yearFrac(issue, maturity, basis);
    const dsm = yearFrac(settlement, maturity, basis);
    const a = yearFrac(issue, settlement, basis);
    if (dsm === 0) return NUM;
    return ((100 + dim * rate * 100) / (price + a * rate * 100) - 1) / dsm;
  },
};

export const financialHelpers = { pmt, fv, pv, ipmt, ppmt, irrCalc, VALUE };
