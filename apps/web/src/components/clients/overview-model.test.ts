import { describe, expect, it } from 'vitest';
import type { CalendarDay, RecommendationDto } from '@coaching/shared';
import { attentionItems, deltaTone, formatDelta, parseTab, tabHref } from './overview-model';

const stat = (value: number | null) => ({ value, previous: null, delta: null });
const overview = { adherence: stat(96), avgRpe: { ...stat(7.9), cap: 8.5 } };
const day = (date: string, status: CalendarDay['status'], workoutName: string | null = 'Lower A'): CalendarDay => ({
  date, workoutName, workoutId: null, scheduledWorkoutId: null, status, workoutLogId: null, performedAt: null, topSet: null, notes: null,
});
const rec = (id: string, action: RecommendationDto['action']) => ({ id, action, exerciseId: 'e1', reason: 'because' }) as RecommendationDto;

describe('tabs', () => {
  it('defaults to overview', () => {
    expect(parseTab(undefined)).toBe('overview');
    expect(parseTab('bogus')).toBe('overview');
    expect(parseTab('lifts')).toBe('lifts');
  });
  it('keeps the overview URL clean', () => {
    expect(tabHref('c1', 'overview')).toBe('/coach/clients/c1');
    expect(tabHref('c1', 'overview', { month: '2026-10' })).toBe('/coach/clients/c1?month=2026-10');
    expect(tabHref('c1', 'lifts')).toBe('/coach/clients/c1?tab=lifts');
  });
});

describe('formatDelta', () => {
  it('signs and rounds', () => {
    expect(formatDelta(4)).toBe('+4');
    expect(formatDelta(-0.2, 1)).toBe('−0.2');
    expect(formatDelta(0.04, 1)).toBe('0');
    expect(formatDelta(null)).toBeNull();
  });
});

describe('deltaTone', () => {
  it('treats RPE rises as a warning', () => {
    expect(deltaTone(2, true)).toBe('good');
    expect(deltaTone(2, false)).toBe('warn');
    expect(deltaTone(-1, false)).toBe('good');
    expect(deltaTone(0, true)).toBe('neutral');
    expect(deltaTone(null, true)).toBe('neutral');
  });
});

describe('attentionItems', () => {
  const names = new Map([['e1', 'Deadlift']]);
  it('is empty for a healthy client', () => {
    expect(attentionItems(overview, [day('2026-11-02', 'COMPLETED')], [], names)).toEqual([]);
  });
  it('orders deloads first and counts the rest', () => {
    const items = attentionItems(
      { ...overview, adherence: stat(70) },
      [day('2026-11-04', 'MISSED'), day('2026-11-14', 'MISSED', 'Upper B'), day('2026-11-18', 'HIGH_RPE')],
      [rec('a', 'INCREASE_LOAD'), rec('b', 'DELOAD')],
      names,
    );
    expect(items.map((i) => i.key)).toEqual(['deload-b', 'pending', 'adherence', 'missed', 'high-rpe']);
    expect(items[0]?.title).toBe('Lighter week pending · Deadlift');
    expect(items[3]?.title).toBe('Missed Upper B (Nov 14)');
    expect(items[3]?.detail).toBe('2 missed sessions this month.');
  });
});
