import { ENGINE_LIMITS, MuscleGroup, MuscleRole } from '@coaching/shared';
import type { CreateExerciseRequest, Equipment, ExerciseDto, ExercisePosition, MovementPattern, ResistanceProfile } from '@coaching/shared';
import { MUSCLE_GROUP_LABELS } from '@coaching/shared';
import { parseOverride } from '@/components/ui/OverrideField';
import { toNumber } from '@/lib/format';

/** Coach and athlete share one library; the viewer decides which columns and fields show. */
export type LibraryViewer = 'coach' | 'athlete';

export interface ExerciseDraft {
  name: string;
  muscleGroup: MuscleGroup | '';
  /** Muscle tags beyond the main muscle. */
  extraMuscles: Partial<Record<MuscleGroup, MuscleRole>>;
  equipment: Equipment | '';
  pattern: MovementPattern | '';
  profile: ResistanceProfile | '';
  position: ExercisePosition | '';
  loadIncrementKg: string;
  /** Empty = inherit. */
  rpeCap: string;
  repsMin: string;
  repsMax: string;
  /** https demo video link; empty = none. */
  demoUrl: string;
}

export type ExerciseErrors = Partial<Record<Exclude<keyof ExerciseDraft, 'extraMuscles'>, string>>;

export const EMPTY_DRAFT: ExerciseDraft = {
  name: '',
  muscleGroup: '',
  extraMuscles: {},
  equipment: '',
  pattern: '',
  profile: '',
  position: '',
  loadIncrementKg: '2.5',
  rpeCap: '',
  repsMin: '',
  repsMax: '',
  demoUrl: '',
};

export function draftFromExercise(e: ExerciseDto): ExerciseDraft {
  const extraMuscles: ExerciseDraft['extraMuscles'] = {};
  for (const m of e.muscles) if (m.muscle !== e.muscleGroup) extraMuscles[m.muscle] = m.role;
  return {
    name: e.name,
    muscleGroup: e.muscleGroup,
    extraMuscles,
    equipment: e.equipment ?? '',
    pattern: e.pattern ?? '',
    profile: e.profile ?? '',
    position: e.position ?? '',
    loadIncrementKg: String(toNumber(e.loadIncrementKg)),
    rpeCap: e.rpeCap === null ? '' : String(toNumber(e.rpeCap)),
    repsMin: e.repsMin === null ? '' : String(e.repsMin),
    repsMax: e.repsMax === null ? '' : String(e.repsMax),
    demoUrl: e.demoUrl ?? '',
  };
}

/** Tag pill cycle: off → secondary → primary → off. */
export function nextMuscleRole(role: MuscleRole | undefined): MuscleRole | undefined {
  if (role === undefined) return MuscleRole.SECONDARY;
  return role === MuscleRole.SECONDARY ? MuscleRole.PRIMARY : undefined;
}

/** Demo links must be https and short enough for the column; empty is fine. Returns an error or null. */
export function demoUrlProblem(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (url.length > 300) return 'At most 300 characters.';
  try {
    if (new URL(url).protocol !== 'https:') return 'Use an https:// link.';
  } catch {
    return 'Enter a full link, e.g. https://youtu.be/…';
  }
  return null;
}

export type Validation = { ok: true; body: CreateExerciseRequest } | { ok: false; errors: ExerciseErrors };

/**
 * Client-side mirror of the API rules: RPE cap 5–10 in halves, rep bounds both or neither.
 * Athletes do not edit engine rules, so their body leaves rpeCap and reps out (increment keeps its default).
 */
export function validateExercise(d: ExerciseDraft, viewer: LibraryViewer = 'coach'): Validation {
  const errors: ExerciseErrors = {};
  const name = d.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 80) errors.name = 'At most 80 characters.';
  if (d.muscleGroup === '') errors.muscleGroup = 'Choose a muscle group.';

  const demoProblem = demoUrlProblem(d.demoUrl);
  if (demoProblem) errors.demoUrl = demoProblem;

  const coach = viewer === 'coach';
  const inc = parseOverride(d.loadIncrementKg, ENGINE_LIMITS.loadIncrementKg);
  if (!inc.ok) errors.loadIncrementKg = inc.error;
  else if (inc.value === null) errors.loadIncrementKg = 'Enter an increment.';

  const cap = parseOverride(coach ? d.rpeCap : '', ENGINE_LIMITS.rpeCap);
  if (!cap.ok) errors.rpeCap = `RPE cap must be between ${ENGINE_LIMITS.rpeCap.min.toFixed(1)} and ${ENGINE_LIMITS.rpeCap.max.toFixed(1)} in steps of 0.5.`;

  const min = parseOverride(coach ? d.repsMin : '', { min: 1, max: 50, step: 1 });
  const max = parseOverride(coach ? d.repsMax : '', { min: 1, max: 50, step: 1 });
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
  const main = d.muscleGroup;
  const muscles = Object.values(MuscleGroup).flatMap((muscle) => {
    const role = d.extraMuscles[muscle];
    return role && muscle !== main ? [{ muscle, role }] : [];
  });
  return {
    ok: true,
    body: {
      name,
      muscleGroup: main,
      muscles,
      equipment: d.equipment || null,
      pattern: d.pattern || null,
      profile: d.profile || null,
      position: d.position || null,
      loadIncrementKg: inc.value ?? 2.5,
      demoUrl: d.demoUrl.trim() || null,
      ...(coach ? { rpeCap: cap.value, repsMin: min.value, repsMax: max.value } : {}),
    },
  };
}

/** "Quads, Glutes": primaries in order, then secondaries. */
export function formatMuscles(e: Pick<ExerciseDto, 'muscles'>, roles: 'primary' | 'all' = 'all'): string {
  return e.muscles
    .filter((m) => roles === 'all' || m.role === MuscleRole.PRIMARY)
    .map((m) => MUSCLE_GROUP_LABELS[m.muscle])
    .join(', ');
}

export function formatRepRange(e: Pick<ExerciseDto, 'repsMin' | 'repsMax'>): string {
  if (e.repsMin === null || e.repsMax === null) return '—';
  return e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}–${e.repsMax}`;
}

export function formatOverrides(n: number): string {
  return n === 0 ? '0' : `${n} ${n === 1 ? 'client' : 'clients'}`;
}

/** Whether the viewer owns (may edit and archive) this exercise. */
export function isOwnExercise(e: Pick<ExerciseDto, 'coachId' | 'ownerId'>, viewer: LibraryViewer, userId: string): boolean {
  return viewer === 'coach' ? e.coachId === userId : e.ownerId === userId;
}
