/** Small SVG charts in theme-token colours. No chart library — none is in the
 * offline pnpm store, and these cover donut + grouped bars. */

export interface Slice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 180, thickness = 26 }: { data: Slice[]; size?: number; thickness?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2;
  const radius = r - thickness / 2;

  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="No data">
        <circle cx={r} cy={r} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={thickness} />
      </svg>
    );
  }

  let start = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown">
      {data.map((d, i) => {
        const frac = d.value / total;
        if (frac <= 0) return null;
        const a0 = start * 2 * Math.PI - Math.PI / 2;
        const a1 = (start + frac) * 2 * Math.PI - Math.PI / 2;
        start += frac;
        if (frac >= 0.999) {
          return <circle key={i} cx={r} cy={r} r={radius} fill="none" stroke={d.color} strokeWidth={thickness} />;
        }
        const p0 = [r + radius * Math.cos(a0), r + radius * Math.sin(a0)];
        const p1 = [r + radius * Math.cos(a1), r + radius * Math.sin(a1)];
        const large = frac > 0.5 ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${p0[0]} ${p0[1]} A ${radius} ${radius} 0 ${large} 1 ${p1[0]} ${p1[1]}`}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
          />
        );
      })}
    </svg>
  );
}

export interface BarGroup {
  label: string;
  values: number[];
}

/** Grouped bars: one group per label, one bar per series (colors[i]). */
export function BarChart({ data, colors, height = 180 }: { data: BarGroup[]; colors: string[]; height?: number }) {
  const series = Math.max(1, ...data.map((d) => d.values.length));
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const barWidth = 18;
  const gap = 28;
  const groupWidth = barWidth * series + 4 * (series - 1);
  const width = data.length * (groupWidth + gap) + gap;
  const plotH = height - 30;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMax meet" role="img">
      {data.map((d, gi) => {
        const x0 = gap + gi * (groupWidth + gap);
        return (
          <g key={gi}>
            {d.values.map((v, si) => {
              const h = (v / max) * plotH;
              return (
                <rect
                  key={si}
                  x={x0 + si * (barWidth + 4)}
                  y={height - 24 - h}
                  width={barWidth}
                  height={h}
                  rx={4}
                  fill={colors[si % colors.length]}
                />
              );
            })}
            <text x={x0 + groupWidth / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
