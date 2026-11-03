import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { sfx } from "../lib/prefs";

const BREAK_SECONDS = 120;
const HEROES = [
  { id: "web", name: "Web Warrior", bg: "from-red-600 to-blue-900", main: "🕷️", side: ["🕸️", "🏙️", "🕸️"], line: "Thoda aaram karo, hero! Powers recharge ho rahi hain." },
  { id: "spark", name: "Spark Critter", bg: "from-yellow-400 to-orange-600", main: "⚡🐹", side: ["⚡", "🌩️", "⚡"], line: "Charge ho raha hai… Aankhein band karke gehri saans lo." },
  { id: "squad", name: "Super Squad", bg: "from-indigo-700 to-purple-900", main: "🦸‍♂️🛡️🔨🦸‍♀️", side: ["⭐", "💥", "⭐"], line: "Squad ka rule: break ke baad hi agla mission!" },
] as const;
const TIPS = ["👀 20-20-20: 20 second tak 20 feet door dekho.", "💧 Paani peeyo.", "🧘 Kandhe aur gardan ghumao.", "🚶 Thoda khade ho kar chalo."];

export function BreakMode({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [hero, setHero] = useState(0);
  const [left, setLeft] = useState(BREAK_SECONDS);
  const endAt = useRef(0);

  useEffect(() => {
    if (!open) return;
    setHero(Math.floor(Math.random() * HEROES.length));
    endAt.current = Date.now() + BREAK_SECONDS * 1000;
    setLeft(BREAK_SECONDS);
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(r);
      if (r <= 0) { clearInterval(id); sfx("end"); }
    }, 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    addEventListener("keydown", onKey);
    return () => { clearInterval(id); removeEventListener("keydown", onKey); };
  }, [open, onDone]);

  const h = HEROES[hero];
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const pct = ((BREAK_SECONDS - left) / BREAK_SECONDS) * 100;
  return (
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-modal="true" className={`fixed inset-0 z-[100] bg-gradient-to-br ${h.bg} text-white flex flex-col items-center justify-center p-6 text-center overflow-hidden select-none`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <motion.span key={i} className="absolute text-3xl opacity-40" style={{ left: `${(i * 11) % 95}%` }} initial={{ y: "110vh" }} animate={{ y: "-20vh", rotate: 360 }} transition={{ repeat: Infinity, duration: 7 + (i % 4) * 2, delay: i * 0.6, ease: "linear" }}>{h.side[i % 3]}</motion.span>
          ))}
          <p className="font-display font-extrabold text-xl mb-4 relative">😴 Break Time — {h.name}</p>
          <motion.img src={`/break/${h.id}.jpg`} alt={h.name} className="w-56 h-56 sm:w-72 sm:h-72 rounded-3xl object-cover shadow-2xl relative border-4 border-white/70" animate={{ y: [0, -14, 0], rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} />
          <p className="mt-6 max-w-md text-lg relative">{h.line}</p>
          <p className="font-display font-extrabold text-6xl mt-4 tabular-nums relative">{mm}:{ss}</p>
          <div className="w-64 h-2 rounded-full bg-white/25 mt-3 overflow-hidden relative"><div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} /></div>
          <motion.p key={Math.floor(left / 30)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-sm max-w-sm relative">{TIPS[Math.floor(left / 30) % TIPS.length]}</motion.p>
          <button
            onClick={onDone}
            className="mt-6 relative bg-white text-black font-bold rounded-2xl px-6 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          >
            {left <= 0 ? "✅ Wapas padhai par" : "Break khatam karo"}
          </button>
          <p className="mt-3 text-xs opacity-75 relative">Escape dabakar bhi wapas ja sakte ho.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
