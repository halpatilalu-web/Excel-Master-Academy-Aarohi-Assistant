import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, Eye, FileText, Printer, RotateCcw, Zap } from "lucide-react";
import { CHAPTERS, QUESTION_BANK, type ExamQ, type Level } from "../data/chapters";
import { DIPLOMA_MODULES } from "../data/diplomaModules";
import { EXTRA_QUESTIONS } from "../data/questions";
import { SAMPLE_PAPERS } from "../data/samplePapers";
import { PASS_PCT, useExams } from "../lib/academy";
import { Bilingual, LangSwitcher } from "../lib/lang";
import { Button, Card, Pill, ProgressBar } from "../components/ui";

const QUESTION_COUNT = 20;
const DURATION_SECONDS = 20 * 60;
const LEVEL_QUOTAS: Record<Level, number> = { Basic: 6, Intermediate: 8, Advanced: 6 };

interface Q extends ExamQ {
  opts: { t: string; ok: boolean }[];
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uniqueQuestions(): ExamQ[] {
  const seen = new Map<string, ExamQ>();
  for (const question of [...QUESTION_BANK, ...EXTRA_QUESTIONS]) {
    const key = question.q.trim().toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(key)) seen.set(key, question);
  }
  return [...seen.values()];
}

function build(): Q[] {
  const bank = uniqueQuestions();
  const selected: ExamQ[] = [];
  const leftovers: ExamQ[] = [];

  (Object.keys(LEVEL_QUOTAS) as Level[]).forEach((level) => {
    const pool = shuffle(bank.filter((q) => q.level === level));
    selected.push(...pool.slice(0, LEVEL_QUOTAS[level]));
    leftovers.push(...pool.slice(LEVEL_QUOTAS[level]));
  });

  if (selected.length < QUESTION_COUNT) {
    selected.push(...shuffle(leftovers).slice(0, QUESTION_COUNT - selected.length));
  }

  return shuffle(selected)
    .slice(0, QUESTION_COUNT)
    .map((q) => ({ ...q, opts: shuffle(q.o.map((t, i) => ({ t, ok: i === q.a }))) }));
}

const mmss = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function ModuleTopicQuizzes() {
  const [modId, setModId] = useState(DIPLOMA_MODULES[0].id);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [seedKey, setSeedKey] = useState(0);

  const mod = DIPLOMA_MODULES.find((m) => m.id === modId) ?? DIPLOMA_MODULES[0];
  const quizQuestions = useMemo(() => {
    void seedKey;
    const all = uniqueQuestions().filter((q) => mod.chapters.includes(q.chapter));
    return shuffle(all).slice(0, 8);
  }, [mod.chapters, seedKey]);

  const answered = Object.keys(picks).length;
  const correct = quizQuestions.filter((q, idx) => picks[idx] === q.a).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DIPLOMA_MODULES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setModId(m.id);
              setPicks({});
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              m.id === modId
                ? "bg-(--color-accent) text-white border-transparent"
                : "border-(--color-border) bg-(--color-surface) text-(--color-muted)"
            }`}
          >
            {m.emoji} {m.code}: {m.titleEn.split(" ")[0]}
          </button>
        ))}
      </div>

      <Card className="!p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-extrabold text-lg">
            {mod.emoji} {mod.titleEn} — Topic Quiz ({quizQuestions.length} MCQs)
          </h2>
          <p className="text-xs text-(--color-muted)">
            Score: <b>{correct}/{answered}</b> answered · Chapters: {mod.chapters.join(", ")}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setPicks({});
            setSeedKey((k) => k + 1);
          }}
        >
          <RotateCcw size={15} /> New Question Set
        </Button>
      </Card>

      <div className="space-y-3">
        {quizQuestions.map((q, qi) => {
          const chosen = picks[qi];
          const revealed = chosen !== undefined;
          const chapter = CHAPTERS.find((c) => c.n === q.chapter);
          return (
            <Card key={`${modId}-${seedKey}-${qi}`} className="!p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm">
                  {qi + 1}. {q.q}
                </p>
                <Pill tone="info">Ch {q.chapter}</Pill>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.o.map((opt, oi) => {
                  const cls = revealed
                    ? oi === q.a
                      ? "border-emerald-500 bg-emerald-500/15 font-bold"
                      : chosen === oi
                        ? "border-rose-400 bg-rose-500/15"
                        : "border-(--color-border) opacity-75"
                    : "border-(--color-border) hover:bg-(--color-accent-soft)";
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={revealed}
                      onClick={() => setPicks((cur) => ({ ...cur, [qi]: oi }))}
                      className={`text-left text-xs sm:text-sm rounded-xl border px-3 py-2.5 transition ${cls}`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <p className="text-xs text-(--color-muted)">
                  {chosen === q.a ? "✅ Sahi jawab / Correct!" : `❌ Right Answer: ${q.o[q.a]}`} · Ref: Ch{" "}
                  {q.chapter} ({chapter?.title})
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SamplePapersView() {
  const [paperId, setPaperId] = useState(SAMPLE_PAPERS[0].id);
  const [mcqPicks, setMcqPicks] = useState<Record<string, number>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [draftFormulas, setDraftFormulas] = useState<Record<string, string>>({});

  const paper = SAMPLE_PAPERS.find((p) => p.id === paperId) ?? SAMPLE_PAPERS[0];

  return (
    <div className="space-y-5 print-area">
      <div className="flex flex-wrap gap-2">
        {SAMPLE_PAPERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPaperId(p.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              p.id === paperId
                ? "bg-(--color-accent) text-white border-transparent shadow-sm"
                : "border-(--color-border) bg-(--color-surface) text-(--color-muted)"
            }`}
          >
            {p.emoji} {p.code}: {p.titleEn.split("—")[0]}
          </button>
        ))}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-2 border-(--color-accent)/40">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-(--color-accent-dark)">
            {paper.code} · Max Marks: {paper.marks} · Duration: {paper.duration}
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold mt-1">
            {paper.emoji} {paper.titleEn}
          </h2>
          <p className="text-xs text-(--color-muted)">{paper.titleHi}</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={15} /> Print Question Paper
        </Button>
      </Card>

      {/* Section A: Objective MCQs */}
      <section className="space-y-3">
        <h3 className="font-display font-bold text-lg">
          Section A — Objective Questions (Click to Attempt)
        </h3>
        {paper.mcqs.map((m, idx) => {
          const key = `${paper.id}-mcq-${idx}`;
          const chosen = mcqPicks[key];
          return (
            <Card key={key} className="!p-4 space-y-3">
              <Bilingual
                compact
                en={
                  <b>
                    Q{idx + 1}. {m.qEn}
                  </b>
                }
                hi={
                  <span>
                    प्र.{idx + 1}. {m.qHi}
                  </span>
                }
              />
              <div className="grid sm:grid-cols-2 gap-2">
                {m.opts.map((opt, oi) => {
                  const cls =
                    chosen !== undefined
                      ? oi === m.ans
                        ? "border-emerald-500 bg-emerald-500/15 font-bold"
                        : chosen === oi
                          ? "border-rose-400 bg-rose-500/15"
                          : "border-(--color-border)"
                      : "border-(--color-border) hover:bg-(--color-accent-soft)";
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setMcqPicks((cur) => ({ ...cur, [key]: oi }))}
                      className={`text-left text-xs sm:text-sm rounded-xl border px-3 py-2 transition ${cls}`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                    </button>
                  );
                })}
              </div>
              {chosen !== undefined && (
                <Bilingual en={`✅ ${m.expEn}`} hi={`✅ ${m.expHi}`} />
              )}
            </Card>
          );
        })}
      </section>

      {/* Section B: Formula Writing */}
      <section className="space-y-3">
        <h3 className="font-display font-bold text-lg">
          Section B — Practical Formula Writing Problems
        </h3>
        {paper.formulaTasks.map((ft, idx) => {
          const key = `${paper.id}-ft-${idx}`;
          const open = !!showKey[key];
          return (
            <Card key={key} className="!p-4 space-y-3">
              <Bilingual en={ft.scenarioEn} hi={ft.scenarioHi} />
              <div className="text-xs font-mono bg-(--color-canvas) px-3 py-2 rounded-lg border border-(--color-border)">
                Sample Cells: {ft.sampleRef}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={draftFormulas[key] ?? ""}
                  onChange={(e) => setDraftFormulas((cur) => ({ ...cur, [key]: e.target.value }))}
                  placeholder="Write your Excel formula here (e.g., =B2*$G$1)…"
                  className="flex-1 rounded-xl border border-(--color-border) bg-(--color-canvas) px-3 py-2 font-mono text-xs sm:text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={() => setShowKey((cur) => ({ ...cur, [key]: !open }))}
                >
                  <Eye size={15} /> {open ? "Hide Model Answer" : "Show Model Answer"}
                </Button>
              </div>
              {open && (
                <div className="space-y-2 pt-1">
                  <code className="block rounded-xl bg-slate-900 text-emerald-300 px-4 py-2.5 text-xs sm:text-sm font-mono">
                    Model Formula: {ft.modelFormula}
                  </code>
                  <Bilingual en={ft.explanationEn} hi={ft.explanationHi} />
                </div>
              )}
            </Card>
          );
        })}
      </section>

      {/* Section C: Viva & Practical Case Study */}
      <section className="space-y-3">
        <h3 className="font-display font-bold text-lg">
          Section C — Interview Viva & Practical Case Answers
        </h3>
        {paper.vivaQuestions.map((vq, idx) => {
          const key = `${paper.id}-viva-${idx}`;
          const open = showKey[key] ?? true;
          return (
            <Card key={key} className="!p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Bilingual
                  compact
                  en={<b>Viva Q: {vq.qEn}</b>}
                  hi={<span>Viva सवाल: {vq.qHi}</span>}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((cur) => ({ ...cur, [key]: !open }))}
                  className="text-xs font-bold text-(--color-accent-dark) shrink-0"
                >
                  {open ? "Hide" : "Reveal"}
                </button>
              </div>
              {open && (
                <Bilingual
                  en={<pre className="whitespace-pre-wrap font-sans text-sm">{vq.aEn}</pre>}
                  hi={<pre className="whitespace-pre-wrap font-sans text-sm">{vq.aHi}</pre>}
                />
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
}

export function Exam() {
  const [mode, setMode] = useState<"final" | "quizzes" | "papers">("final");
  const { items: past, loading, error: loadError, add } = useExams();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [ans, setAns] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(DURATION_SECONDS);
  const [res, setRes] = useState<{
    score: number;
    byLevel: Record<string, [number, number]>;
    seconds: number;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const endAtRef = useRef(0);

  const total = qs?.length ?? QUESTION_COUNT;

  function start() {
    const built = build();
    setQs(built);
    setAns(Array(built.length).fill(-1));
    setIndex(0);
    setLeft(DURATION_SECONDS);
    setRes(null);
    setSaveError(null);
    finishedRef.current = false;
    endAtRef.current = Date.now() + DURATION_SECONDS * 1000;
  }

  const finish = useCallback(() => {
    if (finishedRef.current || !qs) return;
    finishedRef.current = true;

    const byLevel: Record<string, [number, number]> = {};
    let score = 0;
    qs.forEach((question, k) => {
      const ok = ans[k] >= 0 && question.opts[ans[k]]?.ok;
      if (ok) score++;
      byLevel[question.level] = [
        (byLevel[question.level]?.[0] ?? 0) + (ok ? 1 : 0),
        (byLevel[question.level]?.[1] ?? 0) + 1,
      ];
    });

    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    const seconds = Math.min(DURATION_SECONDS, Math.max(0, DURATION_SECONDS - remaining));
    const pct = Math.round((score / qs.length) * 100);

    setRes({ score, byLevel, seconds });
    add({
      score,
      total: qs.length,
      pct,
      passed: pct >= PASS_PCT,
      date: new Date().toISOString(),
      seconds,
      byLevel,
    }).catch((error: unknown) => {
      setSaveError(error instanceof Error ? error.message : "Result save nahi hua");
    });
  }, [add, ans, qs]);

  useEffect(() => {
    if (!qs || res) return;
    const tick = () => {
      setLeft(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [qs, res]);

  useEffect(() => {
    if (qs && !res && left <= 0) finish();
  }, [finish, left, qs, res]);

  const examRunning = qs !== null && !res;

  return (
    <div className="space-y-6">
      {!examRunning && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
                📝 Diploma Examination & Test Center
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">
                Final Exam, Module Quizzes & Solved Sample Papers 🏆
              </h1>
              <p className="text-sm text-(--color-muted) mt-1">
                280+ question bank, 8 instant topic quizzes, 5 solved bilingual Diploma sample papers & timed final exam!
              </p>
            </div>
            <LangSwitcher />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("final")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                mode === "final"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "bg-(--color-surface) border border-(--color-border) text-(--color-muted)"
              }`}
            >
              <ClipboardCheck size={16} /> Final Diploma Exam (20 Q)
            </button>
            <button
              type="button"
              onClick={() => setMode("quizzes")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                mode === "quizzes"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "bg-(--color-surface) border border-(--color-border) text-(--color-muted)"
              }`}
            >
              <Zap size={16} /> 8 Module Topic Quizzes
            </button>
            <button
              type="button"
              onClick={() => setMode("papers")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                mode === "papers"
                  ? "bg-(--color-accent) text-white shadow-sm"
                  : "bg-(--color-surface) border border-(--color-border) text-(--color-muted)"
              }`}
            >
              <FileText size={16} /> 5 Solved Sample Papers
            </button>
          </div>
        </>
      )}

      {mode === "quizzes" && !examRunning && <ModuleTopicQuizzes />}
      {mode === "papers" && !examRunning && <SamplePapersView />}

      {mode === "final" && !qs && (
        <div className="space-y-5 max-w-3xl">
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-(--color-accent)" size={22} />
              <h2 className="font-display font-extrabold text-xl">
                Official Practice Diploma Final Exam
              </h2>
            </div>
            <Bilingual
              en="20 randomized MCQs balanced across Basic (6), Intermediate (8), and Advanced (6) modules. Score 60%+ in 20 minutes to unlock your Practice Diploma Certificate!"
              hi="Basic (6), Intermediate (8) aur Advanced (6) chapters se 20 random sawal. 20 minute mein 60%+ laakar apna Practice Diploma Certificate unlock karo!"
            />
            <Button className="mt-2" onClick={start}>
              🚀 Start Timed Diploma Exam
            </Button>
          </Card>

          {loading && past.length === 0 && (
            <p className="text-sm text-(--color-muted)">Pichhle attempts load ho rahe hain…</p>
          )}
          {loadError && (
            <p
              role="alert"
              className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3"
            >
              Attempts load nahi hue: {loadError}
            </p>
          )}

          {past.length > 0 && (
            <Card>
              <h2 className="font-display font-bold mb-3">Past Exam Attempts ({past.length})</h2>
              <div className="divide-y divide-(--color-border)">
                {past.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{new Date(attempt.date).toLocaleString()}</span>
                    <span className="flex items-center gap-2">
                      {attempt.score}/{attempt.total} ({attempt.pct}%)
                      <Pill tone={attempt.passed ? "good" : "danger"}>
                        {attempt.passed ? "Pass ✓" : "Retry"}
                      </Pill>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {mode === "final" && qs && res && (
        <div className="space-y-5 max-w-3xl">
          <Card className="text-center">
            <Pill tone={Math.round((res.score / total) * 100) >= PASS_PCT ? "good" : "danger"}>
              {Math.round((res.score / total) * 100) >= PASS_PCT ? "PASSED 🎉" : "TRY AGAIN"}
            </Pill>
            <div className="font-display text-5xl font-extrabold mt-3">
              {Math.round((res.score / total) * 100)}%
            </div>
            <p className="text-sm text-(--color-muted)">
              {res.score}/{total} correct · time {mmss(res.seconds)}
            </p>
            {saveError && (
              <p
                role="alert"
                className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 mt-4"
              >
                Result screen par sahi hai, lekin server par save nahi hua: {saveError}
              </p>
            )}
            <div className="mt-4 space-y-2 text-left max-w-sm mx-auto">
              {Object.entries(res.byLevel).map(([level, [correct, count]]) => (
                <div key={level}>
                  <div className="flex justify-between text-xs">
                    <span>{level}</span>
                    <span>
                      {correct}/{count}
                    </span>
                  </div>
                  <ProgressBar pct={count ? (correct / count) * 100 : 0} />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-center gap-2">
              <Button onClick={start}>
                <RotateCcw size={16} /> Retake Exam
              </Button>
              <Button variant="secondary" onClick={() => setQs(null)}>
                Back to Exam Hub
              </Button>
            </div>
          </Card>

          <h2 className="font-display font-bold">Detailed Answer Review</h2>
          {qs.map((question, k) => {
            const good = ans[k] >= 0 && question.opts[ans[k]]?.ok;
            const chapter = CHAPTERS.find((c) => c.n === question.chapter);
            return (
              <Card key={k} className={good ? "!border-green-300" : "!border-red-300"}>
                <p className="text-sm font-semibold">
                  {k + 1}. {question.q}
                </p>
                <p className="text-sm mt-1">
                  Your Answer:{" "}
                  <b className={good ? "text-green-700" : "text-red-600"}>
                    {ans[k] >= 0 ? question.opts[ans[k]]?.t : "Skipped"}
                  </b>
                </p>
                {!good && (
                  <p className="text-sm">
                    Correct Answer:{" "}
                    <b className="text-green-700">
                      {question.opts.find((option) => option.ok)?.t}
                    </b>
                  </p>
                )}
                <p className="text-xs text-(--color-muted) mt-1">
                  Chapter {question.chapter}
                  {chapter ? `: ${chapter.title}` : ""}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {mode === "final" && qs && !res && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between sticky top-0 bg-(--color-canvas) py-2 z-10">
            <span className="text-sm font-semibold">
              Question {index + 1}/{total}
            </span>
            <span
              className={`flex items-center gap-1.5 font-mono font-bold ${
                left < 120 ? "text-red-600" : ""
              }`}
            >
              <Clock size={16} /> {mmss(Math.max(0, left))}
            </span>
          </div>

          <Card>
            <p className="font-semibold">{qs[index].q}</p>
            <div className="mt-4 space-y-2">
              {qs[index].opts.map((option, k) => (
                <button
                  key={k}
                  onClick={() => setAns(ans.map((answer, j) => (j === index ? k : answer)))}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm ${
                    ans[index] === k
                      ? "border-(--color-accent) bg-(--color-accent-soft) font-semibold"
                      : "border-(--color-border) hover:bg-(--color-canvas)"
                  }`}
                >
                  {String.fromCharCode(65 + k)}. {option.t}
                </button>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap gap-1.5">
            {qs.map((_, k) => (
              <button
                key={k}
                onClick={() => setIndex(k)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                  k === index
                    ? "bg-(--color-accent) text-white"
                    : ans[k] >= 0
                      ? "bg-(--color-accent-soft)"
                      : "bg-(--color-surface) border border-(--color-border)"
                }`}
              >
                {k + 1}
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              ← Previous
            </Button>
            {index < total - 1 ? (
              <Button onClick={() => setIndex(index + 1)}>Next →</Button>
            ) : (
              <Button onClick={finish}>Submit Diploma Exam</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
