import clsx from 'clsx';
import type { RecommendationAction } from '@coaching/shared';
import { ACTION_META } from '@/components/progression/ActionBadge';
import { sparkPoints } from './spark-model';

/** Tiny server-rendered trend line. The last point is emphasised; `label` is the accessible description. */
export function Sparkline({
  values,
  label,
  tone = 'neutral',
  width = 120,
  height = 32,
}: {
  values: readonly number[];
  label: string;
  tone?: RecommendationAction | 'neutral';
  width?: number;
  height?: number;
}) {
  const pts = sparkPoints(values, width, height, 8);
  if (pts.length === 0) return null;
  const last = pts[pts.length - 1];
  const stroke = tone === 'neutral' ? 'stroke-muted' : ACTION_META[tone].stroke;
  const text = tone === 'neutral' ? 'text-muted' : ACTION_META[tone].text;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label} className="overflow-visible">
      {pts.length > 1 ? (
        <polyline
          fill="none"
          className={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        />
      ) : null}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p === last ? 3 : 2} className={clsx(p === last ? 'fill-ink' : ['fill-current', text])} />
      ))}
    </svg>
  );
}
