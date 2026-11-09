import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flame, Volume2, VolumeX } from "lucide-react";
import { CHAPTERS } from "../data/chapters";
import { useExams, useProgress } from "../lib/academy";
import { beep, saveBadges, seenBadges, setSound, soundOn, touchStreak } from "../lib/prefs";
import { useSetting } from "../lib/settings";
import { Card } from "./ui";

export function StreakBadges() {
  const { items: prog } = useProgress();
  const { items: exams } = useExams();
  const [streak] = useState(touchStreak);
  // Read the shared settings store, so this switch and the one in Settings are
  // the same switch (they used to disagree until a reload).
  const [sound, setSoundSetting] = useSetting("sound");
  const [toast, setToast] = useState<string | null>(null);
  const completedChapters = useMemo(() => new Set(prog.map((p) => p.chapter)).size, [prog]);
  const badges = useMemo(
    () => [
      { id: "first", e: "🌱", t: "First Chapter", ok: completedChapters >= 1 },
      { id: "streak3", e: "🔥", t: "3-Day Streak", ok: streak >= 3 },
      { id: "streak7", e: "⚡", t: "7-Day Streak", ok: streak >= 7 },
      { id: "ten", e: "📚", t: "10 Chapters", ok: completedChapters >= 10 },
      { id: "master", e: "🎓", t: `All ${CHAPTERS.length} Done`, ok: completedChapters >= CHAPTERS.length },
      { id: "topper", e: "🏆", t: "Exam 80%+", ok: exams.some((e) => e.pct >= 80) },
    ],
    [completedChapters, exams, streak],
  );

  useEffect(() => {
    const seen = seenBadges();
    const fresh = badges.find((b) => b.ok && !seen.includes(b.id));
    if (fresh) {
      setToast(`${fresh.e} Badge unlocked: ${fresh.t}`);
      beep();
      saveBadges([...seen, ...badges.filter((b) => b.ok).map((b) => b.id)]);
      setTimeout(() => setToast(null), 3500);
    }
  }, [badges]);

  return (
    <Card className="!p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600">
            <Flame size={15} />
          </span>
          <p className="font-display font-bold text-sm">
            {streak}-Day Study Streak · Milestones
          </p>
        </div>
        <button
          type="button"
          aria-label="Sound toggle"
          onClick={() => {
            setSound(!sound);
            setSoundSetting(!sound);
          }}
          className="p-1.5 rounded-lg hover:bg-(--color-accent-soft) text-(--color-muted) cursor-pointer"
        >
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.t}
            className={`rounded-xl px-2 py-2.5 text-center border transition ${
              b.ok
                ? "bg-(--color-accent-soft)/60 border-(--color-accent)/40"
                : "bg-(--color-canvas) border-(--color-border) opacity-50 grayscale"
            }`}
          >
            <div className="text-lg leading-none">{b.e}</div>
            <div className="text-[11px] font-semibold leading-tight mt-1.5 truncate">{b.t}</div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring" }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] bg-(--color-ink) text-(--color-canvas) font-semibold text-sm rounded-2xl px-5 py-3 shadow-xl"
          >
            {toast} 🎉
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
