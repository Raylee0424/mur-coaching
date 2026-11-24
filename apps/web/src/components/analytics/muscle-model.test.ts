import { describe, expect, it } from 'vitest';
import type { MuscleStatDto } from '@coaching/shared';
import { BODY_REGIONS, muscleStatus, parseDays, sortMuscles, windowFor } from './muscle-model';

const m = (muscle: MuscleStatDto['muscle'], weekly: number, perWeek: number, band: MuscleStatDto['band'], tonnage = '0'): MuscleStatDto => ({
  muscle, hardSets: weekly, effectiveSets: weekly, weeklyEffectiveSets: weekly, sessions: 1, perWeek, tonnageKg: tonnage, band,
});

describe('muscle-model', () => {
  it('maps bands and frequency to statuses; untrained is NONE in both views', () => {
    expect(muscleStatus(m('CHEST', 12, 2, 'PRODUCTIVE'), 'volume').key).toBe('PRODUCTIVE');
    expect(muscleStatus(m('CHEST', 24, 4, 'HIGH'), 'volume').fill).toBe('fill-rose');
    expect(muscleStatus(m('CHEST', 3, 0.5, 'BELOW'), 'frequency').key).toBe('FREQ_LOW');
    expect(muscleStatus(m('CHEST', 3, 1.5, 'BELOW'), 'frequency').key).toBe('FREQ_ONCE');
    expect(muscleStatus(m('CALVES', 0, 0, 'BELOW'), 'volume').key).toBe('NONE');
  });

  it('sorts by number or label with a stable name tiebreak', () => {
    const rows = [m('QUADS', 10, 2, 'PRODUCTIVE', '900'), m('CHEST', 10, 3, 'PRODUCTIVE', '1200'), m('BACK', 4, 1, 'BELOW', '50')];
    expect(sortMuscles(rows, 'weeklyEffectiveSets', 'desc').map((r) => r.muscle)).toEqual(['CHEST', 'QUADS', 'BACK']);
    expect(sortMuscles(rows, 'tonnageKg', 'asc').map((r) => r.muscle)).toEqual(['BACK', 'QUADS', 'CHEST']);
    expect(sortMuscles(rows, 'muscle', 'asc')[0]!.muscle).toBe('BACK');
  });

  it('parses windows and covers every mapped muscle on the map', () => {
    expect([parseDays('14'), parseDays('9'), parseDays(undefined)]).toEqual([14, 7, 7]);
    expect(windowFor('2026-03-10', 7)).toEqual({ from: '2026-03-04', to: '2026-03-10' });
    const drawn = new Set([...BODY_REGIONS.front, ...BODY_REGIONS.back].map((r) => r.muscle));
    expect(drawn.size).toBe(10);
  });
});
