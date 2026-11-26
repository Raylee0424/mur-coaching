import { PlusCircle, Repeat, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import {
  PROGRESSION_ACTION_LABEL,
  PROGRESSION_ACTION_TONE,
  type ProgressionActionTone,
  type RecommendationAction,
} from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

const TONE_CLASSES: Record<ProgressionActionTone, { tone: BadgeTone; text: string; rule: string; stroke: string; box: string }> = {
  lime: {
    tone: 'signal',
    text: 'text-primary',
    rule: 'border-l-primary',
    stroke: 'stroke-primary',
    box: 'border-primary/40 bg-primary-container',
  },
  sky: {
    tone: 'sky',
    text: 'text-sky',
    rule: 'border-l-sky',
    stroke: 'stroke-sky',
    box: 'border-sky/40 bg-sky-bg',
  },
  muted: {
    tone: 'slate',
    text: 'text-muted',
    rule: 'border-l-line-strong',
    stroke: 'stroke-muted',
    box: 'border-line bg-canvas-low',
  },
  amber: {
    tone: 'amber',
    text: 'text-amber',
    rule: 'border-l-amber',
    stroke: 'stroke-amber',
    box: 'border-amber/40 bg-amber-bg',
  },
};

const ICONS: Record<RecommendationAction, LucideIcon> = {
  INCREASE_LOAD: TrendingUp,
  INCREASE_REPS: PlusCircle,
  HOLD: Repeat,
  DELOAD: TrendingDown,
};

const metaOf = (action: RecommendationAction) => ({
  label: PROGRESSION_ACTION_LABEL[action],
  code: action,
  icon: ICONS[action],
  ...TONE_CLASSES[PROGRESSION_ACTION_TONE[action]],
});

/** Single source for how each engine call looks across Stitch coach & athlete screens. */
export const ACTION_META: Record<
  RecommendationAction,
  { label: string; code: string; icon: LucideIcon; tone: BadgeTone; text: string; rule: string; stroke: string; box: string }
> = {
  INCREASE_LOAD: metaOf('INCREASE_LOAD'),
  INCREASE_REPS: metaOf('INCREASE_REPS'),
  HOLD: metaOf('HOLD'),
  DELOAD: metaOf('DELOAD'),
};

/** `showCode` adds the enum code as a tooltip; coach screens only. */
export function ActionBadge({ action, showCode = false, count }: { action: RecommendationAction; showCode?: boolean; count?: number }) {
  const meta = ACTION_META[action];
  return (
    <Badge tone={meta.tone} icon={meta.icon} title={showCode ? meta.code : undefined}>
      {count === undefined ? meta.label : `${count} ${meta.label}`}
    </Badge>
  );
}
