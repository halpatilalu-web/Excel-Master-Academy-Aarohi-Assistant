import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function projectPoint(
  p: Vec3,
  rotX: number,
  rotY: number,
  cx: number,
  cy: number,
  scale: number,
  fov = 520,
): { x: number; y: number; z: number; depth: number } {
  // Rotate around Y
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  // Rotate around X
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  const persp = fov / Math.max(140, fov + z2);
  return {
    x: cx + x1 * scale * persp,
    y: cy + y2 * scale * persp,
    z: z2,
    depth: z2,
  };
}

export function drawBox3D(
  ctx: CanvasRenderingContext2D,
  center: Vec3,
  size: Vec3,
  colors: { top: string; left: string; right: string; stroke?: string },
  rotX: number,
  rotY: number,
  cx: number,
  cy: number,
  scale: number,
  alpha = 1,
) {
  const hx = size.x / 2;
  const hy = size.y / 2;
  const hz = size.z / 2;
  const v: Vec3[] = [
    { x: center.x - hx, y: center.y - hy, z: center.z - hz }, // 0 top-back-left
    { x: center.x + hx, y: center.y - hy, z: center.z - hz }, // 1 top-back-right
    { x: center.x + hx, y: center.y - hy, z: center.z + hz }, // 2 top-front-right
    { x: center.x - hx, y: center.y - hy, z: center.z + hz }, // 3 top-front-left
    { x: center.x - hx, y: center.y + hy, z: center.z - hz }, // 4 bot-back-left
    { x: center.x + hx, y: center.y + hy, z: center.z - hz }, // 5 bot-back-right
    { x: center.x + hx, y: center.y + hy, z: center.z + hz }, // 6 bot-front-right
    { x: center.x - hx, y: center.y + hy, z: center.z + hz }, // 7 bot-front-left
  ];

  const pv = v.map((pt) => projectPoint(pt, rotX, rotY, cx, cy, scale));
  const faces: { idx: [number, number, number, number]; fill: string }[] = [
    { idx: [0, 1, 2, 3], fill: colors.top }, // top
    { idx: [4, 5, 6, 7], fill: colors.left }, // bottom
    { idx: [3, 2, 6, 7], fill: colors.right }, // front
    { idx: [0, 1, 5, 4], fill: colors.left }, // back
    { idx: [0, 3, 7, 4], fill: colors.left }, // left
    { idx: [1, 2, 6, 5], fill: colors.right }, // right
  ];

  const sorted = faces
    .map((f) => ({
      ...f,
      avgZ: (pv[f.idx[0]].z + pv[f.idx[1]].z + pv[f.idx[2]].z + pv[f.idx[3]].z) / 4,
    }))
    .sort((a, b) => b.avgZ - a.avgZ);

  ctx.save();
  ctx.globalAlpha = alpha;
  // Draw back-to-front (painter's algorithm)
  for (const face of sorted.slice(2)) {
    ctx.beginPath();
    ctx.moveTo(pv[face.idx[0]].x, pv[face.idx[0]].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pv[face.idx[i]].x, pv[face.idx[i]].y);
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
    if (colors.stroke) {
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Interactive 3D Excel Hologram Model for the Diploma Hero Section!
 * Drag to orbit 360°, watch 3D live bars & floating Excel sheets rotate smoothly.
 */
export function Excel3DHeroCube({ onExplore }: { onExplore?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(true);
  const rotRef = useRef({ x: 0.48, y: -0.62 });
  const dragRef = useRef<{ active: boolean; lx: number; ly: number }>({
    active: false,
    lx: 0,
    ly: 0,
  });

  useEffect(() => {
    let raf = 0;
    let tick = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth || 340;
        const h = canvas.clientHeight || 260;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, w, h);

          // Subtle radial glow
          const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.52);
          grad.addColorStop(0, "rgba(16, 185, 129, 0.22)");
          grad.addColorStop(1, "rgba(16, 185, 129, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          if (spinning && !dragRef.current.active) {
            rotRef.current.y += 0.009;
          }
          tick += 0.04;

          const rx = rotRef.current.x;
          const ry = rotRef.current.y;
          const cx = w / 2;
          const cy = h * 0.56;
          const sc = Math.min(w, h) * 0.0038;

          // Base 3D Excel Spreadsheet Platform
          drawBox3D(
            ctx,
            { x: 0, y: 26, z: 0 },
            { x: 210, y: 12, z: 170 },
            {
              top: "#064e3b",
              left: "#022c22",
              right: "#065f46",
              stroke: "rgba(52, 211, 153, 0.55)",
            },
            rx,
            ry,
            cx,
            cy,
            sc,
          );

          // Draw spreadsheet grid lines on top of platform
          ctx.strokeStyle = "rgba(110, 231, 183, 0.35)";
          ctx.lineWidth = 1;
          for (let gx = -90; gx <= 90; gx += 30) {
            const p1 = projectPoint({ x: gx, y: 19.5, z: -75 }, rx, ry, cx, cy, sc);
            const p2 = projectPoint({ x: gx, y: 19.5, z: 75 }, rx, ry, cx, cy, sc);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          for (let gz = -75; gz <= 75; gz += 25) {
            const p1 = projectPoint({ x: -90, y: 19.5, z: gz }, rx, ry, cx, cy, sc);
            const p2 = projectPoint({ x: 90, y: 19.5, z: gz }, rx, ry, cx, cy, sc);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }

          // 3D Animated Bars sorted back-to-front
          const barDefs = [
            { x: -65, z: -35, baseH: 52, palette: { top: "#6ee7b7", left: "#059669", right: "#10b981" }, lbl: "Basic" },
            { x: -22, z: -35, baseH: 76, palette: { top: "#93c5fd", left: "#2563eb", right: "#3b82f6" }, lbl: "fx" },
            { x: 22, z: -35, baseH: 96, palette: { top: "#fcd34d", left: "#d97706", right: "#f59e0b" }, lbl: "Pivot" },
            { x: 65, z: -35, baseH: 118, palette: { top: "#c4b5fd", left: "#7c3aed", right: "#8b5cf6" }, lbl: "VBA" },
            { x: -45, z: 28, baseH: 68, palette: { top: "#5eead4", left: "#0d9488", right: "#14b8a6" }, lbl: "Clean" },
            { x: 0, z: 28, baseH: 90, palette: { top: "#fda4af", left: "#e11d48", right: "#f43f5e" }, lbl: "XLOOK" },
            { x: 45, z: 28, baseH: 108, palette: { top: "#86efac", left: "#16a34a", right: "#22c55e" }, lbl: "Dash" },
          ];

          const barsWithDepth = barDefs
            .map((b, i) => {
              const wave = Math.sin(tick + i * 0.7) * 9;
              const bh = Math.max(24, b.baseH + wave);
              const center: Vec3 = { x: b.x, y: 20 - bh / 2, z: b.z };
              const proj = projectPoint(center, rx, ry, cx, cy, sc);
              return { ...b, bh, center, depth: proj.depth };
            })
            .sort((a, b) => b.depth - a.depth);

          for (const b of barsWithDepth) {
            drawBox3D(
              ctx,
              b.center,
              { x: 26, y: b.bh, z: 26 },
              { ...b.palette, stroke: "rgba(255,255,255,0.45)" },
              rx,
              ry,
              cx,
              cy,
              sc,
            );
            const topPt = projectPoint(
              { x: b.x, y: 20 - b.bh - 10, z: b.z },
              rx,
              ry,
              cx,
              cy,
              sc,
            );
            ctx.font = "700 10px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ecfdf5";
            ctx.fillText(b.lbl, topPt.x, topPt.y);
          }

          // Orbiting floating formula pills
          const orbitTags = ["=XLOOKUP()", "Ctrl+T", "Power Query", "Diploma 🎓"];
          orbitTags.forEach((tag, idx) => {
            const ang = tick * 0.45 + (idx * Math.PI) / 2;
            const pt = projectPoint(
              {
                x: Math.cos(ang) * 118,
                y: -62 + Math.sin(tick + idx) * 8,
                z: Math.sin(ang) * 95,
              },
              rx * 0.5,
              0,
              cx,
              cy,
              sc,
            );
            ctx.font = "700 10px ui-monospace, monospace";
            const tw = ctx.measureText(tag).width + 12;
            ctx.fillStyle = "rgba(6, 78, 59, 0.88)";
            ctx.strokeStyle = "rgba(110, 231, 183, 0.7)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(pt.x - tw / 2, pt.y - 10, tw, 19, 9);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#d1fae5";
            ctx.textAlign = "center";
            ctx.fillText(tag, pt.x, pt.y + 3);
          });

          ctx.restore();
        }
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [spinning]);

  return (
    <div className="relative rounded-2xl bg-slate-950 border border-emerald-500/30 overflow-hidden select-none shadow-xl">
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200">
          🧊 Interactive 3D Model · Drag to Rotate
        </span>
      </div>
      <div className="absolute top-2.5 right-2.5 z-10 flex gap-1">
        <button
          type="button"
          aria-label={spinning ? "Pause 3D spin" : "Play 3D spin"}
          onClick={() => setSpinning((s) => !s)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition"
        >
          {spinning ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          type="button"
          aria-label="Reset 3D camera"
          onClick={() => {
            rotRef.current = { x: 0.48, y: -0.62 };
          }}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-60 sm:h-64 cursor-grab active:cursor-grabbing touch-none block"
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
          rotRef.current.x = Math.max(-0.2, Math.min(1.15, rotRef.current.x + dy * 0.008));
        }}
        onPointerUp={() => {
          dragRef.current.active = false;
        }}
        onPointerCancel={() => {
          dragRef.current.active = false;
        }}
      />

      {onExplore && (
        <div className="px-3.5 py-2 bg-emerald-950/80 border-t border-emerald-500/25 flex items-center justify-between text-xs text-emerald-100">
          <span>✨ 6 Interactive 3D Excel Lessons available</span>
          <button
            type="button"
            onClick={onExplore}
            className="font-bold text-emerald-300 hover:text-white underline cursor-pointer"
          >
            Open 3D Studio →
          </button>
        </div>
      )}
    </div>
  );
}
