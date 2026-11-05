import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LangMode = "both" | "hi" | "en";

interface LangContextValue {
  lang: LangMode;
  setLang: (mode: LangMode) => void;
  t: (hi: string, en: string) => string;
}

const STORAGE_KEY = "ema_diploma_lang_v1";

function readInitialLang(): LangMode {
  if (typeof window === "undefined") return "both";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "both" || saved === "hi" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return "both";
}

const LangContext = createContext<LangContextValue>({
  lang: "both",
  setLang: () => undefined,
  t: (hi, en) => `${en} · ${hi}`,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangMode>(readInitialLang);

  const setLang = (mode: LangMode) => {
    setLangState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const t = (hi: string, en: string) => {
    if (lang === "hi") return hi;
    if (lang === "en") return en;
    return hi === en ? en : `${en} / ${hi}`;
  };

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/**
 * Renders Hindi/Hinglish and English explanations cleanly according to the user's selected mode.
 * In "both" mode (default), both languages are shown with clear subtle badges!
 */
export function Bilingual({
  hi,
  en,
  className = "",
  compact = false,
}: {
  hi: ReactNode;
  en: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const { lang } = useLang();
  if (lang === "hi") return <div className={className}>{hi}</div>;
  if (lang === "en") return <div className={className}>{en}</div>;

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="text-(--color-ink)">{en}</div>
        <div className="text-(--color-muted) text-[0.92em]">{hi}</div>
      </div>
    );
  }

  return (
    <div className={`grid sm:grid-cols-2 gap-2.5 ${className}`}>
      <div className="rounded-xl bg-(--color-canvas) border border-(--color-border) px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">
          🇬🇧 English Explanation
        </span>
        <div className="text-sm leading-relaxed">{en}</div>
      </div>
      <div className="rounded-xl bg-(--color-accent-soft)/60 border border-(--color-border) px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
          🇮🇳 Hindi / Hinglish Samjhao
        </span>
        <div className="text-sm leading-relaxed">{hi}</div>
      </div>
    </div>
  );
}

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const options: { key: LangMode; label: string; short: string }[] = [
    { key: "both", label: "🇮🇳+🇬🇧 Hindi + English", short: "HI+EN" },
    { key: "hi", label: "🇮🇳 Hindi", short: "HI" },
    { key: "en", label: "🇬🇧 English", short: "EN" },
  ];

  return (
    <div
      role="group"
      aria-label="Explanation language"
      className="inline-flex items-center rounded-xl border border-(--color-border) bg-(--color-canvas) p-0.5 text-xs font-semibold"
    >
      {options.map((opt) => {
        const active = lang === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setLang(opt.key)}
            aria-pressed={active}
            className={`rounded-lg px-2.5 py-1 transition whitespace-nowrap ${
              active
                ? "bg-(--color-accent) text-white shadow-xs"
                : "text-(--color-muted) hover:text-(--color-ink)"
            }`}
          >
            {compact ? opt.short : opt.label}
          </button>
        );
      })}
    </div>
  );
}
