export interface TrendPoint {
  label: string;
  value: number;
}

const W = 300;
const H = 90;
const PAD_X = 16;
const PAD_Y = 14;

/** Small server-rendered line chart (design: dashed guides, round dots, last point larger). */
export function TrendChart({
  points,
  title,
  unit,
  tone = 'neutral',
  decimals = 1,
}: {
  points: TrendPoint[];
  title: string;
  unit: string;
  tone?: 'neutral' | 'sky';
  decimals?: number;
}) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD_X + (i * (W - 2 * PAD_X)) / (points.length - 1));
  const y = (v: number) => (span === 0 ? H / 2 : PAD_Y + ((max - v) / span) * (H - 2 * PAD_Y));
  const fmt = (v: number) => (Math.round(v * 10 ** decimals) / 10 ** decimals).toString();
  const stroke = tone === 'sky' ? 'stroke-sky' : 'stroke-ink';
  const fill = tone === 'sky' ? 'fill-sky' : 'fill-ink';
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: ${points.length} sessions, from ${fmt(first?.value ?? 0)} to ${fmt(last?.value ?? 0)} ${unit}, high ${fmt(max)}, low ${fmt(min)}`}
        className="h-24 w-full"
      >
        <line x1="0" x2={W} y1={PAD_Y} y2={PAD_Y} className="stroke-line" strokeDasharray="4 4" />
        <line x1="0" x2={W} y1={H - PAD_Y} y2={H - PAD_Y} className="stroke-line" strokeDasharray="4 4" />
        {points.length > 1 ? (
          <polyline
            fill="none"
            className={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
          />
        ) : null}
        {points.map((p, i) => (
          <circle key={`${p.label}-${i}`} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3 : 2} className={fill}>
            <title>{`${p.label}: ${fmt(p.value)} ${unit}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-micro text-faint">
        <span>{first?.label}</span>
        {points.length > 1 ? <span>{last?.label}</span> : null}
      </div>
    </div>
  );
}
