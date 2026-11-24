import { describe, expect, it } from 'vitest';
import type { MessageDto } from '@coaching/shared';
import { formatMessageTime, lastMineIndex, mergeMessages } from './messages-model';

const m = (id: string, at: string, mine = false): MessageDto => ({ id, senderId: mine ? 'me' : 'them', mine, body: id, createdAt: at });

describe('mergeMessages', () => {
  it('dedupes by id and keeps time order', () => {
    const a = [m('a', '2026-11-24T10:00:00Z'), m('b', '2026-11-24T10:01:00Z')];
    const merged = mergeMessages(a, [m('b', '2026-11-24T10:01:00Z'), m('c', '2026-11-24T10:02:00Z'), m('0', '2026-11-24T09:00:00Z')]);
    expect(merged.map((x) => x.id)).toEqual(['0', 'a', 'b', 'c']);
  });
});

describe('lastMineIndex', () => {
  it('finds my latest message', () => {
    expect(lastMineIndex([m('a', '1', true), m('b', '2'), m('c', '3', true), m('d', '4')])).toBe(2);
    expect(lastMineIndex([m('a', '1')])).toBe(-1);
  });
});

describe('formatMessageTime', () => {
  const now = new Date(2026, 10, 24, 15, 0);
  it('shows a clock time today, Yesterday, then a date', () => {
    expect(formatMessageTime(new Date(2026, 10, 24, 10, 42).toISOString(), now)).toMatch(/10:42/);
    expect(formatMessageTime(new Date(2026, 10, 23, 22, 0).toISOString(), now)).toBe('Yesterday');
    expect(formatMessageTime(new Date(2026, 10, 21, 9, 0).toISOString(), now)).toBe('Nov 21');
  });
});
