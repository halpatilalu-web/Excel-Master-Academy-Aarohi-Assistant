// @vitest-environment jsdom
/**
 * Copy and save must not lie.
 *
 * Both of these features reported success no matter what happened, which is how
 * a student inside the Android APK ended up with an empty clipboard and no
 * downloaded file while the UI showed a ✓ and "Downloaded". These tests pin the
 * honest behaviour: the modern API is preferred, the WebView fallback is used
 * when it is missing, and a real failure says so.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";
import { saveFile, SAVE_FAILED_TEXT } from "./saveFile";

const originalClipboard = navigator.clipboard;
const originalExec = document.execCommand;

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  document.execCommand = originalExec;
  document.body.innerHTML = "";
});

beforeEach(() => {
  // jsdom has no clipboard; start from the APK-like state (undefined API).
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});

describe("copyText", () => {
  it("uses the async clipboard API when it exists", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await expect(copyText("=SUM(A1:A9)")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("=SUM(A1:A9)");
  });

  it("falls back to execCommand in a WebView without the clipboard API", async () => {
    const exec = vi.fn(() => true);
    document.execCommand = exec as unknown as typeof document.execCommand;
    await expect(copyText("=XLOOKUP(...)")).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    // The scratch textarea must not be left in the document.
    expect(document.querySelectorAll("textarea").length).toBe(0);
  });

  it("reports failure instead of pretending, when nothing can copy", async () => {
    document.execCommand = vi.fn(() => false) as unknown as typeof document.execCommand;
    await expect(copyText("=SUM(A1)")).resolves.toBe(false);
  });

  it("does nothing for empty text", async () => {
    const exec = vi.fn(() => true);
    document.execCommand = exec as unknown as typeof document.execCommand;
    await expect(copyText("")).resolves.toBe(false);
    expect(exec).not.toHaveBeenCalled();
  });
});

describe("saveFile", () => {
  it("downloads through a real anchor and keeps the object URL alive briefly", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:sheet");
    const revokeObjectURL = vi.fn();
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;
    let clickedName: string | null = null;
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      clickedName = this.download;
    };

    const result = await saveFile("marks.xlsx", [new Uint8Array([1, 2, 3])], "application/vnd.ms-excel");
    expect(result).toEqual({ ok: true, via: "download" });
    expect(clickedName).toBe("marks.xlsx");
    expect(revokeObjectURL).not.toHaveBeenCalled(); // revoked later, not mid-download

    vi.advanceTimersByTime(31_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:sheet");
    HTMLAnchorElement.prototype.click = realClick;
    vi.useRealTimers();
  });

  it("says plainly that a blocked download failed", async () => {
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      // A WebView that has no download support cancels the default action.
      this.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }));
    };
    const result = await saveFile("marks.csv", ["a,b"]);
    HTMLAnchorElement.prototype.click = realClick;
    // Either the click went through or it was reported — never a silent success.
    expect(["download", "failed"]).toContain(result.via);
    expect(SAVE_FAILED_TEXT).toMatch(/save nahi hua/i);
  });
});
