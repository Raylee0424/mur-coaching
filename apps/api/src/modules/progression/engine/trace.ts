import { RecommendationAction } from '@coaching/shared';
import type { RuleTraceStep } from '@coaching/shared';
import { computeSessionMetrics } from './metrics';
import { isDeclining, isHighEffort, isPlateau, repsAtTopWeight, targetRpeOf } from './rules';
import { DEFAULT_THRESHOLDS, type EngineThresholds } from './settings';
import type { Prescription, SessionInput, SessionMetrics } from './types';

const MIN_SESSIONS = 2;
const A = RecommendationAction;

const r1 = (n: number): number => Math.round(n * 10) / 10;
const yn = (b: boolean): string => (b ? 'yes' : 'no');

export interface RuleTrace {
  /** Same action `evaluate` returns for this input. */
  verdict: RecommendationAction;
  /** DELOAD, HOLD, INCREASE_REPS, INCREASE_LOAD, in that order. */
  steps: RuleTraceStep[];
}

/**
 * Replays the engine's rules against the same inputs and reports, for each rule, its condition, what was
 * observed and whether it held. `matched` is per-rule truth; `decided` marks the one the engine acted on
 * (precedence: insufficient data / DELOAD → HOLD → INCREASE_LOAD → INCREASE_REPS). Pure; mirrors `evaluate`.
 * Returns null when there are no usable sessions.
 */
export function traceRules(
  history: readonly SessionInput[],
  rx: Prescription,
  t: EngineThresholds = DEFAULT_THRESHOLDS,
): RuleTrace | null {
  const analysed = history
    .map((session) => ({ session, metrics: computeSessionMetrics(session) }))
    .filter((x): x is { session: SessionInput; metrics: SessionMetrics } => x.metrics !== null)
    .sort((a, b) => a.session.performedAt.getTime() - b.session.performedAt.getTime())
    .slice(-t.window);
  const latest = analysed[analysed.length - 1];
  if (!latest) return null;

  const window = analysed.map((x) => x.metrics);
  const n = window.length;
  const lm = latest.metrics;
  const first = window[0] as SessionMetrics;
  const repsDone = repsAtTopWeight(latest.session, lm.topWeightKg);
  const targetRpe = targetRpeOf(rx);
  const loadCap = targetRpe - t.loadMarginRpe;
  const lowest = repsDone.length > 0 ? Math.min(...repsDone) : 0;

  // ── DELOAD ──
  const fullWindow = n === t.window;
  const plateau = isPlateau(window, t.plateauTolerance);
  const highEffort = isHighEffort(window, t.highRpe);
  const declining = isDeclining(window, t.declineThreshold);
  const deload = fullWindow && ((plateau && highEffort) || declining);
  const e1rmChange = first.e1rmKg > 0 ? r1(((lm.e1rmKg - first.e1rmKg) / first.e1rmKg) * 100) : 0;
  const rpeList = window.map((m) => (m.avgRpe === null ? 'n/a' : String(m.avgRpe))).join(', ');

  // ── HOLD (first triggered sub-condition, in the engine's order) ──
  let holdWhy: string | null = null;
  if (n < MIN_SESSIONS) holdWhy = `Only ${n} session logged; need ${MIN_SESSIONS}`;
  else if (lm.workingSets < rx.targetSets || repsDone.length < rx.targetSets) {
    holdWhy = `${repsDone.length} of ${rx.targetSets} prescribed sets done at ${lm.topWeightKg} kg`;
  } else if (lm.avgRpe === null) holdWhy = 'No RPE logged';
  else if (lm.avgRpe > targetRpe) holdWhy = `Average RPE ${lm.avgRpe} is above the ${targetRpe} cap`;
  else if (lowest < rx.repsMin) holdWhy = `Lowest set ${lowest} reps is below the ${rx.repsMin}-rep floor`;
  else if (lowest >= rx.repsMax && lm.avgRpe > loadCap) {
    holdWhy = `Top of range hit, but average RPE ${lm.avgRpe} is above ${loadCap} (cap ${targetRpe} minus margin ${t.loadMarginRpe})`;
  }
  const hold = holdWhy !== null;

  const clear = !hold; // lowest/avgRpe are meaningful below only when HOLD did not trigger
  const incLoad = clear && lowest >= rx.repsMax;
  const incReps = clear && lowest < rx.repsMax;
  const verdict = n < MIN_SESSIONS ? A.HOLD : deload ? A.DELOAD : hold ? A.HOLD : incLoad ? A.INCREASE_LOAD : A.INCREASE_REPS;

  const setsObs = clear ? `lowest set ${lowest} reps, avg RPE ${lm.avgRpe}` : (holdWhy ?? '');
  const steps: RuleTraceStep[] = [
    {
      action: A.DELOAD,
      condition: `Plateau (volume and e1RM within ${r1(t.plateauTolerance * 100)}%) with avg RPE >= ${t.highRpe} in all ${t.window} sessions, or e1RM falling every session by ${r1(t.declineThreshold * 100)}%+ overall`,
      observed: `${n} of ${t.window} sessions; plateau: ${yn(plateau)}; RPE by session: ${rpeList}; e1RM change ${e1rmChange}%${declining ? ' (falling)' : ''}`,
      matched: deload,
      decided: verdict === A.DELOAD,
    },
    {
      action: A.HOLD,
      condition: `Any of: fewer sets than prescribed at the top load, no RPE logged, avg RPE above ${targetRpe}, a set below ${rx.repsMin} reps, or top of range hit without RPE headroom`,
      observed: holdWhy ?? 'None of these triggered',
      matched: hold,
      decided: verdict === A.HOLD,
    },
    {
      action: A.INCREASE_REPS,
      condition: `All ${rx.targetSets} sets at ${rx.repsMin}+ reps with avg RPE <= ${targetRpe}, but not every set at ${rx.repsMax} reps yet`,
      observed: setsObs,
      matched: incReps,
      decided: verdict === A.INCREASE_REPS,
    },
    {
      action: A.INCREASE_LOAD,
      condition: `All ${rx.targetSets} sets at ${rx.repsMax} reps with avg RPE <= ${r1(loadCap)} (cap ${targetRpe} minus margin ${t.loadMarginRpe})`,
      observed: setsObs,
      matched: incLoad,
      decided: verdict === A.INCREASE_LOAD,
    },
  ];
  return { verdict, steps };
}
