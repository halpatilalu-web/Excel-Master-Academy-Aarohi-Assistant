import { useEffect, useState } from "react";
import { getSettings, setSetting } from "./settings";

const get = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const del = (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };
function parseJSON<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Keys that belong to *one student*, not to the browser. A classroom machine is
 * shared: without this, the next student opened Aarohi and read the previous
 * student's chat, and inherited their streak and badges.
 */
const USER_SCOPED_KEYS = ["ema_streak", "ema_badges", "aarohi_excel_chat_v4", "aarohi_avatar_scene_v1"];
const LAST_USER_KEY = "ema_last_user";

export function resetUserLocalState() {
  USER_SCOPED_KEYS.forEach(del);
}

/**
 * Call whenever the signed-in identity is known (or becomes null). Clears the
 * per-student local state when the account changes and on sign-out.
 */
export function adoptUser(userId: string | null | undefined) {
  const last = get(LAST_USER_KEY, "");
  const next = userId ?? "";
  if (last === next) return;
  if (last) resetUserLocalState();
  if (next) set(LAST_USER_KEY, next);
  else del(LAST_USER_KEY);
}

export function useDark() {
  const [dark, setDark] = useState(() => get("ema_dark", "0") === "1");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); set("ema_dark", dark ? "1" : "0"); }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

/**
 * Sound lives in the shared settings store so the Settings app can switch it
 * on and off from one board (the old single key had no UI at all).
 */
/**
 * Sound reads and writes the shared settings store directly.
 *
 * It used to poke at the raw localStorage key, which meant the Settings panel's
 * switch never re-rendered when the streak widget toggled sound (and vice
 * versa): two switches, one stored value, both visibly disagreeing.
 */
export const soundOn = () => getSettings().sound;
export const setSound = (on: boolean) => setSetting("sound", on);

/**
 * One shared AudioContext. Creating a context per beep leaked them until the
 * browser's limit (~6) was hit, after which every badge sound silently failed.
 */
let audio: AudioContext | null = null;
function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  if (audio.state === "suspended") void audio.resume().catch(() => undefined);
  return audio;
}

export function beep(freqs = [660, 880, 1100]) {
  if (!soundOn()) return;
  try {
    const ctx = audioContext();
    if (!ctx) return;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.1);
    });
  } catch { /* audio is a nicety, never a feature */ }
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
