import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  Copy,
  Lightbulb,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Table2,
  Video,
} from "lucide-react";
import { CHAPTERS, LEVEL_STYLE, type Chapter } from "../data/chapters";
import { DIPLOMA_MODULES, getChapterRich, getModuleForChapter } from "../data/diplomaModules";
import { useProgress } from "../lib/academy";
import { Bilingual, LangSwitcher, useLang } from "../lib/lang";
import { Button, Card, Pill, ProgressBar } from "../components/ui";

function Lesson({
  c,
  done,
  busy,
  onToggle,
  onBack,
  onNext,
  onJumpAction,
}: {
  c: Chapter;
  done: boolean;
  busy: boolean;
  onToggle: () => void;
  onBack: () => void;
  onNext: () => void;
  onJumpAction?: (
    target:
      | { kind: "video"; id: string }
      | { kind: "3d"; id: string }
      | { kind: "sheet"; id: string }
      | { kind: "ai"; prompt: string },
  ) => void;
}) {
  const { lang } = useLang();
  const st = LEVEL_STYLE[c.level];
  const rich = getChapterRich(c.n);
  const mod = getModuleForChapter(c.n);
  const [pick, setPick] = useState<Record<number, number>>({});
  const [copied, setCopied] = useState(false);
  const colors = ["#fff7b0", "#ffd9e6", "#d8f5d0", "#d6ecff"];

  return (
    <div className="space-y-5 max-w-4xl print-area">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-muted) hover:text-(--color-ink)"
        >
          <ArrowLeft size={16} /> All {CHAPTERS.length} Diploma Chapters
        </button>
        <div className="flex items-center gap-2">
          <LangSwitcher compact />
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer size={15} /> Print Notes
          </Button>
        </div>
      </div>

      {/* Chapter Hero Banner */}
      <Card className="!p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: st.bg, color: st.fg }}
          >
            {c.level} · Chapter {c.n}/{CHAPTERS.length}
          </span>
          <Pill tone="info">
            {mod.emoji} {mod.code}: {mod.titleEn}
          </Pill>
          {done && <Pill tone="good">✓ Completed</Pill>}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
          {rich.emoji} {c.title}
        </h1>

        <Bilingual en={rich.enIntro} hi={c.intro} />

        {/* Interactive Action Strip: Video + 3D + Live Sheet + Ask AI */}
        {onJumpAction && (
          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => onJumpAction({ kind: "video", id: mod.videoId })}
            >
              <Video size={15} /> Video Lesson
            </Button>
            <Button
              variant="secondary"
              onClick={() => onJumpAction({ kind: "3d", id: mod.model3dId })}
            >
              <Box size={15} /> Interactive 3D Model
            </Button>
            <Button
              variant="secondary"
              onClick={() => onJumpAction({ kind: "sheet", id: mod.sheetId })}
            >
              <Table2 size={15} /> Live Practice Sheet
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                onJumpAction({
                  kind: "ai",
                  prompt: `Chapter ${c.n} (${c.title}) ko simple Hindi aur English dono mein example ke saath samjhao!`,
                })
              }
            >
              <Sparkles size={15} /> Ask Aarohi AI
            </Button>
          </div>
        )}
      </Card>

      {/* Handwritten Notebook Notes (English + Hindi) */}
      <div
        className="note relative rounded-2xl border border-black/10 p-5 pl-9 shadow-sm text-slate-900"
        style={{ background: st.note }}
      >
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-rose-400/60" aria-hidden="true" />
        <div className="hand text-2xl sm:text-3xl font-bold text-rose-800 mb-2">
          📒 Handwritten Study Notes (Ch {c.n})
        </div>

        {(lang === "both" || lang === "en") && (
          <div className="mb-3">
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-300/60 text-emerald-950">
              🇬🇧 English Key Points
            </span>
            <ul className="hand text-xl sm:text-2xl space-y-0.5 mt-1">
              {rich.enPoints.map((point, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-800">✓</span>
                  <span className="text-slate-900">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(lang === "both" || lang === "hi") && (
          <div>
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-300/70 text-amber-950">
              🇮🇳 Hindi / Hinglish Mere Notes
            </span>
            <ul className="hand text-xl sm:text-2xl space-y-0.5 mt-1">
              {c.points.map((point, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: ["#c0392b", "#1f5fbf", "#1b7f45", "#8e44ad"][i % 4] }}>
                    ✦
                  </span>
                  <span style={{ color: ["#1a1a6e", "#7a1f1f", "#0b5d3b", "#4a2a7a"][i % 4] }}>
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Professional Step-by-Step Visual Infographic + Sample Spreadsheet Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-extrabold text-lg">
            📊 Visual Workflow Infographic & Sample Sheet
          </h2>
          <Pill tone="good">Step-by-Step</Pill>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {rich.steps.map((s, idx) => (
            <div
              key={s.label}
              className="rounded-xl border border-(--color-border) bg-(--color-canvas) p-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-(--color-accent) text-white text-xs font-extrabold grid place-items-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-display font-bold text-xs">{s.label}</span>
              </div>
              {(lang === "both" || lang === "en") && (
                <p className="text-xs mt-2 font-medium">🇬🇧 {s.detailEn}</p>
              )}
              {(lang === "both" || lang === "hi") && (
                <p className="text-xs text-(--color-muted) mt-1">🇮🇳 {s.detailHi}</p>
              )}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-(--color-border)">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-(--color-accent-soft) text-(--color-accent-dark)">
              <tr>
                {rich.sampleTable.headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rich.sampleTable.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-(--color-border)">
                  {r.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 font-mono text-xs">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Bilingual
          compact
          en={rich.sampleTable.captionEn}
          hi={rich.sampleTable.captionHi}
          className="text-xs"
        />
      </Card>

      {/* Formula Highlight Card */}
      {c.formula && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
              🧮 Live Formula Syntax
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(c.formula!.f);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-accent-dark) hover:underline"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Formula"}
            </button>
          </div>
          <code className="block mt-2 rounded-xl bg-slate-900 text-emerald-300 px-4 py-3 text-sm sm:text-base overflow-x-auto">
            {c.formula.f}
          </code>
          <p className="text-sm mt-2">{c.formula.note}</p>
        </Card>
      )}

      {/* Handwritten Sticky Pro-Tip */}
      <div
        className="rounded-2xl p-4 flex gap-3 hand text-xl text-slate-900 border border-black/10"
        style={{ background: colors[c.n % 4] }}
      >
        <Lightbulb className="shrink-0 text-amber-600 mt-1" />
        <div className="space-y-1">
          {(lang === "both" || lang === "en") && (
            <div>
              <b>Pro Tip (EN):</b> {rich.enTip}
            </div>
          )}
          {(lang === "both" || lang === "hi") && (
            <div>
              <b>Yaad Rakho (HI):</b> {c.tip}
            </div>
          )}
        </div>
      </div>

      {/* Chapter Quick Check Quiz */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold">✅ Chapter Quick Check Quiz</h2>
          {Object.keys(pick).length > 0 && (
            <button
              type="button"
              onClick={() => setPick({})}
              className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-muted) hover:text-(--color-ink)"
            >
              <RotateCcw size={13} /> Retry Quiz
            </button>
          )}
        </div>
        <div className="space-y-4">
          {c.quiz.map((question, qi) => (
            <div key={qi}>
              <p className="text-sm font-semibold">
                {qi + 1}. {question.q}
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-2">
                {question.o.map((option, oi) => {
                  const selected = pick[qi] === oi;
                  const shown = pick[qi] !== undefined;
                  const cls = shown
                    ? oi === question.a
                      ? "border-green-500 bg-green-50 text-slate-900 font-semibold"
                      : selected
                        ? "border-red-400 bg-red-50 text-slate-900"
                        : "border-(--color-border)"
                    : "border-(--color-border) hover:bg-(--color-accent-soft)";
                  return (
                    <button
                      key={oi}
                      disabled={shown}
                      onClick={() => setPick({ ...pick, [qi]: oi })}
                      className={`text-left text-sm rounded-xl border px-3 py-2 transition ${cls}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onToggle} disabled={busy} variant={done ? "secondary" : "primary"}>
          <Check size={16} />{" "}
          {busy
            ? "Save ho raha hai…"
            : done
              ? "Completed ✓ (Click to Undo)"
              : "Mark Chapter Complete ✓"}
        </Button>
        {c.n < CHAPTERS.length && (
          <Button variant="ghost" onClick={onNext}>
            Next: Chapter {c.n + 1} →
          </Button>
        )}
      </div>
    </div>
  );
}

export function Chapters({
  openChapter,
  onOpenChapter,
  onJumpAction,
}: {
  openChapter?: number | null;
  onOpenChapter?: (chapter: number | null) => void;
  onJumpAction?: (
    target:
      | { kind: "video"; id: string }
      | { kind: "3d"; id: string }
      | { kind: "sheet"; id: string }
      | { kind: "ai"; prompt: string },
  ) => void;
} = {}) {
  const { items: prog, loading, error, remove, upsert } = useProgress();
  const [localOpen, setLocalOpen] = useState<number | null>(null);
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<"modules" | "levels">("modules");
  const [search, setSearch] = useState("");

  const open = openChapter !== undefined ? openChapter : localOpen;
  const setOpen = (chapter: number | null) => {
    if (onOpenChapter) onOpenChapter(chapter);
    else setLocalOpen(chapter);
  };

  const done = useMemo(() => new Set(prog.map((p) => p.chapter)), [prog]);
  const current = CHAPTERS.find((c) => c.n === open);
  const q = search.trim().toLowerCase();

  const matchesChapter = (c: Chapter) => {
    if (!q) return true;
    const rich = getChapterRich(c.n);
    return `${c.n} ${c.title} ${c.intro} ${rich.enIntro}`.toLowerCase().includes(q);
  };

  async function toggle(chapter: Chapter) {
    setActionError(null);
    setBusyChapter(chapter.n);
    try {
      const records = prog.filter((p) => p.chapter === chapter.n);
      if (records.length) {
        await Promise.all(records.map((record) => remove(record.id)));
      } else {
        await upsert({ id: `chapter-${chapter.n}`, chapter: chapter.n });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Progress save nahi hua");
    } finally {
      setBusyChapter(null);
    }
  }

  const notices = (
    <>
      {loading && prog.length === 0 && (
        <p className="text-sm text-(--color-muted)">Progress load ho raha hai…</p>
      )}
      {error && (
        <p
          role="alert"
          className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3"
        >
          Progress load nahi hua: {error}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3"
        >
          Save nahi hua: {actionError}
        </p>
      )}
    </>
  );

  if (current) {
    return (
      <div className="space-y-4">
        {notices}
        <Lesson
          c={current}
          done={done.has(current.n)}
          busy={busyChapter === current.n}
          onBack={() => setOpen(null)}
          onNext={() => setOpen(current.n + 1)}
          onToggle={() => void toggle(current)}
          onJumpAction={onJumpAction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
            🎓 Complete Diploma Syllabus
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">
            {CHAPTERS.length} Bilingual Diploma Chapters (8 Modules)
          </h1>
          <p className="text-sm text-(--color-muted) mt-1">
            Basic Excel → Data Cleaning → Validation → Lookups → Pivot & Dashboards → Power Query → VBA Macros!
          </p>
        </div>
        <LangSwitcher />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setGroupMode("modules")}
            className={`px-4 py-2 rounded-xl text-xs font-bold border ${
              groupMode === "modules"
                ? "bg-(--color-accent) text-white border-transparent"
                : "border-(--color-border) bg-(--color-surface) text-(--color-muted)"
            }`}
          >
            📚 By 8 Diploma Modules
          </button>
          <button
            type="button"
            onClick={() => setGroupMode("levels")}
            className={`px-4 py-2 rounded-xl text-xs font-bold border ${
              groupMode === "levels"
                ? "bg-(--color-accent) text-white border-transparent"
                : "border-(--color-border) bg-(--color-surface) text-(--color-muted)"
            }`}
          >
            🪜 By Difficulty Level
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-(--color-muted)" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter chapters (XLOOKUP, VBA, Clean)…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-(--color-border) bg-(--color-surface) text-sm outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
      </div>

      {notices}

      {groupMode === "modules" ? (
        <div className="space-y-6">
          {DIPLOMA_MODULES.map((mod) => {
            const modChapters = mod.chapters
              .map((num) => CHAPTERS.find((c) => c.n === num)!)
              .filter(Boolean)
              .filter(matchesChapter);
            if (modChapters.length === 0) return null;
            const completedInMod = mod.chapters.filter((n) => done.has(n)).length;

            return (
              <Card key={mod.id} className="!p-0 overflow-hidden">
                <div className="grid md:grid-cols-4 border-b border-(--color-border)">
                  <img
                    src={mod.image}
                    alt={mod.titleEn}
                    className="w-full h-36 md:h-full object-cover"
                  />
                  <div className="md:col-span-3 p-4 sm:p-5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
                        {mod.emoji} {mod.code} · {completedInMod}/{mod.chapters.length} Done
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {mod.skills.map((sk) => (
                          <span
                            key={sk}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-(--color-canvas) border border-(--color-border)"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h2 className="font-display text-lg sm:text-xl font-extrabold">
                      {mod.titleEn}{" "}
                      <span className="text-sm font-normal text-(--color-muted)">
                        · {mod.titleHi}
                      </span>
                    </h2>
                    <Bilingual compact en={mod.descEn} hi={mod.descHi} className="text-xs" />
                    <ProgressBar pct={(completedInMod / mod.chapters.length) * 100} />
                  </div>
                </div>

                <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-(--color-canvas)/40">
                  {modChapters.map((chapter) => {
                    const rich = getChapterRich(chapter.n);
                    return (
                      <button
                        key={chapter.n}
                        onClick={() => setOpen(chapter.n)}
                        className="text-left bg-(--color-surface) border border-(--color-border) rounded-2xl p-3.5 hover:shadow-md hover:border-(--color-accent) transition"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-bold rounded-full px-2.5 py-0.5"
                            style={{
                              background: LEVEL_STYLE[chapter.level].bg,
                              color: LEVEL_STYLE[chapter.level].fg,
                            }}
                          >
                            Ch {chapter.n} · {chapter.level}
                          </span>
                          {done.has(chapter.n) ? (
                            <CheckCircle2 size={18} className="text-green-600" />
                          ) : (
                            <span className="text-base">{rich.emoji}</span>
                          )}
                        </div>
                        <div className="font-semibold mt-2.5 text-sm leading-snug">
                          {chapter.title}
                        </div>
                        <p className="text-xs text-(--color-muted) mt-1 line-clamp-2">
                          {rich.enIntro}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        (["Basic", "Intermediate", "Advanced"] as const).map((level) => {
          const list = CHAPTERS.filter((c) => c.level === level && matchesChapter(c));
          if (!list.length) return null;
          return (
            <section key={level}>
              <h2
                className="font-display font-bold text-lg mb-3"
                style={{ color: LEVEL_STYLE[level].fg }}
              >
                {level} ({list.length} Chapters)
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((chapter) => {
                  const rich = getChapterRich(chapter.n);
                  return (
                    <button
                      key={chapter.n}
                      onClick={() => setOpen(chapter.n)}
                      className="text-left bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold rounded-full w-8 h-8 grid place-items-center"
                          style={{
                            background: LEVEL_STYLE[level].bg,
                            color: LEVEL_STYLE[level].fg,
                          }}
                        >
                          {chapter.n}
                        </span>
                        {done.has(chapter.n) ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : (
                          <Pill tone="info">{rich.emoji} Read</Pill>
                        )}
                      </div>
                      <div className="font-semibold mt-3 text-sm leading-snug">
                        {chapter.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
