import { useEffect, useState } from "react";

const get = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
function parseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useDark() {
  const [dark, setDark] = useState(() => get("ema_dark", matchMedia("(prefers-color-scheme: dark)").matches ? "1" : "0") === "1");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); set("ema_dark", dark ? "1" : "0"); }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

export const soundOn = () => get("ema_sound", "0") === "1";
export const setSound = (on: boolean) => set("ema_sound", on ? "1" : "0");

export function beep(freqs = [660, 880, 1100]) {
  if (!soundOn()) return;
  try {
    const ctx = new AudioContext();
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.1);
    });
  } catch { /* ignore */ }
}

const day = (d: Date) => d.toISOString().slice(0, 10);
export function touchStreak(): number {
  const today = day(new Date()), y = day(new Date(Date.now() - 86400000));
  const s = parseJSON<{ last?: string; count?: number }>(get("ema_streak", "{}"), {});
  if (s.last === today) return s.count ?? 1;
  const count = s.last === y ? (s.count ?? 0) + 1 : 1;
  set("ema_streak", JSON.stringify({ last: today, count }));
  return count;
}
export const seenBadges = (): string[] => {
  const parsed = parseJSON<unknown>(get("ema_badges", "[]"), []);
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
};
export const saveBadges = (b: string[]) => set("ema_badges", JSON.stringify(b));

export function sfx(kind: "click" | "win" | "end") {
  if (kind === "click") beep([520]);
  else if (kind === "win") beep([523, 659, 784, 1047]);
  else beep([880, 660, 880, 1320]);
}
