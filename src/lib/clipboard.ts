/**
 * Copy text the way a student expects on every platform this app runs on.
 *
 * `navigator.clipboard` is only available in a *secure context*. The web build
 * is https, so it works there — but the Android APK serves the app from
 * `file://` or `http://localhost`, where the API is missing entirely. The old
 * code called `navigator.clipboard?.writeText(...)` and then showed a ✓ tick
 * regardless, so inside the APK every "copy formula" button silently did
 * nothing while telling the student it had worked. That is worse than a plain
 * failure, because the formula never reaches their clipboard.
 *
 * Order of attempts:
 *   1. `navigator.clipboard.writeText` (modern, secure contexts)
 *   2. a hidden `<textarea>` + `document.execCommand("copy")` (WebView/APK)
 *   3. give up and return `false`, so the UI can say "copy nahi hua".
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext !== false) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through: permission denied or an iframe without clipboard-write */
    }
  }

  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  // Off-screen but focusable — `display:none` breaks execCommand in WebViews.
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  area.style.opacity = "0";
  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  document.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, area.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
    // Put the student's selection back where it was.
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
  }
}
