import { describe, expect, it } from 'vitest';
import { openSlots, validateAvailability, zonedToUtc, zonedToday } from '@coaching/shared';

const LA = 'America/Los_Angeles';

describe('zonedToUtc', () => {
  it('converts standard and daylight time', () => {
    expect(zonedToUtc('2026-11-23', 9 * 60, LA).toISOString()).toBe('2026-11-23T17:00:00.000Z'); // PST −8
    expect(zonedToUtc('2026-07-01', 9 * 60, LA).toISOString()).toBe('2026-07-01T16:00:00.000Z'); // PDT −7
    expect(zonedToUtc('2026-11-23', 23 * 60 + 30, 'Asia/Tokyo').toISOString()).toBe('2026-11-23T14:30:00.000Z');
  });

  it('takes the first 01:30 on the fall-back day', () => {
    expect(zonedToUtc('2026-11-01', 90, LA).toISOString()).toBe('2026-11-01T08:30:00.000Z');
  });

  it('reports the zone date', () => {
    expect(zonedToday('Asia/Tokyo', Date.parse('2026-11-23T20:00:00Z'))).toBe('2026-11-24');
    expect(zonedToday(LA, Date.parse('2026-11-24T05:00:00Z'))).toBe('2026-11-23');
  });
});

describe('openSlots', () => {
  // Monday 2026-11-23 06:00 PST.
  const now = Date.parse('2026-11-23T14:00:00Z');
  const availability = { timezone: LA, windows: [{ weekday: 1, startMinute: 9 * 60, endMinute: 11 * 60 }] };

  it('steps a 30-minute grid inside the window, after the notice period', () => {
    const slots = openSlots(availability, [], { now, days: 1, minutes: 20, noticeMinutes: 120 });
    expect(slots.map((s) => s.startsAt)).toEqual(['2026-11-23T17:00:00.000Z', '2026-11-23T17:30:00.000Z', '2026-11-23T18:00:00.000Z', '2026-11-23T18:30:00.000Z']);
    expect(slots[0]!.endsAt).toBe('2026-11-23T17:20:00.000Z');
  });

  it('drops slots inside the notice period, overlapping a booking, or overrunning the window', () => {
    const busy = [{ startsAt: '2026-11-23T17:40:00.000Z', endsAt: '2026-11-23T18:00:00.000Z' }];
    const slots = openSlots(availability, busy, { now: Date.parse('2026-11-23T15:30:00Z'), days: 1, minutes: 30, noticeMinutes: 120 });
    // 09:00 too soon (07:30 + 2 h), 09:30 overlaps 09:40, 10:30 + 30 fits exactly.
    expect(slots.map((s) => s.startsAt)).toEqual(['2026-11-23T18:00:00.000Z', '2026-11-23T18:30:00.000Z']);
  });

  it('repeats weekly and skips the wall time lost to the spring-forward gap', () => {
    const night = { timezone: LA, windows: [{ weekday: 0, startMinute: 120, endMinute: 180 }] };
    const slots = openSlots(night, [], { now: Date.parse('2027-03-13T12:00:00Z'), days: 9, minutes: 20, noticeMinutes: 0 });
    // Sunday 2027-03-14 02:00–03:00 does not exist in LA; the next Sunday (PDT) has both slots.
    expect(slots.map((s) => s.startsAt)).toEqual(['2027-03-21T09:00:00.000Z', '2027-03-21T09:30:00.000Z']);
  });
});

describe('validateAvailability', () => {
  const ok = { timezone: LA, windows: [{ weekday: 1, startMinute: 540, endMinute: 600 }], meetingUrl: 'https://meet.example.com/x' };

  it('accepts a sound schedule', () => {
    expect(validateAvailability(ok)).toBeNull();
  });

  it('rejects bad zones, overlaps, short windows and non-https links', () => {
    expect(validateAvailability({ ...ok, timezone: 'Mars/Base' })).toMatch(/timezone/);
    expect(validateAvailability({ ...ok, windows: [...ok.windows, { weekday: 1, startMinute: 580, endMinute: 700 }] })).toMatch(/overlap/);
    expect(validateAvailability({ ...ok, windows: [{ weekday: 2, startMinute: 600, endMinute: 610 }] })).toMatch(/20-minute/);
    expect(validateAvailability({ ...ok, meetingUrl: 'http://x' })).toMatch(/https/);
  });
});
