import { RecommendationAction } from '@coaching/shared';
import { computeSessionMetrics, roundToIncrement } from './metrics';
import { isDeclining, isHighEffort, isPlateau, repsAtTopWeight, targetRpeOf } from './rules';
import { DEFAULT_THRESHOLDS, type EngineThresholds } from './settings';
import type { Prescription, RecommendationDraft, SessionInput, SessionMetrics } from './types';

const MIN_SESSIONS = 2;
const pct = (fraction: number): number => Math.round(fraction * 1000) / 10;

/**
 * Pure decision function: history + prescription (+ thresholds) → recommendation draft.
 * Rule order (first match wins): insufficient data → DELOAD → INCREASE_LOAD → INCREASE_REPS → HOLD.
 * `rx` is the effective prescription (overrides already applied, see settings.ts).
 */
export function evaluate(
  history: readonly SessionInput[],
  rx: Prescription,
  t: EngineThresholds = DEFAULT_THRESHOLDS,
): RecommendationDraft | null {
  const WINDOW = t.window;
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
    const grinding = isPlateau(window, t.plateauTolerance) && isHighEffort(window, t.highRpe);
    if (grinding || isDeclining(window, t.declineThreshold)) {
      const keep = pct(t.deloadFactor);
      return {
        ...base,
        action: RecommendationAction.DELOAD,
        recommendedWeightKg: roundToIncrement(lm.topWeightKg * t.deloadFactor, rx.loadIncrementKg),
        recommendedRepsMin: rx.repsMin,
        recommendedRepsMax: rx.repsMax,
        recommendedSets: rx.targetSets,
        reason: grinding
          ? `Plateau over the last ${WINDOW} sessions (volume and e1RM flat) with average RPE >= ${t.highRpe} each time. Deload to ~${keep}% load.`
          : `Estimated 1RM fell across the last ${WINDOW} sessions. Deload to ~${keep}% load.`,
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
    const loadCap = targetRpe - t.loadMarginRpe;
    if (lm.avgRpe > loadCap) {
      return hold(
        `All ${rx.targetSets} sets hit ${rx.repsMax} reps, but average RPE ${lm.avgRpe} is not at least ${t.loadMarginRpe} below the cap ${targetRpe}; repeat the load.`,
      );
    }
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
