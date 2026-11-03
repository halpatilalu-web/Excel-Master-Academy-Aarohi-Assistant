import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Lightbulb } from "lucide-react";
import { CHAPTERS, LEVEL_STYLE, type Chapter } from "../data/chapters";
import { useProgress } from "../lib/academy";
import { Button, Card, Pill } from "../components/ui";

function Lesson({
  c,
  done,
  busy,
  onToggle,
  onBack,
  onNext,
}: {
  c: Chapter;
  done: boolean;
  busy: boolean;
  onToggle: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const st = LEVEL_STYLE[c.level];
  const [pick, setPick] = useState<Record<number, number>>({});
  const colors = ["#fff7b0", "#ffd9e6", "#d8f5d0", "#d6ecff"];

  return (
    <div className="space-y-5 max-w-3xl">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-(--color-muted) hover:text-(--color-ink)"
      >
        <ArrowLeft size={16} /> Saare chapters
      </button>

      <div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: st.bg, color: st.fg }}
        >
          {c.level} · Chapter {c.n}
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">{c.title}</h1>
        <p className="mt-2 text-(--color-muted)">{c.intro}</p>
      </div>

      <div className="note rounded-2xl border border-black/10 p-5 shadow-sm" style={{ background: st.note }}>
        <div className="hand text-2xl font-bold text-rose-700 mb-1">📒 Mere Notes</div>
        <ul className="hand text-xl sm:text-2xl space-y-0.5">
          {c.points.map((point, i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: ["#c0392b", "#1f5fbf", "#1b7f45", "#8e44ad"][i % 4] }}>✦</span>
              <span style={{ color: ["#1a1a6e", "#7a1f1f", "#0b5d3b", "#4a2a7a"][i % 4] }}>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {c.formula && (
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">Formula example</div>
          <code className="block mt-2 rounded-xl bg-slate-900 text-emerald-300 px-4 py-3 text-sm sm:text-base overflow-x-auto">
            {c.formula.f}
          </code>
          <p className="text-sm mt-2">{c.formula.note}</p>
        </Card>
      )}

      <div className="rounded-2xl p-4 flex gap-3 hand text-xl text-slate-900" style={{ background: colors[c.n % 4] }}>
        <Lightbulb className="shrink-0 text-amber-600" />
        <span>
          <b>Tip:</b> {c.tip}
        </span>
      </div>

      <Card>
        <h2 className="font-display font-bold mb-3">Quick Check</h2>
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
                      ? "border-green-500 bg-green-50 text-slate-900"
                      : selected
                        ? "border-red-400 bg-red-50 text-slate-900"
                        : "border-(--color-border)"
                    : "border-(--color-border) hover:bg-(--color-accent-soft)";
                  return (
                    <button
                      key={oi}
                      disabled={shown}
                      onClick={() => setPick({ ...pick, [qi]: oi })}
                      className={`text-left text-sm rounded-xl border px-3 py-2 ${cls}`}
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
          <Check size={16} /> {busy ? "Save ho raha hai…" : done ? "Poora ho gaya (undo)" : "Chapter poora mark karo"}
        </Button>
        {c.n < CHAPTERS.length && (
          <Button variant="ghost" onClick={onNext}>
            Agla chapter →
          </Button>
        )}
      </div>
    </div>
  );
}

export function Chapters({
  openChapter,
  onOpenChapter,
}: {
  openChapter?: number | null;
  onOpenChapter?: (chapter: number | null) => void;
} = {}) {
  const { items: prog, loading, error, remove, upsert } = useProgress();
  const [localOpen, setLocalOpen] = useState<number | null>(null);
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const open = openChapter !== undefined ? openChapter : localOpen;
  const setOpen = (chapter: number | null) => {
    if (onOpenChapter) onOpenChapter(chapter);
    else setLocalOpen(chapter);
  };

  const done = new Set(prog.map((p) => p.chapter));
  const current = CHAPTERS.find((c) => c.n === open);

  async function toggle(chapter: Chapter) {
    setActionError(null);
    setBusyChapter(chapter.n);
    try {
      const records = prog.filter((p) => p.chapter === chapter.n);
      if (records.length) {
        // Remove every matching row so legacy duplicates cannot keep it marked done.
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
      {loading && prog.length === 0 && <p className="text-sm text-(--color-muted)">Progress load ho raha hai…</p>}
      {error && (
        <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          Progress load nahi hua: {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
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
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{CHAPTERS.length} Chapters</h1>
        <p className="text-sm text-(--color-muted) mt-1">Hindi/English mixed lessons, rangeen handwritten notes ke saath.</p>
      </div>

      {notices}

      {(["Basic", "Intermediate", "Advanced"] as const).map((level) => (
        <section key={level}>
          <h2 className="font-display font-bold text-lg mb-3" style={{ color: LEVEL_STYLE[level].fg }}>
            {level}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CHAPTERS.filter((c) => c.level === level).map((chapter) => (
              <button
                key={chapter.n}
                onClick={() => setOpen(chapter.n)}
                className="text-left bg-(--color-surface) border border-(--color-border) rounded-2xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold rounded-full w-8 h-8 grid place-items-center"
                    style={{ background: LEVEL_STYLE[level].bg, color: LEVEL_STYLE[level].fg }}
                  >
                    {chapter.n}
                  </span>
                  {done.has(chapter.n) ? (
                    <CheckCircle2 size={18} className="text-green-600" />
                  ) : (
                    <Pill tone="info">Naya</Pill>
                  )}
                </div>
                <div className="font-semibold mt-3 text-sm leading-snug">{chapter.title}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
