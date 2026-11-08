import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { CHAPTERS } from "../data/chapters";
import { FORMULAS } from "../data/formulas";
import { SHORTCUTS } from "../data/shortcuts";

export type Hit = {
  kind: "chapter" | "formula" | "shortcut";
  title: string;
  sub: string;
  chapter?: number;
  query?: string;
};

export function SearchBox({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (h: Hit) => void }) {
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current?.focus(), 50); } }, [open]);
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", f); return () => removeEventListener("keydown", f); }, [onClose]);
  const hits = useMemo<Hit[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return [
      ...CHAPTERS.filter((c) => `${c.title} ${c.intro}`.toLowerCase().includes(s)).map((c) => ({ kind: "chapter" as const, title: `Ch ${c.n}: ${c.title}`, sub: c.level, chapter: c.n })),
      ...FORMULAS.filter((f) => `${f.name} ${f.hindi}`.toLowerCase().includes(s)).map((f) => ({ kind: "formula" as const, title: f.name, sub: f.hindi, query: f.name })),
      ...SHORTCUTS.filter((x) => `${x.win} ${x.desc}`.toLowerCase().includes(s)).map((x) => ({ kind: "shortcut" as const, title: x.win, sub: x.desc, query: x.win })),
    ].slice(0, 30);
  }, [q]);
  const icon = { chapter: "📘", formula: "ƒx", shortcut: "⌨️" };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 pt-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ y: -20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: -20 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-(--color-surface) neu-btn rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 border-b border-(--color-border)">
              <Search size={18} className="text-(--color-muted)" />
              <input
                ref={ref}
                aria-label="Formula, shortcut ya chapter dhoondhein"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Formula, shortcut ya chapter dhoondhein…" className="flex-1 bg-transparent py-3.5 text-sm outline-none" />
              <kbd className="text-xs text-(--color-muted)">Esc</kbd>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {q.trim().length >= 2 && hits.length === 0 && <p className="p-4 text-sm text-(--color-muted)">Kuch nahi mila 🙁</p>}
              {hits.map((h, i) => (
                <button key={i} onClick={() => { onPick(h); onClose(); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-(--color-accent-soft)">
                  <span className="w-7 text-center">{icon[h.kind]}</span>
                  <span className="min-w-0"><span className="block text-sm font-semibold truncate">{h.title}</span><span className="block text-xs text-(--color-muted) truncate">{h.sub}</span></span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
