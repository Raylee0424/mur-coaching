import type { RecommendationAction } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

export const ACTION_META: Record<RecommendationAction, { label: string; symbol: string; tone: BadgeTone; border: string }> = {
  INCREASE_LOAD: { label: 'Increase load', symbol: '▲', tone: 'emerald', border: 'border-l-emerald' },
  INCREASE_REPS: { label: 'Add reps', symbol: '+', tone: 'sky', border: 'border-l-sky' },
  HOLD: { label: 'Hold', symbol: '●', tone: 'slate', border: 'border-l-muted' },
  DELOAD: { label: 'Deload', symbol: '▼', tone: 'amber', border: 'border-l-amber' },
};

export function ActionBadge({ action }: { action: RecommendationAction }) {
  const meta = ACTION_META[action];
  return (
    <Badge tone={meta.tone}>
      <span aria-hidden="true" className="mr-1">
        {meta.symbol}
      </span>
      {meta.label}
    </Badge>
  );
}
