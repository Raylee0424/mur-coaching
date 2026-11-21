import type { RecommendationAction } from '@coaching/shared';

/** Tinted card colours per engine action (border + background, and an accent text colour). */
export const ACTION_TONE: Record<RecommendationAction, { box: string; text: string }> = {
  INCREASE_LOAD: { box: 'border-emerald/40 bg-emerald-bg', text: 'text-emerald' },
  INCREASE_REPS: { box: 'border-sky/40 bg-sky-bg', text: 'text-sky' },
  HOLD: { box: 'border-line-strong bg-raised', text: 'text-muted' },
  DELOAD: { box: 'border-amber/40 bg-amber-bg', text: 'text-amber' },
};
