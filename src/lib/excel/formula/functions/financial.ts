/**
 * Financial functions: loans/EMI, NPV/IRR, depreciation and bond maths.
 *
 * These are the ones Indian students actually bill for — PMT for a home loan,
 * RATE for a chit fund, XIRR for SIPs, SLN/WDV for depreciation schedules — so
 * they are first-class here instead of being an Excel-only privilege.
 */
import { NUM, VALUE, isErr, scalarsIn, toNum, type Scalar, type XErr } from "../core";
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
  hint: "Bond pricing needs a coupon calendar; use PRICE-free basics like PMT, IPMT, XIRR in this lab.",
});

export const financialFns: Record<string, FnImpl> = {
  ACCRINT: bondNotAvailable,
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
  COUPDAYBS: bondNotAvailable,
  COUPDAYS: bondNotAvailable,
  COUPDAYSNC: bondNotAvailable,
  COUPNCD: bondNotAvailable,
  COUPNUM: bondNotAvailable,
  COUPPCD: bondNotAvailable,
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
  DISC: bondNotAvailable,
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
  DURATION: bondNotAvailable,
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
  INTRATE: bondNotAvailable,
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
  MDURATION: bondNotAvailable,
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
  ODDFPRICE: bondNotAvailable,
  ODDFYIELD: bondNotAvailable,
  ODDLPRICE: bondNotAvailable,
  ODDLYIELD: bondNotAvailable,
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
  PRICE: bondNotAvailable,
  PRICEDISC: bondNotAvailable,
  PRICEMAT: bondNotAvailable,
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
  RECEIVED: bondNotAvailable,
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
  TBILLEQ: bondNotAvailable,
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
  YIELD: bondNotAvailable,
  YIELDDISC: bondNotAvailable,
  YIELDMAT: bondNotAvailable,
};

export const financialHelpers = { pmt, fv, pv, ipmt, ppmt, irrCalc, VALUE };
