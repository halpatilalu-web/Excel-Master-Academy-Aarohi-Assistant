import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { drawBox3D, projectPoint, type Vec3 } from "../components/Excel3DModel";
import { Button, Card, Pill } from "../components/ui";
import { Bilingual, LangSwitcher } from "../lib/lang";

export type Lesson3DId =
  | "pivot-cube"
  | "sheet-stack"
  | "lookup-laser"
  | "cityscape"
  | "pq-pipeline"
  | "vba-robot";

interface Lesson3DMeta {
  id: Lesson3DId;
  emoji: string;
  titleEn: string;
  titleHi: string;
  moduleTag: string;
  chapterRef: number;
  summaryEn: string;
  summaryHi: string;
  formula: string;
}

export const LESSONS_3D: Lesson3DMeta[] = [
  {
    id: "pivot-cube",
    emoji: "🧊",
    titleEn: "3D Pivot Data Cube (Slice & Aggregate)",
    titleHi: "3D Pivot Data Cube (Slice aur Summary)",
    moduleTag: "Pivot Tables",
    chapterRef: 23,
    summaryEn:
      "A Pivot Table is actually a 3D multi-dimensional cube (Rows × Columns × Slicer Filter)! Rotate the cube 360° and click Quarter slices (Q1, Q2, Q3) to watch how Slicers filter 3D blocks into a 2D summary table.",
    summaryHi:
      "Pivot Table asal mein ek 3D Cube hota hai (Region × Product × Quarter)! Mouse se 360° ghumao aur Q1, Q2, Q3 button daba kar dekho Slicer kaise 3D data kaat kar turant total nikalta hai.",
    formula: "PivotTable: Rows=Region | Columns=Product | Slicer=Quarter | Values=SUM(Sales)",
  },
  {
    id: "sheet-stack",
    emoji: "📚",
    titleEn: "3D Multi-Sheet Formula Beam (=SUM(Jan:Mar!B2))",
    titleHi: "3D Multi-Sheet Formula Laser (=SUM(Jan:Mar!B2))",
    moduleTag: "Formulas & Workbooks",
    chapterRef: 5,
    summaryEn:
      "When you have identical monthly tabs (Jan, Feb, Mar), a 3D Reference pierces straight through the same cell address across every worksheet! Click any cell coordinate below to move the 3D laser beam.",
    summaryHi:
      "Jab Jan, Feb, Mar ki sheets ek jaisi hon, to 3D Formula ek laser kiran ki tarah sabhi sheets ke usi cell (jaise B2) ko chhed kar ek saath jod deta hai!",
    formula: "=SUM(Jan:Mar!B2)",
  },
  {
    id: "lookup-laser",
    emoji: "🔦",
    titleEn: "3D XLOOKUP vs VLOOKUP vs INDEX-MATCH Laser",
    titleHi: "3D Lookup Laser (XLOOKUP vs VLOOKUP vs INDEX-MATCH)",
    moduleTag: "Advanced Lookups",
    chapterRef: 19,
    summaryEn:
      "See why XLOOKUP and INDEX-MATCH beat VLOOKUP! Pick an Employee ID and target column — notice how XLOOKUP effortlessly shoots a beam LEFT to fetch Department, while VLOOKUP can only look RIGHT.",
    summaryHi:
      "3D mein dekho XLOOKUP aur INDEX-MATCH kaise kaam karte hain! Employee ID chuno — dekho XLOOKUP left side (Dept) bhi aaram se nikal leta hai jabki VLOOKUP sirf right ja sakta hai.",
    formula: '=XLOOKUP("E103", tblEmp[EmpID], tblEmp[Salary], "Not Found")',
  },
  {
    id: "cityscape",
    emoji: "🏙️",
    titleEn: "3D Conditional Formatting & Chart Cityscape",
    titleHi: "3D Conditional Formatting aur Live Chart Bars",
    moduleTag: "Charts & Rules",
    chapterRef: 34,
    summaryEn:
      "Adjust the Target threshold slider and monthly revenue sliders! Bars above target automatically glow Emerald Green, near-target glow Amber, and below-target turn Coral Red in 3D space.",
    summaryHi:
      "Target slider ko ghuma kar dekho! Target se upar wale mahine apne aap Green, paas wale Yellow aur kam wale Red ho jate hain — bilkul live Conditional Formatting + Chart ki tarah!",
    formula: '=IF(Sales>=Target, "🟢 Hit", "🔴 Miss")',
  },
  {
    id: "pq-pipeline",
    emoji: "⚙️",
    titleEn: "3D Power Query Automated ETL Tunnel",
    titleHi: "3D Power Query Data Cleaning Machine",
    moduleTag: "Power Query",
    chapterRef: 37,
    summaryEn:
      "Watch dirty, crooked raw CSV blocks travel along the 3D conveyor through 4 Applied Steps — 1. TRIM/CLEAN, 2. SPLIT, 3. UNPIVOT, and 4. MERGE — emerging as structured emerald Excel Table blocks!",
    summaryHi:
      "Dekho kaise tedhe-medhe gande CSV data blocks 4 Power Query steps (TRIM, SPLIT, UNPIVOT, MERGE) se guzar kar ekdum chamakte hue clean Table blocks ban jate hain!",
    formula: 'Table.TransformColumns(Source, {{"Name", Text.Trim}, {"Name", Text.Proper}})',
  },
  {
    id: "vba-robot",
    emoji: "🤖",
    titleEn: "3D VBA Macro Loop Visualizer (For i = 2 To 7)",
    titleHi: "3D VBA Macro Robot (Row-by-Row Automation)",
    moduleTag: "VBA Macros",
    chapterRef: 39,
    summaryEn:
      "Step through or auto-play a real VBA For...Next loop! Watch the 3D Macro Pointer jump down rows 2 to 7, inspect Marks, color Pass/Fail cells in 3D, and highlight the active VBA code line.",
    summaryHi:
      "VBA ka For...Next loop 3D mein chalta hua dekho! 3D robot ek-ek row par kood kar Marks check karta hai aur Pass/Fail colour bhar deta hai.",
    formula: 'For r = 2 To 7 : If Cells(r, 2).Value >= 40 Then Cells(r, 3).Value = "Pass" : Next r',
  },
];

const REGIONS = ["North", "West", "South"] as const;
const PRODUCTS = ["Laptop", "Phone", "Tablet"] as const;
const QUARTERS = ["Q1", "Q2", "Q3"] as const;
const CUBE_VALS: number[][][] = [
  // Q1
  [
    [42, 35, 24],
    [38, 48, 20],
    [30, 29, 32],
  ],
  // Q2
  [
    [55, 40, 28],
    [44, 52, 26],
    [36, 34, 38],
  ],
  // Q3
  [
    [64, 46, 34],
    [50, 60, 31],
    [41, 39, 45],
  ],
];

const EMP_ROWS = [
  { dept: "Sales", id: "E101", name: "Aarav", salary: "₹48,000" },
  { dept: "IT", id: "E102", name: "Diya", salary: "₹72,000" },
  { dept: "Finance", id: "E103", name: "Rohan", salary: "₹65,000" },
  { dept: "HR", id: "E104", name: "Meera", salary: "₹54,000" },
];

const SHEET_CELLS = ["B2", "C2", "B3", "C3"] as const;
const SHEET_DATA: Record<string, Record<(typeof SHEET_CELLS)[number], number>> = {
  Jan: { B2: 120, C2: 85, B3: 95, C3: 140 },
  Feb: { B2: 150, C2: 92, B3: 110, C3: 160 },
  Mar: { B2: 180, C2: 108, B3: 125, C3: 190 },
};

const VBA_STUDENTS = [
  { name: "Aarav", marks: 78 },
  { name: "Kabir", marks: 32 },
  { name: "Diya", marks: 91 },
  { name: "Rohan", marks: 38 },
  { name: "Isha", marks: 66 },
  { name: "Vikram", marks: 84 },
];

export function Studio3D({
  initialLesson = "pivot-cube",
  onGoChapter,
}: {
  initialLesson?: Lesson3DId;
  onGoChapter?: (chapter: number) => void;
}) {
  const [activeId, setActiveId] = useState<Lesson3DId>(initialLesson);
  useEffect(() => {
    setActiveId(initialLesson);
  }, [initialLesson]);

  const lesson = LESSONS_3D.find((l) => l.id === activeId) ?? LESSONS_3D[0];

  // Shared 3D camera controls
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef({ x: 0.48, y: -0.55 });
  const dragRef = useRef({ active: false, lx: 0, ly: 0 });
  const [zoom, setZoom] = useState(1);
  const [autoRotate, setAutoRotate] = useState(true);

  // Lesson-specific interactive controls
  const [quarterFilter, setQuarterFilter] = useState<"ALL" | 0 | 1 | 2>("ALL");
  const [selectedCell, setSelectedCell] = useState<(typeof SHEET_CELLS)[number]>("B2");
  const [empId, setEmpId] = useState("E103");
  const [lookupCol, setLookupCol] = useState<"salary" | "name" | "dept">("salary");
  const [lookupEngine, setLookupEngine] = useState<"XLOOKUP" | "VLOOKUP" | "INDEX-MATCH">("XLOOKUP");
  const [targetVal, setTargetVal] = useState(65);
  const [monthVals, setMonthVals] = useState([52, 74, 61, 88, 95, 48]);
  const [vbaRow, setVbaRow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVbaRow((r) => (r + 1) % VBA_STUDENTS.length);
    }, 1350);
    return () => clearInterval(id);
  }, []);

  // Pivot summary computed live from 3D cube!
  const pivotMatrix = useMemo(() => {
    const qs = quarterFilter === "ALL" ? [0, 1, 2] : [quarterFilter];
    return REGIONS.map((reg, rIdx) => {
      const vals = PRODUCTS.map((_, pIdx) =>
        qs.reduce((acc, qIdx) => acc + CUBE_VALS[qIdx][rIdx][pIdx], 0),
      );
      return { region: reg, vals, total: vals.reduce((a, b) => a + b, 0) };
    });
  }, [quarterFilter]);

  useEffect(() => {
    let raf = 0;
    let tick = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth || 640;
        const h = canvas.clientHeight || 380;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, w, h);

          // Studio dark radial backdrop
          const bg = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.65);
          bg.addColorStop(0, "#064e3b");
          bg.addColorStop(0.55, "#0f172a");
          bg.addColorStop(1, "#020617");
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          if (autoRotate && !dragRef.current.active) {
            rotRef.current.y += 0.0055;
          }
          tick += 0.04;

          const rx = rotRef.current.x;
          const ry = rotRef.current.y;
          const cx = w / 2;
          const cy = h * 0.54;
          const sc = Math.min(w, h) * 0.0032 * zoom;

          if (activeId === "pivot-cube") {
            const items: {
              center: Vec3;
              qIdx: number;
              val: number;
              depth: number;
              active: boolean;
            }[] = [];
            for (let q = 0; q < 3; q++) {
              const active = quarterFilter === "ALL" || quarterFilter === q;
              const explodeZ = quarterFilter === q ? -14 : 0;
              for (let r = 0; r < 3; r++) {
                for (let p = 0; p < 3; p++) {
                  const center: Vec3 = {
                    x: (p - 1) * 52,
                    y: (r - 1) * 46,
                    z: (q - 1) * 54 + explodeZ,
                  };
                  const proj = projectPoint(center, rx, ry, cx, cy, sc);
                  items.push({
                    center,
                    qIdx: q,
                    val: CUBE_VALS[q][r][p],
                    depth: proj.depth,
                    active,
                  });
                }
              }
            }
            items.sort((a, b) => b.depth - a.depth);
            const qPalettes = [
              { top: "#6ee7b7", left: "#059669", right: "#10b981" },
              { top: "#93c5fd", left: "#2563eb", right: "#3b82f6" },
              { top: "#fcd34d", left: "#d97706", right: "#f59e0b" },
            ];
            for (const item of items) {
              drawBox3D(
                ctx,
                item.center,
                { x: 38, y: 34, z: 38 },
                { ...qPalettes[item.qIdx], stroke: "rgba(255,255,255,0.4)" },
                rx,
                ry,
                cx,
                cy,
                sc,
                item.active ? 0.96 : 0.16,
              );
              if (item.active) {
                const pt = projectPoint(item.center, rx, ry, cx, cy, sc);
                ctx.font = "700 10px ui-monospace, monospace";
                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "center";
                ctx.fillText(`₹${item.val}k`, pt.x, pt.y + 3);
              }
            }
            // Axis labels
            QUARTERS.forEach((ql, qi) => {
              const pt = projectPoint({ x: -105, y: -78, z: (qi - 1) * 54 }, rx, ry, cx, cy, sc);
              ctx.font = "800 11px system-ui, sans-serif";
              ctx.fillStyle = ["#6ee7b7", "#93c5fd", "#fcd34d"][qi];
              ctx.fillText(ql, pt.x, pt.y);
            });
          } else if (activeId === "sheet-stack") {
            const sheets = ["Jan", "Feb", "Mar", "Summary (SUM)"];
            const cellCoords: Record<(typeof SHEET_CELLS)[number], { x: number; z: number }> = {
              B2: { x: -34, z: -22 },
              C2: { x: 34, z: -22 },
              B3: { x: -34, z: 26 },
              C3: { x: 34, z: 26 },
            };
            const targetXZ = cellCoords[selectedCell];

            // Draw sheets from bottom to top
            for (let s = 0; s < 4; s++) {
              const sy = 78 - s * 52;
              const isSum = s === 3;
              drawBox3D(
                ctx,
                { x: 0, y: sy, z: 0 },
                { x: 180, y: 6, z: 130 },
                isSum
                  ? {
                      top: "rgba(245, 158, 11, 0.85)",
                      left: "#b45309",
                      right: "#d97706",
                      stroke: "#fef3c7",
                    }
                  : {
                      top: "rgba(16, 185, 129, 0.45)",
                      left: "#065f46",
                      right: "#047857",
                      stroke: "#6ee7b7",
                    },
                rx,
                ry,
                cx,
                cy,
                sc,
              );

              const lblPt = projectPoint({ x: -105, y: sy, z: -55 }, rx, ry, cx, cy, sc);
              ctx.font = "700 11px system-ui, sans-serif";
              ctx.fillStyle = isSum ? "#fde68a" : "#a7f3d0";
              ctx.textAlign = "right";
              ctx.fillText(sheets[s], lblPt.x, lblPt.y);

              // Draw the 4 cells on each sheet
              for (const cellKey of SHEET_CELLS) {
                const pos = cellCoords[cellKey];
                const isPicked = cellKey === selectedCell;
                const val = isSum
                  ? SHEET_DATA.Jan[cellKey] + SHEET_DATA.Feb[cellKey] + SHEET_DATA.Mar[cellKey]
                  : SHEET_DATA[sheets[s]][cellKey];
                const cpt = projectPoint({ x: pos.x, y: sy - 5, z: pos.z }, rx, ry, cx, cy, sc);
                ctx.fillStyle = isPicked ? "#ffffff" : "rgba(255,255,255,0.65)";
                ctx.font = isPicked ? "800 11px ui-monospace, monospace" : "600 10px ui-monospace, monospace";
                ctx.textAlign = "center";
                ctx.fillText(`${cellKey}:${val}`, cpt.x, cpt.y);
              }
            }

            // Glowing vertical 3D laser piercing through selectedCell across all 4 sheets!
            const pBot = projectPoint({ x: targetXZ.x, y: 92, z: targetXZ.z }, rx, ry, cx, cy, sc);
            const pTop = projectPoint({ x: targetXZ.x, y: -95, z: targetXZ.z }, rx, ry, cx, cy, sc);
            ctx.save();
            ctx.strokeStyle = "#34d399";
            ctx.shadowColor = "#34d399";
            ctx.shadowBlur = 14;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pBot.x, pBot.y);
            ctx.lineTo(pTop.x, pTop.y);
            ctx.stroke();
            ctx.restore();
          } else if (activeId === "lookup-laser") {
            const rowIdx = Math.max(
              0,
              EMP_ROWS.findIndex((r) => r.id === empId),
            );
            const vlookupBlocked = lookupEngine === "VLOOKUP" && lookupCol === "dept";

            // Left 3D Source Table (4 columns: Dept | EmpID | Name | Salary)
            const colX = [-125, -80, -35, 10];
            const colHeaders = ["Dept", "EmpID", "Name", "Salary"];
            drawBox3D(
              ctx,
              { x: -58, y: 0, z: -20 },
              { x: 190, y: 150, z: 12 },
              { top: "#1e293b", left: "#0f172a", right: "#1e293b", stroke: "#38bdf8" },
              rx * 0.35,
              ry * 0.35,
              cx,
              cy,
              sc,
            );

            colHeaders.forEach((hName, ci) => {
              const hp = projectPoint(
                { x: colX[ci], y: -55, z: -12 },
                rx * 0.35,
                ry * 0.35,
                cx,
                cy,
                sc,
              );
              ctx.font = "800 10px system-ui, sans-serif";
              ctx.fillStyle = ci === 1 ? "#34d399" : "#93c5fd";
              ctx.textAlign = "center";
              ctx.fillText(hName, hp.x, hp.y);
            });

            const targetColIdx = lookupCol === "dept" ? 0 : lookupCol === "name" ? 2 : 3;

            EMP_ROWS.forEach((emp, ri) => {
              const ryPos = -22 + ri * 28;
              const vals = [emp.dept, emp.id, emp.name, emp.salary];
              vals.forEach((v, ci) => {
                const pt = projectPoint(
                  { x: colX[ci], y: ryPos, z: -12 },
                  rx * 0.35,
                  ry * 0.35,
                  cx,
                  cy,
                  sc,
                );
                const isMatchId = ri === rowIdx && ci === 1;
                const isReturn = ri === rowIdx && ci === targetColIdx && !vlookupBlocked;
                if (isMatchId || isReturn) {
                  ctx.fillStyle = isMatchId ? "rgba(16,185,129,0.35)" : "rgba(56,189,248,0.35)";
                  ctx.fillRect(pt.x - 22, pt.y - 10, 44, 16);
                }
                ctx.font = isMatchId || isReturn ? "800 10px ui-monospace, monospace" : "500 10px ui-monospace, monospace";
                ctx.fillStyle = isMatchId ? "#6ee7b7" : isReturn ? "#7dd3fc" : "#e2e8f0";
                ctx.textAlign = "center";
                ctx.fillText(v, pt.x, pt.y + 2);
              });
            });

            // Right 3D Result Card
            drawBox3D(
              ctx,
              { x: 112, y: 0, z: 25 },
              { x: 105, y: 95, z: 16 },
              {
                top: vlookupBlocked ? "#7f1d1d" : "#065f46",
                left: "#022c22",
                right: vlookupBlocked ? "#991b1b" : "#047857",
                stroke: vlookupBlocked ? "#f87171" : "#6ee7b7",
              },
              rx * 0.35,
              ry * 0.35,
              cx,
              cy,
              sc,
            );

            const cardPt = projectPoint({ x: 112, y: -12, z: 36 }, rx * 0.35, ry * 0.35, cx, cy, sc);
            ctx.textAlign = "center";
            ctx.font = "700 10px system-ui, sans-serif";
            ctx.fillStyle = "#d1fae5";
            ctx.fillText(`${lookupEngine}(${empId})`, cardPt.x, cardPt.y - 12);
            ctx.font = "800 14px ui-monospace, monospace";
            ctx.fillStyle = vlookupBlocked ? "#fca5a5" : "#ffffff";
            const outVal = vlookupBlocked
              ? "#REF! Left Blocked"
              : EMP_ROWS[rowIdx][lookupCol];
            ctx.fillText(outVal, cardPt.x, cardPt.y + 12);

            // Animated 3D Laser Path: Top of EmpID col → Matched EmpID → Target Col → Result Card!
            const pStart = projectPoint({ x: colX[1], y: -55, z: -8 }, rx * 0.35, ry * 0.35, cx, cy, sc);
            const pId = projectPoint(
              { x: colX[1], y: -22 + rowIdx * 28, z: -8 },
              rx * 0.35,
              ry * 0.35,
              cx,
              cy,
              sc,
            );
            const pTarget = projectPoint(
              { x: colX[targetColIdx], y: -22 + rowIdx * 28, z: -8 },
              rx * 0.35,
              ry * 0.35,
              cx,
              cy,
              sc,
            );
            ctx.save();
            ctx.strokeStyle = vlookupBlocked ? "#ef4444" : "#34d399";
            ctx.shadowColor = vlookupBlocked ? "#ef4444" : "#34d399";
            ctx.shadowBlur = 12;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pStart.x, pStart.y);
            ctx.lineTo(pId.x, pId.y);
            ctx.lineTo(pTarget.x, pTarget.y);
            if (!vlookupBlocked) ctx.lineTo(cardPt.x - 36, cardPt.y);
            ctx.stroke();
            ctx.restore();
          } else if (activeId === "cityscape") {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
            // Base platform
            drawBox3D(
              ctx,
              { x: 0, y: 55, z: 0 },
              { x: 260, y: 10, z: 120 },
              { top: "#1e293b", left: "#0f172a", right: "#334155", stroke: "#475569" },
              rx,
              ry,
              cx,
              cy,
              sc,
            );

            // 3D Bars sorted by depth
            const bars = monthVals
              .map((val, i) => {
                const bx = -100 + i * 40;
                const bh = Math.max(14, val * 1.35);
                const center: Vec3 = { x: bx, y: 50 - bh / 2, z: 0 };
                const proj = projectPoint(center, rx, ry, cx, cy, sc);
                const palette =
                  val >= targetVal
                    ? { top: "#6ee7b7", left: "#059669", right: "#10b981" }
                    : val >= targetVal - 12
                      ? { top: "#fde68a", left: "#d97706", right: "#f59e0b" }
                      : { top: "#fda4af", left: "#e11d48", right: "#f43f5e" };
                return { bx, bh, val, lbl: months[i], center, depth: proj.depth, palette };
              })
              .sort((a, b) => b.depth - a.depth);

            for (const b of bars) {
              drawBox3D(
                ctx,
                b.center,
                { x: 26, y: b.bh, z: 36 },
                { ...b.palette, stroke: "rgba(255,255,255,0.4)" },
                rx,
                ry,
                cx,
                cy,
                sc,
              );
              const topP = projectPoint({ x: b.bx, y: 50 - b.bh - 10, z: 0 }, rx, ry, cx, cy, sc);
              ctx.font = "800 10px ui-monospace, monospace";
              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              ctx.fillText(`${b.lbl}:${b.val}`, topP.x, topP.y);
            }

            // Target horizontal laser line
            const ty = 50 - targetVal * 1.35;
            const t1 = projectPoint({ x: -125, y: ty, z: 25 }, rx, ry, cx, cy, sc);
            const t2 = projectPoint({ x: 125, y: ty, z: 25 }, rx, ry, cx, cy, sc);
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(t1.x, t1.y);
            ctx.lineTo(t2.x, t2.y);
            ctx.stroke();
            ctx.font = "800 11px system-ui, sans-serif";
            ctx.fillStyle = "#fde047";
            ctx.fillText(`Target: ${targetVal}`, t2.x + 28, t2.y + 4);
            ctx.restore();
          } else if (activeId === "pq-pipeline") {
            const gates = [
              { x: -95, label: "1. TRIM", color: "#38bdf8" },
              { x: -32, label: "2. SPLIT", color: "#a78bfa" },
              { x: 32, label: "3. UNPIVOT", color: "#fbbf24" },
              { x: 95, label: "4. LOAD", color: "#34d399" },
            ];

            // Conveyor track
            drawBox3D(
              ctx,
              { x: 0, y: 28, z: 0 },
              { x: 280, y: 8, z: 60 },
              { top: "#1e293b", left: "#0f172a", right: "#334155", stroke: "#64748b" },
              rx,
              ry,
              cx,
              cy,
              sc,
            );

            // Moving data packets
            for (let k = 0; k < 5; k++) {
              const prog = ((tick * 0.32 + k * 0.2) % 1) * 260 - 130;
              const cleanStage = prog > 32 ? 2 : prog > -32 ? 1 : 0;
              const palette =
                cleanStage === 2
                  ? { top: "#6ee7b7", left: "#059669", right: "#10b981" }
                  : cleanStage === 1
                    ? { top: "#fde68a", left: "#d97706", right: "#f59e0b" }
                    : { top: "#fca5a5", left: "#dc2626", right: "#ef4444" };
              const wobble = cleanStage === 0 ? Math.sin(tick * 4 + k) * 6 : 0;
              drawBox3D(
                ctx,
                { x: prog, y: 8 + wobble, z: 0 },
                { x: 22, y: 22, z: 22 },
                { ...palette, stroke: "#ffffff" },
                rx,
                ry,
                cx,
                cy,
                sc,
              );
            }

            // 4 Processing arches
            for (const g of gates) {
              drawBox3D(
                ctx,
                { x: g.x, y: -18, z: 0 },
                { x: 12, y: 66, z: 68 },
                {
                  top: "rgba(30, 41, 59, 0.7)",
                  left: "rgba(15, 23, 42, 0.65)",
                  right: "rgba(51, 65, 85, 0.65)",
                  stroke: g.color,
                },
                rx,
                ry,
                cx,
                cy,
                sc,
                0.78,
              );
              const gp = projectPoint({ x: g.x, y: -62, z: 0 }, rx, ry, cx, cy, sc);
              ctx.font = "800 10px system-ui, sans-serif";
              ctx.fillStyle = g.color;
              ctx.textAlign = "center";
              ctx.fillText(g.label, gp.x, gp.y);
            }
          } else if (activeId === "vba-robot") {
            // 3D Worksheet Rows + Jumping VBA Bot
            VBA_STUDENTS.forEach((st, ri) => {
              const rz = (ri - 2.5) * 34;
              const passed = st.marks >= 40;
              const processed = ri <= vbaRow;
              const isCurrent = ri === vbaRow;

              drawBox3D(
                ctx,
                { x: 0, y: 24, z: rz },
                { x: 175, y: isCurrent ? 14 : 9, z: 28 },
                processed
                  ? passed
                    ? { top: "#10b981", left: "#047857", right: "#059669", stroke: "#a7f3d0" }
                    : { top: "#f43f5e", left: "#be123c", right: "#e11d48", stroke: "#fecdd3" }
                  : { top: "#334155", left: "#1e293b", right: "#475569", stroke: "#64748b" },
                rx,
                ry,
                cx,
                cy,
                sc,
              );

              const rowPt = projectPoint({ x: 0, y: 15, z: rz }, rx, ry, cx, cy, sc);
              ctx.font = isCurrent ? "800 11px ui-monospace, monospace" : "600 10px ui-monospace, monospace";
              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              const statusTxt = processed ? (passed ? "PASS ✓" : "FAIL ✗") : "...";
              ctx.fillText(`Row ${ri + 2}: ${st.name} (${st.marks}) → ${statusTxt}`, rowPt.x, rowPt.y);

              if (isCurrent) {
                // Floating 3D Robot Head above active row!
                const botY = -22 + Math.sin(tick * 3) * 6;
                drawBox3D(
                  ctx,
                  { x: -72, y: botY, z: rz },
                  { x: 26, y: 26, z: 26 },
                  { top: "#fde047", left: "#ca8a04", right: "#eab308", stroke: "#ffffff" },
                  rx,
                  ry,
                  cx,
                  cy,
                  sc,
                );
                const bp = projectPoint({ x: -72, y: botY - 22, z: rz }, rx, ry, cx, cy, sc);
                ctx.font = "800 11px ui-monospace, monospace";
                ctx.fillStyle = "#fde047";
                ctx.fillText(`🤖 i = ${ri + 2}`, bp.x, bp.y);
              }
            });
          }

          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [activeId, autoRotate, zoom, quarterFilter, selectedCell, empId, lookupCol, lookupEngine, targetVal, monthVals, vbaRow]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-(--color-accent-soft) text-(--color-accent-dark)">
            <Sparkles size={13} /> Interactive 3D Excel Lab
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold mt-2">
            🧊 3D Excel Models & Visual Lessons
          </h1>
          <p className="text-sm text-(--color-muted) mt-1">
            Rotate 360° with your mouse/finger, tweak inputs live, and understand Excel inside-out in Hindi & English!
          </p>
        </div>
        <LangSwitcher />
      </div>

      {/* 6 3D Lesson Selector Pills */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {LESSONS_3D.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={`text-left rounded-2xl border p-3.5 transition ${
                active
                  ? "border-(--color-accent) bg-(--color-accent-soft) shadow-sm"
                  : "border-(--color-border) bg-(--color-surface) hover:bg-(--color-accent-soft)/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl">{item.emoji}</span>
                <Pill tone={active ? "good" : "info"}>{item.moduleTag}</Pill>
              </div>
              <div className="font-display font-bold text-sm mt-2 leading-snug">{item.titleEn}</div>
              <div className="text-xs text-(--color-muted) mt-0.5">{item.titleHi}</div>
            </button>
          );
        })}
      </div>

      {/* Main 3D Viewport + Live Controls */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 shadow-xl flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-white/10 text-xs text-slate-200">
            <span className="font-semibold">
              {lesson.emoji} {lesson.titleEn} · <span className="text-emerald-300">Drag to Orbit 360°</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 inline-flex items-center gap-1"
              >
                {autoRotate ? <Pause size={12} /> : <Play size={12} />}
                {autoRotate ? "Pause" : "Spin"}
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.15).toFixed(2)))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                aria-label="Reset view"
                onClick={() => {
                  rotRef.current = { x: 0.48, y: -0.55 };
                  setZoom(1);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full h-80 sm:h-96 cursor-grab active:cursor-grabbing touch-none block"
            onPointerDown={(e) => {
              dragRef.current = { active: true, lx: e.clientX, ly: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.lx;
              const dy = e.clientY - dragRef.current.ly;
              dragRef.current.lx = e.clientX;
              dragRef.current.ly = e.clientY;
              rotRef.current.y += dx * 0.01;
              rotRef.current.x = Math.max(-0.35, Math.min(1.2, rotRef.current.x + dy * 0.008));
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
            onPointerCancel={() => {
              dragRef.current.active = false;
            }}
          />

          <div className="px-4 py-2.5 bg-slate-900/95 border-t border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
            fx: {lesson.formula}
          </div>
        </div>

        {/* Right Interactive Controls Panel */}
        <Card className="lg:col-span-2 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <h2 className="font-display font-extrabold text-lg">
              🎛️ Live 3D Controls & Output
            </h2>

            {activeId === "pivot-cube" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-(--color-muted)">
                  Quarter Slicer (Click to Slice 3D Cube)
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["ALL", 0, 1, 2] as const).map((q) => (
                    <button
                      key={String(q)}
                      type="button"
                      onClick={() => setQuarterFilter(q)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        quarterFilter === q
                          ? "bg-(--color-accent) text-white border-transparent"
                          : "border-(--color-border) hover:bg-(--color-accent-soft)"
                      }`}
                    >
                      {q === "ALL" ? "All Quarters" : QUARTERS[q]}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl neu-btn">
                  <table className="w-full text-xs">
                    <thead className="bg-(--color-accent-soft)">
                      <tr>
                        <th className="p-2 text-left">Region</th>
                        {PRODUCTS.map((p) => (
                          <th key={p} className="p-2 text-right">
                            {p}
                          </th>
                        ))}
                        <th className="p-2 text-right font-extrabold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pivotMatrix.map((row) => (
                        <tr key={row.region} className="border-t border-(--color-border)">
                          <td className="p-2 font-semibold">{row.region}</td>
                          {row.vals.map((v, i) => (
                            <td key={i} className="p-2 text-right font-mono">
                              ₹{v}k
                            </td>
                          ))}
                          <td className="p-2 text-right font-mono font-bold text-(--color-accent-dark)">
                            ₹{row.total}k
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeId === "sheet-stack" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-(--color-muted)">
                  Pick Cell Coordinate to Pierce Across Sheets
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SHEET_CELLS.map((cell) => (
                    <button
                      key={cell}
                      type="button"
                      onClick={() => setSelectedCell(cell)}
                      className={`px-3 py-2 rounded-xl font-mono text-xs font-bold border ${
                        selectedCell === cell
                          ? "bg-(--color-accent) text-white border-transparent"
                          : "border-(--color-border) hover:bg-(--color-accent-soft)"
                      }`}
                    >
                      =SUM(Jan:Mar!{cell})
                    </button>
                  ))}
                </div>
                <div className="rounded-xl bg-(--color-canvas) p-3 text-xs space-y-1 font-mono neu-btn">
                  <div>Jan!{selectedCell} = {SHEET_DATA.Jan[selectedCell]}</div>
                  <div>Feb!{selectedCell} = {SHEET_DATA.Feb[selectedCell]}</div>
                  <div>Mar!{selectedCell} = {SHEET_DATA.Mar[selectedCell]}</div>
                  <div className="pt-1 border-t border-(--color-border) font-extrabold text-(--color-accent-dark)">
                    Summary ={" "}
                    {SHEET_DATA.Jan[selectedCell] +
                      SHEET_DATA.Feb[selectedCell] +
                      SHEET_DATA.Mar[selectedCell]}
                  </div>
                </div>
              </div>
            )}

            {activeId === "lookup-laser" && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase text-(--color-muted) mb-1.5">
                    1. Formula Engine
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["XLOOKUP", "VLOOKUP", "INDEX-MATCH"] as const).map((eng) => (
                      <button
                        key={eng}
                        type="button"
                        onClick={() => setLookupEngine(eng)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          lookupEngine === eng
                            ? "bg-(--color-accent) text-white border-transparent"
                            : "border-(--color-border)"
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-(--color-muted) mb-1.5">
                    2. Lookup Employee ID
                  </p>
                  <div className="flex gap-1.5">
                    {EMP_ROWS.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEmpId(e.id)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                          empId === e.id ? "bg-(--color-ink) text-(--color-canvas)" : "border-(--color-border)"
                        }`}
                      >
                        {e.id}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-(--color-muted) mb-1.5">
                    3. Column to Fetch (Try Dept = Left of EmpID!)
                  </p>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { k: "dept", l: "⬅️ Dept (Left)" },
                        { k: "name", l: "➡️ Name" },
                        { k: "salary", l: "➡️ Salary" },
                      ] as const
                    ).map((col) => (
                      <button
                        key={col.k}
                        type="button"
                        onClick={() => setLookupCol(col.k)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                          lookupCol === col.k
                            ? "bg-(--color-accent-soft) border-(--color-accent) text-(--color-accent-dark)"
                            : "border-(--color-border)"
                        }`}
                      >
                        {col.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeId === "cityscape" && (
              <div className="space-y-3 text-xs">
                <label className="block">
                  <span className="font-bold">Target Line: {targetVal}</span>
                  <input
                    type="range"
                    min={30}
                    max={95}
                    value={targetVal}
                    onChange={(e) => setTargetVal(Number(e.target.value))}
                    className="w-full accent-(--color-accent) mt-1"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, idx) => (
                    <label key={m} className="block bg-(--color-canvas) p-2 rounded-xl neu-btn">
                      <span className="font-semibold">
                        {m}: {monthVals[idx]}
                      </span>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        value={monthVals[idx]}
                        onChange={(e) =>
                          setMonthVals((cur) =>
                            cur.map((v, j) => (j === idx ? Number(e.target.value) : v)),
                          )
                        }
                        className="w-full accent-(--color-accent)"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeId === "pq-pipeline" && (
              <div className="space-y-2 text-xs">
                <div className="rounded-xl bg-red-500/10 border border-red-400/30 p-2.5">
                  <b>🔴 Raw Input:</b> <code>&quot;  ravi  | Jan:400 &quot;</code> (Spaces, Pipes, Wide cols)
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-2.5">
                  <b>🟡 Applied Steps:</b> Trim → Split by Delimiter → Unpivot Months → Merge Master
                </div>
                <div className="rounded-xl bg-(--color-accent)/10 border border-(--color-accent)/30 p-2.5">
                  <b>🟢 Clean Output:</b> Structured Excel Table — click <code>Alt+F5</code> next month!
                </div>
              </div>
            )}

            {activeId === "vba-robot" && (
              <div className="space-y-2">
                <p className="text-xs text-(--color-muted)">
                  Active Loop Iteration: <b>i = {vbaRow + 2}</b> ({VBA_STUDENTS[vbaRow].name})
                </p>
                <pre className="rounded-xl bg-slate-900 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
                  {`Sub AutoGradeRows()\n  For i = 2 To 7\n`}
                  <span className="bg-(--color-accent)/30 text-(--color-accent-soft) px-1 rounded">
                    {`    ' Checking Row ${vbaRow + 2}: Marks = ${VBA_STUDENTS[vbaRow].marks}\n`}
                  </span>
                  {`    If Cells(i, 2).Value >= 40 Then\n      Cells(i, 3).Value = "PASS"\n    Else\n      Cells(i, 3).Value = "FAIL"\n    End If\n  Next i\nEnd Sub`}
                </pre>
              </div>
            )}
          </div>

          {onGoChapter && (
            <Button variant="secondary" onClick={() => onGoChapter(lesson.chapterRef)}>
              📘 Read Full Chapter {lesson.chapterRef} Notes →
            </Button>
          )}
        </Card>
      </div>

      {/* Bilingual Explanation Card */}
      <Card>
        <h3 className="font-display font-bold text-base mb-2.5">
          💡 Concept Explanation (English + Hindi)
        </h3>
        <Bilingual en={lesson.summaryEn} hi={lesson.summaryHi} />
      </Card>
    </div>
  );
}
