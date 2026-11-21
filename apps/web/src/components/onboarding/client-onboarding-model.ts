import { Experience, WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { BaselineDto, BaselineInput, MeProfileDto, ProgramDto, WeightUnit } from '@coaching/shared';
import { displayToKg, kgToDisplay, unitLabel } from '@/lib/units';

export const CLIENT_STEPS = ['Goals', 'Units and experience', 'Limitations', 'Starting weights', 'All set'] as const;

export const EXPERIENCE_OPTIONS: { value: Experience; label: string; description: string }[] = [
  { value: Experience.BEGINNER, label: 'Beginner', description: 'Under a year of consistent lifting.' },
  { value: Experience.INTERMEDIATE, label: 'Intermediate', description: '1–3 years; you know your main lifts.' },
  { value: Experience.ADVANCED, label: 'Advanced', description: '3+ years of structured programs.' },
];

export interface LiftRow {
  exerciseId: string;
  name: string;
  /** In the chosen display unit. */
  weight: string;
  reps: string;
  unknown: boolean;
}

export interface ClientAnswers {
  goals: string[];
  goalNote: string;
  unit: WeightUnit;
  experience: Experience | null;
  daysPerWeek: number;
  limitations: string[];
  limitationsNote: string;
  lifts: LiftRow[];
}

export type StepErrors = Record<string, string>;

const MAX_LIFTS = 6;
const FALLBACK_LIFTS = ['Back Squat', 'Barbell Bench Press', 'Romanian Deadlift', 'Overhead Press'];

/**
 * Lifts to baseline: the first (main) exercise of each week-1 day of the assigned program, else a
 * standard compound set from the library.
 */
export function pickBaselineLifts(
  program: ProgramDto | null,
  library: { id: string; name: string }[],
): { exerciseId: string; name: string }[] {
  const picked = new Map<string, string>();
  if (program) {
    for (const w of program.workouts.filter((x) => x.weekNumber === 1).sort((a, b) => a.dayNumber - b.dayNumber)) {
      const main = w.exercises[0];
      if (main) picked.set(main.exerciseId, main.exercise.name);
    }
  }
  if (picked.size === 0) {
    for (const name of FALLBACK_LIFTS) {
      const ex = library.find((e) => e.name === name);
      if (ex) picked.set(ex.id, ex.name);
    }
  }
  return [...picked].slice(0, MAX_LIFTS).map(([exerciseId, name]) => ({ exerciseId, name }));
}

export function initialAnswers(
  me: MeProfileDto,
  unit: WeightUnit,
  lifts: { exerciseId: string; name: string }[],
): ClientAnswers {
  const saved = new Map<string, BaselineDto>(me.baselines.map((b) => [b.exerciseId, b]));
  return {
    goals: [...me.profile.goals],
    goalNote: me.profile.goalNote ?? '',
    unit,
    experience: me.profile.experience,
    daysPerWeek: me.profile.daysPerWeek ?? 3,
    limitations: [...me.profile.limitations],
    limitationsNote: me.profile.limitationsNote ?? '',
    lifts: lifts.map((l) => {
      const b = saved.get(l.exerciseId);
      return {
        ...l,
        weight: b?.weightKg != null ? String(kgToDisplay(b.weightKg, unit)) : '',
        reps: b?.reps != null ? String(b.reps) : '5',
        unknown: b?.unknown ?? false,
      };
    }),
  };
}

/** Resume at the first step without saved answers (0-based). */
export function resumeStep(me: MeProfileDto): number {
  if (me.profile.goals.length === 0) return 0;
  if (me.profile.experience === null) return 1;
  if (me.profile.limitations.length === 0) return 2;
  if (me.baselines.length === 0) return 3;
  return 4;
}

/** "None" excludes every other limitation and vice versa. */
export function toggleLimitation(current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  if (value === 'None') return ['None'];
  return [...current.filter((v) => v !== 'None'), value];
}

export function validateStep(step: number, a: ClientAnswers): StepErrors {
  const errors: StepErrors = {};
  if (step === 0 && a.goals.length === 0) errors.goals = 'Pick at least one goal.';
  if (step === 1) {
    if (!a.experience) errors.experience = 'Choose your experience level.';
    if (a.daysPerWeek < 1 || a.daysPerWeek > 7) errors.daysPerWeek = '1–7 days.';
  }
  if (step === 2 && a.limitations.length === 0) errors.limitations = 'Pick any that apply, or None.';
  if (step === 3) {
    const max = kgToDisplay(WORKOUT_LOG_LIMITS.maxWeightKg, a.unit);
    for (const l of a.lifts) {
      if (l.unknown) continue;
      const w = Number(l.weight);
      if (l.weight.trim() === '' || !Number.isFinite(w) || w <= 0 || w > max) {
        errors[`lift.${l.exerciseId}.weight`] = `Enter a weight in ${unitLabel(a.unit)}, or choose "I don't know yet".`;
      }
      const r = Number(l.reps);
      if (!Number.isInteger(r) || r < 1 || r > 50) errors[`lift.${l.exerciseId}.reps`] = 'Reps 1–50.';
    }
  }
  return errors;
}

export function liftsToInput(a: ClientAnswers): BaselineInput[] {
  return a.lifts.map((l) =>
    l.unknown
      ? { exerciseId: l.exerciseId, weightKg: null, reps: null, unknown: true }
      : { exerciseId: l.exerciseId, weightKg: displayToKg(Number(l.weight), a.unit), reps: Number(l.reps), unknown: false },
  );
}
