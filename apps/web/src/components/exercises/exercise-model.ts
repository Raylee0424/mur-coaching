import { ENGINE_LIMITS, MuscleGroup } from '@coaching/shared';
import type { CreateExerciseRequest, ExerciseDto } from '@coaching/shared';
import { parseOverride } from '@/components/ui/OverrideField';
import { toNumber } from '@/lib/format';

export interface ExerciseDraft {
  name: string;
  muscleGroup: MuscleGroup | '';
  equipment: string;
  loadIncrementKg: string;
  /** Empty = inherit. */
  rpeCap: string;
  repsMin: string;
  repsMax: string;
}

export type ExerciseErrors = Partial<Record<keyof ExerciseDraft, string>>;

export const EMPTY_DRAFT: ExerciseDraft = {
  name: '',
  muscleGroup: '',
  equipment: '',
  loadIncrementKg: '2.5',
  rpeCap: '',
  repsMin: '',
  repsMax: '',
};

export function draftFromExercise(e: ExerciseDto): ExerciseDraft {
  return {
    name: e.name,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment ?? '',
    loadIncrementKg: String(toNumber(e.loadIncrementKg)),
    rpeCap: e.rpeCap === null ? '' : String(toNumber(e.rpeCap)),
    repsMin: e.repsMin === null ? '' : String(e.repsMin),
    repsMax: e.repsMax === null ? '' : String(e.repsMax),
  };
}

export type Validation = { ok: true; body: CreateExerciseRequest } | { ok: false; errors: ExerciseErrors };

/** Client-side mirror of the API rules: RPE cap 5–10 in halves, rep bounds both or neither. */
export function validateExercise(d: ExerciseDraft): Validation {
  const errors: ExerciseErrors = {};
  const name = d.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 80) errors.name = 'At most 80 characters.';
  if (d.muscleGroup === '') errors.muscleGroup = 'Choose a muscle group.';

  const inc = parseOverride(d.loadIncrementKg, ENGINE_LIMITS.loadIncrementKg);
  if (!inc.ok) errors.loadIncrementKg = inc.error;
  else if (inc.value === null) errors.loadIncrementKg = 'Enter an increment.';

  const cap = parseOverride(d.rpeCap, ENGINE_LIMITS.rpeCap);
  if (!cap.ok) errors.rpeCap = `RPE cap must be between ${ENGINE_LIMITS.rpeCap.min.toFixed(1)} and ${ENGINE_LIMITS.rpeCap.max.toFixed(1)} in steps of 0.5.`;

  const min = parseOverride(d.repsMin, { min: 1, max: 50, step: 1 });
  const max = parseOverride(d.repsMax, { min: 1, max: 50, step: 1 });
  if (!min.ok) errors.repsMin = min.error;
  if (!max.ok) errors.repsMax = max.error;
  if (min.ok && max.ok) {
    if ((min.value === null) !== (max.value === null)) {
      if (min.value === null) errors.repsMin = 'Set both bounds or neither.';
      else errors.repsMax = 'Set both bounds or neither.';
    } else if (min.value !== null && max.value !== null && min.value > max.value) {
      errors.repsMax = 'Must be at least the minimum.';
    }
  }

  if (Object.keys(errors).length > 0 || d.muscleGroup === '' || !inc.ok || !cap.ok || !min.ok || !max.ok) return { ok: false, errors };
  return {
    ok: true,
    body: {
      name,
      muscleGroup: d.muscleGroup,
      equipment: d.equipment.trim(),
      loadIncrementKg: inc.value ?? 2.5,
      rpeCap: cap.value,
      repsMin: min.value,
      repsMax: max.value,
    },
  };
}

export function formatRepRange(e: Pick<ExerciseDto, 'repsMin' | 'repsMax'>): string {
  if (e.repsMin === null || e.repsMax === null) return '—';
  return e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}–${e.repsMax}`;
}

export function formatOverrides(n: number): string {
  return n === 0 ? '0' : `${n} ${n === 1 ? 'client' : 'clients'}`;
}
