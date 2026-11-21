import type { SessionInput, SessionMetrics } from './types';

const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Epley. A single rep is its own 1RM. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  return reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** Snap to the exercise's smallest load step. */
export function roundToIncrement(kg: number, incrementKg: number): number {
  return round(Math.round(kg / incrementKg) * incrementKg, 2);
}

/** Warm-ups are ignored. Returns null when the session has no working sets with reps. */
export function computeSessionMetrics(session: SessionInput): SessionMetrics | null {
  const working = session.sets.filter((s) => !s.isWarmup && s.reps > 0);
  if (working.length === 0) return null;

  const topWeightKg = Math.max(...working.map((s) => s.weightKg));
  const topSetReps = Math.max(...working.filter((s) => s.weightKg === topWeightKg).map((s) => s.reps));
  const rpes = working.flatMap((s) => (s.rpe === null ? [] : [s.rpe]));

  return {
    exerciseLogId: session.exerciseLogId,
    performedAt: session.performedAt.toISOString(),
    workingSets: working.length,
    volumeKg: round(working.reduce((sum, s) => sum + s.reps * s.weightKg, 0), 2),
    topWeightKg,
    topSetReps,
    e1rmKg: round(estimateOneRepMax(topWeightKg, topSetReps), 1),
    avgRpe: rpes.length === 0 ? null : round(rpes.reduce((a, b) => a + b, 0) / rpes.length, 2),
  };
}
