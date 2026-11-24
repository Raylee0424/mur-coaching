import { PauseCircle, PlusCircle, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { RecommendationAction } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

/** Single source for how each engine call looks across Stitch coach & athlete screens. */
export const ACTION_META: Record<
  RecommendationAction,
  { label: string; code: string; icon: LucideIcon; tone: BadgeTone; text: string; rule: string; stroke: string; box: string }
> = {
  INCREASE_LOAD: {
    label: 'Increase load',
    code: 'INCREASE_LOAD',
    icon: TrendingUp,
    tone: 'emerald',
    text: 'text-emerald',
    rule: 'border-l-emerald',
    stroke: 'stroke-emerald',
    box: 'border-emerald/40 bg-emerald-bg',
  },
  INCREASE_REPS: {
    label: 'Add reps',
    code: 'INCREASE_REPS',
    icon: PlusCircle,
    tone: 'sky',
    text: 'text-sky',
    rule: 'border-l-sky',
    stroke: 'stroke-sky',
    box: 'border-sky/40 bg-sky-bg',
  },
  HOLD: {
    label: 'Hold',
    code: 'HOLD',
    icon: PauseCircle,
    tone: 'amber',
    text: 'text-amber',
    rule: 'border-l-amber',
    stroke: 'stroke-amber',
    box: 'border-amber/40 bg-amber-bg',
  },
  DELOAD: {
    label: 'Deload',
    code: 'DELOAD',
    icon: TrendingDown,
    tone: 'red',
    text: 'text-rose',
    rule: 'border-l-rose',
    stroke: 'stroke-rose',
    box: 'border-rose/40 bg-rose-bg',
  },
};

export function ActionBadge({ action }: { action: RecommendationAction }) {
  const meta = ACTION_META[action];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.code}
    </Badge>
  );
}
