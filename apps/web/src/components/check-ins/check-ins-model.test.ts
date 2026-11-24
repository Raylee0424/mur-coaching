import { describe, expect, it } from 'vitest';
import { answerText, moveQuestion, parseCheckInTab, parseInboxFilter, scheduleLabel, timeAgo } from './check-ins-model';

describe('check-ins model', () => {
  it('parses tabs and filters with safe defaults', () => {
    expect(parseCheckInTab('builder')).toBe('builder');
    expect(parseCheckInTab('nope')).toBe('inbox');
    expect(parseInboxFilter('all')).toBe('all');
    expect(parseInboxFilter(undefined)).toBe('unreviewed');
  });

  it('labels schedules and answers', () => {
    expect(scheduleLabel({ cadence: 'WEEKLY', weekday: 0, dueDate: null }, (d) => d)).toBe('Every Sunday');
    expect(scheduleLabel({ cadence: 'ONCE', weekday: null, dueDate: '2026-12-05' }, (d) => `on ${d}`)).toBe('Once · due on 2026-12-05');
    expect(answerText({ questionId: 'q', prompt: 'p', kind: 'SCALE', unit: null, value: '4' })).toBe('4 / 5');
    expect(answerText({ questionId: 'q', prompt: 'p', kind: 'NUMBER', unit: 'kg', value: '83.4' })).toBe('83.4 kg');
    expect(answerText({ questionId: 'q', prompt: 'p', kind: 'TEXT', unit: null, value: null })).toBe('Skipped');
  });

  it('moves questions within bounds only', () => {
    expect(moveQuestion(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveQuestion(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });

  it('formats relative time', () => {
    const now = Date.parse('2026-11-24T12:00:00Z');
    expect(timeAgo('2026-11-24T11:42:00Z', now)).toBe('18m ago');
    expect(timeAgo('2026-11-24T10:00:00Z', now)).toBe('2h ago');
    expect(timeAgo('2026-11-21T12:00:00Z', now)).toBe('3d ago');
  });
});
