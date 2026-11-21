import { describe, expect, it } from 'vitest';
import { RecommendationAction } from '@coaching/shared';
import { evaluate } from './engine';
import { DEFAULT_THRESHOLDS, resolveEngineSettings, shouldAutoApprove } from './settings';
import type { Prescription, SessionInput, SetInput } from './types';

const A = RecommendationAction;
const rx: Prescription = { targetSets: 3, repsMin: 8, repsMax: 10, targetRpe: 8, loadIncrementKg: 2.5 };
const session = (i: number, sets: SetInput[]): SessionInput => ({
  exerciseLogId: `s${i}`,
  performedAt: new Date(Date.UTC(2026, 0, i)),
  sets,
});
const work = (reps: number, weightKg: number, rpe: number | null = 8, n = 3): SetInput[] =>
  Array.from({ length: n }, () => ({ reps, weightKg, rpe, isWarmup: false }));

describe('resolveEngineSettings', () => {
  it('with no overrides reproduces the default thresholds and the prescription', () => {
    const s = resolveEngineSettings({ coach: null, client: null, prescription: rx });
    expect(s.thresholds).toEqual(DEFAULT_THRESHOLDS);
    expect(s.rx).toEqual(rx);
    expect(s.resolved.rpeCap).toEqual({ value: 8, source: 'PRESCRIPTION' });
    expect(s.resolved.loadIncrementKg).toEqual({ value: 2.5, source: 'EXERCISE' });
    expect(s.resolved.sessionsAnalyzed.source).toBe('DEFAULT');
  });

  it('client beats prescription beats coach for the RPE cap', () => {
    const coach = { rpeCap: 7 };
    expect(resolveEngineSettings({ coach, client: null, prescription: rx }).resolved.rpeCap.source).toBe('PRESCRIPTION');
    expect(
      resolveEngineSettings({ coach, client: null, prescription: { ...rx, targetRpe: null } }).resolved.rpeCap,
    ).toEqual({ value: 7, source: 'COACH' });
    expect(resolveEngineSettings({ coach, client: { rpeCap: 9 }, prescription: rx }).resolved.rpeCap).toEqual({
      value: 9,
      source: 'CLIENT',
    });
  });

  it('uses the client rep range only when both bounds are set', () => {
    expect(resolveEngineSettings({ coach: null, client: { repsMin: 5 }, prescription: rx }).rx.repsMin).toBe(8);
    const s = resolveEngineSettings({ coach: null, client: { repsMin: 5, repsMax: 6 }, prescription: rx });
    expect([s.rx.repsMin, s.rx.repsMax, s.resolved.repsMax.source]).toEqual([5, 6, 'CLIENT']);
  });

  it('client deload % and window beat coach rules', () => {
    const s = resolveEngineSettings({
      coach: { deloadPercent: 15, sessionsAnalyzed: 4 },
      client: { deloadPercent: 20 },
      prescription: rx,
    });
    expect(s.thresholds.deloadFactor).toBeCloseTo(0.8);
    expect(s.thresholds.window).toBe(4);
    expect(s.resolved.sessionsAnalyzed.source).toBe('COACH');
  });
});

describe('evaluate with settings', () => {
  const topOfRange = [session(1, work(10, 100, 7.5)), session(2, work(10, 100, 7.5))];

  it('a coach margin turns INCREASE_LOAD into HOLD', () => {
    expect(evaluate(topOfRange, rx)?.action).toBe(A.INCREASE_LOAD);
    const { rx: eff, thresholds } = resolveEngineSettings({ coach: { loadMarginRpe: 1 }, client: null, prescription: rx });
    const rec = evaluate(topOfRange, eff, thresholds);
    expect(rec?.action).toBe(A.HOLD);
    expect(rec?.reason).toContain('at least 1 below the cap 8');
  });

  it('a client increment override changes the jump', () => {
    const { rx: eff, thresholds } = resolveEngineSettings({ coach: null, client: { loadIncrementKg: 5 }, prescription: rx });
    expect(evaluate(topOfRange, eff, thresholds)?.recommendedWeightKg).toBe(105);
  });

  it('the window size controls how many sessions DELOAD needs', () => {
    const grinding = [1, 2, 3, 4, 5].map((i) => session(i, work(8, 100, 9.5)));
    const two = resolveEngineSettings({ coach: null, client: { sessionsAnalyzed: 2 }, prescription: rx });
    expect(evaluate(grinding.slice(0, 2), two.rx, two.thresholds)?.action).toBe(A.DELOAD);
    const five = resolveEngineSettings({ coach: null, client: { sessionsAnalyzed: 5 }, prescription: rx });
    expect(evaluate(grinding.slice(0, 3), five.rx, five.thresholds)?.action).not.toBe(A.DELOAD);
    const rec = evaluate(grinding, five.rx, five.thresholds);
    expect(rec?.action).toBe(A.DELOAD);
    expect(rec?.metrics).toHaveLength(5);
  });

  it('deload % sets the deload target and the reason', () => {
    const grinding = [1, 2, 3].map((i) => session(i, work(8, 100, 9.5)));
    const s = resolveEngineSettings({ coach: { deloadPercent: 20, highRpe: 9.5 }, client: null, prescription: rx });
    const rec = evaluate(grinding, s.rx, s.thresholds);
    expect(rec?.recommendedWeightKg).toBe(80);
    expect(rec?.reason).toContain('~80% load');
    expect(rec?.reason).toContain('>= 9.5');
  });
});

describe('shouldAutoApprove', () => {
  const draft = (action: RecommendationAction, to: number) => ({
    action,
    recommendedWeightKg: to,
    metrics: [{ topWeightKg: 100 } as never],
  });

  it('only for INCREASE_LOAD with auto-approve on', () => {
    expect(shouldAutoApprove(draft(A.INCREASE_LOAD, 102.5), { autoApprove: false, autoApproveMaxKg: null })).toBe(false);
    expect(shouldAutoApprove(draft(A.DELOAD, 90), { autoApprove: true, autoApproveMaxKg: null })).toBe(false);
    expect(shouldAutoApprove(draft(A.INCREASE_LOAD, 110), { autoApprove: true, autoApproveMaxKg: null })).toBe(true);
  });

  it('respects the jump limit inclusively', () => {
    const link = { autoApprove: true, autoApproveMaxKg: 5 };
    expect(shouldAutoApprove(draft(A.INCREASE_LOAD, 105), link)).toBe(true);
    expect(shouldAutoApprove(draft(A.INCREASE_LOAD, 105.5), link)).toBe(false);
  });
});

describe('exercise-level rules', () => {
  const rx = { targetSets: 3, repsMin: 8, repsMax: 10, targetRpe: 8, loadIncrementKg: 2.5 };

  it('exercise rpeCap and reps beat the prescription and coach, with source EXERCISE', () => {
    const { resolved, rx: effective } = resolveEngineSettings({
      coach: { rpeCap: 9 },
      client: null,
      exercise: { rpeCap: 8.5, repsMin: 4, repsMax: 6 },
      prescription: rx,
    });
    expect(resolved.rpeCap).toEqual({ value: 8.5, source: 'EXERCISE' });
    expect(resolved.repsMin).toEqual({ value: 4, source: 'EXERCISE' });
    expect(resolved.repsMax).toEqual({ value: 6, source: 'EXERCISE' });
    expect(effective).toMatchObject({ repsMin: 4, repsMax: 6, targetRpe: 8.5 });
  });

  it('client override still beats the exercise rule', () => {
    const { resolved } = resolveEngineSettings({
      coach: null,
      client: { rpeCap: 7.5, repsMin: 10, repsMax: 12 },
      exercise: { rpeCap: 8.5, repsMin: 4, repsMax: 6 },
      prescription: rx,
    });
    expect(resolved.rpeCap).toEqual({ value: 7.5, source: 'CLIENT' });
    expect(resolved.repsMin.source).toBe('CLIENT');
  });

  it('a half-set exercise rep range is ignored; absent exercise rules change nothing', () => {
    const half = resolveEngineSettings({ coach: null, client: null, exercise: { repsMin: 4 }, prescription: rx });
    expect(half.resolved.repsMin).toEqual({ value: 8, source: 'PRESCRIPTION' });
    const none = resolveEngineSettings({ coach: null, client: null, prescription: rx });
    expect(none.resolved.rpeCap).toEqual({ value: 8, source: 'PRESCRIPTION' });
  });
});
