/**
 * @license MIT
 * "Sare formulas ki practice" — one drill per worksheet function.
 *
 * The Lab already had eleven hand-written practice sheets. This panel adds the
 * other half of the promise: a practice sheet for **every** function the app
 * knows (398 of them), grouped by Excel's own categories, each with
 *
 *   1. a seeded worksheet (`FORMULA_DATASETS`) on which the example really
 *      calculates — SUM needs numbers, FIND needs a separator,
 *   2. the exact formula to type, in H1, clear of the data,
 *   3. the answer the engine actually returns (`expected`, computed by the
 *      generator, never typed by hand), and
 *   4. "Check answers", which re-runs the same cells in the grid.
 *
 * Because expected values are computed, a drill can only pass if the student's
 * formula agrees with the real engine — the point of the whole exercise.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Filter, FunctionSquare, RotateCcw, Search } from "lucide-react";
import { Button, Pill } from "./ui";
import { ExcelGrid, type GridCheck } from "./ExcelGrid";
import { TaskBrief } from "./excel/TaskBrief";
import {
  ANSWER_CELL,
  DRILL_COUNTS,
  FORMULA_DRILLS,
  drillSheet,
  type FormulaDrill,
} from "../data/formulaPractice";
import { CATALOG_CATS, type CatalogCat } from "../data/formulaCatalog";
import type { PracticeTask } from "../data/practiceTasks";
import { useWorkbooks } from "../lib/excel/useWorkbook";

/** A drill becomes a `PracticeTask` so it renders in the same TaskBrief. */
function briefFor(drill: FormulaDrill): PracticeTask {
  const sheet = drillSheet(drill);
  return {
    id: `formula-${drill.name}` as PracticeTask["id"],
    titleHi: `${drill.name} — ${drill.syntax}`,
    titleEn: `${drill.name} practice (${drill.cat})`,
    goalHi: drill.goalHi,
    goalEn: drill.goalEn,
    steps: [
      {
        hi: `Sheet “${sheet.label}” ready hai: ${sheet.tell}`,
        en: `The “${sheet.label}” sheet is ready: ${sheet.tell}`,
      },
      {
        hi: `${ANSWER_CELL} par tap karo aur likho: ${drill.formula} — Enter dabao.`,
        en: `Tap ${ANSWER_CELL} and type ${drill.formula}, then Enter.`,
      },
      {
        hi: `Formula ka jawab ${drill.expected} aana chahiye. Upar “Check answers” dabao — green tick aa gaya matlab sahi.`,
        en: `The answer should be ${drill.expected}. Press “Check answers” — a green tick means it matches the engine.`,
      },
    ],
    write: [{ at: ANSWER_CELL, formula: drill.formula, why: drill.hintEn }],
    watchOut: { hi: drill.watchOutHi, en: drill.watchOutEn },
    result: {
      hi: `${ANSWER_CELL} mein ${drill.expected} dikhna chahiye.`,
      en: `${ANSWER_CELL} must show ${drill.expected}.`,
    },
    shortcuts: ["F2 (edit)", "F4 (absolute $)", "Ctrl+Enter", "Esc (cancel)"],
  };
}

const CAT_TONE: Record<CatalogCat, string> = {
  "Math & Trig": "from-sky-500/15 to-sky-500/5",
  Statistical: "from-violet-500/15 to-violet-500/5",
  Logical: "from-amber-500/15 to-amber-500/5",
  Text: "from-emerald-500/15 to-emerald-500/5",
  "Date & Time": "from-orange-500/15 to-orange-500/5",
  "Lookup & Reference": "from-cyan-500/15 to-cyan-500/5",
  Financial: "from-lime-500/15 to-lime-500/5",
  Information: "from-slate-500/15 to-slate-500/5",
  Engineering: "from-indigo-500/15 to-indigo-500/5",
  Database: "from-rose-500/15 to-rose-500/5",
  "Dynamic Array": "from-fuchsia-500/15 to-fuchsia-500/5",
  Web: "from-teal-500/15 to-teal-500/5",
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function FormulaPracticeLab({ initialFormula = "SUM" }: { initialFormula?: string }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatalogCat | "All">("All");
  const [onlyLeft, setOnlyLeft] = useState(false);
  const [name, setName] = useState(() => (FORMULA_DRILLS.some((d) => d.name === initialFormula) ? initialFormula : "SUM"));
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [solutions, setSolutions] = useState(false);
  const [briefOpen, setBriefOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 768);
  const [started, setStarted] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { items } = useWorkbooks();
  const drill = useMemo(
    () => FORMULA_DRILLS.find((entry) => entry.name === name) ?? FORMULA_DRILLS[0],
    [name],
  );
  const sheet = useMemo(() => drillSheet(drill), [drill]);
  const brief = useMemo(() => briefFor(drill), [drill]);
  const checks = useMemo<GridCheck[]>(
    () => [
      {
        cell: ANSWER_CELL,
        expected: drill.expected,
        formulaSample: drill.formula,
        label: drill.name,
      },
    ],
    [drill],
  );
  /** A saved workbook for this exact drill wins over the seeded sheet. */
  const gridSheets = useMemo(() => {
    const saved = items.find((doc) => doc.template === `formula-${drill.name}`);
    return [{ name: "Practice", cells: { ...(saved?.sheets[0]?.cells ?? sheet.cells) } }];
  }, [items, drill.name, sheet]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return FORMULA_DRILLS.filter((entry) => {
      if (cat !== "All" && entry.cat !== cat) return false;
      if (onlyLeft && started[entry.name]) return false;
      if (!text) return true;
      return (
        entry.name.toLowerCase().includes(text) ||
        entry.cat.toLowerCase().includes(text) ||
        entry.hintEn.toLowerCase().includes(text) ||
        entry.hintHi.toLowerCase().includes(text) ||
        // "sum" should find SUM, SUMIF and SUMIFS but not CONSUME.
        new RegExp(`^${escapeRegExp(text)}`).test(entry.name.toLowerCase()) ||
        entry.syntax.toLowerCase().includes(text)
      );
    });
  }, [query, cat, onlyLeft, started]);

  useEffect(() => {
    setJumpTo(null);
    setStatus(null);
    setSolutions(false);
  }, [drill.name]);

  const done = FORMULA_DRILLS.filter((entry) => started[entry.name]).length;

  /** Scroll the sheet into view after picking a drill (no-op in jsdom tests). */
  const revealSheet = () => {
    if (typeof panelRef.current?.scrollIntoView === "function") {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const pick = (next: string) => {
    setName(next);
    setStarted((current) => ({ ...current, [next]: true }));
    setStatus(`${next} drill khul gaya — H1 mein formula likho.`);
    setSolutions(false);
    // On a phone the function list is tall; scroll the sheet back into view.
    revealSheet();
  };

  const resetDrill = () => {
    // The grid keys on the drill name, so re-keying remounts it with the seeded
    // cells — exactly "Reset sheet" without reaching into the grid's internals.
    setName((current) => current);
    setJumpTo(null);
    setSolutions(false);
    setStatus("Seed data wapas aa gaya — formula dobara try karo.");
    revealSheet();
  };

  return (
    <div className="space-y-4">
      <section className="neu-card p-3 sm:p-4 space-y-3" aria-label="Formula practice lab">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-extrabold text-base sm:text-lg flex items-center gap-2">
              <FunctionSquare size={18} className="text-(--color-accent)" />
              Sare formulas ki practice — {FORMULA_DRILLS.length} drills
            </h3>
            <p className="text-[11px] sm:text-xs text-(--color-muted)">
              Har function ki alag practice sheet: seedha data, likhne ka exact cell, aur engine se check. Kabhi bhi
              koi bhi formula kholo.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Pill tone="info">
              {done}/{FORMULA_DRILLS.length} tried
            </Pill>
            <Pill tone="good">{checks.length} check</Pill>
          </div>
        </div>

        {/* Category chips — one per Excel group, with its drill count. */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCat("All")}
            aria-pressed={cat === "All"}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
              cat === "All"
                ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)"
                : "neu-btn text-(--color-muted)"
            }`}
          >
            All ({FORMULA_DRILLS.length})
          </button>
          {CATALOG_CATS.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setCat(entry)}
              aria-pressed={cat === entry}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                cat === entry
                  ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)"
                  : "neu-btn text-(--color-muted)"
              }`}
            >
              {entry} ({DRILL_COUNTS[entry] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-muted)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Formula dhoondo — SUMIF, VLOOKUP, XIRR…"
              aria-label="Search formulas"
              className="w-full neu-field pl-8 pr-3 py-2 text-sm focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setOnlyLeft((value) => !value)}
            aria-pressed={onlyLeft}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition ${
              onlyLeft ? "bg-(--color-accent) text-white" : "neu-btn text-(--color-muted)"
            }`}
          >
            <Filter size={13} /> {onlyLeft ? "Sirf baaki" : "Sab dikhao"}
          </button>
        </div>

        {/* The function list: compact rows, scrollable, filtered live. */}
        <div className="max-h-64 overflow-y-auto rounded-xl neu-pressed-sm p-1.5" role="list" aria-label="Formula drills">
          {visible.length === 0 && (
            <p className="px-2 py-4 text-xs text-(--color-muted)">
              Is filter par koi formula nahi mila — search saaf karo ya doosri category chuno.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {visible.map((entry) => (
              <button
                key={entry.name}
                type="button"
                role="listitem"
                aria-current={entry.name === drill.name}
                onClick={() => pick(entry.name)}
                className={`text-left rounded-lg px-2 py-1.5 text-[11px] font-semibold truncate transition ${
                  entry.name === drill.name
                    ? "bg-(--color-accent) text-white shadow-(--neu-raised-sm)"
                    : `bg-gradient-to-br ${CAT_TONE[entry.cat]} text-(--color-ink) hover:shadow-(--neu-raised-sm)`
                }`}
                title={`${entry.name} — ${entry.hintEn}`}
              >
                {entry.name}
                {started[entry.name] && entry.name !== drill.name && (
                  <CheckCircle2 size={10} className="inline ml-1 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div ref={panelRef} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="good">{drill.cat}</Pill>
          <Pill tone="info">{sheet.label}</Pill>
          {drill.kind === "error" && <Pill tone="warn">Expected error: {drill.expected}</Pill>}
          <span className="text-[11px] text-(--color-muted)">
            {visible.length} matches · answers engine se verified
          </span>
          <span className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setBriefOpen((value) => !value)}>
              {briefOpen ? "Hide task" : "Task brief"}
            </Button>
            <Button variant="secondary" onClick={() => setSolutions((value) => !value)}>
              {solutions ? "Hide solution" : "Show solution"}
            </Button>
            <Button variant="ghost" onClick={resetDrill}>
              <RotateCcw size={14} /> Reset
            </Button>
          </span>
        </div>

        {briefOpen && (
          <TaskBrief
            task={brief}
            startOpen
            onApplyStep={(at) => {
              const first = at.split(":")[0].replace(/[^A-Z0-9$]/gi, "");
              if (/^\$?[A-Z]{1,3}\$?\d+$/i.test(first)) setJumpTo(first.replace(/\$/g, ""));
            }}
          />
        )}

        {solutions && (
          <div className="rounded-xl neu-pressed-sm px-3.5 py-2.5 text-xs space-y-1">
            <div>
              <strong>Formula:</strong> <code className="font-mono">{drill.formula}</code> → <strong>{ANSWER_CELL}</strong>
            </div>
            <div>
              <strong>Answer:</strong> <code className="font-mono">{drill.expected}</code>{" "}
              <span className="text-(--color-muted)">({drill.kind === "error" ? "expected Excel error" : "value"})</span>
            </div>
            <div className="text-(--color-muted)">{drill.hintEn}</div>
            <div className="text-(--color-muted)">{drill.hintHi}</div>
          </div>
        )}

        {status && (
          <p role="status" className="text-[11px] font-semibold text-(--color-accent-dark)">
            {status}
          </p>
        )}

        <ExcelGrid
          key={drill.name}
          template={`formula-${drill.name}`}
          title={`${drill.name} practice`}
          sheets={gridSheets}
          rows={16}
          cols={9}
          jumpTo={jumpTo}
          brief={{
            title: `${drill.name} — ${drill.syntax}`,
            hint: drill.goalHi,
            formulaHint: solutions ? drill.formula : `${ANSWER_CELL} mein likho`,
            checks,
          }}
          headerActions={
            <Button onClick={() => setSolutions(true)}>
              <ExternalLink size={14} /> Answer dekho
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-(--color-muted)">
          <CheckCircle2 size={13} /> {ANSWER_CELL} ka jawab {drill.expected} aana chahiye — “Check answers” engine se
          compare karta hai.
          <span className="inline-flex items-center gap-1">
            <RotateCcw size={12} /> Reset se seed data wapas.
          </span>
        </div>
      </div>
    </div>
  );
}
