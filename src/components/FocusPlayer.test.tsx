// @vitest-environment jsdom
/**
 * Focus Mode rules that must never regress:
 *  - nothing plays until the student presses play (no autoplay, no preload),
 *  - the two vibes are real, distinct tracks,
 *  - "switch vibe" swaps the source and keeps playing if it already was,
 *  - the choice survives a page reload.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOCUS_TRACKS, FocusPlayer } from "./FocusPlayer";

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

  it("has two distinct vibes and switches between them", () => {
    expect(FOCUS_TRACKS).toHaveLength(2);
    expect(FOCUS_TRACKS[0].src).not.toBe(FOCUS_TRACKS[1].src);
    expect(FOCUS_TRACKS.map((track) => track.vibe)).toEqual(["Hindi Lofi", "English Study"]);

    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /open focus mode music/i }));
    fireEvent.click(screen.getByRole("button", { name: /switch vibe/i }));
    expect(screen.getAllByText(/English Study/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /English Study/i }).getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps playing the new vibe when switched while playing", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /play focus music/i }));
    fireEvent.click(screen.getByRole("button", { name: /switch vibe/i }));
    const audio = FakeAudio.instances[0];
    expect(audio.src).toBe(FOCUS_TRACKS[1].src);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it("remembers the chosen vibe for the next visit", () => {
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /open focus mode music/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /English Study/i })[0]);
    cleanup();
    render(<FocusPlayer />);
    fireEvent.click(screen.getByRole("button", { name: /play focus music/i }));
    expect(FakeAudio.instances.at(-1)?.src).toBe(FOCUS_TRACKS[1].src);
  });
});
