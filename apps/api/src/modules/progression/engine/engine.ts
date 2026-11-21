import { RecommendationAction } from '@coaching/shared';
import { computeSessionMetrics, roundToIncrement } from './metrics';
import {
  DELOAD_FACTOR,
  isDeclining,
  isHighEffort,
  isPlateau,
  repsAtTopWeight,
  targetRpeOf,
} from './rules';
import type { Prescription, RecommendationDraft, SessionInput, SessionMetrics } from './types';

/** Sessions the rules look at. */
const WINDOW = 3;
const MIN_SESSIONS = 2;

/**
 * Pure decision function: history + prescription → recommendation draft.
 * Rule order (first match wins): insufficient data → DELOAD → INCREASE_LOAD → INCREASE_REPS → HOLD.
 */
export function evaluate(history: readonly SessionInput[], rx: Prescription): RecommendationDraft | null {
  const analysed = history
    .map((session) => ({ session, metrics: computeSessionMetrics(session) }))
    .filter((x): x is { session: SessionInput; metrics: SessionMetrics } => x.metrics !== null)
    .sort((a, b) => a.session.performedAt.getTime() - b.session.performedAt.getTime())
    .slice(-WINDOW);

  const latest = analysed[analysed.length - 1];
  if (!latest) return null;

  const window = analysed.map((x) => x.metrics);
  const base = {
    metrics: window,
    sourceExerciseLogIds: window.map((m) => m.exerciseLogId),
  };
  const { metrics: lm } = latest;
  const hold = (reason: string): RecommendationDraft => ({
    ...base,
    action: RecommendationAction.HOLD,
    recommendedWeightKg: lm.topWeightKg,
    recommendedRepsMin: rx.repsMin,
    recommendedRepsMax: rx.repsMax,
    recommendedSets: rx.targetSets,
    reason,
  });

  if (analysed.length < MIN_SESSIONS) {
    return hold(`Only ${analysed.length} session logged; need ${MIN_SESSIONS} before recommending changes.`);
  }

  // DELOAD: needs a full window.
  if (window.length === WINDOW) {
    const grinding = isPlateau(window) && isHighEffort(window);
    if (grinding || isDeclining(window)) {
      return {
        ...base,
        action: RecommendationAction.DELOAD,
        recommendedWeightKg: roundToIncrement(lm.topWeightKg * DELOAD_FACTOR, rx.loadIncrementKg),
        recommendedRepsMin: rx.repsMin,
        recommendedRepsMax: rx.repsMax,
        recommendedSets: rx.targetSets,
        reason: grinding
          ? `Plateau over the last ${WINDOW} sessions (volume and e1RM flat) with average RPE >= 9 each time. Deload to ~90% load.`
          : `Estimated 1RM fell across the last ${WINDOW} sessions. Deload to ~90% load.`,
      };
    }
  }

  const repsDone = repsAtTopWeight(latest.session, lm.topWeightKg);
  const targetRpe = targetRpeOf(rx);

  if (lm.workingSets < rx.targetSets || repsDone.length < rx.targetSets) {
    return hold(`Completed ${repsDone.length} of ${rx.targetSets} prescribed sets at ${lm.topWeightKg} kg.`);
  }
  if (lm.avgRpe === null) {
    return hold('RPE not logged; cannot confirm the load was manageable.');
  }
  if (lm.avgRpe > targetRpe) {
    return hold(`Average RPE ${lm.avgRpe} is above target ${targetRpe}; repeat the load.`);
  }

  const lowestReps = Math.min(...repsDone);
  if (lowestReps < rx.repsMin) {
    return hold(`Lowest set was ${lowestReps} reps, below the ${rx.repsMin}-rep floor; repeat the load.`);
  }

  if (lowestReps >= rx.repsMax) {
    return {
      ...base,
      action: RecommendationAction.INCREASE_LOAD,
      recommendedWeightKg: lm.topWeightKg + rx.loadIncrementKg,
      recommendedRepsMin: rx.repsMin,
      recommendedRepsMax: rx.repsMax,
      recommendedSets: rx.targetSets,
      reason: `All ${rx.targetSets} sets hit ${rx.repsMax} reps at ${lm.topWeightKg} kg with average RPE ${lm.avgRpe} (target ${targetRpe}). Add ${rx.loadIncrementKg} kg.`,
    };
  }

  const nextFloor = Math.min(rx.repsMax, lowestReps + 1);
  return {
    ...base,
    action: RecommendationAction.INCREASE_REPS,
    recommendedWeightKg: lm.topWeightKg,
    recommendedRepsMin: nextFloor,
    recommendedRepsMax: rx.repsMax,
    recommendedSets: rx.targetSets,
    reason: `Reps ${Math.min(...repsDone)}-${Math.max(...repsDone)} at ${lm.topWeightKg} kg, RPE ${lm.avgRpe} within target. Stay at this load and aim for ${nextFloor}+ reps on every set.`,
  };
}
