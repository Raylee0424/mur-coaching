import type { RecommendationAction } from '@coaching/shared';
import { ACTION_META } from '@/components/progression/ActionBadge';

const BOX: Record<RecommendationAction, string> = {
  INCREASE_LOAD: 'border-emerald/40 bg-emerald-bg',
  INCREASE_REPS: 'border-sky/40 bg-sky-bg',
  HOLD: 'border-line-strong bg-raised',
  DELOAD: 'border-rose/40 bg-rose-bg',
};

/** Card colours per engine action; the text colour comes from ACTION_META. */
export const ACTION_TONE: Record<RecommendationAction, { box: string; text: string }> = {
  INCREASE_LOAD: { box: BOX.INCREASE_LOAD, text: ACTION_META.INCREASE_LOAD.text },
  INCREASE_REPS: { box: BOX.INCREASE_REPS, text: ACTION_META.INCREASE_REPS.text },
  HOLD: { box: BOX.HOLD, text: ACTION_META.HOLD.text },
  DELOAD: { box: BOX.DELOAD, text: ACTION_META.DELOAD.text },
};
