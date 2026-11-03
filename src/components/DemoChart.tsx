import { useState } from "react";
import { motion } from "motion/react";
import type { ChartKind } from "../data/charts";

const COL = ["var(--color-accent)", "var(--color-info)", "var(--color-warn)", "var(--color-danger)", "var(--color-good)"];
const DEF_L = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const DEF_S = [[120, 150, 135, 180, 210, 190], [20, 32, 25, 44, 58, 47]];
const W = 360, H = 210, P = 28;
const ease = [0.22, 1, 0.36, 1] as const;

function Tip({ t }: { t: string | null }) {
  return t ? <div className="absolute top-1 right-2 text-xs font-semibold bg-(--color-ink) text-white rounded-lg px-2 py-1 pointer-events-none">{t}</div> : null;
}

export function DemoChart({ kind, labels = DEF_L, series = DEF_S }: { kind: ChartKind; labels?: string[]; series?: number[][] }) {
  const [tip, setTip] = useState<string | null>(null);
  const s0 = series[0] ?? [], s1 = series[1] ?? s0.map((v) => v / 4);
  const n = labels.length;
  const iw = W - 2 * P, ih = H - 2 * P;
  const bw = iw / n;
  const hov = (t: string | null) => ({ onMouseEnter: () => setTip(t), onMouseLeave: () => setTip(null), onTouchStart: () => setTip(t) });
  const axis = <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--color-border)" />;
  const xl = (cx: (i: number) => number) => labels.map((l, i) => <text key={i} x={cx(i)} y={H - 10} fontSize="10" textAnchor="middle" fill="var(--color-muted)">{l}</text>);
  const Y = (v: number, mx: number) => H - P - (v / mx) * ih;
  const mx = Math.max(1, ...series.flat());
  const path = (arr: number[], m: number) => arr.map((v, i) => `${i ? "L" : "M"}${P + bw * (i + 0.5)} ${Y(v, m)}`).join(" ");
  let body: React.ReactNode = null;

  if (kind === "column" || kind === "histogram" || kind === "pareto" || kind === "combo") {
    const gap = kind === "histogram" ? 0 : 0.3;
    const cum = s0.reduce<number[]>((a, v) => [...a, (a[a.length - 1] ?? 0) + v], []);
    const tot = cum[cum.length - 1] || 1;
    body = <>
      {s0.map((v, i) => { const h = (v / mx) * ih; return <motion.rect key={i} {...hov(`${labels[i]}: ${v}`)} x={P + bw * (i + gap / 2)} width={bw * (1 - gap)} rx={kind === "histogram" ? 0 : 4} fill={COL[0]} stroke={kind === "histogram" ? "white" : undefined} initial={{ y: H - P, height: 0 }} animate={{ y: H - P - h, height: h }} transition={{ duration: 0.8, delay: i * 0.07, ease }} />; })}
      {kind === "pareto" && <motion.path d={cum.map((v, i) => `${i ? "L" : "M"}${P + bw * (i + 0.5)} ${Y(v / tot, 1)}`).join(" ")} fill="none" stroke={COL[3]} strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.5 }} />}
      {kind === "combo" && <motion.path d={path(s1, Math.max(...s1))} fill="none" stroke={COL[2]} strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.5 }} />}
      {axis}{xl((i) => P + bw * (i + 0.5))}
    </>;
  } else if (kind === "stacked" || kind === "stacked100") {
    const tots = s0.map((v, i) => v + (s1[i] ?? 0));
    const m = kind === "stacked100" ? 1 : Math.max(...tots);
    body = <>{s0.map((v, i) => { const a = kind === "stacked100" ? v / tots[i] : v / m, b = kind === "stacked100" ? (s1[i] ?? 0) / tots[i] : (s1[i] ?? 0) / m; return <g key={i} {...hov(`${labels[i]}: ${v} + ${s1[i]}`)}>
      <motion.rect x={P + bw * 0.15} width={bw * 0.7} fill={COL[0]} initial={{ y: H - P, height: 0 }} animate={{ y: H - P - a * ih, height: a * ih }} transition={{ duration: 0.8, delay: i * 0.07 }} style={{ translateX: bw * i }} />
      <motion.rect x={P + bw * 0.15} width={bw * 0.7} fill={COL[1]} initial={{ y: H - P, height: 0 }} animate={{ y: H - P - (a + b) * ih, height: b * ih }} transition={{ duration: 0.8, delay: 0.2 + i * 0.07 }} style={{ translateX: bw * i }} /></g>; })}{axis}{xl((i) => P + bw * (i + 0.5))}</>;
  } else if (kind === "bar" || kind === "gantt") {
    const bh = ih / n;
    const starts = kind === "gantt" ? s0 : s0.map(() => 0), lens = kind === "gantt" ? s1 : s0;
    const m = Math.max(...starts.map((v, i) => v + lens[i]));
    body = <>{lens.map((v, i) => <g key={i}><text x={P - 4} y={P / 2 + bh * (i + 0.6)} fontSize="10" textAnchor="end" fill="var(--color-muted)">{labels[i]}</text>
      <motion.rect {...hov(`${labels[i]}: ${v}`)} y={P / 2 + bh * (i + 0.15)} height={bh * 0.7} rx={4} fill={COL[i % 5 && kind === "gantt" ? i % 5 : 0]} initial={{ x: P + (starts[i] / m) * iw, width: 0 }} animate={{ x: P + (starts[i] / m) * iw, width: (v / m) * iw }} transition={{ duration: 0.8, delay: i * 0.1, ease }} /></g>)}</>;
  } else if (kind === "line" || kind === "area") {
    const d = path(s0, mx), d2 = path(s1, mx);
    body = <>{kind === "area" && <motion.path d={`${d} L${P + bw * (n - 0.5)} ${H - P} L${P + bw * 0.5} ${H - P}Z`} fill={COL[0]} opacity={0.25} initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 0.6 }} />}
      <motion.path d={d} fill="none" stroke={COL[0]} strokeWidth="3" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
      {kind === "area" && <motion.path d={d2} fill="none" stroke={COL[1]} strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />}
      {s0.map((v, i) => <motion.circle key={i} {...hov(`${labels[i]}: ${v}`)} cx={P + bw * (i + 0.5)} cy={Y(v, mx)} r={5} fill="white" stroke={COL[0]} strokeWidth="2.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.08 }} />)}{axis}{xl((i) => P + bw * (i + 0.5))}</>;
  } else if (kind === "pie" || kind === "doughnut" || kind === "sunburst") {
    const tot = s0.reduce((a, b) => a + b, 0);
    const ring = (vals: number[], r: number, sw: number, off: number, lbls: string[]) => { let st = 0; const t = vals.reduce((a, b) => a + b, 0); return vals.map((v, i) => { const f = v / t, el = <motion.circle key={`${r}${i}`} {...hov(`${lbls[i]}: ${Math.round(f * 100)}%`)} cx={W / 2} cy={H / 2} r={r} fill="none" stroke={COL[(i + off) % 5]} strokeWidth={sw} pathLength={1} strokeDashoffset={-st} transform={`rotate(-90 ${W / 2} ${H / 2})`} initial={{ strokeDasharray: "0 1" }} animate={{ strokeDasharray: `${f - 0.004} ${1 - f + 0.004}` }} transition={{ duration: 1, delay: i * 0.12 }} />; st += f; return el; }); };
    body = kind === "pie" ? ring(s0, 45, 90, 0, labels) : kind === "doughnut" ? <>{ring(s0, 62, 30, 0, labels)}<text x={W / 2} y={H / 2 + 5} textAnchor="middle" fontWeight="800" fontSize="16" fill="var(--color-ink)">{tot}</text></> : <>{ring(s0, 30, 32, 0, labels)}{ring([...s0, ...s0].map((v) => v / 2), 66, 30, 2, [...labels, ...labels])}</>;
    if (kind !== "sunburst") body = <>{body}<g>{labels.map((l, i) => <g key={i}><rect x={8} y={10 + i * 16} width={9} height={9} rx={2} fill={COL[i % 5]} /><text x={21} y={18 + i * 16} fontSize="10" fill="var(--color-muted)">{l}</text></g>)}</g></>;
  } else if (kind === "scatter" || kind === "bubble") {
    const xs = [10, 20, 30, 40, 50, 35, 15, 45];
    body = <>{xs.map((x, i) => { const y = 20 + x * 1.1 + ((i * 17) % 13); return <motion.circle key={i} {...hov(`(${x}, ${Math.round(y)})`)} cx={P + (x / 55) * iw} cy={H - P - (y / 100) * ih} r={kind === "bubble" ? 6 + (i % 4) * 5 : 5} fill={COL[i % 3]} opacity={kind === "bubble" ? 0.6 : 1} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08, type: "spring" }} />; })}{axis}<line x1={P} x2={P} y1={P} y2={H - P} stroke="var(--color-border)" /></>;
  } else if (kind === "radar") {
    const m = Math.max(...s0), cx = W / 2, cy = H / 2, R = 78;
    const pt = (i: number, f: number) => `${cx + R * f * Math.sin((2 * Math.PI * i) / n)},${cy - R * f * Math.cos((2 * Math.PI * i) / n)}`;
    body = <>{[0.33, 0.66, 1].map((f) => <polygon key={f} points={labels.map((_, i) => pt(i, f)).join(" ")} fill="none" stroke="var(--color-border)" />)}
      {labels.map((l, i) => { const [x, y] = pt(i, 1.2).split(",").map(Number); return <text key={i} x={x} y={y + 3} fontSize="10" textAnchor="middle" fill="var(--color-muted)">{l}</text>; })}
      <motion.polygon points={s0.map((v, i) => pt(i, v / m)).join(" ")} fill={COL[0]} fillOpacity={0.3} stroke={COL[0]} strokeWidth="2.5" style={{ transformOrigin: `${cx}px ${cy}px` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.9, ease }} /></>;
  } else if (kind === "stock") {
    const c = [[100, 108, 98, 105], [105, 110, 101, 103], [103, 115, 102, 112], [112, 118, 108, 110], [110, 120, 109, 119], [119, 123, 114, 116]];
    const y = (v: number) => H - P - ((v - 95) / 30) * ih;
    body = <>{c.map(([o, h, l, cl], i) => { const x = P + (iw / 6) * (i + 0.5), up = cl >= o; return <motion.g key={i} {...hov(`O${o} H${h} L${l} C${cl}`)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}><line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke="var(--color-ink)" /><rect x={x - 11} width={22} y={y(Math.max(o, cl))} height={Math.abs(y(o) - y(cl))} fill={up ? COL[4] : COL[3]} rx={2} /></motion.g>; })}{axis}</>;
  } else if (kind === "heat") {
    const g = 5; body = <>{Array.from({ length: g * g }, (_, k) => { const r = Math.floor(k / g), c = k % g, v = Math.abs(Math.sin(r * 2 + c * 1.3)); return <motion.rect key={k} {...hov(`Value: ${Math.round(v * 100)}`)} x={P + c * (iw / g)} y={P / 2 + r * (ih / g)} width={iw / g - 3} height={ih / g - 3} rx={5} fill={v > 0.66 ? COL[4] : v > 0.33 ? COL[2] : COL[3]} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 0.55 + v * 0.45, scale: 1 }} transition={{ delay: k * 0.03 }} />; })}</>;
  } else if (kind === "box") {
    body = <>{[0, 1, 2].map((i) => { const x = P + (iw / 3) * (i + 0.5), a = 40 + i * 10; return <motion.g key={i} {...hov(`Median ${a + 20}`)} initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} style={{ transformOrigin: `${x}px ${H / 2}px` }} transition={{ delay: i * 0.15 }}><line x1={x} x2={x} y1={20} y2={H - 30} stroke="var(--color-ink)" /><rect x={x - 22} width={44} y={H - P - a - 40} height={50} fill={COL[i]} fillOpacity={0.4} stroke={COL[i]} strokeWidth="2" /><line x1={x - 22} x2={x + 22} y1={H - P - a - 15} y2={H - P - a - 15} stroke="var(--color-ink)" strokeWidth="3" /><circle cx={x} cy={14} r={3} fill={COL[3]} /></motion.g>; })}</>;
  } else if (kind === "waterfall") {
    let run = 0; const m = Math.max(...s0.map((v, i) => (run += i === n - 1 ? 0 : v, Math.abs(run) + 1)), 100), Yv = (v: number) => H - P - (v / 110) * ih; run = 0; void m;
    body = <>{s0.map((v, i) => { const last = i === n - 1, from = last ? 0 : run, to = last ? v : run + v; if (!last) run += v; const top = Math.max(from, to), h = Math.abs(to - from); return <motion.rect key={i} {...hov(`${labels[i]}: ${v}`)} x={P + bw * (i + 0.15)} width={bw * 0.7} rx={3} fill={last || i === 0 ? COL[1] : v < 0 ? COL[3] : COL[4]} initial={{ y: Yv(from), height: 0, opacity: 0 }} animate={{ y: Yv(top), height: (h / 110) * ih, opacity: 1 }} transition={{ delay: i * 0.18 }} />; })}{axis}{xl((i) => P + bw * (i + 0.5))}</>;
  } else if (kind === "funnel") {
    const vals = [100, 60, 30, 12]; const lb = ["Visit", "Signup", "Trial", "Paid"]; body = <>{vals.map((v, i) => <motion.g key={i} {...hov(`${lb[i]}: ${v}%`)} initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} style={{ transformOrigin: `${W / 2}px 0` }} transition={{ delay: i * 0.2 }}><rect x={W / 2 - v * 1.5} width={v * 3} y={14 + i * 46} height={40} rx={6} fill={COL[i]} /><text x={W / 2} y={39 + i * 46} textAnchor="middle" fontSize="12" fontWeight="700" fill="white">{lb[i]} {v}%</text></motion.g>)}</>;
  } else if (kind === "treemap") {
    const r = [[0, 0, 190, 130, 0, "Food"], [190, 0, 120, 80, 1, "Tech"], [190, 80, 120, 50, 2, "Cloth"], [0, 130, 310, 40, 3, "Misc"]] as const;
    body = <g transform="translate(25,15)">{r.map(([x, y, w, h, c, t], i) => <motion.g key={i} {...hov(t)} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12 }}><rect x={x} y={y} width={w - 3} height={h - 3} rx={6} fill={COL[c]} /><text x={x + 8} y={y + 18} fill="white" fontWeight="700" fontSize="12">{t}</text></motion.g>)}</g>;
  } else if (kind === "spark") {
    body = <>{[0, 1, 2].map((r) => <g key={r} transform={`translate(${P},${20 + r * 60})`}><text y={22} fontSize="11" fill="var(--color-muted)">{["Line", "Column", "Win/Loss"][r]}</text>
      {r === 0 && <motion.path d={s0.map((v, i) => `${i ? "L" : "M"}${70 + i * 40} ${40 - (v / mx) * 36}`).join(" ")} fill="none" stroke={COL[0]} strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />}
      {r === 1 && s0.map((v, i) => <motion.rect key={i} x={70 + i * 40} width={22} fill={COL[1]} initial={{ y: 40, height: 0 }} animate={{ y: 40 - (v / mx) * 36, height: (v / mx) * 36 }} transition={{ delay: i * 0.08 }} />)}
      {r === 2 && s0.map((v, i) => <motion.rect key={i} x={70 + i * 40} width={22} height={12} y={v > 150 ? 6 : 24} fill={v > 150 ? COL[4] : COL[3]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} />)}</g>)}</>;
  } else if (kind === "gauge") {
    const v = (s0[0] ?? 64) / 100, cx = W / 2, cy = 150, R = 100, a = Math.PI * (1 - v);
    const arc = (f: number, t: number) => `M${cx + R * Math.cos(Math.PI * (1 - f))} ${cy - R * Math.sin(Math.PI * (1 - f))} A${R} ${R} 0 0 1 ${cx + R * Math.cos(Math.PI * (1 - t))} ${cy - R * Math.sin(Math.PI * (1 - t))}`;
    body = <>{[[0, 0.4, 3], [0.4, 0.7, 2], [0.7, 1, 4]].map(([f, t, c], i) => <path key={i} d={arc(f, t)} stroke={COL[c]} strokeWidth="22" fill="none" />)}
      <motion.line x1={cx} y1={cy} x2={cx + 85 * Math.cos(a)} y2={cy - 85 * Math.sin(a)} stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" style={{ transformOrigin: `${cx}px ${cy}px` }} initial={{ rotate: -90 }} animate={{ rotate: 0 }} transition={{ duration: 1.4, type: "spring", bounce: 0.3 }} /><circle cx={cx} cy={cy} r={8} fill="var(--color-ink)" /><text x={cx} y={cy + 32} textAnchor="middle" fontWeight="800" fontSize="20" fill="var(--color-ink)">{Math.round(v * 100)}%</text></>;
  } else if (kind === "bullet") {
    body = <g transform={`translate(${P},70)`}>{[[0, 0.5, 3], [0.5, 0.75, 2], [0.75, 1, 4]].map(([f, t, c], i) => <rect key={i} x={f * iw} width={(t - f) * iw} height={60} fill={COL[c]} opacity={0.35} />)}
      <motion.rect y={22} height={16} fill={COL[1]} initial={{ width: 0 }} animate={{ width: 0.78 * iw }} transition={{ duration: 1 }} /><rect x={0.9 * iw} y={8} width={4} height={44} fill="var(--color-ink)" /></g>;
  } else if (kind === "thermo") {
    body = <g><rect x={W / 2 - 14} y={16} width={28} height={150} rx={14} fill="none" stroke="var(--color-ink)" strokeWidth="2" /><circle cx={W / 2} cy={178} r={20} fill={COL[3]} />
      <motion.rect x={W / 2 - 9} width={18} fill={COL[3]} rx={9} initial={{ y: 170, height: 0 }} animate={{ y: 170 - 1.4 * (s0[0] ?? 68), height: 1.4 * (s0[0] ?? 68) }} transition={{ duration: 1.2 }} /><text x={W / 2 + 36} y={100} fontWeight="800" fill="var(--color-ink)">{s0[0] ?? 68}%</text></g>;
  } else if (kind === "dumbbell") {
    const pairs = [[40, 60], [55, 50], [30, 70]]; body = <>{pairs.map(([a, b], i) => <g key={i} {...hov(`${a} → ${b}`)}><motion.line y1={40 + i * 50} y2={40 + i * 50} x1={P + a * 3} stroke="var(--color-border)" strokeWidth="4" initial={{ x2: P + a * 3 }} animate={{ x2: P + b * 3 }} transition={{ duration: 0.8, delay: i * 0.15 }} /><circle cx={P + a * 3} cy={40 + i * 50} r={8} fill={COL[1]} /><motion.circle cy={40 + i * 50} r={8} fill={COL[0]} initial={{ cx: P + a * 3 }} animate={{ cx: P + b * 3 }} transition={{ duration: 0.8, delay: i * 0.15 }} /></g>)}</>;
  }

  return <div className="relative"><Tip t={tip} /><svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">{body}</svg></div>;
}
