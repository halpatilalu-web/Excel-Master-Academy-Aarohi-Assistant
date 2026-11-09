/**
 * @license MIT
 * The live formula bubble that sits *beside* the cell being edited.
 *
 * Why it exists: the formula bar is at the top of the sheet, the cell a student
 * is typing in can be 40 rows down — so a long formula "disappears upwards" and
 * they scroll away from the cell, lose the caret and have to start again. This
 * bubble is anchored to the cell itself: it grows to the left of the cell (the
 * side with room, since the address is usually mid-sheet), shows the whole
 * formula on two lines instead of one clipped line, and shows the live result
 * underneath so `=SUM(` … `)` can be checked as it is typed.
 *
 * It never takes focus: `pointer-events-none`, so the caret stays in the cell.
 */
import { useMemo } from "react";
import type { Scalar } from "../../lib/excel/formula/core";
import { isErr } from "../../lib/excel/formula/core";

/** How the preview talks about a value. */
function describe(value: Scalar): { text: string; tone: "ok" | "error" | "pending" } {
  if (isErr(value)) return { text: value.err, tone: "error" };
  if (value === null || value === undefined) return { text: "…", tone: "pending" };
  if (typeof value === "boolean") return { text: value ? "TRUE" : "FALSE", tone: "ok" };
  if (typeof value === "number") {
    const text = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
    return { text, tone: "ok" };
  }
  return { text: String(value), tone: "ok" };
}

/** A formula only previews when it is complete enough to parse. */
function balanced(formula: string): boolean {
  let depth = 0;
  let inString = false;
  for (const char of formula) {
    if (char === '"') inString = !inString;
    else if (inString) continue;
    else if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if (depth < 0) return true; // let the engine report the real error
  }
  return depth === 0 && !inString;
}

/** Column index of an address, so the bubble can pick a side with room. */
function columnIndex(address: string): number {
  const letters = address.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  let value = 0;
  for (const char of letters) value = value * 26 + (char.charCodeAt(0) - 64);
  return value - 1;
}

export function FormulaBubble({
  draft,
  result,
  address = "A1",
}: {
  draft: string;
  result?: Scalar;
  /** The cell being edited — decides which side the bubble grows. */
  address?: string;
}) {
  const preview = useMemo(() => {
    if (!draft.startsWith("=") || draft.length < 2) return null;
    if (!balanced(draft)) return { text: "…", tone: "pending" as const };
    return describe(result ?? null);
  }, [draft, result]);

  if (!draft.startsWith("=")) return null;

  // Left of the cell, unless the cell is in the first columns.
  const side: "left" | "above" = columnIndex(address) >= 2 ? "left" : "above";

  const full = draft.length > 90;

  return (
    <span
      aria-hidden
      data-formula-bubble
      // "Cell ke bilkul left side, uske saath samne" — the bubble hangs off the
      // cell's left edge, vertically centred on the cell, so the formula is
      // read *beside* the cell it belongs to. Columns A–B have no room on the
      // left, so there it sits just above the cell instead of off-screen.
      // `w-max` matters: an absolutely positioned box with only `right` set is
      // shrink-to-fit and collapses to the width of the cell it hangs off, which
      // turned a formula into a one-word-per-line column.
      className={`pointer-events-none absolute z-30 block w-max max-w-[min(28rem,calc(100vw-1.5rem))] rounded-lg bg-(--color-ink) px-2 py-1 font-mono text-[10.5px] leading-snug text-white shadow-lg ring-1 ring-black/10 sm:text-[11px] ${
        side === "left" ? "right-[calc(100%+4px)] top-1/2 -translate-y-1/2" : "bottom-[calc(100%+4px)] left-0"
      }`}
    >
      <span className={`block whitespace-pre ${full ? "line-clamp-3" : ""}`}>{draft}</span>
      <span
        className={`mt-0.5 flex items-center gap-1 border-t border-white/20 pt-0.5 text-[10px] font-semibold ${
          preview?.tone === "error" ? "text-rose-300" : preview?.tone === "pending" ? "text-white/60" : "text-emerald-300"
        }`}
      >
        = {preview?.text ?? "…"}
      </span>
    </span>
  );
}
