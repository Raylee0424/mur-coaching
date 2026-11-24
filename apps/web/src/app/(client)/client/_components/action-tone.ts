import type { RecommendationAction } from '@coaching/shared';
import { ACTION_META } from '@/components/progression/ActionBadge';

/** Card colours per engine action; sourced from ACTION_META. */
export const ACTION_TONE: Record<RecommendationAction, { box: string; text: string }> = {
  INCREASE_LOAD: { box: ACTION_META.INCREASE_LOAD.box, text: ACTION_META.INCREASE_LOAD.text },
  INCREASE_REPS: { box: ACTION_META.INCREASE_REPS.box, text: ACTION_META.INCREASE_REPS.text },
  HOLD: { box: ACTION_META.HOLD.box, text: ACTION_META.HOLD.text },
  DELOAD: { box: ACTION_META.DELOAD.box, text: ACTION_META.DELOAD.text },
};
