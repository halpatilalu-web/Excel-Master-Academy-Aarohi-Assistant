import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, RotateCcw } from "lucide-react";
import { CHARTS, type ChartInfo } from "../data/charts";
import { downloadText } from "../data/labs";
import { DASHBOARDS, DASH_PARTS, DASH_RULES, type DashTemplate } from "../data/dashboards";
import { DemoChart } from "../components/DemoChart";
import { CountUp } from "../components/CountUp";
import { Card, Pill, Button } from "../components/ui";

type Tab = "charts" | "guide" | "templates" | "practice";
const TABS: { k: Tab; l: string }[] = [{ k: "charts", l: "📊 Chart Types" }, { k: "guide", l: "🧭 Dashboard Guide" }, { k: "templates", l: "🧩 6 Templates" }, { k: "practice", l: "📥 Practice Data" }];
const GROUPS = ["All", "Basic", "Statistical", "Advanced", "Trick"] as const;

function ChartCard({ c }: { c: ChartInfo }) {
  const [run, setRun] = useState(0);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-extrabold text-lg">{c.emoji} {c.name}</h3>
        <Pill tone="info">{c.group}</Pill>
      </div>
      <div className="rounded-xl bg-(--color-canvas) p-2 relative">
        <DemoChart key={run} kind={c.kind} />
        <button aria-label="Replay animation" onClick={() => setRun((r) => r + 1)} className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-(--color-surface) neu-btn hover:bg-(--color-accent-soft)"><RotateCcw size={14} /></button>
      </div>
      <p className="text-sm"><b>Kab use karein:</b> {c.when}</p>
      <ol className="text-sm list-decimal pl-5 space-y-1 text-(--color-muted)">{c.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p className="text-sm rounded-xl bg-(--color-accent-soft) text-(--color-accent-dark) p-3">💡 {c.tip}</p>
      <div className="overflow-x-auto">
        <table className="text-xs w-full"><tbody>{c.sample.map((r, i) => <tr key={i} className={i === 0 ? "font-bold bg-(--color-accent-soft)" : "border-t border-(--color-border)"}>{r.map((x, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{x}</td>)}</tr>)}</tbody></table>
      </div>
    </Card>
  );
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/**
 * Practice data as CSV. This used to pull in `xlsx` (429 kB, two high-severity
 * advisories with no published fix) just to write one sheet; Excel opens CSV
 * natively, so the dependency is gone.
 */
function download(t: DashTemplate) {
  const csv = [t.headers, ...t.rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadText(`${t.id}-practice-data.csv`, csv);
}

function Template({ t }: { t: DashTemplate }) {
  const [run, setRun] = useState(0);
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-extrabold text-lg">{t.emoji} {t.name}</h3>
        <Button variant="secondary" onClick={() => setRun((r) => r + 1)}><RotateCcw size={14} /> Replay</Button>
      </div>
      <div key={run}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {t.kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl bg-(--color-accent-soft) p-3">
              <p className="text-xs text-(--color-muted)">{k.emoji} {k.label}</p>
              <p className="font-display font-extrabold text-xl text-(--color-accent-dark)"><CountUp to={k.value} prefix={k.prefix} suffix={k.suffix} /></p>
            </motion.div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[t.chart1, t.chart2].map((c) => (
            <div key={c.title} className="rounded-xl neu-btn p-3">
              <p className="text-sm font-semibold mb-1">{c.title}</p>
              <DemoChart kind={c.kind} labels={c.labels} series={c.series} />
            </div>
          ))}
        </div>
      </div>
      <h4 className="font-semibold mt-4 mb-1">Steps</h4>
      <ol className="text-sm list-decimal pl-5 space-y-1 text-(--color-muted)">{t.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <Button className="mt-4" onClick={() => download(t)}><Download size={16} /> Sample .csv download</Button>
    </Card>
  );
}

export default function ChartsDash() {
  const [tab, setTab] = useState<Tab>("charts");
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
  const list = CHARTS.filter((c) => group === "All" || c.group === group);
  return (
    <div>
      <h1 className="font-display font-extrabold text-3xl mb-1">Charts & Dashboards 📊</h1>
      <p className="text-(--color-muted) mb-4">{CHARTS.length} chart types · 6 dashboard templates · live animated demos</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${tab === t.k ? "bg-(--color-accent) text-white border-transparent" : "border-(--color-border) text-(--color-muted) hover:bg-(--color-accent-soft)"}`}>{t.l}</button>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === "charts" && <>
            <div className="flex flex-wrap gap-2 mb-4">{GROUPS.map((g) => <button key={g} onClick={() => setGroup(g)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${group === g ? "bg-(--color-ink) text-white" : "border-(--color-border) text-(--color-muted)"}`}>{g}</button>)}</div>
            <div className="grid md:grid-cols-2 gap-4">{list.map((c) => <ChartCard key={c.id} c={c} />)}</div>
          </>}
          {tab === "guide" && <div className="space-y-4">
            <Card><h2 className="font-display font-extrabold text-xl mb-2">Dashboard kya hota hai?</h2><p className="text-sm text-(--color-muted)">Dashboard ek page ka summary hota hai jahan KPI, charts aur filters ek saath dikhte hain, taaki bada data bina padhe samajh aa jaaye.</p></Card>
            <Card><h2 className="font-display font-extrabold text-xl mb-2">Design rules</h2><ul className="text-sm space-y-2">{DASH_RULES.map((r) => <li key={r}>{r}</li>)}</ul></Card>
            <div className="grid sm:grid-cols-2 gap-4">{DASH_PARTS.map((p) => <Card key={p.t}><h3 className="font-bold mb-1">{p.t}</h3><p className="text-sm text-(--color-muted)">{p.d}</p></Card>)}</div>
          </div>}
          {tab === "templates" && <div className="space-y-5">{DASHBOARDS.map((t) => <Template key={t.id} t={t} />)}</div>}
          {tab === "practice" && <div className="grid sm:grid-cols-2 gap-4">{DASHBOARDS.map((t) => <Card key={t.id}><h3 className="font-bold">{t.emoji} {t.name}</h3><p className="text-xs text-(--color-muted) my-2">{t.rows.length} rows · {t.headers.join(", ")}</p><Button variant="secondary" onClick={() => download(t)}><Download size={16} /> Download .csv</Button></Card>)}</div>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
