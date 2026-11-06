/**
 * @license MIT
 * "Sab kuch free" page — the promise, itemised.
 *
 * Students distrust "everything is free" because paid courses say it and then
 * hide XLOOKUP behind a plan. This page lists every feature with its real
 * status, so what is free is provable and what is not is honest.
 */
import { useMemo, useState } from "react";
import { BadgeCheck, Filter, Info, Sparkles, Table2 } from "lucide-react";
import { Card, Pill } from "../components/ui";
import { Bilingual } from "../lib/lang";
import { FREE_FEATURES, FREE_GROUPS, STATUS_STYLE, type FreeStatus } from "../data/freeFeatures";
import { knownFunctions } from "../lib/excel/formula/engine";
import { M365_COUNT } from "../data/formulaCatalog";

export function Free() {
  const [group, setGroup] = useState<string>("All");
  const [status, setStatus] = useState<FreeStatus | "All">("All");

  const rows = useMemo(
    () =>
      FREE_FEATURES.filter((feature) => (group === "All" ? true : feature.group === group)).filter((feature) =>
        status === "All" ? true : feature.status === status,
      ),
    [group, status],
  );

  const counts = useMemo(
    () => ({
      full: FREE_FEATURES.filter((f) => f.status === "full").length,
      limit: FREE_FEATURES.filter((f) => f.status === "browser-limit").length,
      only: FREE_FEATURES.filter((f) => f.status === "excel-only").length,
    }),
    [],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-(--color-border) bg-(--color-surface) p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark) px-3 py-1 text-xs font-bold">
              <BadgeCheck size={14} /> No subscription · no trial · no card
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Everything Excel charges for, free — itemised
            </h1>
            <Bilingual
              en="Office 365 keeps XLOOKUP, FILTER, LAMBDA, Flash Fill and the analytics stack behind a monthly plan. Here they run in your browser, on your own workbook, for free. Below is every feature with its honest status."
              hi="Office 365 mein XLOOKUP, FILTER, LAMBDA, Flash Fill aur analytics sab monthly plan ke peeche hain. Yahan ye sab browser mein, aapke workbook par, free chalte hain. Neeche har feature ka sach likha hai."
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: counts.full, l: "Work here" },
              { v: counts.limit, l: "Formula route" },
              { v: counts.only, l: "Needs Excel file" },
            ].map((item) => (
              <div key={item.l} className="rounded-xl border border-(--color-border) bg-(--color-canvas) px-3 py-2">
                <div className="font-display text-xl font-extrabold text-(--color-ink)">{item.v}</div>
                <div className="text-[10px] text-(--color-muted) leading-tight">{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px]">
          <Pill tone="good">
            <Sparkles size={11} /> {knownFunctions().length} formulas live
          </Pill>
          <Pill tone="good">{M365_COUNT} were Office-365-only</Pill>
          <Pill tone="info">.xlsx in &amp; out</Pill>
          <Pill tone="info">Autosaved per student</Pill>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-(--color-muted) mr-1">
          <Filter size={12} /> Group
        </span>
        {["All", ...FREE_GROUPS].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setGroup(option)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
              group === option
                ? "bg-(--color-accent) text-white border-transparent"
                : "border-(--color-border) text-(--color-muted) hover:text-(--color-ink) hover:bg-(--color-accent-soft)"
            }`}
          >
            {option}
          </button>
        ))}
        <span className="w-px h-4 bg-(--color-border) mx-1" />
        {(["All", "full", "browser-limit", "excel-only"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
              status === option
                ? "bg-(--color-ink) text-(--color-surface) border-transparent"
                : "border-(--color-border) text-(--color-muted) hover:text-(--color-ink)"
            }`}
          >
            {option === "All" ? "Any status" : STATUS_STYLE[option].label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((feature) => {
          const style = STATUS_STYLE[feature.status];
          return (
            <Card key={`${feature.group}-${feature.name}`} className="!p-4 space-y-2 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Table2 size={14} className="shrink-0 text-(--color-accent)" />
                  <h2 className="font-display font-bold text-sm text-(--color-ink) leading-snug">{feature.name}</h2>
                </div>
                <Pill tone={style.tone}>{style.label}</Pill>
              </div>
              <p className="text-xs text-(--color-ink)/85 leading-relaxed">{feature.en}</p>
              <p className="text-[11px] text-(--color-muted) leading-relaxed">{feature.hi}</p>
              <span className="mt-auto text-[10px] uppercase tracking-wide text-(--color-muted)">{feature.group}</span>
            </Card>
          );
        })}
      </div>

      <Card className="!p-4 flex items-start gap-2 text-xs">
        <Info size={15} className="mt-0.5 shrink-0 text-(--color-accent)" />
        <p className="text-(--color-muted) leading-relaxed">
          <b className="text-(--color-ink)">Why the honesty?</b> A course that promises “everything free” and then
          blocks FILTER is worse than one that says “FILTER is here; VBA needs your Excel file”. Every row above is
          reproducible in this app — open the{" "}
          <a className="underline font-semibold text-(--color-accent-dark)" href="#/workbook">
            free workbook
          </a>{" "}
          and try it, or download the .xlsx and do the same thing in real Excel.
        </p>
      </Card>
    </div>
  );
}
