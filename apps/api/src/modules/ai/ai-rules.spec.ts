import { describe, expect, it } from 'vitest';
import { parseVoiceTranscript } from '@coaching/shared';
import type { GenerateWorkoutRequest } from '@coaching/shared';
import type { LimitationRow } from '../limitations/conflict';
import type { CoachContext, ContextCall } from './ai-context.service';
import { pickCitations, rulesAnswer } from './coach-rules';
import { eligibleCandidates, exerciseCount, pickExercises, prescribe, validateModelPick, type CandidateExercise } from './generator-rules';
import { normalizeVoiceIntent } from './voice.service';

describe('parseVoiceTranscript', () => {
  it('parses the full HUD command', () => {
    expect(parseVoiceTranscript('Log 157.5 kilos for 5 reps at RPE 8, note crisp depth, start 3 minute rest')).toEqual({
      type: 'LOG_SET',
      weight: 157.5,
      reps: 5,
      rpe: 8,
      note: 'crisp depth',
      restSeconds: 180,
    });
  });

  it('reads number words and pounds', () => {
    expect(parseVoiceTranscript('two twenty five pounds for eight')).toMatchObject({ type: 'LOG_SET', reps: 8 });
    expect(parseVoiceTranscript('100 lbs for ten reps')).toMatchObject({ weight: 100, reps: 10, rpe: null });
  });

  it('parses rest, note and swap intents', () => {
    expect(parseVoiceTranscript('start rest timer 90 seconds')).toEqual({ type: 'REST_TIMER', seconds: 90 });
    expect(parseVoiceTranscript('rest two minutes')).toEqual({ type: 'REST_TIMER', seconds: 120 });
    expect(parseVoiceTranscript('note left knee felt off')).toEqual({ type: 'NOTE', text: 'left knee felt off' });
    expect(parseVoiceTranscript('swap to trap bar deadlift')).toEqual({ type: 'SWAP', exerciseQuery: 'trap bar deadlift' });
  });

  it('drops out-of-range values and unknown speech', () => {
    expect(parseVoiceTranscript('100 kg for 5 reps at rpe 14')).toMatchObject({ rpe: null });
    expect(parseVoiceTranscript('hello there')).toEqual({ type: 'UNKNOWN' });
    expect(parseVoiceTranscript('   ')).toEqual({ type: 'UNKNOWN' });
  });
});

describe('normalizeVoiceIntent', () => {
  it('accepts a bounded model answer and rejects junk', () => {
    expect(normalizeVoiceIntent({ type: 'LOG_SET', weight: 100, reps: 5, rpe: 8.5, note: null, restSeconds: null })).toMatchObject({ weight: 100, reps: 5 });
    expect(normalizeVoiceIntent({ type: 'LOG_SET', weight: -4, reps: 2.5 })).toBeNull();
    expect(normalizeVoiceIntent({ type: 'DELETE_ALL' })).toBeNull();
    expect(normalizeVoiceIntent('LOG_SET')).toBeNull();
  });
});

const day = '2026-11-25';
const lim = (over: Partial<LimitationRow>): LimitationRow => ({
  id: 'l1',
  target: 'EXERCISE',
  muscleGroup: null,
  exerciseId: null,
  joint: null,
  pattern: null,
  severity: 'AVOID',
  note: null,
  startsOn: '2026-01-01',
  endsOn: null,
  ...over,
});
const ex = (id: string, muscleGroup: CandidateExercise['muscleGroup'], over: Partial<CandidateExercise> = {}): CandidateExercise => ({
  id,
  name: id,
  muscleGroup,
  equipment: 'BARBELL',
  pattern: null,
  muscles: [],
  ...over,
});
const call = (over: Partial<ContextCall>): ContextCall => ({
  id: 'r1',
  date: day,
  exerciseId: 'squat',
  exerciseName: 'Back Squat',
  action: 'DELOAD',
  targetWeightKg: 140,
  repsMin: 5,
  repsMax: 5,
  reason: 'RPE 9.5 three sessions running',
  ...over,
});

describe('generator guardrails', () => {
  const catalog = [
    ex('squat', 'QUADS'),
    ex('legpress', 'QUADS', { equipment: 'MACHINE' }),
    ex('bench', 'CHEST'),
    ex('ohp', 'SHOULDERS', { pattern: 'VERTICAL_PUSH' }),
    ex('row', 'BACK', { equipment: 'DUMBBELL' }),
    ex('plank', 'CORE', { equipment: null }),
  ];
  const req: GenerateWorkoutRequest = { goal: 'STRENGTH', durationMin: 60, targetMuscles: [], equipment: ['BARBELL', 'DUMBBELL'] };

  it('filters AVOID, keeps CAUTION flagged, honours equipment', () => {
    const rows = [lim({ id: 'a', exerciseId: 'bench' }), lim({ id: 'c', target: 'MUSCLE', muscleGroup: 'SHOULDERS', severity: 'CAUTION' })];
    const { candidates, excludedCount } = eligibleCandidates(catalog, rows, day, req.equipment);
    const ids = candidates.map((c) => c.id);
    expect(ids).not.toContain('bench');
    expect(ids).not.toContain('legpress');
    expect(ids).toContain('plank');
    expect(excludedCount).toBe(1);
    expect(candidates.find((c) => c.id === 'ohp')?.limitation).toMatchObject({ severity: 'CAUTION', limitationId: 'c' });
  });

  it('ignores limitations outside their dates', () => {
    const { candidates } = eligibleCandidates(catalog, [lim({ exerciseId: 'bench', endsOn: '2026-02-01' })], day, req.equipment);
    expect(candidates.map((c) => c.id)).toContain('bench');
  });

  it('is deterministic and sized to the duration', () => {
    const { candidates } = eligibleCandidates(catalog, [], day, req.equipment);
    const a = pickExercises(candidates, req, new Set());
    expect(a.map((c) => c.id)).toEqual(pickExercises(candidates, req, new Set()).map((c) => c.id));
    expect(a.length).toBe(Math.min(exerciseCount(req), candidates.length));
  });

  it('takes load only from the engine and never raises a DELOAD or HOLD', () => {
    const { candidates } = eligibleCandidates(catalog, [], day, req.equipment);
    const picked = candidates.filter((c) => ['squat', 'row'].includes(c.id));
    const calls = new Map([
      ['squat', call({ action: 'DELOAD', targetWeightKg: 140, repsMin: 5, repsMax: 5 })],
      ['row', call({ id: 'r2', exerciseId: 'row', action: 'HOLD', targetWeightKg: 32.5, repsMin: 8, repsMax: 10 })],
    ]);
    const out = prescribe(picked, req, calls);
    expect(out.find((e) => e.exerciseId === 'squat')).toMatchObject({ engineWeightKg: '140.00', engineAction: 'DELOAD', repsMin: 5, repsMax: 5 });
    expect(out.find((e) => e.exerciseId === 'row')).toMatchObject({ engineWeightKg: '32.50', engineAction: 'HOLD', repsMin: 8, repsMax: 10 });
    expect(prescribe(picked, req, new Map()).every((e) => e.engineWeightKg === null)).toBe(true);
  });

  it('rejects a model pick with unknown, AVOIDed or repeated ids', () => {
    const { candidates } = eligibleCandidates(catalog, [lim({ exerciseId: 'bench' })], day, req.equipment);
    expect(validateModelPick({ exerciseIds: ['squat', 'row'], title: 'Lower', rationale: 'x' }, candidates, 4)).toMatchObject({ ids: ['squat', 'row'] });
    expect(validateModelPick({ exerciseIds: ['squat', 'bench'] }, candidates, 4)).toBeNull();
    expect(validateModelPick({ exerciseIds: ['squat', 'foreign-id'] }, candidates, 4)).toBeNull();
    expect(validateModelPick({ exerciseIds: ['squat', 'squat'] }, candidates, 4)).toBeNull();
    expect(validateModelPick(null, candidates, 4)).toBeNull();
  });
});

describe('coach rules', () => {
  const ctx: CoachContext = {
    unit: 'KG',
    sessions: [
      { id: 'w1', date: '2026-11-18', name: 'Lower B', lines: ['Conventional Deadlift 182.5 kg × 4 @ RPE 9.5'] },
      { id: 'w2', date: '2026-11-16', name: 'Upper A', lines: ['Bench Press 100 kg × 5 @ RPE 8'] },
    ],
    prs: [{ id: 'p1', date: '2026-10-01', exerciseName: 'Conventional Deadlift', detail: '190 kg × 3' }],
    calls: [call({ id: 'r9', exerciseId: 'dl', exerciseName: 'Conventional Deadlift', action: 'DELOAD', targetWeightKg: 165 })],
    limitations: [{ limitationId: 'l1', severity: 'CAUTION', label: 'Lower back: Caution' }],
    limitationRows: [],
    readiness: null,
    stats: { sessionsIndexed: 2, activeLimitations: 1, avgRpe7d: '8.8', readinessScore: null },
  };

  it('cites only rows from the context that the question names', () => {
    const cites = pickCitations('Why did my deadlift stall?', ctx);
    expect(cites.map((c) => c.id).sort()).toEqual(['p1', 'r9', 'w1']);
    expect(cites.find((c) => c.kind === 'ENGINE')).toMatchObject({ action: 'DELOAD' });
  });

  it('restates the engine call without raising it', () => {
    const text = rulesAnswer('deadlift?', ctx, pickCitations('deadlift?', ctx));
    expect(text).toContain('the progression engine says deload (165 kg × 5)');
    expect(text).toContain('Lower back: Caution');
    expect(text).not.toMatch(/increase|add load/i);
  });
});
