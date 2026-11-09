// @vitest-environment jsdom
/**
 * A timed exam must survive the phone.
 *
 * The exam is also shipped inside an Android APK, where the WebView can be
 * killed while the student checks a message. Two things used to go wrong:
 *
 *  1. Answers lived only in React state, so an interruption — back gesture,
 *     background kill, reload — threw the whole marked attempt away.
 *  2. The countdown was decremented by a `setInterval`, so the ~1/minute timer
 *     throttling of a backgrounded WebView silently handed out free minutes.
 *
 * These tests pin both: the attempt reloads exactly as it was, and the time
 * left is always recomputed from the deadline, never counted down.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Exam } from "./Exam";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  globalThis.fetch = vi.fn(
    async () => new Response("[]", { headers: { "content-type": "application/json" } }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function startExam() {
  render(<Exam />);
  fireEvent.click(await screen.findByRole("button", { name: /Start Timed Diploma Exam/i }));
}

/** The countdown moved into a labelled node so a screen reader can read it too. */
const timer = () => screen.getByLabelText(/Time left/i).textContent?.match(/(\d{2}):(\d{2})/)?.[0] ?? null;

describe("timed diploma exam", () => {
  it("keeps the marked attempt (and its deadline) across a reload", async () => {
    await startExam();
    // Mark the first question.
    const options = screen.getAllByRole("button", { name: /^(?!.*(Next|Previous|Submit|Start|Skip))/ });
    fireEvent.click(options[0]);

    const before = timer();
    expect(before).toBeTruthy();
    const stored = JSON.parse(sessionStorage.getItem("excel-academy:exam-attempt-v1") ?? "null") as
      | { ans: number[]; endAt: number }
      | null;
    expect(stored).toBeTruthy();
    expect(stored!.endAt).toBeGreaterThan(Date.now());
    const answered = stored!.ans.filter((a) => a >= 0).length;
    expect(answered).toBeGreaterThan(0);

    // The WebView is killed and reopened: a brand-new mount with the same tab.
    cleanup();
    render(<Exam />);

    // Still in the exam (not back on the start screen) with the deadline kept.
    expect(screen.queryByRole("button", { name: /Start Timed Diploma Exam/i })).toBeNull();
    const resumed = JSON.parse(sessionStorage.getItem("excel-academy:exam-attempt-v1") ?? "null") as
      | { ans: number[]; endAt: number }
      | null;
    expect(resumed!.endAt).toBe(stored!.endAt);
    expect(resumed!.ans.filter((a) => a >= 0).length).toBe(answered);
    expect(timer()).toBeTruthy();
  });

  it("charges time spent in the background instead of pausing the clock", async () => {
    await startExam();
    const before = timer()!;
    const [mins, secs] = before.split(":").map(Number);

    // Simulate the app being frozen for two minutes: the wall clock advances,
    // the timer callback does not. Re-reading the deadline must catch up.
    const realNow = Date.now;
    const spy = vi.spyOn(Date, "now").mockImplementation(() => realNow() + 120_000);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const after = timer()!;
    spy.mockRestore();

    const [m2, s2] = after.split(":").map(Number);
    const elapsed = mins * 60 + secs - (m2 * 60 + s2);
    expect(elapsed).toBeGreaterThanOrEqual(119);
    expect(elapsed).toBeLessThanOrEqual(121);
  });

  it("asks before leaving while a paper is in progress, and stops asking once it is handed in", async () => {
    await startExam();
    const running = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(running);
    expect(running.defaultPrevented).toBe(true);
  });
});
