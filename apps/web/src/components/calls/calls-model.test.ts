import { describe, expect, it } from 'vitest';
import { dateKey, groupByDay, parseClock, timeLabel, zonedInputToIso } from './calls-model';

describe('calls model', () => {
  it('reads wall times in the coach zone, not the browser zone', () => {
    expect(zonedInputToIso('2026-11-23', '09:00', 'America/Los_Angeles')).toBe('2026-11-23T17:00:00.000Z');
    expect(zonedInputToIso('2026-11-23', '9am', 'UTC')).toBeNull();
    expect(timeLabel('2026-11-23T17:00:00.000Z', 'America/Los_Angeles')).toBe('09:00');
  });

  it('groups slots by local day', () => {
    const slots = [{ startsAt: '2026-11-24T06:30:00.000Z' }, { startsAt: '2026-11-23T17:00:00.000Z' }, { startsAt: '2026-11-24T07:30:00.000Z' }];
    // 06:30Z and 07:30Z are still Nov 23 in LA (22:30, 23:30).
    expect(groupByDay(slots, 'America/Los_Angeles').map((g) => [g.date, g.items.length])).toEqual([['2026-11-23', 3]]);
    expect(groupByDay(slots, 'UTC').map((g) => g.date)).toEqual(['2026-11-23', '2026-11-24']);
    expect(dateKey('2026-11-23T20:00:00Z', 'Asia/Tokyo')).toBe('2026-11-24');
  });

  it('parses clock inputs', () => {
    expect(parseClock('16:30')).toBe(990);
    expect(parseClock('24:00')).toBe(1440);
    expect(parseClock('25:00')).toBeNull();
  });
});
