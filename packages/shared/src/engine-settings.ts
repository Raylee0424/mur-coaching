import type { RecommendationAction } from './enums';

/**
 * Progression engine thresholds. The defaults reproduce the original hard-coded engine exactly.
 * Resolution order (see the API's engine/settings.ts): client override → coach rule → default,
 * with the prescription and exercise supplying RPE target, rep range and increment where set.
 */
export interface EngineRuleValues {
  /** Target / cap RPE used when the client has no override and the prescription has no target. */
  rpeCap: number;
  /** INCREASE_LOAD needs avg RPE at least this far below the cap. */
  loadMarginRpe: number;
  /** Avg RPE at/above which a session counts as grinding (DELOAD check). */
  highRpe: number;
  /** Volume/e1RM within this % of the oldest session counts as a plateau. */
  plateauTolerancePct: number;
  /** Total e1RM drop (%) across the window that counts as declining. */
  declineThresholdPct: number;
  /** Load reduction on DELOAD, in %. */
  deloadPercent: number;
  /** Sessions the engine analyses. */
  sessionsAnalyzed: number;
}

export const ENGINE_DEFAULTS: EngineRuleValues = {
  rpeCap: 8,
  loadMarginRpe: 0,
  highRpe: 9,
  plateauTolerancePct: 2,
  declineThresholdPct: 2.5,
  deloadPercent: 10,
  sessionsAnalyzed: 3,
};

export interface NumberLimit {
  min: number;
  max: number;
  step: number;
}

/** Validation bounds shared by API validators, DB CHECKs and UI inputs. */
export const ENGINE_LIMITS: Record<keyof EngineRuleValues, NumberLimit> & {
  loadIncrementKg: NumberLimit;
  reps: NumberLimit;
  autoApproveMaxKg: NumberLimit;
} = {
  rpeCap: { min: 5, max: 10, step: 0.5 },
  loadMarginRpe: { min: 0, max: 3, step: 0.5 },
  highRpe: { min: 7, max: 10, step: 0.5 },
  plateauTolerancePct: { min: 0, max: 10, step: 0.5 },
  declineThresholdPct: { min: 0, max: 20, step: 0.5 },
  deloadPercent: { min: 5, max: 30, step: 1 },
  sessionsAnalyzed: { min: 2, max: 5, step: 1 },
  loadIncrementKg: { min: 0.25, max: 25, step: 0.25 },
  reps: { min: 1, max: 50, step: 1 },
  autoApproveMaxKg: { min: 0.5, max: 50, step: 0.5 },
};

export type SettingSource = 'DEFAULT' | 'COACH' | 'CLIENT' | 'PRESCRIPTION' | 'EXERCISE';

export interface ResolvedSetting<T> {
  value: T;
  source: SettingSource;
}

/** Everything one evaluation used, with where each value came from. Stored on each recommendation. */
export interface ResolvedEngineSettings {
  rpeCap: ResolvedSetting<number>;
  loadMarginRpe: ResolvedSetting<number>;
  highRpe: ResolvedSetting<number>;
  plateauTolerancePct: ResolvedSetting<number>;
  declineThresholdPct: ResolvedSetting<number>;
  deloadPercent: ResolvedSetting<number>;
  sessionsAnalyzed: ResolvedSetting<number>;
  loadIncrementKg: ResolvedSetting<number>;
  repsMin: ResolvedSetting<number>;
  repsMax: ResolvedSetting<number>;
}

export type EngineRuleKey = keyof EngineRuleValues;

/** Coach's stored rules (null = default) plus the values in force. */
export interface CoachEngineRulesDto {
  rules: { [K in EngineRuleKey]: number | null };
  effective: EngineRuleValues;
  updatedAt: string | null;
}

/** Full replacement: send every key; null resets that key to the default. */
export type UpdateCoachEngineRulesRequest = { [K in EngineRuleKey]: number | null };

export interface EnginePreviewRequest {
  clientId: string;
  exerciseId: string;
  rules: UpdateCoachEngineRulesRequest;
}

export interface EnginePreviewResponse {
  clientName: string;
  exerciseName: string;
  action: RecommendationAction;
  reason: string;
  recommendedWeightKg: number | null;
  recommendedRepsMin: number | null;
  recommendedRepsMax: number | null;
  recommendedSets: number | null;
  settings: ResolvedEngineSettings;
}
