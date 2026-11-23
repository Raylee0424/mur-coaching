import { LimitationSeverity, LimitationTarget } from '@coaching/shared';
import type { LimitationFlag, MuscleGroup } from '@coaching/shared';

export interface LimitationRow {
  id: string;
  target: LimitationTarget;
  muscleGroup: MuscleGroup | null;
  exerciseId: string | null;
  severity: LimitationSeverity;
  note: string | null;
  /** `YYYY-MM-DD` */
  startsOn: string;
  /** `YYYY-MM-DD`, inclusive; null = open ended. */
  endsOn: string | null;
}

/** Inclusive on both ends; `day` is `YYYY-MM-DD`. */
export function isActiveOn(l: Pick<LimitationRow, 'startsOn' | 'endsOn'>, day: string): boolean {
  return l.startsOn <= day && (l.endsOn === null || l.endsOn >= day);
}

/**
 * The limitation that applies to an exercise on `day`, or null. AVOID beats CAUTION; ties keep the first row.
 * Advisory only: callers flag and sort, they never block logging.
 */
export function limitationFlag(
  limitations: readonly LimitationRow[],
  exercise: { id: string; muscleGroup: MuscleGroup },
  day: string,
): LimitationFlag | null {
  let best: LimitationRow | null = null;
  for (const l of limitations) {
    if (!isActiveOn(l, day)) continue;
    const hit =
      l.target === LimitationTarget.EXERCISE ? l.exerciseId === exercise.id : l.muscleGroup !== null && l.muscleGroup === exercise.muscleGroup;
    if (!hit) continue;
    if (!best || (best.severity === LimitationSeverity.CAUTION && l.severity === LimitationSeverity.AVOID)) best = l;
  }
  return best ? { limitationId: best.id, severity: best.severity, note: best.note } : null;
}

/** Safe options first: unflagged, then CAUTION, then AVOID. Stable within each group. */
export function sortSafestFirst<T extends { limitation: LimitationFlag | null }>(items: readonly T[]): T[] {
  const rank = (x: T): number => (x.limitation === null ? 0 : x.limitation.severity === LimitationSeverity.CAUTION ? 1 : 2);
  return items.map((item, i) => ({ item, i })).sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i).map((x) => x.item);
}
