/**
 * @license MIT
 * On-screen Excel keyboard.
 *
 * Purpose: a student on a phone or a laptop without a numpad should still be
 * able to *see and press* every key real Excel uses — F1…F12, Ctrl/Alt/Shift
 * chords, arrows, Enter/Tab and the dedicated keys (Insert, Delete, Home, End,
 * Page Up/Down, Esc). Buttons fire the same handler the physical key does, so
 * nothing here is a mock-up: pressing F4 really toggles the reference style,
 * Ctrl+E really runs Flash Fill.
 *
 * The keyboard is also the teaching surface: hovering a key shows what Excel
 * does with it in Hindi + English, and the "shortcut tray" below lists the
 * combos for the sheet the student is working on.
 */
import { useMemo, useState } from "react";
import { Keyboard, X } from "lucide-react";

export interface KeyDef {
  /** Text printed on the key cap. */
  label: string;
  /** Stable id the grid uses to route the key. */
  code: string;
  /** Physical `KeyboardEvent.key` value this key stands for. */
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  w?: number;
  /** What Excel does with it — shown on hover/focus. */
  en?: string;
  hi?: string;
  /** Tone for teaching keys (formula keys, flash fill …). */
  accent?: boolean;
}

const FUNC_KEYS: { label: string; en: string; hi: string }[] = [
  { label: "F1", en: "Help / tell me what to do", hi: "Help — batata hai kaunsa button kya karta hai" },
  { label: "F2", en: "Edit the active cell", hi: "Cell ko edit mode mein kholo" },
  { label: "F3", en: "Paste a defined name", hi: "Named range chuno" },
  { label: "F4", en: "Repeat last action · toggle $A$1 references", hi: "Pichhla kaam doh-rao / $A$1 absolute banao" },
  { label: "F5", en: "Go To (type any cell or range)", hi: "Go To — kisi bhi cell/range par jao" },
  { label: "F7", en: "Spell check", hi: "Spelling check karo" },
  { label: "F8", en: "Extend selection mode", hi: "Selection ko arrow se badhao" },
  { label: "F9", en: "Recalculate all sheets", hi: "Saari sheet dobara calculate karo" },
  { label: "F11", en: "Chart from the selected data", hi: "Selection se chart banao" },
  { label: "F12", en: "Save as / download .xlsx", hi: "Save as — .xlsx download" },
];

const CTRL_KEYS: { code: string; label: string; key: string; en: string; hi: string; accent?: boolean }[] = [
  { code: "copy", label: "C", key: "c", en: "Copy", hi: "Copy karo" },
  { code: "paste", label: "V", key: "v", en: "Paste", hi: "Paste karo" },
  { code: "x", label: "X", key: "x", en: "Cut", hi: "Cut karo" },
  { code: "undo", label: "Z", key: "z", en: "Undo", hi: "Undo" },
  { code: "redo", label: "Y", key: "y", en: "Redo", hi: "Redo" },
  { code: "bold", label: "B", key: "b", en: "Bold", hi: "Bold" },
  { code: "flash", label: "E", key: "e", en: "Flash Fill", hi: "Flash Fill — pattern se baki cells bhar do", accent: true },
  { code: "selectall", label: "A", key: "a", en: "Select all", hi: "Sab select karo" },
  { code: "find", label: "F", key: "f", en: "Find", hi: "Dhoondo" },
  { code: "replace", label: "H", key: "h", en: "Replace", hi: "Replace karo" },
  { code: "goto", label: "G", key: "g", en: "Go To", hi: "Go To" },
  { code: "format", label: "1", key: "1", en: "Format cells dialog", hi: "Number format kholo" },
  { code: "today", label: ";", key: ";", en: "Today's date", hi: "Aaj ki date" },
  { code: "now", label: ":", key: ":", en: "Date + time now", hi: "Aaj ki date + time" },
  { code: "dollar", label: "4", key: "4", en: "Currency format", hi: "₹ format" },
  { code: "percent", label: "5", key: "5", en: "Percent format", hi: "% format" },
];

const ALT_KEYS: { code: string; label: string; key: string; en: string; hi: string }[] = [
  { code: "autosum", label: "=", key: "=", en: "AutoSum (Alt+=)", hi: "AutoSum — upar ke numbers ka SUM" },
  { code: "enter", label: "Enter", key: "Enter", en: "Line break inside a cell", hi: "Cell ke andar nayi line" },
  { code: "datalist", label: "↓", key: "ArrowDown", en: "Drop-down list in a column", hi: "Column ki list dikhao" },
];

const SPECIAL: KeyDef[] = [
  { label: "Esc", code: "escape", key: "Escape", w: 1.2, en: "Cancel the edit", hi: "Edit cancel karo" },
  { label: "Tab", code: "tab", key: "Tab", w: 1.3, en: "Next cell (Shift+Tab = back)", hi: "Agla cell" },
  { label: "Enter", code: "enter", key: "Enter", w: 1.5, en: "Commit and move down", hi: "Value daalo aur neeche jao" },
  { label: "Space", code: "space", key: " ", w: 3.2 },
  { label: "←", code: "left", key: "ArrowLeft", en: "Move left", hi: "Baayein" },
  { label: "↑", code: "up", key: "ArrowUp", en: "Move up", hi: "Upar" },
  { label: "↓", code: "down", key: "ArrowDown", en: "Move down", hi: "Neeche" },
  { label: "→", code: "right", key: "ArrowRight", en: "Move right", hi: "Daayein" },
  { label: "Home", code: "home", key: "Home", en: "Go to column A", hi: "Column A par jao" },
  { label: "End", code: "end", key: "End", en: "Jump to the last used cell", hi: "Aakhri used cell par jao" },
  { label: "PgUp", code: "pageup", key: "PageUp", en: "Scroll a screen up", hi: "Ek screen upar" },
  { label: "PgDn", code: "pagedown", key: "PageDown", en: "Scroll a screen down", hi: "Ek screen neeche" },
  { label: "Del", code: "delete", key: "Delete", w: 1.2, en: "Clear the cell (Ctrl+Del clears all)", hi: "Cell khali karo" },
  { label: "Ins", code: "insert", key: "Insert", en: "Toggle overtype mode", hi: "Insert/overtype" },
  { label: "F2", code: "edit", key: "F2", en: "Edit the cell", hi: "Cell edit karo", accent: true },
  { label: "F4", code: "abs", key: "F4", en: "Add/remove $ on the reference", hi: "$ lagao/hatao", accent: true },
  { label: "F9", code: "calc", key: "F9", en: "Recalculate", hi: "Dobara calculate", accent: true },
  { label: "Ctrl+E", code: "flash", key: "e", ctrl: true, w: 1.7, en: "Flash Fill", hi: "Pattern se bharo", accent: true },
  { label: "Alt+=", code: "autosum", key: "=", alt: true, w: 1.7, en: "AutoSum", hi: "AutoSum", accent: true },
];

export function VirtualKeyboard({
  onKey,
  onClose,
  /** Show the teaching labels under each row. */
  dense = false,
}: {
  onKey: (def: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; code: string }) => void;
  onClose: () => void;
  dense?: boolean;
}) {
  const [tab, setTab] = useState<"keys" | "ctrl" | "fn">("keys");
  const [hover, setHover] = useState<{ en: string; hi: string } | null>(null);

  const keyClass = (accent?: boolean) =>
    `relative select-none rounded-lg border text-[11px] sm:text-xs font-semibold transition active:translate-y-px ` +
    (accent
      ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent-dark) "
      : "border-(--color-border-strong) bg-(--color-surface) text-(--color-ink) ") +
    "hover:bg-(--color-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) shadow-[0_1px_0_var(--color-border-strong)]";

  const press = (def: KeyDef) => {
    onKey({ key: def.key, ctrl: def.ctrl, shift: def.shift, alt: def.alt, code: def.code });
    if (def.en || def.hi) setHover({ en: def.en ?? "", hi: def.hi ?? "" });
  };

  const fnPad = useMemo(
    () =>
      FUNC_KEYS.map((fk) => ({
        ...fk,
        key: fk.label,
        code: fk.label.toLowerCase(),
        accent: ["F2", "F4", "F9"].includes(fk.label),
      })),
    [],
  );

  return (
    <div className="rounded-2xl border border-(--color-border-strong) bg-(--color-surface-2) p-2.5 sm:p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-(--color-ink)">
          <Keyboard size={14} /> Virtual Excel keyboard
          <span className="hidden sm:inline text-[11px] font-medium text-(--color-muted)">
            — press a key, the grid does the same thing as your laptop
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              ["keys", "Main keys"],
              ["fn", "F1–F12"],
              ["ctrl", "Ctrl / Alt"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                tab === id
                  ? "bg-(--color-accent) text-white border-transparent"
                  : "border-(--color-border) text-(--color-muted) hover:text-(--color-ink)"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide the virtual keyboard"
            className="p-1 rounded-lg text-(--color-muted) hover:bg-(--color-accent-soft)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {tab === "keys" && (
        <div className="space-y-1.5">
          {/* Number row + the keys students forget */}
          <div className="flex gap-1">
            {"1234567890".split("").map((digit) => (
              <button
                key={digit}
                type="button"
                onMouseEnter={() => setHover({ en: `Type ${digit}`, hi: `${digit} likho` })}
                onClick={() => onKey({ key: digit, code: `digit-${digit}` })}
                className={`${keyClass()} flex-1 py-2`}
              >
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => onKey({ key: "-", code: "minus" })} className={`${keyClass()} px-2.5 py-2`}>
              −
            </button>
            <button type="button" onClick={() => onKey({ key: "=", code: "equals" })} className={`${keyClass()} px-2.5 py-2`}>
              =
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {SPECIAL.map((def) => (
              <button
                key={def.code}
                type="button"
                title={def.en}
                onMouseEnter={() => setHover({ en: def.en ?? "", hi: def.hi ?? "" })}
                onClick={() => press(def)}
                style={{ flexGrow: def.w ?? 1, flexBasis: `${(def.w ?? 1) * 3.2}rem` }}
                className={`${keyClass(def.accent)} px-2 py-2`}
              >
                {def.label}
              </button>
            ))}
          </div>

          {/* The operators a formula needs, always visible */}
          <div className="flex gap-1">
            {["(", ")", ",", ":", "$", "*", "/", "+", "&", "^", "%", "<", ">"].map((op) => (
              <button
                key={op}
                type="button"
                onMouseEnter={() =>
                  setHover({
                    en: `Insert "${op}" into the formula`,
                    hi: `Formula mein "${op}" daalo`,
                  })
                }
                onClick={() => onKey({ key: op, code: `op-${op}` })}
                className={`${keyClass()} flex-1 py-2 font-mono`}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "fn" && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {fnPad.map((fk) => (
              <button
                key={fk.label}
                type="button"
                onMouseEnter={() => setHover({ en: fk.en, hi: fk.hi })}
                onClick={() => onKey({ key: fk.key, code: fk.code })}
                className={`${keyClass(fk.accent)} px-2 py-2.5 flex flex-col items-start gap-0.5 text-left`}
              >
                <span className="font-mono font-extrabold">{fk.label}</span>
                <span className="text-[10px] font-medium leading-tight text-(--color-muted) line-clamp-2">{fk.en}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-(--color-muted)">
            F1 se F12 tak — sabhi function keys jo desktop Excel mein hain. F2 edit, F4 <code>$</code> toggle, F9 recalc,
            F11 chart. <b>Ctrl+Shift+F1</b> real Excel mein ribbon hide karta hai; yahan wahi shortcut keyboard panel
            chhupata/dikhata hai.
          </p>
        </div>
      )}

      {tab === "ctrl" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {CTRL_KEYS.map((ck) => (
              <button
                key={ck.code}
                type="button"
                title={`Ctrl+${ck.label} — ${ck.en}`}
                onMouseEnter={() => setHover({ en: `Ctrl+${ck.label} — ${ck.en}`, hi: ck.hi })}
                onClick={() => onKey({ key: ck.key, ctrl: true, code: ck.code })}
                className={`${keyClass(ck.accent)} px-2.5 py-2 inline-flex items-center gap-1`}
              >
                <span className="text-(--color-muted) font-mono text-[10px]">Ctrl</span>+{ck.label}
              </button>
            ))}
          </div>
          <div className="h-px bg-(--color-border)" />
          <div className="flex flex-wrap gap-1.5">
            {ALT_KEYS.map((ak) => (
              <button
                key={ak.code}
                type="button"
                onMouseEnter={() => setHover({ en: `Alt+${ak.label} — ${ak.en}`, hi: ak.hi })}
                onClick={() => onKey({ key: ak.key, alt: true, code: ak.code })}
                className={`${keyClass(ak.code === "autosum")} px-2.5 py-2 inline-flex items-center gap-1`}
              >
                <span className="text-(--color-muted) font-mono text-[10px]">Alt</span>+{ak.label}
              </button>
            ))}
            {["Shift+F2", "Shift+F3", "Shift+F4", "Shift+F11", "Ctrl+Shift+%", "Ctrl+Shift+#", "Ctrl+Shift+F1"].map((combo) => (
              <span
                key={combo}
                className="px-2.5 py-2 rounded-lg border border-dashed border-(--color-border) text-[11px] font-mono text-(--color-muted)"
                title={`${combo} — shown for reference, physical keyboard only`}
              >
                {combo}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-(--color-muted)">
            Ctrl+E = <b>Flash Fill</b> (sabse zyada poochha jaata shortcut), Ctrl+1 = format cells, Ctrl+; = aaj ki
            date. Dashed keys sirf reference ke liye hain — wo browser ya OS reserve karta hai.
          </p>
        </div>
      )}

      {!dense && (
        <div
          className="min-h-[2.25rem] rounded-lg bg-(--color-canvas) border border-(--color-border) px-2.5 py-1.5 text-[11px]"
          role="status"
          aria-live="polite"
        >
          {hover ? (
            <>
              <b className="text-(--color-ink)">{hover.en}</b>
              <span className="text-(--color-muted)"> · {hover.hi}</span>
            </>
          ) : (
            <span className="text-(--color-muted)">Key par hover karo — Excel mein uska kaam yahan dikhega.</span>
          )}
        </div>
      )}
    </div>
  );
}
