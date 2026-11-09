/**
 * @license MIT
 * The Settings board: every optional feature, one switch each.
 *
 * The request was blunt — "Excel me bhi Settings button ho, waha se kuch bhi
 * chalu karna ho to ON karna pade, na chahiye to OFF". So this is deliberately
 * a list of ON/OFF switches and nothing else: no hidden sub-menus, no feature
 * that is always on. The same component is mounted by the site's Settings page
 * and by the desktop shell's Settings app, so the two can never disagree —
 * they both read `src/lib/settings.ts`.
 */
import { Headphones, Keyboard, LayoutGrid, Mic2, RotateCcw, Volume2, Wand2, X } from "lucide-react";
import { Bilingual } from "../lib/lang";
import { resetSettings, useAllSettings, type AppSettings } from "../lib/settings";

interface SwitchRow {
  key: keyof AppSettings;
  label: string;
  hi: string;
  icon: React.ReactNode;
  /** Shown when the switch is on, to explain what it does. */
  hint: string;
}

const ROWS: SwitchRow[] = [
  {
    key: "virtualKeyboard",
    label: "Virtual keyboard",
    hi: "On-screen keyboard — mouse ke bina bhi type kar sakte ho",
    icon: <Keyboard size={15} />,
    hint: "Formula bar ke neeche pad dikhega. Grip se drag karke kahin bhi rakh sakte ho.",
  },
  {
    key: "music",
    label: "Focus Mode music",
    hi: "Padhai ke liye lofi music player",
    icon: <Headphones size={15} />,
    hint: "Player neeche-left dikhega. OFF karte hi music ruk jayega — kuch bhi background me nahi chalega.",
  },
  {
    key: "lyrics",
    label: "Lyrics with emojis",
    hi: "Player me timed lyrics (emoji ke saath)",
    icon: <Mic2 size={15} />,
    hint: "Har gaane ki apni Hinglish lines, uske beat par. Original lines hain, koi copyrighted gaana nahi.",
  },
  {
    key: "gridlines",
    label: "Sheet gridlines",
    hi: "Excel jaisi halki lines",
    icon: <LayoutGrid size={15} />,
    hint: "Off karne par sheet saaf white page jaisi dikhegi (Excel ke View ▸ Gridlines jaisa).",
  },
  {
    key: "sound",
    label: "App sounds",
    hi: "Badge jeetne par halki si awaaz",
    icon: <Volume2 size={15} />,
    hint: "Default OFF — class me phone baja na chale.",
  },
];

export function SettingsPanel({ onClose, compact = false }: { onClose?: () => void; compact?: boolean }) {
  const [settings, update] = useAllSettings();

  return (
    <div className={compact ? "space-y-2 pb-2" : "space-y-3 pb-6"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-extrabold text-(--color-ink)">Settings · ON / OFF</h3>
          <p className="text-[11px] text-(--color-muted)">
            Jo chahiye ON karo, jo nahi chahiye OFF. Sab kuch turant lagta hai.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="neu-btn p-1.5 text-(--color-muted) hover:text-(--color-ink)"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {ROWS.map((row) => {
          const on = Boolean(settings[row.key]);
          return (
            <li
              key={row.key}
              className="flex items-start gap-2 rounded-xl bg-(--color-surface) px-2 py-2 shadow-(--neu-raised-sm)"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[12px] font-bold leading-tight text-(--color-ink)">
                  <span className="text-(--color-accent-dark)" aria-hidden>
                    {row.icon}
                  </span>
                  {row.label}
                </p>
                <p dir="auto" className="text-[10.5px] leading-snug text-(--color-muted)">
                  {row.hi}
                </p>
                {on && <p className="mt-0.5 text-[10px] leading-snug text-(--color-accent-dark)/80">{row.hint}</p>}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${row.label}: ${on ? "on" : "off"}`}
                onClick={() => update(row.key, !on)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 grow-0 rounded-full transition-colors duration-300 ${
                  on ? "bg-(--color-accent)" : "bg-(--color-border-strong)"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
                    on ? "left-[1.375rem]" : "left-0.5"
                  }`}
                />
                <span className="sr-only">{on ? "ON" : "OFF"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={resetSettings}
          className="neu-btn flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-(--color-muted)"
        >
          <RotateCcw size={12} /> Reset to default
        </button>
        <p className="flex items-center gap-1 text-[10px] text-(--color-muted)">
          <Wand2 size={11} /> Music kabhi apne aap start nahi hota.
        </p>
      </div>

      {!compact && (
        <Bilingual
          en="Every optional feature lives here. Turn one off and it disappears from the app immediately; turn it back on and it returns — nothing is lost."
          hi="Har optional feature yahi se chalta hai. OFF karte hi app se turant gayab, ON karte hi wapas — kuch bhi delete nahi hota."
        />
      )}
    </div>
  );
}
