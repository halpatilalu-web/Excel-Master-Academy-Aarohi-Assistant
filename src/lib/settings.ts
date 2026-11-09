/**
 * @license MIT
 * One settings store the whole app reads.
 *
 * Why a store and not one `localStorage` key per feature: the Settings app has
 * to *control* the things that live inside other components — the on-screen
 * keyboard, the music player, the lyric line, the sound effects. Before this,
 * each feature read localStorage once at mount and there was no way to switch
 * anything on or off from one place (and no way to switch the music off at
 * all once it was playing).
 *
 * Same pattern as `createStore`, but synchronous and local-only: a settings
 * toggle must apply instantly, with no request and no flicker.
 */
import { useCallback, useEffect, useState } from "react";

export interface AppSettings {
  /** The on-screen Excel keyboard: shown at all, and floating instead of docked. */
  virtualKeyboard: boolean;
  keyboardFloating: boolean;
  /** Focus Mode music: master on/off, plus its volume (0–1) and loop. */
  music: boolean;
  musicVolume: number;
  musicLoop: boolean;
  /** Show the lyric line under the player. */
  lyrics: boolean;
  /** Little UI sounds (badges, break finished). */
  sound: boolean;
  /** Sheet gridlines, on by default like Excel. */
  gridlines: boolean;
}

const KEY = "excel-academy:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  virtualKeyboard: true,
  keyboardFloating: false,
  music: true,
  musicVolume: 0.55,
  musicLoop: true,
  lyrics: true,
  sound: false,
  gridlines: true,
};

function read(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // A partial/old object merges over the defaults, so a new key never breaks
    // a student who already saved settings.
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current: AppSettings = read();
const listeners = new Set<(next: AppSettings) => void>();

function emit() {
  listeners.forEach((listener) => listener(current));
}

export function getSettings(): AppSettings {
  return current;
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  if (current[key] === value) return;
  current = { ...current, [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: the setting still applies for this session */
  }
  emit();
}

export function resetSettings(): void {
  current = { ...DEFAULT_SETTINGS };
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Read one setting in a component; changing it anywhere re-renders everyone. */
export function useSetting<K extends keyof AppSettings>(key: K): [AppSettings[K], (value: AppSettings[K]) => void] {
  const [value, setValue] = useState<AppSettings[K]>(() => current[key]);

  useEffect(() => {
    const listener = (next: AppSettings) => setValue(next[key]);
    listeners.add(listener);
    // Another tab may have changed it.
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) {
        current = read();
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const update = useCallback((next: AppSettings[K]) => setSetting(key, next), [key]);
  return [value, update];
}

/** All settings at once, for the Settings app's switch board. */
export function useAllSettings(): [AppSettings, <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void] {
  const [value, setValue] = useState<AppSettings>(current);
  useEffect(() => {
    const listener = (next: AppSettings) => setValue(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return [value, setSetting];
}
