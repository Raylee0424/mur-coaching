import { describe, expect, it } from 'vitest';
import { countdownLabel, goalProgress, monthColumns, nextEvent, phaseState, phaseWeeks, spanOf, todayMarker, trimDecimal } from './roadmap-model';

describe('timeline geometry', () => {
  it('places a phase as a percent of the roadmap', () => {
    const s = spanOf('2026-10-11', '2026-10-20', '2026-10-01', '2026-10-30');
    expect(s.leftPct).toBeCloseTo(33.33, 1);
    expect(s.widthPct).toBeCloseTo(33.33, 1);
  });

  it('builds one clipped column per month', () => {
    const cols = monthColumns('2026-10-16', '2026-12-15');
    expect(cols.map((c) => c.label)).toEqual(['Oct 2026', 'Nov 2026', 'Dec 2026']);
    expect(cols.reduce((sum, c) => sum + c.widthPct, 0)).toBeCloseTo(100, 5);
  });

  it('crosses a year boundary', () => {
    expect(monthColumns('2026-12-01', '2027-01-31').map((c) => c.key)).toEqual(['2026-12', '2027-01']);
  });

  it('marks today only inside the range', () => {
    expect(todayMarker('2026-09-01', '2026-10-01', '2026-10-31')).toBeNull();
    expect(todayMarker('2026-10-16', '2026-10-01', '2026-10-31')).toBeGreaterThan(40);
  });
});

describe('phases and events', () => {
  const phase = { startDate: '2026-11-16', endDate: '2026-12-20' };
  it('classifies a phase against today and counts weeks', () => {
    expect(phaseState(phase, '2026-11-10')).toBe('upcoming');
    expect(phaseState(phase, '2026-11-23')).toBe('active');
    expect(phaseState(phase, '2027-01-01')).toBe('past');
    expect(phaseWeeks(phase)).toBe(5);
  });

  it('finds the next event and ignores past ones', () => {
    const events = [
      { id: 'a', name: 'Old', date: '2026-10-01', location: null, notes: null },
      { id: 'b', name: 'Later', date: '2027-03-01', location: null, notes: null },
      { id: 'c', name: 'Meet', date: '2027-01-04', location: null, notes: null },
    ];
    expect(nextEvent(events, '2026-11-23')).toMatchObject({ event: { id: 'c' }, days: 42 });
    expect(nextEvent([events[0]!], '2026-11-23')).toBeNull();
  });

  it('words the countdown', () => {
    expect(countdownLabel(0)).toBe('Today');
    expect(countdownLabel(1)).toBe('1 day to go');
    expect(countdownLabel(42)).toBe('42 days to go');
  });
});

describe('goals', () => {
  it('trims decimals', () => {
    expect(trimDecimal('540.00')).toBe('540');
    expect(trimDecimal('512.50')).toBe('512.5');
  });
  it('reports distance and percent', () => {
    expect(goalProgress({ targetValue: '540.00', currentValue: '512.50' })).toEqual({ remaining: '+27.5', pct: 95 });
    expect(goalProgress({ targetValue: '82.50', currentValue: '83.40' }).remaining).toBe('−0.9');
    expect(goalProgress({ targetValue: '82.50', currentValue: null })).toEqual({ remaining: null, pct: null });
  });
});
