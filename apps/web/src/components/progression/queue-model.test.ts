import { describe, expect, it } from 'vitest';
import type { RecommendationQueueItem } from '@coaching/shared';
import { bulkMessage, parseActionFilter, pruneSelection, queueHref, selectionState, toggleAll, toggleId } from './queue-model';

const item = (id: string): RecommendationQueueItem => ({
  id,
  clientId: 'c',
  clientName: 'C',
  exerciseId: 'e',
  exerciseName: 'E',
  action: 'HOLD',
  status: 'PENDING',
  reason: '',
  createdAt: '2026-11-20T00:00:00Z',
  current: null,
  proposed: { weightKg: null, repsMin: null, repsMax: null },
});
const items = [item('a'), item('b'), item('c')];

describe('filters', () => {
  it('parses the action param', () => {
    expect(parseActionFilter('DELOAD')).toBe('DELOAD');
    expect(parseActionFilter('x')).toBe('ALL');
    expect(parseActionFilter(undefined)).toBe('ALL');
  });
  it('builds clean hrefs', () => {
    expect(queueHref('ALL', '')).toBe('/coach/progression');
    expect(queueHref('HOLD', ' ana ')).toBe('/coach/progression?action=HOLD&q=ana');
  });
});

describe('selection', () => {
  it('toggles a single id', () => {
    const s = toggleId(new Set(['a']), 'b');
    expect([...s].sort()).toEqual(['a', 'b']);
    expect([...toggleId(s, 'a')]).toEqual(['b']);
  });
  it('reports none / some / all', () => {
    expect(selectionState(items, new Set())).toBe('none');
    expect(selectionState(items, new Set(['a']))).toBe('some');
    expect(selectionState(items, new Set(['a', 'b', 'c']))).toBe('all');
    expect(selectionState([], new Set())).toBe('none');
  });
  it('select-all selects every row unless all are already selected', () => {
    expect([...toggleAll(items, new Set(['a']))]).toEqual(['a', 'b', 'c']);
    expect(toggleAll(items, new Set(['a', 'b', 'c'])).size).toBe(0);
  });
  it('prunes ids that left the list', () => {
    expect([...pruneSelection([item('a')], new Set(['a', 'z']))]).toEqual(['a']);
  });
});

describe('bulkMessage', () => {
  it('pluralises and mentions skips', () => {
    expect(bulkMessage('ACCEPTED', { updated: 1, skipped: 0 })).toBe('Accepted 1 recommendation.');
    expect(bulkMessage('DISMISSED', { updated: 2, skipped: 1 })).toBe('Dismissed 2 recommendations. 1 already resolved or replaced.');
  });
});
