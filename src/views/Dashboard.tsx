import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Box,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Keyboard,
  Library,
  PlayCircle,
  Sparkles,
  StickyNote,
  Trophy,
  Video,
  Wand2,
} from "lucide-react";
import { DonutChart } from "../components/charts";
import { Excel3DHeroCube } from "../components/Excel3DModel";
import { StreakBadges } from "../components/StreakBadges";
import { Button, Card, ProgressBar } from "../components/ui";
import { CHAPTERS, LEVEL_STYLE, type Level } from "../data/chapters";
import { DIPLOMA_MODULES } from "../data/diplomaModules";
import { FORMULAS } from "../data/formulas";
import { LABS } from "../data/labs";
import { SAMPLE_PAPERS } from "../data/samplePapers";
import { SHORTCUTS } from "../data/shortcuts";
import { PASS_PCT, useExams, useProgress, useSubmissions } from "../lib/academy";
import { useLang } from "../lib/lang";

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
  | "toolkit"
  | "aarohi";

type ModuleTrackFilter = "all" | "foundation" | "analytics" | "automation";

export function Dashboard({
  name,
  go,
  onOpenChapter,
}: {
  name: string;
  go: (v: DashDest) => void;
  onOpenChapter?: (chapter: number) => void;
}) {
  const { lang } = useLang();
  const { items: prog, loading: progressLoading, error: progressError } = useProgress();
  const { items: exams, loading: examsLoading, error: examsError } = useExams();
  const { items: subs, error: submissionsError } = useSubmissions();
  const [trackFilter, setTrackFilter] = useState<ModuleTrackFilter>("all");

  const loadError = progressError || examsError || submissionsError;

  const done = new Set(prog.map((p) => p.chapter));
  const pct = Math.round((done.size / CHAPTERS.length) * 100);
  const best = exams.reduce((m, e) => Math.max(m, e.pct), 0);
  const passed = exams.some((e) => e.passed);
  const certReady = done.size === CHAPTERS.length && passed;
  const next = CHAPTERS.find((c) => !done.has(c.n));
  const day = Math.floor(Date.now() / 86400000);
  const tip = SHORTCUTS[day % SHORTCUTS.length];
  const levels: Level[] = ["Basic", "Intermediate", "Advanced"];

  const filteredModules = DIPLOMA_MODULES.filter((_, idx) => {
    if (trackFilter === "foundation") return idx < 3;
    if (trackFilter === "analytics") return idx >= 3 && idx < 6;
    if (trackFilter === "automation") return idx >= 6;
    return true;
  });

  const studios: {
    key: DashDest;
    icon: typeof FlaskConical;
    badge: string;
    titleEn: string;
    titleHi: string;
    descEn: string;
    descHi: string;
  }[] = [
    {
      key: "lab",
      icon: FlaskConical,
      badge: `7 Live Grids · ${LABS.length} Datasets`,
      titleEn: "Live Practice Lab & GST Sheets",
      titleHi: "लाइव प्रैक्टिस लैब और GST शीट्स",
      descEn: "Write real Excel formulas in the browser and download multi-sheet corporate workbooks.",
      descHi: "ब्राउज़र में असली फॉर्मूले चलाएं और प्रैक्टिस फाइलें डाउनलोड करें।",
    },
    {
      key: "toolkit",
      icon: Wand2,
      badge: "5 Power Tools",
      titleEn: "Pro Toolkit & AI Prompt Studio",
      titleHi: "प्रो टूलकिट और AI प्रॉम्प्ट स्टूडियो",
      descEn: "Generate automation prompts, preview corporate color palettes, and diagnose all 12 errors.",
      descHi: "AI प्रॉम्प्ट बनाएं, कलर पैलेट देखें और सभी 12 एरर ठीक करें।",
    },
    {
      key: "notes",
      icon: StickyNote,
      badge: `${CHAPTERS.length} Notes · 10 Posters`,
      titleEn: "Handwritten Notes & Infographics",
      titleHi: "हैंडरिटन नोट्स और इन्फोग्राफिक्स",
      descEn: "Printable bilingual revision notebooks and visual cheat-sheet posters for every module.",
      descHi: "हर चैप्टर के आसान नोट्स और विज़ुअल पोस्टर।",
    },
    {
      key: "videos",
      icon: Video,
      badge: "8 Videos · 10 Visuals",
      titleEn: "Video Lessons & Visual Gallery",
      titleHi: "वीडियो लेसन्स और विज़ुअल गैलरी",
      descEn: "Step-by-step animated walkthroughs covering Lookups, Dashboards, Power Query, and VBA.",
      descHi: "एनिमेटेड वीडियो के ज़रिए हर मुश्किल टॉपिक आसानी से समझें।",
    },
    {
      key: "reference",
      icon: Library,
      badge: `${FORMULAS.length} Formulas · ${SHORTCUTS.length} Keys`,
      titleEn: "Formula, Shortcut & VBA Vault",
      titleHi: "फॉर्मूला, 400 शॉर्टकट और VBA लाइब्रेरी",
      descEn: "Search syntax, examples, formula limitations matrix, keyboard shortcuts, and ready macros.",
      descHi: "सभी फॉर्मूले, उनकी सीमाएं, शॉर्टकट्स और तैयार VBA कोड।",
    },
    {
      key: "exam",
      icon: ClipboardCheck,
      badge: `${SAMPLE_PAPERS.length} Papers · Timed Exam`,
      titleEn: "Sample Papers, Quizzes & Final Exam",
      titleHi: "सैंपल पेपर्स, क्विज़ और फाइनल परीक्षा",
      descEn: "Practice solved corporate MIS papers, module quizzes, and the 20-minute Diploma exam.",
      descHi: "मॉडल पेपर्स हल करें और सर्टिफिकेट के लिए फाइनल परीक्षा दें।",
    },
  ];

  return (
    <div className="space-y-10">
      {/* ==================== 1. EXECUTIVE HERO & UNIFIED PROGRESS ==================== */}
      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface) p-6 sm:p-8 shadow-xs">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Clean Value Prop & Focused CTAs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark) px-3 py-1 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-(--color-accent)" />
              Excel Diploma Curriculum · {DIPLOMA_MODULES.length} Modules · {CHAPTERS.length} Chapters
            </div>

            <div className="space-y-2.5">
              <p className="text-xs sm:text-sm font-medium text-(--color-muted)">
                Welcome back, <span className="text-(--color-ink) font-semibold">{name}</span>
              </p>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight leading-[1.15]">
                Master Excel A-to-Z —{" "}
                <span className="text-(--color-accent)">Basic to Corporate Automation</span>
              </h1>
              {(lang === "en" || lang === "both") && (
                <p className="text-sm sm:text-base text-(--color-muted) leading-relaxed max-w-2xl">
                  A structured, hands-on program covering Formulas, Data Cleaning, Lookups, Pivot Dashboards, Power Query, VBA Macros, GST Accounting, and AI Automation.
                </p>
              )}
              {(lang === "hi" || lang === "both") && (
                <p className="text-xs sm:text-sm text-(--color-muted)/90 leading-relaxed max-w-2xl">
                  Basic Excel से लेकर Advanced Formulas, Dashboard, Power Query, VBA, GST Billing और AI Automation तक — हिंदी और इंग्लिश दोनों में व्यवस्थित कोर्स।
                </p>
              )}
            </div>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {next ? (
                <Button
                  onClick={() => (onOpenChapter ? onOpenChapter(next.n) : go("chapters"))}
                  className="!px-5 !py-3 shadow-xs"
                >
                  <PlayCircle size={17} />
                  Continue Ch {next.n}: {next.title.length > 28 ? `${next.title.slice(0, 28)}…` : next.title}
                </Button>
              ) : (
                <Button onClick={() => go("exam")} className="!px-5 !py-3 shadow-xs">
                  <Trophy size={17} /> Take Final Diploma Exam
                </Button>
              )}
              <Button variant="secondary" onClick={() => go("lab")} className="!px-4 !py-3">
                <FlaskConical size={16} /> Practice Lab
              </Button>
              <button
                type="button"
                onClick={() => go("toolkit")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-(--color-muted) hover:text-(--color-accent-dark) transition cursor-pointer"
              >
                Pro Toolkit & AI <ArrowRight size={15} />
              </button>
            </div>

            {/* Clean Program Metrics Bar */}
            <div className="pt-4 border-t border-(--color-border) grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { v: `${CHAPTERS.length}`, l: "Structured Chapters" },
                { v: `${FORMULAS.length}+`, l: "Excel Formulas" },
                { v: `${SHORTCUTS.length}`, l: "Shortcut Keys" },
                { v: `${LABS.length}`, l: "Real Office Projects" },
              ].map((m) => (
                <div key={m.l}>
                  <div className="font-display text-lg sm:text-xl font-extrabold text-(--color-ink)">
                    {m.v}
                  </div>
                  <div className="text-xs text-(--color-muted)">{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Unified Student Progress Panel */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-(--color-border) bg-(--color-canvas) p-5 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-(--color-muted)">
                    Your Progress
                  </div>
                  <div className="font-display text-2xl font-extrabold mt-0.5">
                    {done.size} <span className="text-sm font-medium text-(--color-muted)">/ {CHAPTERS.length} Chapters</span>
                  </div>
                </div>
                <div className="shrink-0 scale-90 origin-right">
                  <DonutChart
                    size={84}
                    data={[
                      { label: "Done", value: done.size, color: "#1b7f45" },
                      { label: "Left", value: Math.max(0, CHAPTERS.length - done.size), color: "#dde3ea" },
                    ]}
                  />
                </div>
              </div>

              {/* Level Tracks */}
              <div className="space-y-2.5">
                {levels.map((l) => {
                  const all = CHAPTERS.filter((c) => c.level === l);
                  const d = all.filter((c) => done.has(c.n)).length;
                  return (
                    <div key={l} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold" style={{ color: LEVEL_STYLE[l].fg }}>
                          {l} Level
                        </span>
                        <span className="text-(--color-muted) font-mono">
                          {d}/{all.length}
                        </span>
                      </div>
                      <ProgressBar pct={(d / all.length) * 100} />
                    </div>
                  );
                })}
              </div>

              {/* Mini KPI Row */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-(--color-border) text-center">
                <div className="rounded-xl bg-(--color-surface) border border-(--color-border) px-2 py-2">
                  <div className="font-display font-extrabold text-sm">{subs.length}</div>
                  <div className="text-[10px] text-(--color-muted)">Labs Saved</div>
                </div>
                <div className="rounded-xl bg-(--color-surface) border border-(--color-border) px-2 py-2">
                  <div className="font-display font-extrabold text-sm">{exams.length ? `${best}%` : "—"}</div>
                  <div className="text-[10px] text-(--color-muted)">Best Exam</div>
                </div>
                <button
                  type="button"
                  onClick={() => go("certificate")}
                  className="rounded-xl bg-(--color-surface) border border-(--color-border) hover:border-(--color-accent) px-2 py-2 transition cursor-pointer"
                >
                  <div className="font-display font-extrabold text-sm text-(--color-accent-dark)">
                    {certReady ? "Ready ✓" : `${pct}%`}
                  </div>
                  <div className="text-[10px] text-(--color-muted)">Certificate →</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {(progressLoading || examsLoading) && (
          <p className="text-xs text-(--color-muted) mt-4">Syncing your progress…</p>
        )}
        {loadError && (
          <p
            role="alert"
            className="mt-4 text-xs rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2.5"
          >
            Could not load saved progress: {loadError}
          </p>
        )}
      </section>

      {/* ==================== 2. STRUCTURED 9-MODULE CURRICULUM (3x3 GRID) ==================== */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-(--color-accent)">
              Step-by-Step Syllabus
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold mt-0.5">
              Curriculum Modules ({DIPLOMA_MODULES.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["all", `All (${DIPLOMA_MODULES.length})`],
                ["foundation", "Foundation (1–3)"],
                ["analytics", "Lookups & BI (4–6)"],
                ["automation", "Automation & GST (7–9)"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTrackFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  trackFilter === key
                    ? "bg-(--color-accent) text-white border-transparent"
                    : "bg-(--color-surface) text-(--color-muted) border-(--color-border) hover:text-(--color-ink)"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModules.map((m) => {
            const doneCount = m.chapters.filter((chNum) => done.has(chNum)).length;
            const nextInModule = m.chapters.find((chNum) => !done.has(chNum)) ?? m.chapters[0];
            const complete = doneCount === m.chapters.length;
            return (
              <motion.article
                key={m.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.16 }}
                className="group rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden flex flex-col hover:border-(--color-accent)/60 hover:shadow-md transition"
              >
                <div className="relative h-36 overflow-hidden bg-slate-100">
                  <img
                    src={m.image}
                    alt={m.titleEn}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <span className="absolute top-3 left-3 rounded-lg bg-white/95 text-slate-900 text-[11px] font-bold px-2.5 py-1 shadow-xs">
                    {m.code}
                  </span>
                  <span className="absolute bottom-3 left-3 text-white text-xs font-medium">
                    {m.chapters.length} Chapters
                  </span>
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/65 text-white text-[11px] font-semibold px-2.5 py-0.5">
                    {complete ? "Completed ✓" : `${doneCount}/${m.chapters.length}`}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-display font-bold text-base leading-snug text-(--color-ink)">
                      {lang === "hi" ? m.titleHi : m.titleEn}
                    </h3>
                    {lang === "both" && (
                      <p className="text-xs text-(--color-muted) mt-0.5 line-clamp-1">{m.titleHi}</p>
                    )}
                    <p className="text-xs text-(--color-muted) mt-2 line-clamp-2 leading-relaxed">
                      {lang === "hi" ? m.descHi : m.descEn}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.skills.slice(0, 3).map((sk) => (
                        <span
                          key={sk}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-(--color-canvas) border border-(--color-border) text-(--color-muted) font-medium"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <ProgressBar pct={(doneCount / m.chapters.length) * 100} />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => (onOpenChapter ? onOpenChapter(nextInModule) : go("chapters"))}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-(--color-accent-dark) group-hover:text-(--color-accent) transition cursor-pointer"
                      >
                        {doneCount > 0 && !complete ? `Continue Ch ${nextInModule}` : "Open Module"}
                        <ArrowRight size={14} />
                      </button>
                      {complete && <CheckCircle2 size={16} className="text-(--color-good)" />}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="flex justify-center pt-1">
          <Button variant="secondary" onClick={() => go("chapters")}>
            <BookOpen size={15} /> Browse All {CHAPTERS.length} Chapters Index →
          </Button>
        </div>
      </section>

      {/* ==================== 3. LEARNING STUDIOS & PRACTICE HUB (3x2 CLEAN BENTO) ==================== */}
      <section className="space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-(--color-accent)">
            Hands-On Workspace
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold mt-0.5">
            Practice Labs, Visual Studios & Reference Tools
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {studios.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item.key)}
                className="group text-left rounded-2xl border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-accent) hover:shadow-sm transition flex flex-col justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-(--color-accent-soft) text-(--color-accent-dark) flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="text-[11px] font-semibold text-(--color-muted) bg-(--color-canvas) border border-(--color-border) px-2.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-(--color-ink) group-hover:text-(--color-accent-dark) transition">
                      {lang === "hi" ? item.titleHi : item.titleEn}
                    </h3>
                    <p className="text-xs text-(--color-muted) mt-1 leading-relaxed">
                      {lang === "hi" ? item.descHi : item.descEn}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-accent-dark)">
                  Explore <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ==================== 4. INTERACTIVE 3D PREVIEW + DAILY MICRO-LEARNING ==================== */}
      <section className="grid lg:grid-cols-12 gap-5 items-stretch">
        <Card className="lg:col-span-7 !p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-(--color-accent-soft) text-(--color-accent-dark) flex items-center justify-center">
                <Box size={18} />
              </div>
              <div>
                <h3 className="font-display font-bold text-base">Interactive 3D Concept Visualizer</h3>
                <p className="text-xs text-(--color-muted)">
                  Explore Pivot Cubes, Lookup Lasers, and Power Query Pipelines in 3D
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => go("studio3d")} className="!text-xs !px-3 !py-1.5">
              Open 6 3D Labs →
            </Button>
          </div>
          <Excel3DHeroCube />
        </Card>

        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Daily Shortcut Card */}
          <Card className="!p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-(--color-accent-dark)">
                <Keyboard size={14} /> Shortcut of the Day
              </span>
              <button
                type="button"
                onClick={() => go("reference")}
                className="text-xs font-semibold text-(--color-muted) hover:text-(--color-accent-dark) cursor-pointer"
              >
                All {SHORTCUTS.length} Keys →
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-(--color-canvas) border border-(--color-border) p-3.5">
              <kbd className="font-mono text-xs sm:text-sm bg-(--color-surface) border border-(--color-border) rounded-lg px-3 py-1.5 font-bold shadow-2xs shrink-0">
                {tip.win}
              </kbd>
              <span className="text-sm font-medium text-(--color-ink)">{tip.desc}</span>
            </div>
          </Card>

          {/* Study Streak & Milestones */}
          <StreakBadges />

          {/* Aarohi AI Tutor Card */}
          <Card className="!p-5 flex items-center justify-between gap-3 bg-(--color-accent-soft)/40">
            <div className="space-y-0.5">
              <div className="font-display font-bold text-sm flex items-center gap-1.5">
                <Sparkles size={15} className="text-(--color-accent)" /> Stuck on a Formula or GST Rule?
              </div>
              <p className="text-xs text-(--color-muted)">
                Ask Aarohi AI Tutor for instant examples in Hindi & English.
              </p>
            </div>
            <Button variant="secondary" onClick={() => go("aarohi")} className="shrink-0 !text-xs !px-3.5 !py-2">
              Open Tutor →
            </Button>
          </Card>

          {/* Certificate Ready Banner (only highlighted cleanly when close/ready, or compact link) */}
          <Card className="!p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Award size={22} className="text-(--color-accent) shrink-0" />
              <div className="min-w-0">
                <div className="font-display font-bold text-xs sm:text-sm truncate">
                  Practice Diploma Certificate
                </div>
                <div className="text-[11px] text-(--color-muted) truncate">
                  {certReady
                    ? "Unlocked and ready to print!"
                    : `${done.size}/${CHAPTERS.length} chapters · ${PASS_PCT}%+ exam required`}
                </div>
              </div>
            </div>
            <Button variant="ghost" onClick={() => go("certificate")} className="shrink-0 !text-xs !px-3 !py-1.5">
              View →
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}
