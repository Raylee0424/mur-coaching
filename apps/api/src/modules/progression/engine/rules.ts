import type { Prescription, SessionInput, SessionMetrics } from './types';

/** Used when the prescription has no target RPE. */
export const DEFAULT_TARGET_RPE = 8;
/** RPE at/above which consecutive sessions count as "grinding". */
export const HIGH_RPE = 9;
/** Plateau tolerance: volume/e1RM within this fraction of the oldest session counts as flat. */
export const PLATEAU_TOLERANCE = 0.02;
/** Total e1RM drop across the window that counts as declining. */
export const DECLINE_THRESHOLD = 0.025;
export const DELOAD_FACTOR = 0.9;

export const targetRpeOf = (rx: Prescription): number => rx.targetRpe ?? DEFAULT_TARGET_RPE;

/** All metrics have an RPE and every one is >= HIGH_RPE. Missing RPE never counts as high. */
export function isHighEffort(window: readonly SessionMetrics[]): boolean {
  return window.every((m) => m.avgRpe !== null && m.avgRpe >= HIGH_RPE);
}

/** Newest session has not beaten the oldest in the window on volume or e1RM. */
export function isPlateau(window: readonly SessionMetrics[]): boolean {
  const first = window[0];
  const last = window[window.length - 1];
  if (!first || !last || window.length < 2) return false;
  return (
    last.volumeKg <= first.volumeKg * (1 + PLATEAU_TOLERANCE) &&
    last.e1rmKg <= first.e1rmKg * (1 + PLATEAU_TOLERANCE)
  );
}

/** e1RM fell session over session and the total drop is meaningful. */
export function isDeclining(window: readonly SessionMetrics[]): boolean {
  const first = window[0];
  const last = window[window.length - 1];
  if (!first || !last || window.length < 3) return false;
  const strictlyFalling = window.every((m, i) => i === 0 || m.e1rmKg < (window[i - 1]?.e1rmKg ?? Infinity));
  return strictlyFalling && last.e1rmKg <= first.e1rmKg * (1 - DECLINE_THRESHOLD);
}

/** Reps of the sets done at the session's top weight. */
export function repsAtTopWeight(session: SessionInput, topWeightKg: number): number[] {
  return session.sets.filter((s) => !s.isWarmup && s.reps > 0 && s.weightKg === topWeightKg).map((s) => s.reps);
}
