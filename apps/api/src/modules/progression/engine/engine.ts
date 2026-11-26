import { RecommendationAction, type ProgressionReasonCase } from '@coaching/shared';
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
  return decide(history, rx, t)?.draft ?? null;
}

/** Which branch of `evaluate` decided, and the action it produced. Same code path as `evaluate`. */
export function reasonCaseOf(
  history: readonly SessionInput[],
  rx: Prescription,
  t: EngineThresholds = DEFAULT_THRESHOLDS,
): { reasonCase: ProgressionReasonCase; action: RecommendationAction } | null {
  const decided = decide(history, rx, t);
  return decided ? { reasonCase: decided.reasonCase, action: decided.draft.action } : null;
}

interface Decision {
  reasonCase: ProgressionReasonCase;
  draft: RecommendationDraft;
}

function decide(history: readonly SessionInput[], rx: Prescription, t: EngineThresholds): Decision | null {
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
  const hold = (reasonCase: ProgressionReasonCase, reason: string): Decision => ({
    reasonCase,
    draft: {
      ...base,
      action: RecommendationAction.HOLD,
      recommendedWeightKg: lm.topWeightKg,
      recommendedRepsMin: rx.repsMin,
      recommendedRepsMax: rx.repsMax,
      recommendedSets: rx.targetSets,
      reason,
    },
  });

  if (analysed.length < MIN_SESSIONS) {
    return hold('TOO_FEW_SESSIONS', `Only ${analysed.length} session logged; need ${MIN_SESSIONS} before recommending changes.`);
  }

  // DELOAD: needs a full window.
  if (window.length === WINDOW) {
    const grinding = isPlateau(window, t.plateauTolerance) && isHighEffort(window, t.highRpe);
    if (grinding || isDeclining(window, t.declineThreshold)) {
      const keep = pct(t.deloadFactor);
      return {
        reasonCase: grinding ? 'DELOAD_PLATEAU' : 'DELOAD_DECLINE',
        draft: {
          ...base,
          action: RecommendationAction.DELOAD,
          recommendedWeightKg: roundToIncrement(lm.topWeightKg * t.deloadFactor, rx.loadIncrementKg),
          recommendedRepsMin: rx.repsMin,
          recommendedRepsMax: rx.repsMax,
          recommendedSets: rx.targetSets,
          reason: grinding
            ? `Plateau over the last ${WINDOW} sessions (volume and e1RM flat) with average RPE >= ${t.highRpe} each time. Deload to ~${keep}% load.`
            : `Estimated 1RM fell across the last ${WINDOW} sessions. Deload to ~${keep}% load.`,
        },
      };
    }
  }

  const repsDone = repsAtTopWeight(latest.session, lm.topWeightKg);
  const targetRpe = targetRpeOf(rx);

  if (lm.workingSets < rx.targetSets || repsDone.length < rx.targetSets) {
    return hold('HOLD_SETS_MISSED', `Completed ${repsDone.length} of ${rx.targetSets} prescribed sets at ${lm.topWeightKg} kg.`);
  }
  if (lm.avgRpe === null) {
    return hold('HOLD_RPE_MISSING', 'RPE not logged; cannot confirm the load was manageable.');
  }
  if (lm.avgRpe > targetRpe) {
    return hold('HOLD_RPE_HIGH', `Average RPE ${lm.avgRpe} is above target ${targetRpe}; repeat the load.`);
  }

  const lowestReps = Math.min(...repsDone);
  if (lowestReps < rx.repsMin) {
    return hold('HOLD_REPS_LOW', `Lowest set was ${lowestReps} reps, below the ${rx.repsMin}-rep floor; repeat the load.`);
  }

  if (lowestReps >= rx.repsMax) {
    const loadCap = targetRpe - t.loadMarginRpe;
    if (lm.avgRpe > loadCap) {
      return hold(
        'HOLD_LOAD_MARGIN',
        `All ${rx.targetSets} sets hit ${rx.repsMax} reps, but average RPE ${lm.avgRpe} is not at least ${t.loadMarginRpe} below the cap ${targetRpe}; repeat the load.`,
      );
    }
    return {
      reasonCase: 'INCREASE_LOAD',
      draft: {
        ...base,
        action: RecommendationAction.INCREASE_LOAD,
        recommendedWeightKg: lm.topWeightKg + rx.loadIncrementKg,
        recommendedRepsMin: rx.repsMin,
        recommendedRepsMax: rx.repsMax,
        recommendedSets: rx.targetSets,
        reason: `All ${rx.targetSets} sets hit ${rx.repsMax} reps at ${lm.topWeightKg} kg with average RPE ${lm.avgRpe} (target ${targetRpe}). Add ${rx.loadIncrementKg} kg.`,
      },
    };
  }

  const nextFloor = Math.min(rx.repsMax, lowestReps + 1);
  return {
    reasonCase: 'INCREASE_REPS',
    draft: {
      ...base,
      action: RecommendationAction.INCREASE_REPS,
      recommendedWeightKg: lm.topWeightKg,
      recommendedRepsMin: nextFloor,
      recommendedRepsMax: rx.repsMax,
      recommendedSets: rx.targetSets,
      reason: `Reps ${Math.min(...repsDone)}-${Math.max(...repsDone)} at ${lm.topWeightKg} kg, RPE ${lm.avgRpe} within target. Stay at this load and aim for ${nextFloor}+ reps on every set.`,
    },
  };
}
