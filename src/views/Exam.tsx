import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { CHAPTERS } from "../data/chapters";
import { useExams } from "../lib/academy";
import {
  DURATION_SECONDS,
  QUESTION_COUNT,
  buildExam,
  gradeExam,
  mmss,
  PASS_PCT,
  type ExamQuestion,
} from "../lib/exam";
import { Button, Card, Pill, ProgressBar } from "../components/ui";

const STORAGE_KEY = "ema_exam_in_progress_v1";
const MAX_ATTEMPTS_SHOWN = 8;

interface Draft {
  qs: ExamQuestion[];
  ans: number[];
  endAt: number;
}

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!Array.isArray(parsed?.qs) || !parsed.qs.length || !Array.isArray(parsed.ans)) return null;
    if (!Number.isFinite(parsed.endAt) || parsed.endAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / quota — the exam still works, it just cannot be resumed */
  }
}

export function Exam() {
  const { items: past, loading, error: loadError, add } = useExams();
  const [qs, setQs] = useState<ExamQuestion[] | null>(null);
  const [ans, setAns] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(DURATION_SECONDS);
  const [res, setRes] = useState<{ score: number; byLevel: Record<string, [number, number]>; seconds: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const finishedRef = useRef(false);
  const endAtRef = useRef(0);
  const ansRef = useRef<number[]>([]);
  ansRef.current = ans;

  const total = qs?.length ?? QUESTION_COUNT;

  function start(questions = buildExam()) {
    finishedRef.current = false;
    endAtRef.current = Date.now() + DURATION_SECONDS * 1000;
    setQs(questions);
    setAns(Array(questions.length).fill(-1));
    setIndex(0);
    setLeft(DURATION_SECONDS);
    setRes(null);
    setSaveError(null);
    setResumed(false);
    saveDraft({ qs: questions, ans: Array(questions.length).fill(-1), endAt: endAtRef.current });
  }

  // Resume an attempt that a reload/tab-kill interrupted (school devices do that
  // a lot) instead of silently losing twenty minutes of work.
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    finishedRef.current = false;
    endAtRef.current = draft.endAt;
    setQs(draft.qs);
    setAns(draft.ans);
    setLeft(Math.max(0, Math.ceil((draft.endAt - Date.now()) / 1000)));
    setResumed(true);
  }, []);

  // Persist answers as the student moves through the paper.
  useEffect(() => {
    if (!qs || res) return;
    saveDraft({ qs, ans, endAt: endAtRef.current });
  }, [qs, ans, res]);

  const finish = useCallback(() => {
    if (finishedRef.current || !qs) return;
    finishedRef.current = true;

    const outcome = gradeExam(qs, ansRef.current);
    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    const seconds = Math.min(DURATION_SECONDS, Math.max(0, DURATION_SECONDS - remaining));

    setRes({ score: outcome.score, byLevel: outcome.byLevel, seconds });
    saveDraft(null);
    add({
      score: outcome.score,
      total: outcome.total,
      pct: outcome.pct,
      passed: outcome.passed,
      date: new Date().toISOString(),
      seconds,
      byLevel: outcome.byLevel,
    }).catch((error: unknown) => {
      setSaveError(error instanceof Error ? error.message : "Result save nahi hua");
    });
  }, [add, qs]);

  useEffect(() => {
    if (!qs || res) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [qs, res]);

  useEffect(() => {
    if (qs && !res && left <= 0) finish();
  }, [finish, left, qs, res]);

  if (!qs) {
    return (
      <div className="space-y-5 max-w-2xl">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Practice Exam</h1>
        <Card>
          <ul className="text-sm space-y-1.5 list-disc pl-5">
            <li>{QUESTION_COUNT} MCQ — Basic, Intermediate aur Advanced ka balanced mix</li>
            <li>Har baar duplicate-free random sawal aur random options</li>
            <li>Time: 20 minute — khatam hote hi auto-submit</li>
            <li>Practice pass ke liye {PASS_PCT}% chahiye</li>
            <li>Page refresh ho jaye to attempt wahin se resume hota hai</li>
          </ul>
          <Button className="mt-4" onClick={() => start()}>
            Exam shuru karo
          </Button>
        </Card>

        {loading && past.length === 0 && <p className="text-sm text-(--color-muted)">Pichhle attempts load ho rahe hain…</p>}
        {loadError && (
          <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            Attempts load nahi hue: {loadError}
          </p>
        )}

        {past.length > 0 && (
          <Card>
            <h2 className="font-display font-bold mb-3">Pichhle attempts</h2>
            <div className="divide-y divide-(--color-border)">
              {past.slice(0, MAX_ATTEMPTS_SHOWN).map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{new Date(attempt.date).toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    {attempt.score}/{attempt.total} ({attempt.pct}%)
                    <Pill tone={attempt.passed ? "good" : "danger"}>{attempt.passed ? "Pass" : "Fail"}</Pill>
                  </span>
                </div>
              ))}
            </div>
            {past.length > MAX_ATTEMPTS_SHOWN && (
              <p className="text-xs text-(--color-muted) mt-2">
                Sirf aakhri {MAX_ATTEMPTS_SHOWN} attempts dikh rahe hain ({past.length} total).
              </p>
            )}
          </Card>
        )}
      </div>
    );
  }

  if (res) {
    const outcome = gradeExam(qs, ans);
    return (
      <div className="space-y-5 max-w-3xl">
        <Card className="text-center">
          <Pill tone={outcome.passed ? "good" : "danger"}>{outcome.passed ? "PASS" : "FAIL"}</Pill>
          <div className="font-display text-5xl font-extrabold mt-3">{outcome.pct}%</div>
          <p className="text-sm text-(--color-muted)">
            {res.score}/{total} sahi · samay {mmss(res.seconds)}
          </p>
          {saveError && (
            <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 mt-4">
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
          <Button className="mt-5" onClick={() => start()}>
            <RotateCcw size={16} /> Dobara try karo
          </Button>
        </Card>

        <h2 className="font-display font-bold">Detail report</h2>
        {qs.map((question, k) => {
          const good = ans[k] >= 0 && question.opts[ans[k]]?.ok;
          const chapter = CHAPTERS.find((c) => c.n === question.chapter);
          return (
            <Card key={k} className={good ? "!border-green-300" : "!border-red-300"}>
              <p className="text-sm font-semibold">
                {k + 1}. {question.q}
              </p>
              <p className="text-sm mt-1">
                Aapka jawab:{" "}
                <b className={good ? "text-green-700" : "text-red-600"}>
                  {ans[k] >= 0 ? question.opts[ans[k]]?.t : "Chhoda gaya"}
                </b>
              </p>
              {!good && (
                <p className="text-sm">
                  Sahi jawab: <b className="text-green-700">{question.opts.find((option) => option.ok)?.t}</b>
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
    );
  }

  const question = qs[index];
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between sticky top-16 md:top-0 bg-(--color-canvas) py-2 z-10">
        <span className="text-sm font-semibold">
          Sawal {index + 1}/{total}
        </span>
        <span className={`flex items-center gap-1.5 font-mono font-bold ${left < 120 ? "text-red-600" : ""}`} aria-live="off">
          <Clock size={16} /> {mmss(left)}
        </span>
      </div>

      {resumed && (
        <p role="status" className="text-sm rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2">
          Pichhla attempt resume ho gaya — answers wahin se hain jahan tumne chhoda tha.
        </p>
      )}

      <Card>
        <p className="font-semibold">{question.q}</p>
        <div className="mt-4 space-y-2" role="group" aria-label={`Sawal ${index + 1} ke options`}>
          {question.opts.map((option, k) => (
            <button
              key={k}
              type="button"
              aria-pressed={ans[index] === k}
              onClick={() => setAns((current) => current.map((answer, j) => (j === index ? k : answer)))}
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
            type="button"
            aria-label={`Sawal ${k + 1}`}
            aria-current={k === index ? "true" : undefined}
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
          ← Pichhla
        </Button>
        {index < total - 1 ? (
          <Button onClick={() => setIndex(index + 1)}>Agla →</Button>
        ) : (
          <Button onClick={finish}>Submit exam</Button>
        )}
      </div>
    </div>
  );
}
