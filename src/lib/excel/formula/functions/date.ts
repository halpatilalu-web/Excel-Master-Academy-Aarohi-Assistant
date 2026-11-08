/** Date & time functions (Excel 1900 date system, serial numbers). */
import {
  MAX_SERIAL,
  dateToSerial,
  isErr,
  parseDateText,
  parseTimeText,
  serialToDate,
  toSerial,
  type Scalar,
  type XErr,
} from "../core";
import { num, str, type FnImpl } from "../helpers";

const serial = (args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number | XErr => {
  const node = args[i];
  if (!node || node.t === "missing") return 0;
  const v = ctx.evalNode(node);
  const s = toSerial(Array.isArray(v) ? v[0]?.[0] ?? null : (v as Scalar));
  return s;
};

const ymd = (args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number) => {
  const v = num(args, ctx, i);
  if (isErr(v)) return v;
  return Math.trunc(v);
};

function buildDate(year: number, month: number, day: number): number | XErr {
  // Excel's DATE rolls over out-of-range months/days instead of failing.
  const y = year < 1900 && year >= 0 ? year + 1900 : year;
  const d = new Date(Date.UTC(y, month - 1, day));
  const s = dateToSerial(d);
  return s < 0 ? { err: "#NUM!" } : s;
}

/** Whole days since 1899-12-31, the way DATEDIF wants them. */
function dateDiff(start: number, end: number, unit: string): number | XErr {
  const a = serialToDate(start);
  const b = serialToDate(end);
  if (end < start) return { err: "#NUM!" };
  const U = unit.toUpperCase();
  const yDiff = b.getUTCFullYear() - a.getUTCFullYear();
  const mDiff = yDiff * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (U === "Y") return b.getUTCMonth() * 100 + b.getUTCDate() >= a.getUTCMonth() * 100 + a.getUTCDate() ? yDiff : yDiff - 1;
  if (U === "M") return b.getUTCDate() >= a.getUTCDate() ? mDiff : mDiff - 1;
  if (U === "D") return Math.round(end - start);
  if (U === "MD") {
    if (b.getUTCDate() >= a.getUTCDate()) return b.getUTCDate() - a.getUTCDate();
    const prevMonth = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate();
    return prevMonth - a.getUTCDate() + b.getUTCDate();
  }
  if (U === "YM") {
    const months = b.getUTCDate() >= a.getUTCDate() ? mDiff : mDiff - 1;
    return ((months % 12) + 12) % 12;
  }
  if (U === "YD") {
    const startThisYear = dateToSerial(new Date(Date.UTC(b.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())));
    if (startThisYear <= end) return Math.round(end - startThisYear);
    const startPrevYear = dateToSerial(new Date(Date.UTC(b.getUTCFullYear() - 1, a.getUTCMonth(), a.getUTCDate())));
    return Math.round(end - startPrevYear);
  }
  return { err: "#NUM!" };
}

export const dateFns: Record<string, FnImpl> = {
  DATE: (args, ctx) => {
    const y = ymd(args, ctx, 0);
    if (isErr(y)) return y;
    const m = ymd(args, ctx, 1);
    if (isErr(m)) return m;
    const d = ymd(args, ctx, 2);
    if (isErr(d)) return d;
    return buildDate(y, m, d);
  },
  DATEDIF: (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const end = serial(args, ctx, 1);
    if (isErr(end)) return end;
    const unit = str(args, ctx, 2);
    if (isErr(unit)) return unit;
    return dateDiff(start, end, unit);
  },
  DATEVALUE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    const parsed = parseDateText(s);
    return parsed === null ? { err: "#VALUE!" } : Math.floor(parsed);
  },
  DAY: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    if (s < 0) return { err: "#NUM!" };
    return serialToDate(s).getUTCDate();
  },
  DAYS: (args, ctx) => {
    const end = serial(args, ctx, 0);
    if (isErr(end)) return end;
    const start = serial(args, ctx, 1);
    if (isErr(start)) return start;
    return Math.round(end - start);
  },
  DAYS360: (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const end = serial(args, ctx, 1);
    if (isErr(end)) return end;
    const european = args[2] ? ctx.evalNode(args[2]) : false;
    const a = serialToDate(start);
    const b = serialToDate(end);
    let d1 = a.getUTCDate();
    let d2 = b.getUTCDate();
    if (european) {
      if (d1 === 31) d1 = 30;
      if (d2 === 31) d2 = 30;
    } else {
      if (d1 === 31 || (d1 === 30 && false)) d1 = 30;
      if (d2 === 31 && d1 === 30) d2 = 30;
    }
    return (
      (b.getUTCFullYear() - a.getUTCFullYear()) * 360 +
      (b.getUTCMonth() - a.getUTCMonth()) * 30 +
      (d2 - d1)
    );
  },
  EDATE: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const months = ymd(args, ctx, 1);
    if (isErr(months)) return months;
    const d = serialToDate(s);
    const year = d.getUTCFullYear();
    const monthIndex = d.getUTCMonth() + months;
    // EDATE keeps the day-of-month but clamps to the target month's length.
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    return dateToSerial(new Date(Date.UTC(year, monthIndex, Math.min(d.getUTCDate(), lastDay))));
  },
  EOMONTH: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const months = ymd(args, ctx, 1);
    if (isErr(months)) return months;
    const d = serialToDate(s);
    return dateToSerial(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0)));
  },
  HOUR: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const frac = s - Math.floor(s);
    return Math.floor(Math.round(frac * 86400) / 3600);
  },
  ISOWEEKNUM: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const d = serialToDate(s);
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.getTime();
    const yearStart = Date.UTC(target.getUTCFullYear(), 0, 4);
    const week = 1 + Math.round((firstThursday - yearStart) / (7 * 86400000));
    return week;
  },
  MINUTE: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const frac = s - Math.floor(s);
    return Math.floor((Math.round(frac * 86400) % 3600) / 60);
  },
  MONTH: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    return serialToDate(s).getUTCMonth() + 1;
  },
  NETWORKDAYS: (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const end = serial(args, ctx, 1);
    if (isErr(end)) return end;
    const holidays = args[2] ? new Set(rangeSerials(args, ctx, 2)) : new Set<number>();
    const lo = Math.floor(Math.min(start, end));
    const hi = Math.floor(Math.max(start, end));
    let count = 0;
    for (let s = lo; s <= hi; s++) {
      const dow = serialToDate(s).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      if (holidays.has(s)) continue;
      count++;
    }
    return start <= end ? count : -count;
  },
  "NETWORKDAYS.INTL": (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const end = serial(args, ctx, 1);
    if (isErr(end)) return end;
    const weekend = args[2] && args[2].t !== "missing" ? ctx.evalNode(args[2]) : 1;
    const weekendDays =
      typeof weekend === "string"
        ? weekendMask(weekend)
        : weekendMask(String(Math.trunc(Number(weekend))));
    const holidays = args[3] ? new Set(rangeSerials(args, ctx, 3)) : new Set<number>();
    const lo = Math.floor(Math.min(start, end));
    const hi = Math.floor(Math.max(start, end));
    let count = 0;
    for (let s = lo; s <= hi; s++) {
      if (weekendDays.has(serialToDate(s).getUTCDay())) continue;
      if (holidays.has(s)) continue;
      count++;
    }
    return start <= end ? count : -count;
  },
  NOW: () => {
    const now = new Date();
    return dateToSerial(now);
  },
  SECOND: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const frac = s - Math.floor(s);
    return Math.round(frac * 86400) % 60;
  },
  TIME: (args, ctx) => {
    const h = ymd(args, ctx, 0);
    if (isErr(h)) return h;
    const m = ymd(args, ctx, 1);
    if (isErr(m)) return m;
    const s = ymd(args, ctx, 2);
    if (isErr(s)) return s;
    const total = h * 3600 + m * 60 + s;
    return (((total % 86400) + 86400) % 86400) / 86400;
  },
  TIMEVALUE: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    // Uses the time reader, so "9:30 AM" → 0.3958333 like Excel, and a date
    // with no time returns 0 rather than a negative fraction.
    const parsed = parseTimeText(s);
    return parsed === null ? { err: "#VALUE!" } : parsed;
  },
  TODAY: () => {
    const now = new Date();
    return dateToSerial(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  },
  WEEKDAY: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const type = args[1] && args[1].t !== "missing" ? num(args, ctx, 1) : 1;
    if (isErr(type)) return type;
    const dow = serialToDate(s).getUTCDay(); // 0 = Sunday
    const t = Math.trunc(type);
    if (t === 1) return dow + 1;
    if (t === 2) return ((dow + 6) % 7) + 1;
    if (t === 3) return (dow + 6) % 7;
    if (t >= 11 && t <= 17) {
      const start = (t - 10) % 7; // 11 → Monday start
      return ((dow - start + 7) % 7) + 1;
    }
    return { err: "#NUM!" };
  },
  WEEKNUM: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    const type = args[1] && args[1].t !== "missing" ? num(args, ctx, 1) : 1;
    if (isErr(type)) return type;
    const t = Math.trunc(type);
    if (t === 21) return dateFns.ISOWEEKNUM(args, ctx);
    const firstDayIdx = t === 1 ? 0 : t === 2 ? 1 : t >= 11 && t <= 17 ? (t - 10) % 7 : 0;
    const d = serialToDate(s);
    const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const offset = (jan1.getUTCDay() - firstDayIdx + 7) % 7;
    const dayOfYear = Math.floor(s) - dateToSerial(jan1) + 1;
    return Math.floor((dayOfYear + offset - 1) / 7) + 1;
  },
  WORKDAY: (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const days = ymd(args, ctx, 1);
    if (isErr(days)) return days;
    const holidays = args[2] ? new Set(rangeSerials(args, ctx, 2)) : new Set<number>();
    let cur = Math.floor(start);
    let remaining = Math.abs(days);
    const dir = days >= 0 ? 1 : -1;
    while (remaining > 0) {
      cur += dir;
      const dow = serialToDate(cur).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      if (holidays.has(cur)) continue;
      remaining--;
    }
    return cur;
  },
  "WORKDAY.INTL": (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const days = ymd(args, ctx, 1);
    if (isErr(days)) return days;
    const weekend = args[2] && args[2].t !== "missing" ? ctx.evalNode(args[2]) : 1;
    const mask = typeof weekend === "string" ? weekendMask(weekend) : weekendMask(String(Math.trunc(Number(weekend))));
    const holidays = args[3] ? new Set(rangeSerials(args, ctx, 3)) : new Set<number>();
    let cur = Math.floor(start);
    let remaining = Math.abs(days);
    const dir = days >= 0 ? 1 : -1;
    while (remaining > 0) {
      cur += dir;
      if (mask.has(serialToDate(cur).getUTCDay())) continue;
      if (holidays.has(cur)) continue;
      remaining--;
    }
    return cur;
  },
  YEAR: (args, ctx) => {
    const s = serial(args, ctx, 0);
    if (isErr(s)) return s;
    return serialToDate(s).getUTCFullYear();
  },
  YEARFRAC: (args, ctx) => {
    const start = serial(args, ctx, 0);
    if (isErr(start)) return start;
    const end = serial(args, ctx, 1);
    if (isErr(end)) return end;
    const basis = args[2] && args[2].t !== "missing" ? num(args, ctx, 2) : 0;
    if (isErr(basis)) return basis;
    const a = serialToDate(start);
    const b = serialToDate(end);
    const b0 = Math.trunc(basis);
    if (b0 === 0) {
      let d1 = a.getUTCDate();
      let d2 = b.getUTCDate();
      const m1 = a.getUTCMonth();
      const m2 = b.getUTCMonth();
      const y1 = a.getUTCFullYear();
      const y2 = b.getUTCFullYear();
      if (d1 === 31) d1 = 30;
      if (d2 === 31 && d1 === 30) d2 = 30;
      if (m1 === 1 && d1 === 28 && y1 % 4 === 0 && (y1 % 100 !== 0 || y1 % 400 === 0)) d1 = 29;
      if (m2 === 1 && d2 === 29 && m1 === 1 && d1 === 29) d2 = 28;
      return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
    }
    if (b0 === 1) {
      // Actual/actual: average year length over the span.
      const days = end - start;
      const y1 = a.getUTCFullYear();
      const y2 = b.getUTCFullYear();
      let denomDays = 0;
      let counted = 0;
      for (let y = y1; y <= y2; y++) {
        const yearDays = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365;
        const from = Math.max(start, dateToSerial(new Date(Date.UTC(y, 0, 1))));
        const to = Math.min(end, dateToSerial(new Date(Date.UTC(y + 1, 0, 1))));
        if (to > from) {
          denomDays += yearDays;
          counted++;
        }
      }
      if (!counted || days === 0) return 0;
      return days / (denomDays / counted);
    }
    if (b0 === 2) return (end - start) / 360;
    if (b0 === 3) return (end - start) / 365;
    if (b0 === 4) {
      // European 30/360
      let d1 = a.getUTCDate();
      let d2 = b.getUTCDate();
      if (d1 === 31) d1 = 30;
      if (d2 === 31) d2 = 30;
      return (
        ((b.getUTCFullYear() - a.getUTCFullYear()) * 360 +
          (b.getUTCMonth() - a.getUTCMonth()) * 30 +
          (d2 - d1)) /
        360
      );
    }
    return { err: "#NUM!" };
  },
};

function countLeapDays(y1: number, y2: number): number {
  let count = 0;
  for (let y = y1; y <= y2; y++) if (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) count++;
  return count;
}

function weekendMask(spec: string): Set<number> {
  if (spec.length === 7 && /^[01]{7}$/.test(spec)) {
    // Monday-first string: "0000011" = Sat+Sun
    const days = new Set<number>();
    for (let i = 0; i < 7; i++) if (spec[i] === "1") days.add((i + 1) % 7);
    return days;
  }
  const n = Number(spec);
  const table: Record<number, number[]> = {
    1: [0, 6], 2: [0, 1], 3: [1, 2], 4: [2, 3], 5: [3, 4], 6: [4, 5], 7: [5, 6],
    11: [0], 12: [1], 13: [2], 14: [3], 15: [4], 16: [5], 17: [6],
  };
  return new Set(table[n] ?? [0, 6]);
}

function rangeSerials(args: Parameters<FnImpl>[0], ctx: Parameters<FnImpl>[1], i: number): number[] {
  const v = ctx.evalNode(args[i]);
  const flat = Array.isArray(v) ? v.flat() : [v];
  return flat
    .map((c) => toSerial(c as Scalar))
    .filter((n): n is number => typeof n === "number")
    .map((n) => Math.floor(n));
}

export const MAX_DATE_SERIAL = MAX_SERIAL;
