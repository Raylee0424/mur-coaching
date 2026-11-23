import { JOINT_PATTERNS, LimitationSeverity, LimitationTarget } from '@coaching/shared';
import type { Joint, LimitationFlag, MovementPattern, MuscleGroup, ProgramConflictDto } from '@coaching/shared';

export interface LimitationRow {
  id: string;
  target: LimitationTarget;
  muscleGroup: MuscleGroup | null;
  exerciseId: string | null;
  joint: Joint | null;
  pattern: MovementPattern | null;
  severity: LimitationSeverity;
  note: string | null;
  /** `YYYY-MM-DD` */
  startsOn: string;
  /** `YYYY-MM-DD`, inclusive; null = open ended. */
  endsOn: string | null;
}

/** What the conflict check needs to know about an exercise. */
export interface ConflictExercise {
  id: string;
  /** Main primary muscle; always counted even if `muscles` is empty. */
  muscleGroup: MuscleGroup;
  /** Every muscle trained, primary or secondary. */
  muscles?: readonly { muscle: MuscleGroup }[];
  pattern?: MovementPattern | null;
}

/** Prisma `select` that loads exactly the ConflictExercise fields. */
export const CONFLICT_EXERCISE_SELECT = {
  id: true,
  muscleGroup: true,
  pattern: true,
  muscles: { select: { muscle: true } },
} as const;

/** Inclusive on both ends; `day` is `YYYY-MM-DD`. */
export function isActiveOn(l: Pick<LimitationRow, 'startsOn' | 'endsOn'>, day: string): boolean {
  return l.startsOn <= day && (l.endsOn === null || l.endsOn >= day);
}

function covers(l: LimitationRow, e: ConflictExercise): boolean {
  switch (l.target) {
    case LimitationTarget.EXERCISE:
      return l.exerciseId === e.id;
    case LimitationTarget.MUSCLE:
      return l.muscleGroup !== null && (l.muscleGroup === e.muscleGroup || (e.muscles ?? []).some((m) => m.muscle === l.muscleGroup));
    case LimitationTarget.JOINT:
      return l.joint !== null && !!e.pattern && JOINT_PATTERNS[l.joint].includes(e.pattern);
    case LimitationTarget.PATTERN:
      return l.pattern !== null && l.pattern === e.pattern;
    default:
      return false;
  }
}

/**
 * The limitation that applies to an exercise on `day`, or null. AVOID beats CAUTION; ties keep the first row.
 * Muscle targets match any muscle the exercise trains; joint targets match through JOINT_PATTERNS.
 * Advisory only: callers flag and sort, they never block logging.
 */
export function limitationFlag(limitations: readonly LimitationRow[], exercise: ConflictExercise, day: string): LimitationFlag | null {
  let best: LimitationRow | null = null;
  for (const l of limitations) {
    if (!isActiveOn(l, day) || !covers(l, exercise)) continue;
    if (!best || (best.severity === LimitationSeverity.CAUTION && l.severity === LimitationSeverity.AVOID)) best = l;
  }
  return best ? { limitationId: best.id, severity: best.severity, note: best.note } : null;
}

/** Safe options first: unflagged, then CAUTION, then AVOID. Stable within each group. */
export function sortSafestFirst<T extends { limitation: LimitationFlag | null }>(items: readonly T[]): T[] {
  const rank = (x: T): number => (x.limitation === null ? 0 : x.limitation.severity === LimitationSeverity.CAUTION ? 1 : 2);
  return items.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i).map((x) => x.item);
}

export interface ProgramWorkoutForConflicts {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  exercises: readonly { exercise: ConflictExercise & { name: string } }[];
}

/** Every flagged prescription in program order (workouts as given, then prescription order). */
export function programConflicts(limitations: readonly LimitationRow[], workouts: readonly ProgramWorkoutForConflicts[], day: string): ProgramConflictDto[] {
  const out: ProgramConflictDto[] = [];
  for (const w of workouts) {
    for (const { exercise } of w.exercises) {
      const flag = limitationFlag(limitations, exercise, day);
      if (flag) {
        out.push({
          workoutId: w.id,
          weekNumber: w.weekNumber,
          dayNumber: w.dayNumber,
          workoutName: w.name,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          limitation: flag,
        });
      }
    }
  }
  return out;
}
