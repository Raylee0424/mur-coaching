import type { RecommendationAction } from './enums';

/** Plain-language names for the engine's calls. Display only; the enum stays on the wire. */
export const PROGRESSION_ACTION_LABEL = {
  INCREASE_LOAD: 'Add weight',
  INCREASE_REPS: 'Add reps',
  HOLD: 'Repeat',
  DELOAD: 'Lighter week',
} as const satisfies Record<RecommendationAction, string>;

export type ProgressionActionTone = 'lime' | 'sky' | 'muted' | 'amber';

export const PROGRESSION_ACTION_TONE = {
  INCREASE_LOAD: 'lime',
  INCREASE_REPS: 'sky',
  HOLD: 'muted',
  DELOAD: 'amber',
} as const satisfies Record<RecommendationAction, ProgressionActionTone>;
