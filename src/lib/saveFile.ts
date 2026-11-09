/**
 * Saving a file the student asked for — on a desktop browser *and* in the APK.
 *
 * The web build hands a Blob to an `<a download>` click, which every desktop
 * browser honours. An Android WebView does not: unless the host app installed a
 * `DownloadListener` (most wrappers do not), the click is dropped silently.
 * JavaScript cannot see that drop — there is no event for "the download never
 * started" — so pretending to detect it would just be a different lie.
 *
 * What this module does instead:
 *   1. prefers the Web Share API where it exists (`navigator.canShare`) — on
 *      Android that opens the real "Save to Files / Drive" sheet, which works
 *      inside a WebView;
 *   2. otherwise performs the classic Blob download;
 *   3. reports `ok: false` when the platform *does* let us know (share
 *      cancelled for a real error, no DOM, exception while downloading), and
 *      callers show `SAVE_FAILED_TEXT` instead of a silent nothing;
 *   4. keeps the object URL alive long enough for slow Android download
 *      managers, which used to be revoked out from under the download.
 *
 * For the APK itself the durable fix is host-side (a `DownloadListener` or the
 * Capacitor Filesystem plugin); `docs/audit/ANDROID-WEBVIEW-REPORT.md` says
 * exactly what to add.
 */
export interface SaveResult {
  ok: boolean;
  /** How it was saved, for the message the student reads. */
  via: "share" | "download" | "failed";
}

/** Short, student-facing line for a failed save. */
export const SAVE_FAILED_TEXT =
  "File save nahi hua — app/browser ne download block kiya. Laptop par try karo ya screenshot le lo.";

type ShareNavigator = Navigator & {
  canShare?: (data?: { files?: File[] }) => boolean;
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
};

export async function saveFile(
  name: string,
  data: BlobPart[],
  mime = "text/plain",
  shareText?: string,
): Promise<SaveResult> {
  const blob = data[0] instanceof Blob ? (data[0] as Blob) : new Blob(data, { type: mime || "application/octet-stream" });

  // 1. Share sheet: the path that actually works inside a WebView.
  const nav = typeof navigator === "undefined" ? undefined : (navigator as ShareNavigator);
  if (nav?.canShare && nav.share) {
    try {
      const file = new File([blob], name, { type: mime || "application/octet-stream" });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: name, text: shareText });
        return { ok: true, via: "share" };
      }
    } catch (error) {
      // The student dismissed the sheet: not a failure worth a red message.
      if ((error as Error)?.name === "AbortError") return { ok: false, via: "failed" };
      // Anything else: fall through to the download path.
    }
  }

  // 2. Classic download.
  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") {
    return { ok: false, via: "failed" };
  }
  let url: string;
  try {
    url = URL.createObjectURL(blob);
  } catch {
    return { ok: false, via: "failed" };
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  // Attached but invisible: a detached anchor is ignored by some WebViews.
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } catch {
    link.remove();
    URL.revokeObjectURL(url);
    return { ok: false, via: "failed" };
  }
  link.remove();
  // Slow Android download managers can take a while to start reading the blob;
  // revoking immediately made an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { ok: true, via: "download" };
}
