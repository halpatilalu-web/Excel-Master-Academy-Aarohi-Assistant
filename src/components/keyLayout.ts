/**
 * @license MIT
 * The layout of the on-screen Excel keyboard.
 *
 * Kept in its own module (no JSX) so the grid, the tests and anything else can
 * ask "what keys does the pad have?" without mounting React.
 *
 * Three rows of letters, exactly like a laptop, plus the number row and every
 * operator a formula needs. Shift swaps the symbols (`=` → `+`, `5` → `%`) the
 * same way a real keyboard does — and because `$`, `:`, `,`, `&` are what Excel
 * formulas are made of, those are always one tap away.
 */

/** One key cap. `key` is the character it types (already shifted). */
export interface TypedKey {
  /** What is printed on the cap. */
  label: string;
  /** Character handed to the grid. */
  key: string;
  /** Width in flex units — Space and Backspace are wider, like a real pad. */
  w?: number;
  /** The key that does something structural instead of typing a character. */
  action?: "backspace" | "clear" | "space" | "enter";
  /** Hindi + English teaching line. */
  en?: string;
  hi?: string;
}

/** A whole keyboard row: `[unshifted, shifted]` pairs, so Shift can swap them. */
export type KeyPair = { plain: string; shifted?: string; label?: string };

/**
 * The main block: number row, three letter rows, then the bottom row.
 * Shift only affects the rows where Excel students actually need a symbol.
 */
export const MAIN_ROWS: KeyPair[][] = [
  // Number row — Shift turns these into Excel's own symbols.
  [
    { plain: "1", shifted: "!" },
    { plain: "2", shifted: "@" },
    { plain: "3", shifted: "#" },
    { plain: "4", shifted: "$" },
    { plain: "5", shifted: "%" },
    { plain: "6", shifted: "^" },
    { plain: "7", shifted: "&" },
    { plain: "8", shifted: "*" },
    { plain: "9", shifted: "(" },
    { plain: "0", shifted: ")" },
    { plain: "-", shifted: "_" },
    { plain: "=", shifted: "+" },
  ],
  // Letters: QWERTY, the layout every student has already seen.
  "qwertyuiop".split("").map((letter) => ({ plain: letter, shifted: letter.toUpperCase(), label: letter.toUpperCase() })),
  "asdfghjkl".split("").map((letter) => ({ plain: letter, shifted: letter.toUpperCase(), label: letter.toUpperCase() })),
  [..."zxcvbnm".split("").map((letter) => ({ plain: letter, shifted: letter.toUpperCase(), label: letter.toUpperCase() }))],
];

/** Letters the pad must always have — the assertion the tests lock in. */
export const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
export const DIGITS = "0123456789".split("");

/** Formula operators that are not letters or digits. */
export const SYMBOLS = ["(", ")", ",", ":", "$", "*", "/", "+", "-", "=", "&", "^", "%", "<", ">", '"', "'", "!", "@", "#", "|", ";", "?", "_"];

/** Build the caps for one row, honouring Shift, plus the editing keys. */
export function rowKeys(row: KeyPair[], index: number, shifted: boolean): TypedKey[] {
  const caps: TypedKey[] = row.map((pair) => ({
    label: shifted && pair.shifted ? pair.shifted : (pair.label ?? pair.plain),
    key: shifted && pair.shifted ? pair.shifted : pair.plain,
  }));

  // Row 2 gets Backspace on the right; row 3 gets Enter; the bottom row gets
  // Shift and Space, so the pad reads like the laptop students already know.
  if (index === 1) {
    caps.push({
      label: "⌫",
      key: "Backspace",
      action: "backspace",
      w: 1.6,
      en: "Delete the last character",
      hi: "Aakhri character mitao",
    });
  }
  if (index === 2) {
    caps.push({
      label: "Enter",
      key: "Enter",
      action: "enter",
      w: 1.9,
      en: "Commit the value and move down",
      hi: "Value save karo aur neeche jao",
    });
  }
  return caps;
}

/** The bottom row: Shift, the symbols that break students, Space, Clear. */
export function bottomRow(shifted: boolean): TypedKey[] {
  return [
    {
      label: shifted ? "⇧ SHIFT" : "⇧ Shift",
      key: "Shift",
      w: 1.9,
      en: "Upper case letters and symbols (shift for A, $, % …)",
      hi: "Bade letters aur symbols ($, %, ( ) …)",
    },
    { label: "(", key: "(" },
    { label: ")", key: ")" },
    { label: ",", key: "," },
    { label: ":", key: ":", en: "Range operator — B2:D9", hi: "Range ke liye colon" },
    {
      label: "Space",
      key: " ",
      w: 3.4,
      en: "Space — text aur sheet names ke liye",
      hi: "Space",
    },
    {
      label: "Clear",
      key: "Escape",
      action: "clear",
      w: 1.7,
      en: "Cancel the edit (Esc)",
      hi: "Edit cancel karo",
    },
  ];
}
