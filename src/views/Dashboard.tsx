import { Award, BookOpen, FlaskConical, GraduationCap, Trophy } from "lucide-react";
import { CHAPTERS, LEVEL_STYLE, type Level } from "../data/chapters";
import { useExams, useProgress, useSubmissions, PASS_PCT } from "../lib/academy";
import { SHORTCUTS } from "../data/shortcuts";
import { Card, ProgressBar, Button } from "../components/ui";
import { DonutChart } from "../components/charts";
import { StreakBadges } from "../components/StreakBadges";

export function Dashboard({ name, go }: { name: string; go: (v: "chapters" | "exam" | "lab" | "certificate" | "reference") => void }) {
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
    { icon: BookOpen, label: "Chapters done", v: `${done.size}/${CHAPTERS.length}` },
    { icon: FlaskConical, label: "Lab records", v: subs.length },
    { icon: Trophy, label: "Best exam score", v: exams.length ? `${best}%` : "—" },
    { icon: Award, label: "Practice Certificate", v: done.size === CHAPTERS.length && passed ? "Ready" : "Locked" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Namaste, {name}! 👋</h1>
        <p className="text-(--color-muted) text-sm mt-1">Excel practice course ka safar: Basic se Advanced tak.</p>
      </div>
      {(progressLoading || examsLoading) && <p className="text-sm text-(--color-muted)">Tumhari progress load ho rahi hai…</p>}
      {loadError && <p role="alert" className="text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">Dashboard data load nahi hua: {loadError}</p>}
      <StreakBadges />
      <Card className="!p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-(--color-accent-dark)">Aaj ka shortcut</span>
        <kbd className="font-mono text-sm bg-(--color-accent-soft) rounded-md px-2 py-1">{tip.win}</kbd>
        <span className="text-sm flex-1">{tip.desc}</span>
        <Button variant="secondary" onClick={() => go("reference")}>Sab shortcuts</Button>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4">
            <s.icon size={20} className="text-(--color-accent)" />
            <div className="font-display text-2xl font-extrabold mt-2">{s.v}</div>
            <div className="text-xs text-(--color-muted)">{s.label}</div>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex justify-between text-sm font-semibold mb-2"><span>Course progress</span><span>{pct}%</span></div>
          <ProgressBar pct={pct} />
          <div className="mt-5 space-y-3">
            {levels.map((l) => {
              const all = CHAPTERS.filter((c) => c.level === l);
              const d = all.filter((c) => done.has(c.n)).length;
              return (
                <div key={l}>
                  <div className="flex justify-between text-xs mb-1"><span className="font-semibold" style={{ color: LEVEL_STYLE[l].fg }}>{l}</span><span className="text-(--color-muted)">{d}/{all.length}</span></div>
                  <ProgressBar pct={(d / all.length) * 100} />
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {next ? <Button onClick={() => go("chapters")}>Chapter {next.n} jaari rakho</Button> : <Button onClick={() => go("exam")}>Final exam do</Button>}
            <Button variant="secondary" onClick={() => go("lab")}>Practical Lab</Button>
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center">
          <DonutChart data={[{ label: "Done", value: done.size, color: "#2f9e5b" }, { label: "Left", value: CHAPTERS.length - done.size, color: "#e3e8e5" }]} />
          <p className="text-xs text-(--color-muted) mt-3 text-center">Exam pass karne ke liye {PASS_PCT}% chahiye</p>
        </Card>
      </div>
      <Card className="flex items-center gap-4">
        <GraduationCap className="text-(--color-accent) shrink-0" size={32} />
        <div className="flex-1 text-sm">
          <div className="font-semibold">Practice Certificate</div>
          <div className="text-(--color-muted)">{done.size === CHAPTERS.length && passed ? "Badhai ho! Tumhara practice certificate taiyaar hai." : `Saare ${CHAPTERS.length} chapters poore karo aur practice exam pass karo.`}</div>
        </div>
        <Button variant="secondary" onClick={() => go("certificate")}>Dekho</Button>
      </Card>
    </div>
  );
}
