/**
 * Saving a file the student asked for — on a desktop browser *and* in the APK.
 *
 * The web build hands a Blob to an `<a download>` click, which every desktop
 * browser honours. An Android WebView does not: unless the host app installed a
 * `DownloadListener` (most wrappers do not), the click is simply dropped. The
 * button looked like it worked, the student got nothing, and there was no way
 * to tell whether the export had failed or the file had gone somewhere.
 *
 * So this module:
 *   1. prefers the Web Share API (`navigator.canShare`) when the platform has
 *      it — on Android that opens the normal "Save to Files / Drive" sheet;
 *   2. otherwise uses the classic Blob download;
 *   3. watches for the click actually being cancelled (the WebView case) and
 *      reports `false`, so callers can *say* it did not work instead of lying.
 */
export interface SaveResult {
  ok: boolean;
  /** How it was saved, for the message the student reads. */
  via: "share" | "download" | "failed";
}

function toBlob(parts: BlobPart[], mime: string): Blob {
  return parts[0] instanceof Blob ? (parts[0] as Blob) : new Blob(parts, { type: mime || "application/octet-stream" });
}

/**
 * Save `data` as `name`.
 *
 * `signalText` is optional: when the platform has a share sheet and the file is
 * small enough to be worth sharing as text (CSV, JSON, TXT), sharing the text
 * itself works on more Android targets than sharing a Blob.
 */
export async function saveFile(name: string, data: BlobPart[], mime = "text/plain", signalText?: string): Promise<SaveResult> {
  const blob = toBlob(data, mime);

  // 1. Share sheet (Android APK, mobile browsers, and Safari on iOS).
  const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  });
  if (nav?.canShare && nav.share) {
    try {
      const file = new File([blob], name, { type: mime || "application/octet-stream" });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: name, text: signalText });
        return { ok: true, via: "share" };
      }
    } catch (error) {
      // A cancelled share sheet is not a failure the student needs told about.
      if ((error as Error)?.name !== "AbortError") {
        /* fall through to the download path */
      } else {
        return { ok: false, via: "failed" };
      }
    }
  }

  // 2. Classic download.
  if (typeof document === "undefined") return { ok: false, via: "failed" };
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  // Keep it out of the layout but still inside the document: a detached anchor
  // is ignored by some WebViews.
  link.style.display = "none";
  document.body.appendChild(link);
  let cancelled = false;
  const onClick = (event: MouseEvent) => {
    // A WebView without download support lets the default action be cancelled;
    // browsers that do support it never cancel, so this never false-alarms.
    if (event.defaultPrevented) cancelled = true;
  };
  link.addEventListener("click", onClick);
  try {
    link.click();
  } catch {
    cancelled = true;
  } finally {
    link.removeEventListener("click", onClick);
    link.remove();
    // Revoke on the next tick — revoking synchronously can cancel the download
    // in Firefox and in some Android builds.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return cancelled ? { ok: false, via: "failed" } : { ok: true, via: "download" };
}

/** Short, student-facing line for a failed save. */
export const SAVE_FAILED_TEXT =
  "File save nahi hua — browser/App ne download block kiya. Screenshot le lo ya laptop par try karo.";
