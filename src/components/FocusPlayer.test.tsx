// @vitest-environment jsdom
/**
 * Focus Mode rules that must never regress:
 *  - nothing plays until the student presses play (no autoplay, no preload),
 *  - the playlist is a real playlist: several distinct beds, not one file,
 *  - next / previous swap the source and keep playing if it already was,
 *  - the lyrics toggle shows the timed line and can be switched off,
 *  - the master switch actually stops the sound and hides the player,
 *  - the choice survives a page reload.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOCUS_TRACKS, FocusPlayer } from "./FocusPlayer";
import { FOCUS_LYRICS } from "../data/focusLyrics";
import { resetSettings } from "../lib/settings";

/** Minimal HTMLAudioElement stand-in — jsdom cannot decode audio. */
class FakeAudio {
  static instances: FakeAudio[] = [];
  src = "";
  loop = false;
  volume = 1;
  preload = "";
  paused = true;
  listeners: Record<string, (() => void)[]> = {};
  play = vi.fn(() => {
    this.paused = false;
    this.emit("playing");
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
    this.emit("pause");
  });
  removeAttribute = vi.fn();
  load = vi.fn();
  addEventListener(name: string, fn: () => void) {
    (this.listeners[name] ??= []).push(fn);
  }
  emit(name: string) {
    (this.listeners[name] ?? []).forEach((fn) => fn());
  }
  constructor() {
    FakeAudio.instances.push(this);
  }
}

beforeEach(() => {
  window.localStorage.clear();
  resetSettings();
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Focus Mode player", () => {
  it("does not create or start any audio before the student presses play", () => {
    render(<FocusPlayer />);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(screen.getByRole("button", { name: /play focus music/i })).toBeTruthy();
  });

  it("starts the first track only after a click", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /play focus music/i }));
    expect(FakeAudio.instances).toHaveLength(1);
    const audio = FakeAudio.instances[0];
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.src).toBe(FOCUS_TRACKS[0].src);
  });

  it("pauses instead of reloading when the play button is tapped again", () => {
    render(<FocusPlayer />);
    const button = screen.getByRole("button", { name: /play focus music/i });
    fireEvent.click(button);
    const audio = FakeAudio.instances[0];
    fireEvent.click(screen.getByRole("button", { name: /pause focus music/i }));
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it("ships a real playlist: several beds, all with their own file and lyrics", () => {
    expect(FOCUS_TRACKS.length).toBeGreaterThanOrEqual(4);
    const sources = new Set(FOCUS_TRACKS.map((track) => track.src));
    expect(sources.size).toBe(FOCUS_TRACKS.length);
    // The Hindi aesthetic comes first, and an English study bed exists too.
    expect(FOCUS_TRACKS[0].vibe).toMatch(/hindi/i);
    expect(FOCUS_TRACKS.some((track) => /english/i.test(track.vibe))).toBe(true);
    FOCUS_TRACKS.forEach((track) => {
      const lyrics = FOCUS_LYRICS[track.id];
      expect(lyrics, `lyrics for ${track.id}`).toBeTruthy();
      expect(lyrics.lines.length).toBeGreaterThanOrEqual(4);
      // Every line carries an emoji, and the timings only ever increase.
      lyrics.lines.forEach((line) => expect(line.en).toMatch(/\p{Extended_Pictographic}/u));
      const times = lyrics.lines.map((line) => line.at);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    });
  });

  it("switches song with the next button and keeps playing", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /play focus music/i }));
    fireEvent.click(screen.getByRole("button", { name: /next song/i }));
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe(FOCUS_TRACKS[1].src);
    expect(audio.play).toHaveBeenCalledTimes(2);
    // …and back again, including wrapping past the start.
    fireEvent.click(screen.getByRole("button", { name: /previous song/i }));
    expect(audio.src).toBe(FOCUS_TRACKS[0].src);
    fireEvent.click(screen.getByRole("button", { name: /previous song/i }));
    expect(audio.src).toBe(FOCUS_TRACKS[FOCUS_TRACKS.length - 1].src);
  });

  it("shows a timed lyric line with emoji, and the toggle switches it off", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /open focus mode music/i }));
    const first = FOCUS_LYRICS[FOCUS_TRACKS[0].id].lines[0];
    expect(screen.getByText(first.en)).toBeTruthy();
    expect(screen.getByText(first.hi)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /turn lyrics off/i }));
    expect(screen.queryByText(first.en)).toBeNull();
    expect(screen.getByText(/lyrics band hain/i)).toBeTruthy();
  });

  it("the master switch turns the music off and puts the player away", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /play focus music/i }));
    const audio = FakeAudio.instances[0];
    fireEvent.click(screen.getByRole("button", { name: /turn the music player off/i }));
    expect(audio.pause).toHaveBeenCalled();
    // …and the source is released, so nothing keeps buffering in the background.
    expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    // Nothing of the player is left on screen.
    expect(screen.queryByRole("button", { name: /play focus music/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /open focus mode music/i })).toBeNull();
  });

  it("remembers the chosen song for the next visit", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /open focus mode music/i }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(FOCUS_TRACKS[3].title, "i") }));
    cleanup();
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /play focus music/i }));
    expect(FakeAudio.instances.at(-1)?.src).toBe(FOCUS_TRACKS[3].src);
  });
});
