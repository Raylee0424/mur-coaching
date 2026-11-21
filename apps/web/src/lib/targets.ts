import type { DecimalString, RecommendationDto } from '@coaching/shared';

export interface EffectiveTarget {
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  weightKg: DecimalString | null;
  rpe: DecimalString | null;
  /** True when the coach replaced the engine's numbers. */
  overridden: boolean;
}

/** The target the client should train to: the coach's override when present, else the engine's call. */
export function effectiveTarget(rec: RecommendationDto): EffectiveTarget {
  if (rec.overriddenAt) {
    return {
      sets: rec.recommendedSets,
      repsMin: rec.overrideRepsMin,
      repsMax: rec.overrideRepsMax,
      weightKg: rec.overrideWeightKg,
      rpe: rec.overrideRpe,
      overridden: true,
    };
  }
  return {
    sets: rec.recommendedSets,
    repsMin: rec.recommendedRepsMin,
    repsMax: rec.recommendedRepsMax,
    weightKg: rec.recommendedWeightKg,
    rpe: null,
    overridden: false,
  };
}

/** Adapts an effective target to formatTarget's field names. */
export const asTargetFields = (t: EffectiveTarget) => ({
  recommendedSets: t.sets,
  recommendedRepsMin: t.repsMin,
  recommendedRepsMax: t.repsMax,
  recommendedWeightKg: t.weightKg,
});
