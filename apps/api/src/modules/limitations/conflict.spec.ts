import { describe, expect, it } from 'vitest';
import { isActiveOn, limitationFlag, programConflicts, sortSafestFirst, type LimitationRow } from './conflict';

const base = { note: null, startsOn: '2026-11-01', endsOn: null, joint: null, pattern: null };
const shoulder: LimitationRow = { ...base, id: 'm1', target: 'MUSCLE', muscleGroup: 'SHOULDERS', exerciseId: null, severity: 'CAUTION' };
const bench: LimitationRow = { ...base, id: 'e1', target: 'EXERCISE', muscleGroup: null, exerciseId: 'bench', severity: 'AVOID', note: 'Left pec strain' };
const press = { id: 'ohp', muscleGroup: 'SHOULDERS' } as const;
const benchEx = { id: 'bench', muscleGroup: 'CHEST' } as const;
const DAY = '2026-11-24';

describe('isActiveOn', () => {
  it('is inclusive on both ends and open ended without endsOn', () => {
    expect(isActiveOn({ startsOn: '2026-11-24', endsOn: '2026-11-24' }, DAY)).toBe(true);
    expect(isActiveOn({ startsOn: '2026-11-25', endsOn: null }, DAY)).toBe(false);
    expect(isActiveOn({ startsOn: '2026-11-01', endsOn: '2026-11-23' }, DAY)).toBe(false);
    expect(isActiveOn({ startsOn: '2026-11-01', endsOn: null }, DAY)).toBe(true);
  });
});

describe('limitationFlag', () => {
  it('matches by muscle group and by exact exercise', () => {
    expect(limitationFlag([shoulder], press, DAY)).toEqual({ limitationId: 'm1', severity: 'CAUTION', note: null });
    expect(limitationFlag([bench], benchEx, DAY)?.limitationId).toBe('e1');
    expect(limitationFlag([shoulder, bench], { id: 'row', muscleGroup: 'BACK' }, DAY)).toBeNull();
  });

  it('ignores expired and future limitations', () => {
    expect(limitationFlag([{ ...bench, endsOn: '2026-11-23' }], benchEx, DAY)).toBeNull();
    expect(limitationFlag([{ ...bench, startsOn: '2026-12-01' }], benchEx, DAY)).toBeNull();
  });

  it('prefers AVOID over CAUTION when both apply', () => {
    const avoidShoulder: LimitationRow = { ...shoulder, id: 'm2', severity: 'AVOID' };
    expect(limitationFlag([shoulder, avoidShoulder], press, DAY)?.limitationId).toBe('m2');
    expect(limitationFlag([avoidShoulder, shoulder], press, DAY)?.limitationId).toBe('m2');
  });
});

describe('sortSafestFirst', () => {
  it('orders none, caution, avoid and keeps input order inside a group', () => {
    const flag = (severity: 'AVOID' | 'CAUTION') => ({ limitationId: 'x', severity, note: null });
    const items = [
      { n: 'a', limitation: flag('AVOID') },
      { n: 'b', limitation: null },
      { n: 'c', limitation: flag('CAUTION') },
      { n: 'd', limitation: null },
    ];
    expect(sortSafestFirst(items).map((i) => i.n)).toEqual(['b', 'd', 'c', 'a']);
  });
});

describe('limitationFlag: secondary muscles, joints and patterns', () => {
  const triceps: LimitationRow = { ...base, id: 'm2', target: 'MUSCLE', muscleGroup: 'TRICEPS', exerciseId: null, severity: 'CAUTION' };
  const lowBack: LimitationRow = { ...base, id: 'j1', target: 'JOINT', muscleGroup: null, exerciseId: null, joint: 'LOWER_BACK', severity: 'AVOID' };
  const overhead: LimitationRow = { ...base, id: 'p1', target: 'PATTERN', muscleGroup: null, exerciseId: null, pattern: 'VERTICAL_PUSH', severity: 'CAUTION' };
  const benchFull = { id: 'bench', muscleGroup: 'CHEST', muscles: [{ muscle: 'CHEST' }, { muscle: 'TRICEPS' }], pattern: 'HORIZONTAL_PUSH' } as const;
  const rdl = { id: 'rdl', muscleGroup: 'HAMSTRINGS', muscles: [{ muscle: 'HAMSTRINGS' }], pattern: 'HINGE' } as const;
  const ohp = { id: 'ohp', muscleGroup: 'SHOULDERS', muscles: [{ muscle: 'SHOULDERS' }], pattern: 'VERTICAL_PUSH' } as const;
  const curl = { id: 'curl', muscleGroup: 'BICEPS', muscles: [{ muscle: 'BICEPS' }], pattern: 'ARM_ISOLATION' } as const;

  it('matches a muscle limitation on a secondary muscle', () => {
    expect(limitationFlag([triceps], benchFull, DAY)?.limitationId).toBe('m2');
  });

  it('matches a joint limitation through JOINT_PATTERNS', () => {
    expect(limitationFlag([lowBack], rdl, DAY)).toEqual({ limitationId: 'j1', severity: 'AVOID', note: null });
    expect(limitationFlag([lowBack], ohp, DAY)).toBeNull();
  });

  it('matches a pattern limitation on the exact pattern only', () => {
    expect(limitationFlag([overhead], ohp, DAY)?.limitationId).toBe('p1');
    expect(limitationFlag([overhead], benchFull, DAY)).toBeNull();
  });

  it('never flags an untagged exercise by joint or pattern', () => {
    expect(limitationFlag([lowBack, overhead], { id: 'x', muscleGroup: 'CORE' }, DAY)).toBeNull();
  });

  it('lists program conflicts in order and skips clear prescriptions', () => {
    const workouts = [
      { id: 'w1', weekNumber: 1, dayNumber: 1, name: 'Upper', exercises: [{ exercise: { ...benchFull, name: 'Bench' } }, { exercise: { ...curl, name: 'Curl' } }, { exercise: { ...ohp, name: 'OHP' } }] },
      { id: 'w2', weekNumber: 1, dayNumber: 2, name: 'Lower', exercises: [{ exercise: { ...rdl, name: 'RDL' } }] },
    ];
    const out = programConflicts([overhead, lowBack], workouts, DAY);
    expect(out.map((c) => [c.workoutId, c.exerciseName, c.limitation.severity])).toEqual([
      ['w1', 'OHP', 'CAUTION'],
      ['w2', 'RDL', 'AVOID'],
    ]);
    expect(programConflicts([{ ...lowBack, endsOn: '2026-11-02' }], workouts, DAY)).toEqual([]);
  });
});
