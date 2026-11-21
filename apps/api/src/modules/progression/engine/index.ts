export { evaluate } from './engine';
export { computeSessionMetrics, estimateOneRepMax, roundToIncrement } from './metrics';
export type * from './types';
export { DEFAULT_THRESHOLDS, resolveEngineSettings, shouldAutoApprove, thresholdsFromResolved } from './settings';
export type { ClientOverrides, CoachRules, EffectiveSettings, EngineThresholds, ExerciseRules } from './settings';
export { traceRules } from './trace';
