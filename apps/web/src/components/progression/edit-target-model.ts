import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type {
  DecimalString,
  ExplainDto,
  OverrideRecommendationRequest,
  RecommendationAction,
  RecommendationDto,
  RecommendationStatus,
  WeightUnit,
} from '@coaching/shared';
import { toNumber } from '@/lib/format';
import { displayToKg, kgToDisplay } from '@/lib/units';

/** Everything the edit-target dialog needs, whether it was opened from a card, the queue or the drawer. */
export interface EditTargetSubject {
  recommendationId: string;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  action: RecommendationAction;
  status: RecommendationStatus;
  reason: string;
  engine: { weightKg: DecimalString | null; repsMin: number | null; repsMax: number | null };
  /** RPE cap in force for this call, shown next to the engine target. */
  rpeCap: number | null;
  override: { weightKg: DecimalString | null; repsMin: number | null; repsMax: number | null; rpe: DecimalString | null; note: string | null } | null;
}

export function subjectFromRecommendation(rec: RecommendationDto, exerciseName: string): EditTargetSubject {
  return {
    recommendationId: rec.id,
    clientId: rec.clientId,
    exerciseId: rec.exerciseId,
    exerciseName,
    action: rec.action,
    status: rec.status,
    reason: rec.reason,
    engine: { weightKg: rec.recommendedWeightKg, repsMin: rec.recommendedRepsMin, repsMax: rec.recommendedRepsMax },
    rpeCap: rec.settings?.rpeCap.value ?? null,
    override: rec.overriddenAt
      ? { weightKg: rec.overrideWeightKg, repsMin: rec.overrideRepsMin, repsMax: rec.overrideRepsMax, rpe: rec.overrideRpe, note: rec.overrideNote }
      : null,
  };
}

export function subjectFromExplain(e: ExplainDto): EditTargetSubject {
  return {
    recommendationId: e.recommendationId,
    clientId: e.client.id,
    exerciseId: e.exercise.id,
    exerciseName: e.exercise.name,
    action: e.action,
    status: e.status,
    reason: e.reason,
    engine: { weightKg: e.proposed.weightKg, repsMin: e.proposed.repsMin, repsMax: e.proposed.repsMax },
    rpeCap: e.settings?.rpeCap.value ?? null,
    override: e.override
      ? { weightKg: e.override.weightKg, repsMin: e.override.repsMin, repsMax: e.override.repsMax, rpe: e.override.rpe, note: e.override.note }
      : null,
  };
}

export interface Draft {
  weight: string;
  repsMin: string;
  repsMax: string;
  rpe: string;
  note: string;
}

export type DraftErrors = Partial<Record<keyof Draft, string>>;

export function initialDraft(s: EditTargetSubject, unit: WeightUnit): Draft {
  const t = s.override ?? { ...s.engine, rpe: s.rpeCap === null ? null : String(s.rpeCap), note: null };
  return {
    weight: t.weightKg === null ? '' : String(kgToDisplay(toNumber(t.weightKg), unit)),
    repsMin: t.repsMin === null ? '' : String(t.repsMin),
    repsMax: t.repsMax === null ? '' : String(t.repsMax),
    rpe: t.rpe === null ? '' : String(toNumber(t.rpe)),
    note: s.override?.note ?? '',
  };
}

export function validateDraft(
  d: Draft,
  unit: WeightUnit,
): { errors: DraftErrors; body: OverrideRecommendationRequest } {
  const errors: DraftErrors = {};
  const weight = Number(d.weight);
  const repsMin = Number(d.repsMin);
  const repsMax = Number(d.repsMax);
  if (d.weight.trim() === '' || !Number.isFinite(weight) || weight < 0 || displayToKg(weight, unit) > WORKOUT_LOG_LIMITS.maxWeightKg) {
    errors.weight = 'Enter a weight.';
  }
  if (!Number.isInteger(repsMin) || repsMin < 1 || repsMin > 50) errors.repsMin = 'Whole number, 1–50.';
  if (!Number.isInteger(repsMax) || repsMax < 1 || repsMax > 50) errors.repsMax = 'Whole number, 1–50.';
  else if (!errors.repsMin && repsMin > repsMax) errors.repsMax = 'Must be at least the minimum.';
  const rpe = d.rpe.trim() === '' ? null : Number(d.rpe);
  if (rpe !== null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10 || Math.round(rpe * 2) !== rpe * 2)) {
    errors.rpe = '1–10 in steps of 0.5, or leave empty.';
  }
  if (d.note.length > 500) errors.note = 'At most 500 characters.';
  return {
    errors,
    body: { weightKg: displayToKg(weight, unit), repsMin, repsMax, rpe, ...(d.note.trim() ? { note: d.note.trim() } : {}) },
  };
}
