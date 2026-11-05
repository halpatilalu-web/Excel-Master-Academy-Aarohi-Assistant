import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { CHAPTERS } from "../data/chapters";
import { useExams, useProgress } from "../lib/academy";
import { beep, saveBadges, seenBadges, setSound, soundOn, touchStreak } from "../lib/prefs";
import { Card } from "./ui";

export function StreakBadges() {
  const { items: prog } = useProgress();
  const { items: exams } = useExams();
  const [streak] = useState(touchStreak);
  const [sound, setS] = useState(soundOn);
  const [toast, setToast] = useState<string | null>(null);
  const completedChapters = useMemo(() => new Set(prog.map((p) => p.chapter)).size, [prog]);
  const badges = useMemo(() => [
    { id: "first", e: "🌱", t: "First Chapter", ok: completedChapters >= 1 },
    { id: "streak3", e: "🔥", t: "3 din lagataar", ok: streak >= 3 },
    { id: "streak7", e: "⚡", t: "7 din lagataar", ok: streak >= 7 },
    { id: "ten", e: "📚", t: "10 Chapters", ok: completedChapters >= 10 },
    { id: "master", e: "🎓", t: `Diploma Master (${CHAPTERS.length})`, ok: completedChapters >= CHAPTERS.length },
    { id: "topper", e: "🏆", t: "Exam Topper (80%+)", ok: exams.some((e) => e.pct >= 80) },
  ], [completedChapters, exams, streak]);

  useEffect(() => {
    const seen = seenBadges();
    const fresh = badges.find((b) => b.ok && !seen.includes(b.id));
    if (fresh) { setToast(`${fresh.e} Badge unlock: ${fresh.t}`); beep(); saveBadges([...seen, ...badges.filter((b) => b.ok).map((b) => b.id)]); setTimeout(() => setToast(null), 3500); }
  }, [badges]);

  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display font-extrabold text-lg"><motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="inline-block">🔥</motion.span> {streak} din ka streak</p>
        <button aria-label="Sound toggle" onClick={() => { setSound(!sound); setS(!sound); }} className="p-2 rounded-lg hover:bg-(--color-accent-soft) text-(--color-muted)">{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {badges.map((b) => (
          <div key={b.id} title={b.t} className={`rounded-xl p-2 text-center border border-(--color-border) ${b.ok ? "bg-(--color-accent-soft)" : "opacity-40 grayscale"}`}>
            <div className="text-2xl">{b.e}</div><div className="text-[11px] font-semibold leading-tight mt-1">{b.t}</div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {toast && <motion.div initial={{ y: 60, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring" }} className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] bg-(--color-ink) text-(--color-canvas) font-semibold text-sm rounded-2xl px-5 py-3 shadow-xl">{toast} 🎉</motion.div>}
      </AnimatePresence>
    </Card>
  );
}
