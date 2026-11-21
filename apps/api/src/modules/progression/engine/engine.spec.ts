import { describe, expect, it } from 'vitest';
import { RecommendationAction } from '@coaching/shared';
import { CLIENT_PLANS, WORKOUT_TEMPLATE, buildSets } from '../../../../prisma/seed/demo-history';
import { evaluate } from './engine';
import { computeSessionMetrics, estimateOneRepMax, roundToIncrement } from './metrics';
import type { Prescription, SessionInput, SetInput } from './types';

const A = RecommendationAction;

/** Build the seeded history of one lift for one demo client (first `weeks` weeks). */
function seededHistory(clientName: string, exercise: string, weeks = 4) {
  const plan = CLIENT_PLANS.find((p) => p.name.startsWith(clientName));
  const day = WORKOUT_TEMPLATE.find((d) => d.exercises.some((e) => e.exercise === exercise));
  const rx = day?.exercises.find((e) => e.exercise === exercise);
  const lift = plan?.history[exercise];
  if (!plan || !rx || !lift) throw new Error(`no seed data: ${clientName}/${exercise}`);

  const sessions: SessionInput[] = Array.from({ length: weeks }, (_, w) => ({
    exerciseLogId: `log-${w + 1}`,
    performedAt: new Date(Date.UTC(2026, 0, 5 + w * 7)),
    sets: buildSets(rx, lift, w),
  }));
  const prescription: Prescription = {
    targetSets: rx.sets,
    repsMin: rx.repsMin,
    repsMax: rx.repsMax,
    targetRpe: rx.rpe,
    loadIncrementKg: exercise === 'Back Squat' || exercise === 'Romanian Deadlift' ? 5 : 2.5,
  };
  return { sessions, prescription };
}

const rx: Prescription = { targetSets: 3, repsMin: 8, repsMax: 10, targetRpe: 8, loadIncrementKg: 2.5 };
const session = (i: number, sets: SetInput[]): SessionInput => ({
  exerciseLogId: `s${i}`,
  performedAt: new Date(Date.UTC(2026, 0, i)),
  sets,
});
const work = (reps: number, weightKg: number, rpe: number | null = 8, n = 3): SetInput[] =>
  Array.from({ length: n }, () => ({ reps, weightKg, rpe, isWarmup: false }));

describe('metrics', () => {
  it('ignores warm-ups and computes volume, top set, e1RM, avg RPE', () => {
    const m = computeSessionMetrics(
      session(1, [{ reps: 5, weightKg: 50, rpe: null, isWarmup: true }, ...work(8, 80, 8)]),
    );
    expect(m).toMatchObject({ workingSets: 3, volumeKg: 1920, topWeightKg: 80, topSetReps: 8, avgRpe: 8 });
    expect(m?.e1rmKg).toBeCloseTo(estimateOneRepMax(80, 8), 1);
  });

  it('returns null for a warm-up-only session and snaps loads to increments', () => {
    expect(computeSessionMetrics(session(1, [{ reps: 5, weightKg: 40, rpe: null, isWarmup: true }]))).toBeNull();
    expect(roundToIncrement(74.25, 2.5)).toBe(75);
  });
});

describe('engine on seeded demo data', () => {
  it('Alex bench: top of range at RPE 8 → INCREASE_LOAD (+2.5 kg)', () => {
    const { sessions, prescription } = seededHistory('Alex', 'Barbell Bench Press');
    const rec = evaluate(sessions, prescription);
    expect(rec).toMatchObject({ action: A.INCREASE_LOAD, recommendedWeightKg: 85 });
    expect(rec?.sourceExerciseLogIds).toEqual(['log-2', 'log-3', 'log-4']);
  });

  it('Alex squat uses the 5 kg lower-body step', () => {
    const { sessions, prescription } = seededHistory('Alex', 'Back Squat');
    expect(evaluate(sessions, prescription)).toMatchObject({ action: A.INCREASE_LOAD, recommendedWeightKg: 110 });
  });

  it('Alex pushdown: RPE 8.5 above target → HOLD', () => {
    const { sessions, prescription } = seededHistory('Alex', 'Triceps Pushdown');
    expect(evaluate(sessions, prescription)?.action).toBe(A.HOLD);
  });

  it('Jordan bench: flat volume, RPE >= 9 for 3 sessions → DELOAD to ~90%', () => {
    const { sessions, prescription } = seededHistory('Jordan', 'Barbell Bench Press');
    expect(evaluate(sessions, prescription)).toMatchObject({ action: A.DELOAD, recommendedWeightKg: 77.5 });
  });

  it('Jordan incline DB press: double-progression zone → INCREASE_REPS at same load', () => {
    const { sessions, prescription } = seededHistory('Jordan', 'Incline Dumbbell Press');
    expect(evaluate(sessions, prescription)).toMatchObject({
      action: A.INCREASE_REPS,
      recommendedWeightKg: 24,
      recommendedRepsMin: 10,
      recommendedRepsMax: 10,
    });
  });

  it('Jordan squat: RPE 9 over target → HOLD, not DELOAD (only one session at RPE 9)', () => {
    const { sessions, prescription } = seededHistory('Jordan', 'Back Squat');
    expect(evaluate(sessions, prescription)?.action).toBe(A.HOLD);
  });
});

describe('engine edge cases', () => {
  it('no sessions → null; one session → HOLD (insufficient data)', () => {
    expect(evaluate([], rx)).toBeNull();
    expect(evaluate([session(1, work(10, 50))], rx)?.action).toBe(A.HOLD);
  });

  it('DELOAD needs a full 3-session window', () => {
    const two = [session(1, work(8, 100, 9.5)), session(2, work(8, 100, 9.5))];
    expect(evaluate(two, rx)?.action).toBe(A.HOLD);
  });

  it('declining e1RM triggers DELOAD even at moderate RPE', () => {
    const h = [session(1, work(10, 100, 8)), session(2, work(9, 100, 8)), session(3, work(8, 100, 8))];
    expect(evaluate(h, rx)?.action).toBe(A.DELOAD);
  });

  it('missing RPE blocks INCREASE_LOAD', () => {
    const h = [session(1, work(9, 50, null)), session(2, work(10, 50, null))];
    expect(evaluate(h, rx)?.action).toBe(A.HOLD);
  });

  it('missed sets → HOLD; below rep floor → HOLD', () => {
    expect(evaluate([session(1, work(10, 50)), session(2, work(10, 50, 8, 2))], rx)?.action).toBe(A.HOLD);
    expect(evaluate([session(1, work(8, 50)), session(2, work(7, 50))], rx)?.action).toBe(A.HOLD);
  });

  it('sorts unordered history by performedAt', () => {
    const h = [session(3, work(10, 52.5)), session(1, work(9, 50)), session(2, work(10, 50))];
    expect(evaluate(h, rx)?.sourceExerciseLogIds).toEqual(['s1', 's2', 's3']);
  });
});
