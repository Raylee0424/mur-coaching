import { describe, expect, it } from 'vitest';
import { daysUntil, validateRoadmap } from '@coaching/shared';
import type { RoadmapInput } from '@coaching/shared';

const base: RoadmapInput = {
  title: 'Meet prep',
  startDate: '2026-10-01',
  endDate: '2027-02-28',
  phases: [
    { name: 'Hypertrophy', startDate: '2026-10-01', endDate: '2026-11-15' },
    { name: 'Strength', startDate: '2026-11-16', endDate: '2026-12-20' },
  ],
  goals: [{ label: 'Total', unit: 'kg', targetValue: '540.00', currentValue: '512.5' }],
  events: [{ name: 'USPA Winter Open', date: '2027-01-04' }],
};

describe('validateRoadmap', () => {
  it('accepts a clean roadmap', () => expect(validateRoadmap(base)).toBeNull());
  it('rejects overlapping phases', () => {
    const bad = { ...base, phases: [base.phases[0]!, { ...base.phases[1]!, startDate: '2026-11-10' }] };
    expect(validateRoadmap(bad)).toContain('overlaps');
  });
  it('rejects phases outside the roadmap and impossible dates', () => {
    expect(validateRoadmap({ ...base, phases: [{ name: 'X', startDate: '2026-09-01', endDate: '2026-09-30' }] })).toContain('inside');
    expect(validateRoadmap({ ...base, startDate: '2026-02-30' })).toContain('real dates');
  });
  it('rejects bad goal numbers', () => {
    expect(validateRoadmap({ ...base, goals: [{ label: 'T', unit: 'kg', targetValue: 'abc' }] })).toContain('number');
  });
});

describe('daysUntil', () => {
  it('counts whole days and goes negative after the date', () => {
    expect(daysUntil('2027-01-04', '2026-11-23')).toBe(42);
    expect(daysUntil('2026-11-20', '2026-11-23')).toBe(-3);
    expect(daysUntil('nope', '2026-11-23')).toBeNull();
  });
});
