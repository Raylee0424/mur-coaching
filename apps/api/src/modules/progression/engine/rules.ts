import { ENGINE_DEFAULTS } from '@coaching/shared';
import { DEFAULT_THRESHOLDS } from './settings';
import type { Prescription, SessionInput, SessionMetrics } from './types';

/** Fallback when neither the prescription nor any override sets a target RPE. */
export const targetRpeOf = (rx: Prescription): number => rx.targetRpe ?? ENGINE_DEFAULTS.rpeCap;

/** All metrics have an RPE and every one is >= highRpe. Missing RPE never counts as high. */
export function isHighEffort(window: readonly SessionMetrics[], highRpe = DEFAULT_THRESHOLDS.highRpe): boolean {
  return window.every((m) => m.avgRpe !== null && m.avgRpe >= highRpe);
}

/** Newest session has not beaten the oldest in the window on volume or e1RM. */
export function isPlateau(window: readonly SessionMetrics[], tolerance = DEFAULT_THRESHOLDS.plateauTolerance): boolean {
  const first = window[0];
  const last = window[window.length - 1];
  if (!first || !last || window.length < 2) return false;
  return (
    last.volumeKg <= first.volumeKg * (1 + tolerance) &&
    last.e1rmKg <= first.e1rmKg * (1 + tolerance)
  );
}

/** e1RM fell session over session and the total drop is meaningful. */
export function isDeclining(window: readonly SessionMetrics[], threshold = DEFAULT_THRESHOLDS.declineThreshold): boolean {
  const first = window[0];
  const last = window[window.length - 1];
  if (!first || !last || window.length < 3) return false;
  const strictlyFalling = window.every((m, i) => i === 0 || m.e1rmKg < (window[i - 1]?.e1rmKg ?? Infinity));
  return strictlyFalling && last.e1rmKg <= first.e1rmKg * (1 - threshold);
}

/** Reps of the sets done at the session's top weight. */
export function repsAtTopWeight(session: SessionInput, topWeightKg: number): number[] {
  return session.sets.filter((s) => !s.isWarmup && s.reps > 0 && s.weightKg === topWeightKg).map((s) => s.reps);
}
