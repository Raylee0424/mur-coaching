import { describe, expect, it } from 'vitest';
import { isActiveOn, limitationFlag, sortSafestFirst, type LimitationRow } from './conflict';

const base = { note: null, startsOn: '2026-11-01', endsOn: null };
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
