import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { effectiveRir, muscleAnalytics } from '@coaching/shared';
import type { AnalyticsSet } from '@coaching/shared';
import { resolveWindow } from './muscle-analytics.service';

const bench = (sessionId: string, opts: Partial<AnalyticsSet> = {}): AnalyticsSet => ({
  sessionId,
  weightKg: 100,
  reps: 5,
  rir: 2,
  rpe: null,
  muscles: [
    { muscle: 'CHEST', role: 'PRIMARY' },
    { muscle: 'TRICEPS', role: 'SECONDARY' },
  ],
  ...opts,
});

describe('muscleAnalytics', () => {
  it('weights by role and proximity to failure', () => {
    const r = muscleAnalytics([bench('a'), bench('a', { rir: 5 }), bench('b', { rir: 7 })], 7);
    const chest = r.muscles.find((m) => m.muscle === 'CHEST')!;
    const triceps = r.muscles.find((m) => m.muscle === 'TRICEPS')!;
    expect(chest).toMatchObject({ hardSets: 3, effectiveSets: 1.5, sessions: 2, perWeek: 2, tonnageKg: '1500', band: 'BELOW' });
    expect(triceps).toMatchObject({ hardSets: 1.5, effectiveSets: 0.8, tonnageKg: '750' });
    expect(r).toMatchObject({ sessionCount: 2, totalHardSets: 4.5 });
  });

  it('scales to a week before banding and returns every mapped muscle', () => {
    const sets = Array.from({ length: 24 }, (_, i) => bench(`s${i % 4}`));
    const r = muscleAnalytics(sets, 14);
    expect(r.muscles).toHaveLength(10);
    expect(r.muscles.find((m) => m.muscle === 'CHEST')).toMatchObject({ effectiveSets: 24, weeklyEffectiveSets: 12, band: 'PRODUCTIVE', perWeek: 2 });
    expect(r.muscles.find((m) => m.muscle === 'QUADS')).toMatchObject({ hardSets: 0, band: 'BELOW' });
  });

  it('ignores FULL_BODY tags', () => {
    const r = muscleAnalytics([bench('a', { muscles: [{ muscle: 'FULL_BODY', role: 'PRIMARY' }] })], 7);
    expect(r.totalHardSets).toBe(0);
  });

  it('derives RIR from RPE, defaulting to a hard set', () => {
    expect([effectiveRir(3, 9), effectiveRir(null, 7.5), effectiveRir(null, null)]).toEqual([3, 2.5, 2]);
  });
});

describe('resolveWindow', () => {
  it('defaults to the 7 days ending today', () => {
    expect(resolveWindow(undefined, undefined, new Date('2026-03-10T15:00:00Z'))).toEqual({ from: '2026-03-04', to: '2026-03-10', days: 7 });
  });

  it('refuses reversed, unreal or over-long windows', () => {
    expect(() => resolveWindow('2026-03-10', '2026-03-01')).toThrow(BadRequestException);
    expect(() => resolveWindow('2026-02-30', '2026-03-01')).toThrow(BadRequestException);
    expect(() => resolveWindow('2025-01-01', '2026-03-01')).toThrow(BadRequestException);
  });
});
