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
  // jsdom has no download machinery and logs "Not implemented: navigation" for
  // any real anchor click, so the anchor is stubbed for the whole suite. What is
  // under test is the decision logic, not jsdom's navigator.
  let clicked: HTMLAnchorElement[] = [];
  const realClick = HTMLAnchorElement.prototype.click;

  beforeEach(() => {
    clicked = [];
  });

  afterEach(() => {
    HTMLAnchorElement.prototype.click = realClick;
  });

  const stubClick = (blocked: boolean) => {
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      clicked.push(this);
      if (blocked) {
        const event = new MouseEvent("click", { cancelable: true, bubbles: true });
        this.dispatchEvent(event);
        event.preventDefault();
      }
    };
  };

  it("downloads through a real anchor and keeps the object URL alive briefly", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:sheet");
    const revokeObjectURL = vi.fn();
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;
    stubClick(false);

    const result = await saveFile("marks.xlsx", [new Uint8Array([1, 2, 3])], "application/vnd.ms-excel");
    expect(result).toEqual({ ok: true, via: "download" });
    expect(clicked.map((a) => a.download)).toEqual(["marks.xlsx"]);
    expect(revokeObjectURL).not.toHaveBeenCalled(); // revoked later, not mid-download
    expect(document.querySelectorAll("a[download]").length).toBe(0); // anchor cleaned up

    vi.advanceTimersByTime(61_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:sheet");
    vi.useRealTimers();
  });

  it("reports an exception instead of claiming the file was saved", async () => {
    stubClick(false);
    const realDispatch = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      throw new Error("downloads blocked");
    };
    const result = await saveFile("marks.csv", ["a,b"]);
    HTMLAnchorElement.prototype.click = realDispatch;
    expect(result).toEqual({ ok: false, via: "failed" });
    expect(SAVE_FAILED_TEXT).toMatch(/save nahi hua/i);
  });

  it("prefers the share sheet when the platform has one (the APK path)", async () => {
    const share = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    stubClick(false);
    const result = await saveFile("marks.csv", ["a,b"], "text/csv");
    expect(result).toEqual({ ok: true, via: "share" });
    expect(share).toHaveBeenCalledTimes(1);
    // A real file reached the share sheet — not just a name.
    const shared = (share.mock.calls[0] as unknown[])[0] as { files: File[] };
    expect(shared.files[0].name).toBe("marks.csv");
    expect(clicked.length).toBe(0); // no download fallback was needed
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (navigator as unknown as Record<string, unknown>).canShare;
  });
});
