import { describe, expect, it } from 'vitest';
import { RecommendationAction } from '@coaching/shared';
import { evaluate } from './engine';
import { traceRules } from './trace';
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

const decidedOf = (steps: { action: string; decided: boolean }[]): string[] => steps.filter((s) => s.decided).map((s) => s.action);

describe('traceRules', () => {
  it('lists the four rules in order DELOAD, HOLD, INCREASE_REPS, INCREASE_LOAD', () => {
    const t = traceRules([session(1, work(9, 80)), session(2, work(9, 80))], rx);
    expect(t?.steps.map((s) => s.action)).toEqual([A.DELOAD, A.HOLD, A.INCREASE_REPS, A.INCREASE_LOAD]);
    for (const s of t?.steps ?? []) {
      expect(s.condition.length).toBeGreaterThan(10);
      expect(s.observed.length).toBeGreaterThan(0);
    }
  });

  it('returns null without usable sessions', () => {
    expect(traceRules([], rx)).toBeNull();
    expect(traceRules([session(1, [{ reps: 5, weightKg: 40, rpe: null, isWarmup: true }])], rx)).toBeNull();
  });

  it('top of range at RPE 8 → INCREASE_LOAD decided, INCREASE_REPS not matched', () => {
    const t = traceRules([session(1, work(9, 80)), session(2, work(10, 80, 8))], rx);
    expect(t?.verdict).toBe(A.INCREASE_LOAD);
    expect(decidedOf(t?.steps ?? [])).toEqual([A.INCREASE_LOAD]);
    expect(t?.steps.find((s) => s.action === A.INCREASE_REPS)?.matched).toBe(false);
    expect(t?.steps.find((s) => s.action === A.HOLD)?.matched).toBe(false);
  });

  it('mid-range reps → INCREASE_REPS', () => {
    const t = traceRules([session(1, work(8, 80)), session(2, work(9, 80, 7.5))], rx);
    expect(t?.verdict).toBe(A.INCREASE_REPS);
    expect(t?.steps.find((s) => s.action === A.INCREASE_REPS)?.matched).toBe(true);
  });

  it('RPE above cap → HOLD with the reason in `observed`', () => {
    const t = traceRules([session(1, work(9, 80, 9)), session(2, work(9, 80, 9))], rx);
    expect(t?.verdict).toBe(A.HOLD);
    const hold = t?.steps.find((s) => s.action === A.HOLD);
    expect(hold?.matched).toBe(true);
    expect(hold?.observed).toContain('above the 8 cap');
  });

  it('plateau at high RPE over a full window → DELOAD, even though HOLD also matches', () => {
    const t = traceRules([session(1, work(7, 85, 9)), session(2, work(7, 85, 9)), session(3, work(7, 85, 9.5))], rx);
    expect(t?.verdict).toBe(A.DELOAD);
    expect(decidedOf(t?.steps ?? [])).toEqual([A.DELOAD]);
    expect(t?.steps.find((s) => s.action === A.DELOAD)?.matched).toBe(true);
    expect(t?.steps.find((s) => s.action === A.HOLD)?.matched).toBe(true);
  });

  it('a single session is a HOLD and nothing else matches', () => {
    const t = traceRules([session(1, work(10, 80))], rx);
    expect(t?.verdict).toBe(A.HOLD);
    expect(t?.steps.filter((s) => s.matched).map((s) => s.action)).toEqual([A.HOLD]);
  });

  it('agrees with evaluate() across a grid of histories', () => {
    const repsOpts = [5, 8, 9, 10];
    const rpeOpts: (number | null)[] = [null, 7, 8, 8.5, 9, 9.5];
    const loadOpts = [[80, 80, 80], [80, 82.5, 85], [85, 82.5, 80], [80, 80, 82.5]];
    let checked = 0;
    for (const reps of repsOpts) {
      for (const rpe of rpeOpts) {
        for (const loads of loadOpts) {
          for (const nSessions of [2, 3]) {
            for (const sets of [3, 2]) {
              const hist = loads.slice(0, nSessions).map((w, i) => session(i + 1, work(reps, w, rpe, sets)));
              const draft = evaluate(hist, rx);
              const trace = traceRules(hist, rx);
              expect(trace?.verdict).toBe(draft?.action);
              expect(decidedOf(trace?.steps ?? [])).toEqual([draft?.action]);
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
