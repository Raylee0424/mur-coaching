interface Point {
  label: string;
  value: number;
}

/** Server-rendered SVG line chart. Accessible via the table that sits beside it. */
export function LineChart({ points, unit, title }: { points: Point[]; unit: string; title: string }) {
  const W = 640;
  const H = 220;
  const PAD = { l: 44, r: 12, t: 12, b: 28 };
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;
  const x = (i: number) =>
    PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (v: number) => PAD.t + ((hi - v) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth="1" />
          <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">
            {Math.round(t)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.label + i} cx={x(i)} cy={y(p.value)} r="4" className="fill-canvas stroke-primary" strokeWidth="2">
          <title>{`${p.label}: ${Math.round(p.value * 10) / 10} ${unit}`}</title>
        </circle>
      ))}
      <text x={PAD.l} y={H - 8} className="fill-muted text-[11px]">
        {points[0]?.label}
      </text>
      <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-muted text-[11px]">
        {points[points.length - 1]?.label}
      </text>
    </svg>
  );
}
