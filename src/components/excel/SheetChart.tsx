/**
 * @license MIT
 * A chart drawn from the sheet's own numbers — no chart library, no data
 * leaving the page. Four kinds, the same four the Insert tab offers.
 */
import type { ChartKind, ChartSeries } from "../../lib/excel/insert";

const PALETTE = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#dc2626", "#0d9488"];

export function SheetChart({
  kind,
  series,
  title,
  height = 190,
}: {
  kind: ChartKind;
  series: ChartSeries;
  title: string;
  height?: number;
}) {
  const { labels, values } = series;
  if (!values.length) {
    return (
      <p className="text-xs text-(--color-muted) px-3 py-6 text-center">
        Is range mein koi number nahi mila — pehle numbers wali cells select karo.
      </p>
    );
  }
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const width = 320;
  const plotHeight = height - 34;
  const step = width / values.length;

  return (
    <figure className="space-y-1">
      <figcaption className="text-[11px] font-bold text-(--color-ink)">
        {title}
        <span className="font-normal text-(--color-muted)"> · {series.series}</span>
      </figcaption>
      <svg
        role="img"
        aria-label={`${kind} chart: ${title}`}
        viewBox={`0 0 ${width} ${plotHeight + 20}`}
        className="w-full"
        style={{ height }}
      >
        {/* Axis */}
        <line x1={0} y1={plotHeight * (max / span)} x2={width} y2={plotHeight * (max / span)} stroke="currentColor" strokeOpacity={0.2} />
        {kind === "pie" ? (
          <Pie values={values} radius={Math.min(plotHeight, width / 2) / 2} centre={[width / 2, plotHeight / 2]} />
        ) : kind === "line" ? (
          <>
            <polyline
              fill="none"
              stroke={PALETTE[0]}
              strokeWidth={2.5}
              points={values
                .map((value, index) => `${step * index + step / 2},${plotHeight - ((value - min) / span) * plotHeight}`)
                .join(" ")}
            />
            {values.map((value, index) => (
              <circle
                key={index}
                cx={step * index + step / 2}
                cy={plotHeight - ((value - min) / span) * plotHeight}
                r={3}
                fill={PALETTE[0]}
              >
                <title>{`${labels[index]}: ${value}`}</title>
              </circle>
            ))}
          </>
        ) : (
          values.map((value, index) => {
            const barHeight = Math.max(1, Math.abs(value / span) * plotHeight);
            const y = value >= 0 ? plotHeight - barHeight : plotHeight;
            const barWidth = Math.min(38, step * 0.62);
            return (
              <rect
                key={index}
                x={step * index + (step - barWidth) / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={PALETTE[index % PALETTE.length]}
                fillOpacity={0.85}
              >
                <title>{`${labels[index]}: ${value}`}</title>
              </rect>
            );
          })
        )}
        {kind !== "pie" &&
          labels.map((label, index) => (
            <text
              key={label + index}
              x={step * index + step / 2}
              y={plotHeight + 13}
              textAnchor="middle"
              className="fill-current text-[8px]"
              fillOpacity={0.7}
            >
              {label.length > 7 ? `${label.slice(0, 6)}…` : label}
            </text>
          ))}
      </svg>
      <div className="flex flex-wrap gap-1.5 text-[10px] text-(--color-muted)">
        {kind === "pie"
          ? labels.map((label, index) => (
              <span key={label + index} className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: PALETTE[index % PALETTE.length] }} />
                {label} ({values[index]})
              </span>
            ))
          : (
              <>
                <span className="font-semibold">Max {max}</span>
                <span>·</span>
                <span className="font-semibold">Min {min}</span>
                <span>·</span>
                <span>{values.length} values</span>
              </>
            )}
      </div>
    </figure>
  );
}

function Pie({ values, radius, centre }: { values: number[]; radius: number; centre: [number, number] }) {
  const positives = values.map((value) => Math.max(0, value));
  const total = positives.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return <circle cx={centre[0]} cy={centre[1]} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={14} />;
  }
  let start = 0;
  return (
    <>
      {positives.map((value, index) => {
        const fraction = value / total;
        if (fraction <= 0) return null;
        if (fraction >= 0.999) {
          return <circle key={index} cx={centre[0]} cy={centre[1]} r={radius} fill={PALETTE[index % PALETTE.length]} fillOpacity={0.85} />;
        }
        const a0 = start * 2 * Math.PI - Math.PI / 2;
        const a1 = (start + fraction) * 2 * Math.PI - Math.PI / 2;
        start += fraction;
        const p0 = [centre[0] + radius * Math.cos(a0), centre[1] + radius * Math.sin(a0)];
        const p1 = [centre[0] + radius * Math.cos(a1), centre[1] + radius * Math.sin(a1)];
        return (
          <path
            key={index}
            d={`M ${centre[0]} ${centre[1]} L ${p0[0]} ${p0[1]} A ${radius} ${radius} 0 ${fraction > 0.5 ? 1 : 0} 1 ${p1[0]} ${p1[1]} Z`}
            fill={PALETTE[index % PALETTE.length]}
            fillOpacity={0.85}
          >
            <title>{`${value} (${Math.round(fraction * 100)}%)`}</title>
          </path>
        );
      })}
    </>
  );
}
