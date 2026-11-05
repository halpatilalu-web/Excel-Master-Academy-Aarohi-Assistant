import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Search, Star } from "lucide-react";
import { CHAPTERS } from "../data/chapters";
import { FORMULAS, FORMULA_CATS, FORMULA_COMPARISONS } from "../data/formulas";
import { SHORTCUTS, SHORTCUT_CATS, shortcutCatLabel } from "../data/shortcuts";
import { VBA } from "../data/vba";
import { Bilingual } from "../lib/lang";
import { Card, Pill, inputCls } from "../components/ui";

export type RefTab = "formulas" | "shortcuts" | "vba" | "compare";

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      aria-label="Copy"
      className="p-1.5 rounded-lg text-(--color-muted) hover:bg-(--color-accent-soft) shrink-0"
      onClick={() => { void navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
    >
      {ok ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

function Chips({ items, value, onPick, label }: { items: string[]; value: string; onPick: (v: string) => void; label: (v: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {["All", ...items].map((c) => (
        <button key={c} onClick={() => onPick(c)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${value === c ? "bg-(--color-accent) text-white border-transparent" : "border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"}`}>
          {label(c)}
        </button>
      ))}
    </div>
  );
}

export function Reference({ tab, go, onTab, initialQuery = "" }: { tab: RefTab; go: (chapter?: number) => void; onTab: (t: RefTab) => void; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  useEffect(() => {
    if (initialQuery) setQ(initialQuery);
  }, [initialQuery]);
  const [cat, setCat] = useState("All");
  const [os, setOs] = useState<"win" | "mac">("win");
  const [lvl, setLvl] = useState("All");
  const [favs, setFavs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ema_fav_formulas") || "[]");
    } catch {
      return [];
    }
  });
  const toggleFav = (key: string) => {
    setFavs((prev) => {
      const next = prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key];
      try {
        localStorage.setItem("ema_fav_formulas", JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const s = q.trim().toLowerCase();

  const formulas = useMemo(
    () =>
      FORMULAS.filter(
        (f) =>
          (cat === "All" || (cat === "★ Starred" ? favs.includes(f.name) : f.cat === cat)) &&
          (!s || `${f.name} ${f.syntax} ${f.hindi}`.toLowerCase().includes(s))
      ),
    [cat, s, favs]
  );
  const shortcuts = useMemo(() => SHORTCUTS.filter((x) => (cat === "All" || x.cat === cat) && (!s || `${x.win} ${x.mac} ${x.desc}`.toLowerCase().includes(s))), [cat, s]);
  const vba = useMemo(() => VBA.filter((v) => (lvl === "All" || v.level === lvl) && (!s || `${v.title} ${v.hindi} ${v.code}`.toLowerCase().includes(s))), [lvl, s]);
  const comparisons = useMemo(
    () =>
      FORMULA_COMPARISONS.filter(
        (c) =>
          (cat === "All" || c.cat === cat) &&
          (!s || `${c.name} ${c.bestForEn} ${c.bestForHi} ${c.limitEn} ${c.limitHi}`.toLowerCase().includes(s))
      ),
    [cat, s]
  );

  const tabs: { k: RefTab; l: string; n: number }[] = [
    { k: "formulas", l: "Formula Encyclopedia", n: FORMULAS.length },
    { k: "compare", l: "⚖️ Best-For & Limitations", n: FORMULA_COMPARISONS.length },
    { k: "shortcuts", l: "400 Shortcut Keys", n: SHORTCUTS.length },
    { k: "vba", l: "VBA Automation", n: VBA.length },
  ];
  const pick = (t: RefTab) => { onTab(t); setCat("All"); setQ(""); };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Excel Reference</h1>
        <p className="text-sm text-(--color-muted) mt-1">Formulas, shortcuts aur VBA code — sab ek jagah, search ke saath.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => pick(t.k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.k ? "bg-(--color-accent) text-white" : "bg-(--color-accent-soft) text-(--color-accent-dark)"}`}>
            {t.l} ({t.n})
          </button>
        ))}
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-muted)" />
        <input className={`${inputCls} !pl-10`} placeholder={tab === "formulas" ? "Formula dhoondho (jaise VLOOKUP, round, date)…" : tab === "shortcuts" ? "Shortcut dhoondho (jaise Ctrl+C, filter, pivot)…" : "VBA code dhoondho (jaise loop, pdf, sort)…"} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {tab === "formulas" && (
        <>
          <Chips items={[`★ Starred`, ...FORMULA_CATS]} value={cat} onPick={setCat} label={(c) => c === "★ Starred" ? `★ Starred (${favs.length})` : c} />
          <p className="text-xs text-(--color-muted)">{formulas.length} formulas</p>
          <div className="grid md:grid-cols-2 gap-3">
            {formulas.map((f) => (
              <Card key={f.cat + f.name} className="!p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Bookmark formula"
                      onClick={() => toggleFav(f.name)}
                      className="text-amber-500 hover:scale-110 transition"
                    >
                      <Star size={16} fill={favs.includes(f.name) ? "currentColor" : "none"} />
                    </button>
                    <span className="font-display font-extrabold">{f.name}</span>
                  </div>
                  <Pill tone="info">{f.cat}</Pill>
                </div>
                <div className="mt-2 flex items-start gap-1 bg-(--color-accent-soft) rounded-lg px-2.5 py-1.5">
                  <code className="text-xs break-all flex-1">{f.syntax}</code>
                  <CopyBtn text={f.syntax} />
                </div>
                <p className="text-sm mt-2">{f.hindi}</p>
                <div className="mt-1.5 flex items-start gap-1">
                  <code className="text-xs text-(--color-muted) break-all flex-1">Udaharan: {f.ex}</code>
                  <CopyBtn text={f.ex.split(" → ")[0]} />
                </div>
                {f.ch > 0 && (
                  <button onClick={() => go(f.ch)} className="mt-2 text-xs font-semibold text-(--color-accent-dark) hover:underline">
                    Chapter {f.ch} mein dekho: {CHAPTERS.find((c) => c.n === f.ch)?.title}
                  </button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "shortcuts" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Chips items={SHORTCUT_CATS} value={cat} onPick={setCat} label={shortcutCatLabel} />
            <div className="flex rounded-xl overflow-hidden border border-(--color-border) text-xs font-semibold">
              {(["win", "mac"] as const).map((o) => (
                <button key={o} onClick={() => setOs(o)} className={`px-3 py-1.5 ${os === o ? "bg-(--color-accent) text-white" : ""}`}>{o === "win" ? "Windows" : "Mac"}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-(--color-muted)">{shortcuts.length} shortcuts</p>
          <Card className="!p-0 divide-y divide-(--color-border)">
            {shortcuts.map((x, i) => {
              const k = os === "win" ? x.win : x.mac;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <kbd className="font-mono text-xs bg-(--color-accent-soft) rounded-md px-2 py-1 min-w-36 max-w-44 break-words">{k === "-" ? "Mac par nahi" : k}</kbd>
                  <span className="text-sm flex-1">{x.desc}</span>
                  <span className="hidden sm:block"><Pill tone="info">{shortcutCatLabel(x.cat)}</Pill></span>
                </div>
              );
            })}
            {!shortcuts.length && <p className="p-4 text-sm text-(--color-muted)">Kuch nahi mila.</p>}
          </Card>
        </>
      )}

      {tab === "vba" && (
        <>
          <Chips items={["Basic", "Intermediate", "Advanced"]} value={lvl} onPick={setLvl} label={(c) => c} />
          <div className="grid md:grid-cols-2 gap-3">
            {vba.map((v) => (
              <Card key={v.title} className="!p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-extrabold">{v.title}</span>
                  <Pill tone="info">{v.level}</Pill>
                </div>
                <p className="text-sm mt-1 text-(--color-muted)">{v.hindi}</p>
                <div className="relative mt-2">
                  <pre className="text-xs bg-(--color-accent-soft) rounded-lg p-3 overflow-x-auto"><code>{v.code}</code></pre>
                  <div className="absolute top-1 right-1"><CopyBtn text={v.code} /></div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-(--color-muted)">Use karne ke liye: Alt+F11 → Insert → Module → code paste → F5.</p>
        </>
      )}

      {tab === "compare" && (
        <>
          <Chips items={["Lookup", "Logical", "Statistical", "Cleaning"]} value={cat} onPick={setCat} label={(c) => c} />
          <div className="grid md:grid-cols-2 gap-3">
            {comparisons.map((c) => (
              <Card key={c.name} className="!p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-extrabold text-base">{c.name}</span>
                  <Pill tone="info">{c.cat} • {c.worksWith}</Pill>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs">
                  <div className="font-bold text-emerald-900">✓ Best For:</div>
                  <Bilingual en={c.bestForEn} hi={c.bestForHi} compact />
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs">
                  <div className="font-bold text-rose-900">✗ Limitation / Watch Out:</div>
                  <Bilingual en={c.limitEn} hi={c.limitHi} compact />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
