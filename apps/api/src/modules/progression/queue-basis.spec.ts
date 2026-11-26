import { describe, expect, it } from 'vitest';
import { ENGINE_DEFAULTS, RecommendationAction } from '@coaching/shared';
import type { ResolvedEngineSettings, SessionMetrics } from '@coaching/shared';
import { computeSessionMetrics } from './engine';
import type { SessionInput, SetInput } from './engine/types';
import { queueReason } from './queue-basis';

const A = RecommendationAction;
const src = <T>(value: T) => ({ value, source: 'DEFAULT' as const });
const settings: ResolvedEngineSettings = {
  rpeCap: src(8),
  loadMarginRpe: src(ENGINE_DEFAULTS.loadMarginRpe),
  highRpe: src(ENGINE_DEFAULTS.highRpe),
  plateauTolerancePct: src(ENGINE_DEFAULTS.plateauTolerancePct),
  declineThresholdPct: src(ENGINE_DEFAULTS.declineThresholdPct),
  deloadPercent: src(ENGINE_DEFAULTS.deloadPercent),
  sessionsAnalyzed: src(ENGINE_DEFAULTS.sessionsAnalyzed),
  loadIncrementKg: src(2.5),
  repsMin: src(8),
  repsMax: src(10),
};
const work = (reps: number, weightKg: number, rpe: number | null = 8, n = 3): SetInput[] =>
  Array.from({ length: n }, () => ({ reps, weightKg, rpe, isWarmup: false }));
const session = (i: number, sets: SetInput[]): SessionInput => ({
  exerciseLogId: `s${i}`,
  performedAt: new Date(Date.UTC(2026, 0, i)),
  sets,
});
const inputs = [session(1, work(9, 50)), session(2, work(10, 50))];
const metricsOf = (list: SessionInput[]): SessionMetrics[] =>
  list.map((i) => computeSessionMetrics(i)).filter((m): m is SessionMetrics => m !== null);
const base = {
  action: A.INCREASE_LOAD,
  metrics: metricsOf(inputs),
  settings,
  recommendedSets: 3,
  sourceIds: ['s1', 's2'],
  inputs,
};

describe('queueReason', () => {
  it('returns the replayed case when settings exist and every source session is present', () => {
    expect(queueReason(base).reasonCase).toBe('INCREASE_LOAD');
  });

  it('returns null case when settings are null', () => {
    expect(queueReason({ ...base, settings: null }).reasonCase).toBeNull();
  });

  it('returns null case when a source session is missing', () => {
    expect(queueReason({ ...base, inputs: inputs.slice(0, 1) }).reasonCase).toBeNull();
    expect(queueReason({ ...base, inputs: [], sourceIds: [] }).reasonCase).toBeNull();
  });

  it('returns null case when the stored action differs from the replayed action', () => {
    expect(queueReason({ ...base, action: A.HOLD }).reasonCase).toBeNull();
  });

  it('converts weights and RPE to strings', () => {
    const { basis } = queueReason(base);
    expect(basis.sessionsUsed).toBe(2);
    expect(basis.latest).toEqual({ weightKg: '50', repsPerSet: [10, 10, 10], workingSets: 3, avgRpe: '8' });
    expect(basis.rule).toEqual({
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      rpeCap: '8',
      loadMarginRpe: '0',
      highRpe: '9',
      loadIncrementKg: '2.5',
      deloadPercent: 10,
    });
  });

  it('repsPerSet only counts non-warm-up sets at the top weight', () => {
    const mixed = session(2, [
      { reps: 5, weightKg: 50, rpe: null, isWarmup: true },
      ...work(10, 50),
      { reps: 12, weightKg: 40, rpe: 7, isWarmup: false },
    ]);
    const list = [inputs[0]!, mixed];
    const { basis } = queueReason({ ...base, inputs: list, metrics: metricsOf(list) });
    expect(basis.latest?.repsPerSet).toEqual([10, 10, 10]);
  });

  it('repsPerSet is null when the newest source log is gone', () => {
    const { basis } = queueReason({ ...base, inputs: inputs.slice(0, 1) });
    expect(basis.latest?.repsPerSet).toBeNull();
  });

  it('latest is null when metrics are empty or missing', () => {
    expect(queueReason({ ...base, metrics: [] }).basis.latest).toBeNull();
    expect(queueReason({ ...base, metrics: null }).basis.sessionsUsed).toBe(0);
  });

  it('rule is all null when settings are null', () => {
    const { basis } = queueReason({ ...base, settings: null, recommendedSets: null });
    expect(Object.values(basis.rule).every((v) => v === null)).toBe(true);
  });
});
