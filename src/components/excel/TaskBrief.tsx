/**
 * @license MIT
 * The task brief shown above every practice sheet.
 *
 * This is the answer to "sirf example nahi chahiye, kya karna hai wo likho":
 * numbered steps in Hindi and English, the exact cell + formula to type, the
 * mistake to avoid, and what a finished sheet looks like. It is collapsible so
 * the sheet itself still gets the screen on a phone.
 */
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Keyboard, ListOrdered, PencilLine, Target } from "lucide-react";
import type { PracticeTask } from "../../data/practiceTasks";

export function TaskBrief({
  task,
  startOpen = true,
  onApplyStep,
}: {
  task: PracticeTask;
  startOpen?: boolean;
  /** Tapping a "write" row drops that address into the grid's name box. */
  onApplyStep?: (at: string) => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const [lang, setLang] = useState<"hi" | "en" | "both">("both");

  return (
    <section
      aria-label={`Task brief: ${task.titleEn}`}
      className="neu-card p-3 sm:p-4 space-y-3"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-2 text-left"
      >
        <span className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full neu-pressed-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--color-accent-dark)">
            <Target size={11} /> Aapko yeh karna hai
          </span>
          <span className="block font-display font-extrabold text-base sm:text-lg mt-1.5">{task.titleHi}</span>
          <span className="block text-xs text-(--color-muted)">{task.titleEn}</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-(--color-muted) transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Goal */}
          <div className="rounded-xl neu-pressed-sm px-3 py-2.5">
            <p className="text-xs font-semibold text-(--color-ink) leading-relaxed">{task.goalHi}</p>
            <p className="text-[11px] text-(--color-muted) leading-relaxed mt-1">{task.goalEn}</p>
          </div>

          {/* Language toggle — two full paragraphs on a phone is a wall of text */}
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "both", label: "हिं + EN" },
                { id: "hi", label: "हिंदी" },
                { id: "en", label: "English" },
              ] as const
            ).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setLang(entry.id)}
                aria-pressed={lang === entry.id}
                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                  lang === entry.id
                    ? "neu-pressed-sm text-(--color-accent-dark)"
                    : "text-(--color-muted) hover:text-(--color-ink)"
                }`}
              >
                {entry.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-(--color-muted)">
              {task.steps.length} steps · {task.write.length} cells
            </span>
          </div>

          {/* The numbered instructions */}
          <div>
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--color-muted) mb-1.5">
              <ListOrdered size={13} /> Steps — isi order mein karo
            </h3>
            <ol className="space-y-1.5">
              {task.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 rounded-xl bg-(--color-surface) neu-raised-sm px-2.5 py-2">
                  <span className="shrink-0 grid place-items-center h-5 w-5 rounded-lg neu-pressed-sm text-[10px] font-extrabold text-(--color-accent-dark)">
                    {index + 1}
                  </span>
                  <div className="min-w-0 text-[11px] sm:text-xs leading-relaxed">
                    {lang !== "en" && <p className="text-(--color-ink)">{step.hi}</p>}
                    {lang !== "hi" && (
                      <p className={lang === "both" ? "text-(--color-muted) mt-0.5" : "text-(--color-ink)"}>{step.en}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Exactly what to type, cell by cell */}
          <div>
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--color-muted) mb-1.5">
              <PencilLine size={13} /> Kya likhna hai (cell by cell)
            </h3>
            <div className="rounded-xl neu-pressed-sm overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-(--color-muted)">
                    <th className="px-2 py-1 font-bold">Cell</th>
                    <th className="px-2 py-1 font-bold">Type this</th>
                    <th className="px-2 py-1 font-bold hidden sm:table-cell">Kyun</th>
                  </tr>
                </thead>
                <tbody>
                  {task.write.map((line, index) => (
                    <tr key={`${line.at}-${index}`} className="border-t border-(--color-border)/60">
                      <td className="px-2 py-1 align-top">
                        <button
                          type="button"
                          onClick={() => onApplyStep?.(line.at)}
                          title={`${line.at} par jao`}
                          className="font-mono font-bold text-(--color-accent-dark) underline decoration-dotted underline-offset-2"
                        >
                          {line.at}
                        </button>
                      </td>
                      <td className="px-2 py-1 align-top">
                        <code className="font-mono text-[10.5px] break-all text-(--color-ink)">{line.formula}</code>
                      </td>
                      <td className="px-2 py-1 align-top text-(--color-muted) hidden sm:table-cell">{line.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* The mistake + the finish line */}
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-xl px-2.5 py-2 tone-warn text-[11px] leading-relaxed">
              <span className="flex items-center gap-1 font-bold mb-0.5">
                <AlertTriangle size={12} /> Yahan galti hoti hai
              </span>
              {lang !== "en" && <p>{task.watchOut.hi}</p>}
              {lang !== "hi" && <p className={lang === "both" ? "opacity-80 mt-0.5" : ""}>{task.watchOut.en}</p>}
            </div>
            <div className="rounded-xl px-2.5 py-2 tone-good text-[11px] leading-relaxed">
              <span className="flex items-center gap-1 font-bold mb-0.5">
                <CheckCircle2 size={12} /> Sahi hone par aisa dikhega
              </span>
              <p className="font-mono text-[10.5px]">{task.result.hi}</p>
              {lang !== "hi" && <p className="opacity-80 mt-0.5">{task.result.en}</p>}
            </div>
          </div>

          <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-(--color-muted)">
            <Keyboard size={12} /> Shortcuts: {task.shortcuts.map((key) => (
              <kbd key={key} className="rounded bg-(--color-surface) px-1.5 py-0.5 font-mono shadow-(--neu-raised-sm)">
                {key}
              </kbd>
            ))}
          </p>
        </>
      )}
    </section>
  );
}
