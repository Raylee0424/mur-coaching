import { Equal, Plus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { RecommendationAction } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

/** Single source for how each engine call looks. DELOAD is rose everywhere; amber means "needs attention", not an action. */
export const ACTION_META: Record<
  RecommendationAction,
  { label: string; icon: LucideIcon; tone: BadgeTone; text: string; rule: string; stroke: string }
> = {
  INCREASE_LOAD: { label: 'Increase load', icon: TrendingUp, tone: 'emerald', text: 'text-emerald', rule: 'border-l-emerald', stroke: 'stroke-emerald' },
  INCREASE_REPS: { label: 'Add reps', icon: Plus, tone: 'sky', text: 'text-sky', rule: 'border-l-sky', stroke: 'stroke-sky' },
  HOLD: { label: 'Hold', icon: Equal, tone: 'slate', text: 'text-muted', rule: 'border-l-line-strong', stroke: 'stroke-muted' },
  DELOAD: { label: 'Deload', icon: TrendingDown, tone: 'red', text: 'text-rose', rule: 'border-l-rose', stroke: 'stroke-rose' },
};

export function ActionBadge({ action }: { action: RecommendationAction }) {
  const meta = ACTION_META[action];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}
