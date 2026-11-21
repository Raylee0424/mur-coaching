import { ENGINE_DEFAULTS, RecommendationAction } from '@coaching/shared';
import type { EngineRuleValues, ResolvedEngineSettings, ResolvedSetting, SettingSource } from '@coaching/shared';
import type { Prescription, RecommendationDraft } from './types';

/** Numeric knobs the rules read. Fractions, not percentages. */
export interface EngineThresholds {
  loadMarginRpe: number;
  highRpe: number;
  plateauTolerance: number;
  declineThreshold: number;
  deloadFactor: number;
  window: number;
}

const toThresholds = (v: EngineRuleValues): EngineThresholds => ({
  loadMarginRpe: v.loadMarginRpe,
  highRpe: v.highRpe,
  plateauTolerance: v.plateauTolerancePct / 100,
  declineThreshold: v.declineThresholdPct / 100,
  deloadFactor: 1 - v.deloadPercent / 100,
  window: v.sessionsAnalyzed,
});

/** Reproduces the original hard-coded engine. */
export const DEFAULT_THRESHOLDS: EngineThresholds = toThresholds(ENGINE_DEFAULTS);

/** Coach-level rules; null/undefined fields inherit the default. */
export type CoachRules = { [K in keyof EngineRuleValues]?: number | null };

/** Per-client overrides from the coach-client link; null fields inherit. */
export interface ClientOverrides {
  rpeCap?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  loadIncrementKg?: number | null;
  deloadPercent?: number | null;
  sessionsAnalyzed?: number | null;
}

/** Exercise-level rules (null fields inherit). Reps apply only when both bounds are set. */
export interface ExerciseRules {
  rpeCap?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
}

export interface SettingLayers {
  coach: CoachRules | null;
  client: ClientOverrides | null;
  /** Exercise-level rpeCap / rep range; the exercise's own load increment arrives via `prescription`. */
  exercise?: ExerciseRules | null;
  /** The prescription as written, with the exercise's own load increment. */
  prescription: Prescription;
}

export interface EffectiveSettings {
  /** Prescription with client/coach overrides applied: what the engine evaluates against. */
  rx: Prescription;
  thresholds: EngineThresholds;
  /** Every value plus where it came from, for "Settings used" and Overridden tags. */
  resolved: ResolvedEngineSettings;
}

const has = (v: number | null | undefined): v is number => v !== null && v !== undefined;

function pick(...candidates: [number | null | undefined, SettingSource][]): ResolvedSetting<number> {
  for (const [value, source] of candidates) if (has(value)) return { value, source };
  throw new Error('no candidate value'); // unreachable: callers always end with a default
}

/** Resolved values back into engine thresholds (used to replay a stored recommendation). */
export const thresholdsFromResolved = (r: ResolvedEngineSettings): EngineThresholds =>
  toThresholds({
    rpeCap: r.rpeCap.value,
    loadMarginRpe: r.loadMarginRpe.value,
    highRpe: r.highRpe.value,
    plateauTolerancePct: r.plateauTolerancePct.value,
    declineThresholdPct: r.declineThresholdPct.value,
    deloadPercent: r.deloadPercent.value,
    sessionsAnalyzed: r.sessionsAnalyzed.value,
  });

/**
 * Precedence: client override → exercise rule → prescription → coach rule → default.
 * RPE cap: client, exercise, the prescription's target, coach, default.
 * Rep range: client (both bounds), exercise (both bounds), then the prescription.
 * Increment: client, then the exercise's own load increment (carried on the prescription layer).
 */
export function resolveEngineSettings({ coach, client, exercise, prescription: rx }: SettingLayers): EffectiveSettings {
  const c = client ?? {};
  const e = exercise ?? {};
  const k = coach ?? {};
  const fromCoach = (key: keyof EngineRuleValues): ResolvedSetting<number> =>
    pick([key === 'deloadPercent' || key === 'sessionsAnalyzed' ? c[key] : null, 'CLIENT'], [k[key], 'COACH'], [ENGINE_DEFAULTS[key], 'DEFAULT']);

  const clientReps = has(c.repsMin) && has(c.repsMax);
  const exerciseReps = has(e.repsMin) && has(e.repsMax);
  const resolved: ResolvedEngineSettings = {
    rpeCap: pick([c.rpeCap, 'CLIENT'], [e.rpeCap, 'EXERCISE'], [rx.targetRpe, 'PRESCRIPTION'], [k.rpeCap, 'COACH'], [ENGINE_DEFAULTS.rpeCap, 'DEFAULT']),
    loadMarginRpe: fromCoach('loadMarginRpe'),
    highRpe: fromCoach('highRpe'),
    plateauTolerancePct: fromCoach('plateauTolerancePct'),
    declineThresholdPct: fromCoach('declineThresholdPct'),
    deloadPercent: fromCoach('deloadPercent'),
    sessionsAnalyzed: fromCoach('sessionsAnalyzed'),
    loadIncrementKg: pick([c.loadIncrementKg, 'CLIENT'], [rx.loadIncrementKg, 'EXERCISE']),
    repsMin: clientReps
      ? { value: c.repsMin as number, source: 'CLIENT' }
      : exerciseReps
        ? { value: e.repsMin as number, source: 'EXERCISE' }
        : { value: rx.repsMin, source: 'PRESCRIPTION' },
    repsMax: clientReps
      ? { value: c.repsMax as number, source: 'CLIENT' }
      : exerciseReps
        ? { value: e.repsMax as number, source: 'EXERCISE' }
        : { value: rx.repsMax, source: 'PRESCRIPTION' },
  };

  const values: EngineRuleValues = {
    rpeCap: resolved.rpeCap.value,
    loadMarginRpe: resolved.loadMarginRpe.value,
    highRpe: resolved.highRpe.value,
    plateauTolerancePct: resolved.plateauTolerancePct.value,
    declineThresholdPct: resolved.declineThresholdPct.value,
    deloadPercent: resolved.deloadPercent.value,
    sessionsAnalyzed: resolved.sessionsAnalyzed.value,
  };

  return {
    rx: {
      targetSets: rx.targetSets,
      repsMin: resolved.repsMin.value,
      repsMax: resolved.repsMax.value,
      targetRpe: resolved.rpeCap.value,
      loadIncrementKg: resolved.loadIncrementKg.value,
    },
    thresholds: toThresholds(values),
    resolved,
  };
}

/** Auto-approve applies only to INCREASE_LOAD, and only within the coach's optional jump limit. */
export function shouldAutoApprove(
  draft: Pick<RecommendationDraft, 'action' | 'recommendedWeightKg' | 'metrics'>,
  link: { autoApprove: boolean; autoApproveMaxKg: number | null },
): boolean {
  if (!link.autoApprove || draft.action !== RecommendationAction.INCREASE_LOAD) return false;
  if (link.autoApproveMaxKg === null) return true;
  const current = draft.metrics[draft.metrics.length - 1]?.topWeightKg;
  if (current === undefined || draft.recommendedWeightKg === null) return false;
  return draft.recommendedWeightKg - current <= link.autoApproveMaxKg + 1e-9;
}
