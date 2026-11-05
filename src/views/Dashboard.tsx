import { motion } from "motion/react";
import {
  Award,
  BarChart3,
  BookOpen,
  Box,
  ClipboardCheck,
  FlaskConical,
  GraduationCap,
  Sparkles,
  StickyNote,
  Trophy,
  Video,
} from "lucide-react";
import { DonutChart } from "../components/charts";
import { Excel3DHeroCube } from "../components/Excel3DModel";
import { StreakBadges } from "../components/StreakBadges";
import { Button, Card, Pill, ProgressBar } from "../components/ui";
import { CHAPTERS, LEVEL_STYLE, type Level } from "../data/chapters";
import { DIPLOMA_MODULES } from "../data/diplomaModules";
import { SHORTCUTS } from "../data/shortcuts";
import { PASS_PCT, useExams, useProgress, useSubmissions } from "../lib/academy";
import { Bilingual, LangSwitcher } from "../lib/lang";

export type DashDest =
  | "chapters"
  | "exam"
  | "lab"
  | "certificate"
  | "reference"
  | "videos"
  | "studio3d"
  | "notes"
  | "charts"
  | "aarohi";

export function Dashboard({
  name,
  go,
  onOpenChapter,
}: {
  name: string;
  go: (v: DashDest) => void;
  onOpenChapter?: (chapter: number) => void;
}) {
  const { items: prog, loading: progressLoading, error: progressError } = useProgress();
  const { items: exams, loading: examsLoading, error: examsError } = useExams();
  const { items: subs, error: submissionsError } = useSubmissions();
  const loadError = progressError || examsError || submissionsError;

  const done = new Set(prog.map((p) => p.chapter));
  const pct = Math.round((done.size / CHAPTERS.length) * 100);
  const best = exams.reduce((m, e) => Math.max(m, e.pct), 0);
  const passed = exams.some((e) => e.passed);
  const next = CHAPTERS.find((c) => !done.has(c.n));
  const day = Math.floor(Date.now() / 86400000);
  const tip = SHORTCUTS[day % SHORTCUTS.length];
  const levels: Level[] = ["Basic", "Intermediate", "Advanced"];

  const stats = [
    { icon: BookOpen, emoji: "📘", label: "Diploma Chapters", v: `${done.size}/${CHAPTERS.length}` },
    { icon: FlaskConical, emoji: "🧪", label: "Lab Records", v: subs.length },
    { icon: Trophy, emoji: "🏆", label: "Best Exam Score", v: exams.length ? `${best}%` : "—" },
    {
      icon: Award,
      emoji: "🎓",
      label: "Diploma Certificate",
      v: done.size === CHAPTERS.length && passed ? "Ready ✨" : "In Progress",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Language Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
          🎓 Complete Excel Diploma Course · Basic to Advanced
        </span>
        <LangSwitcher />
      </div>

      {/* Hero Banner with 3D Interactive Hologram Model */}
      <div className="rounded-3xl border border-(--color-border) bg-(--color-surface) p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold leading-tight">
              Namaste, {name}! 👋{" "}
              <span className="text-(--color-accent-dark)">Master Excel A-to-Z</span>
            </h1>

            <Bilingual
              en="40 Chapters across 8 Diploma Modules — Basic Excel, Formulas, Data Cleaning, Conditional Formatting, Data Validation, XLOOKUP & INDEX-MATCH, Pivot Dashboards, Power Query & VBA Macros!"
              hi="8 Diploma Modules aur 40 Chapters — Handwritten Notes, Infographics, Video Lessons, 3D Models, Live Practice Sheet, Sample Papers aur Aarohi Live AI Chat ke saath!"
            />

            <div className="flex flex-wrap gap-2.5 pt-1">
              {next ? (
                <Button
                  onClick={() =>
                    onOpenChapter ? onOpenChapter(next.n) : go("chapters")
                  }
                >
                  🚀 Continue Ch {next.n}: {next.title.slice(0, 22)}
                  {next.title.length > 22 ? "…" : ""}
                </Button>
              ) : (
                <Button onClick={() => go("exam")}>🏆 Take Final Diploma Exam</Button>
              )}
              <Button variant="secondary" onClick={() => go("lab")}>
                🧮 Live Practice Sheet
              </Button>
              <Button variant="secondary" onClick={() => go("videos")}>
                <Video size={16} /> Video Lessons
              </Button>
              <Button variant="secondary" onClick={() => go("aarohi")}>
                <Sparkles size={16} /> Talk to Aarohi AI
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Excel3DHeroCube onExplore={() => go("studio3d")} />
          </div>
        </div>
      </div>

      {(progressLoading || examsLoading) && (
        <p className="text-sm text-(--color-muted)">Tumhari progress load ho rahi hai…</p>
      )}
      {loadError && (
        <p
          role="alert"
          className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3"
        >
          Dashboard data load nahi hua: {loadError}
        </p>
      )}

      {/* Quick Feature Portals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { k: "notes" as const, icon: StickyNote, e: "📒", t: "Handwritten & Infographics", s: "40 Notes + 8 Posters" },
          { k: "videos" as const, icon: Video, e: "🎬", t: "Video & AI Gallery", s: "8 Videos + 8 AI Art" },
          { k: "studio3d" as const, icon: Box, e: "🧊", t: "3D Excel Lessons", s: "6 Interactive 3D Labs" },
          { k: "lab" as const, icon: FlaskConical, e: "🧮", t: "Practice Sheets", s: "Live Grid + 10 .xlsx" },
          { k: "charts" as const, icon: BarChart3, e: "📊", t: "Charts & Dashboards", s: "29 Charts + 6 MIS" },
          { k: "exam" as const, icon: ClipboardCheck, e: "📄", t: "Sample Papers & Quiz", s: "5 Papers + 8 Quizzes" },
        ].map((item, i) => (
          <motion.button
            key={item.k}
            type="button"
            whileHover={{ y: -3 }}
            transition={{ duration: 0.15, delay: i * 0.02 }}
            onClick={() => go(item.k)}
            className="text-left rounded-2xl border border-(--color-border) bg-(--color-surface) p-3.5 hover:border-(--color-accent) hover:shadow-md transition cursor-pointer"
          >
            <div className="text-2xl">{item.e}</div>
            <div className="font-display font-bold text-xs sm:text-sm mt-1.5 leading-snug">
              {item.t}
            </div>
            <div className="text-[11px] text-(--color-muted) mt-0.5">{item.s}</div>
          </motion.button>
        ))}
      </div>

      <StreakBadges />

      {/* Daily Shortcut */}
      <Card className="!p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-(--color-accent-dark)">
          ⚡ Shortcut of the Day
        </span>
        <kbd className="font-mono text-sm bg-(--color-accent-soft) rounded-md px-2.5 py-1 font-bold">
          {tip.win}
        </kbd>
        <span className="text-sm flex-1">{tip.desc}</span>
        <Button variant="secondary" onClick={() => go("reference")}>
          301 Shortcuts & 249 Formulas →
        </Button>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4">
            <div className="flex items-center justify-between">
              <s.icon size={20} className="text-(--color-accent)" />
              <span className="text-lg">{s.emoji}</span>
            </div>
            <div className="font-display text-2xl font-extrabold mt-2">{s.v}</div>
            <div className="text-xs text-(--color-muted)">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* 8 Diploma Modules Visual Showcase */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold">
              📚 8 Complete Diploma Course Modules
            </h2>
            <p className="text-xs sm:text-sm text-(--color-muted)">
              Click any module to study its chapters, notes, formulas, and practical projects!
            </p>
          </div>
          <Button variant="ghost" onClick={() => go("chapters")}>
            View All {CHAPTERS.length} →
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIPLOMA_MODULES.map((m) => {
            const doneCount = m.chapters.filter((chNum) => done.has(chNum)).length;
            const firstChapter = m.chapters[0];
            return (
              <motion.div
                key={m.id}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden flex flex-col shadow-xs hover:shadow-md transition"
              >
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={m.image}
                    alt={m.titleEn}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 rounded-full bg-black/70 text-white text-[10px] font-extrabold px-2.5 py-0.5">
                    {m.emoji} {m.code}
                  </span>
                  <span className="absolute bottom-2 right-2">
                    <Pill tone={doneCount === m.chapters.length ? "good" : "info"}>
                      {doneCount}/{m.chapters.length} Ch
                    </Pill>
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-display font-extrabold text-sm leading-snug">
                      {m.titleEn}
                    </h3>
                    <p className="text-xs text-(--color-accent-dark) font-medium mt-0.5">
                      {m.titleHi}
                    </p>
                    <p className="text-xs text-(--color-muted) mt-1.5 line-clamp-2">
                      {m.descEn}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <ProgressBar pct={(doneCount / m.chapters.length) * 100} />
                    <button
                      type="button"
                      onClick={() =>
                        onOpenChapter ? onOpenChapter(firstChapter) : go("chapters")
                      }
                      className="w-full rounded-xl bg-(--color-accent-soft) hover:bg-(--color-accent) text-(--color-accent-dark) hover:text-white py-2 text-xs font-bold transition cursor-pointer"
                    >
                      Start Module →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Progress Breakdown + Donut */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span>Overall Diploma Progress</span>
            <span>{pct}%</span>
          </div>
          <ProgressBar pct={pct} />
          <div className="mt-5 space-y-3">
            {levels.map((l) => {
              const all = CHAPTERS.filter((c) => c.level === l);
              const d = all.filter((c) => done.has(c.n)).length;
              return (
                <div key={l}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold" style={{ color: LEVEL_STYLE[l].fg }}>
                      {l} Track
                    </span>
                    <span className="text-(--color-muted)">
                      {d}/{all.length} chapters
                    </span>
                  </div>
                  <ProgressBar pct={(d / all.length) * 100} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <DonutChart
            data={[
              { label: "Done", value: done.size, color: "#2f9e5b" },
              { label: "Left", value: CHAPTERS.length - done.size, color: "#e3e8e5" },
            ]}
          />
          <p className="text-xs text-(--color-muted) mt-3 text-center">
            Score {PASS_PCT}%+ in the Final Practice Exam to unlock Certificate
          </p>
        </Card>
      </div>

      {/* Diploma Certificate Callout */}
      <Card className="flex flex-wrap items-center gap-4">
        <GraduationCap className="text-(--color-accent) shrink-0" size={36} />
        <div className="flex-1 min-w-[200px] text-sm">
          <div className="font-display font-bold text-base">
            Practice Diploma Completion Certificate
          </div>
          <div className="text-(--color-muted)">
            {done.size === CHAPTERS.length && passed
              ? "🎉 Badhai ho! Your self-paced Excel Diploma Practice Certificate is ready to print!"
              : `Complete all ${CHAPTERS.length} chapters (${done.size}/${CHAPTERS.length} done) and pass the Final Practice Exam (${PASS_PCT}%+).`}
          </div>
        </div>
        <Button variant="secondary" onClick={() => go("certificate")}>
          View Certificate →
        </Button>
      </Card>
    </div>
  );
}
