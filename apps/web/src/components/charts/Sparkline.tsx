import { sparkPoints } from './spark-model';

/** Tiny server-rendered trend line. The last point is emphasised; `label` is the accessible description. */
export function Sparkline({
  values,
  label,
  color = '#34D399',
  width = 120,
  height = 44,
}: {
  values: readonly number[];
  label: string;
  color?: string;
  width?: number;
  height?: number;
}) {
  const pts = sparkPoints(values, width, height, 8);
  if (pts.length === 0) return null;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label} className="overflow-visible">
      {pts.length > 1 ? (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      ) : null}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p === last ? 4 : 3} fill={p === last ? '#C6FF00' : color} />
      ))}
    </svg>
  );
}
