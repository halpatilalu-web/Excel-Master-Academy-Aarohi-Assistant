import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, RotateCcw } from "lucide-react";
import { CHAPTERS, QUESTION_BANK, type ExamQ, type Level } from "../data/chapters";
import { EXTRA_QUESTIONS } from "../data/questions";
import { PASS_PCT, useExams } from "../lib/academy";
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

export function Exam() {
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
          </ul>
          <Button className="mt-4" onClick={start}>
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
              {past.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{new Date(attempt.date).toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    {attempt.score}/{attempt.total} ({attempt.pct}%)
                    <Pill tone={attempt.passed ? "good" : "danger"}>{attempt.passed ? "Pass" : "Fail"}</Pill>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (res) {
    const pct = Math.round((res.score / total) * 100);
    const passed = pct >= PASS_PCT;
    return (
      <div className="space-y-5 max-w-3xl">
        <Card className="text-center">
          <Pill tone={passed ? "good" : "danger"}>{passed ? "PASS" : "FAIL"}</Pill>
          <div className="font-display text-5xl font-extrabold mt-3">{pct}%</div>
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
          <Button className="mt-5" onClick={start}>
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
      <div className="flex items-center justify-between sticky top-0 bg-(--color-canvas) py-2 z-10">
        <span className="text-sm font-semibold">
          Sawal {index + 1}/{total}
        </span>
        <span className={`flex items-center gap-1.5 font-mono font-bold ${left < 120 ? "text-red-600" : ""}`}>
          <Clock size={16} /> {mmss(Math.max(0, left))}
        </span>
      </div>

      <Card>
        <p className="font-semibold">{question.q}</p>
        <div className="mt-4 space-y-2">
          {question.opts.map((option, k) => (
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
