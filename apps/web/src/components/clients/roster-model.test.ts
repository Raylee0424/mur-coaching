import { describe, expect, it } from 'vitest';
import { ATTENTION_LABELS, DEFAULT_COLUMNS, parseColumns, parseRosterFilter, rosterHref, rosterMeta, rosterQuery, rpeTrend } from './roster-model';

describe('roster filters', () => {
  it('falls back to all for unknown values', () => {
    expect(parseRosterFilter(undefined)).toBe('all');
    expect(parseRosterFilter('nope')).toBe('all');
    expect(parseRosterFilter('paused')).toBe('paused');
  });

  it('maps chips to API queries', () => {
    expect(rosterQuery('all', '')).toEqual({});
    expect(rosterQuery('attention', ' ana ')).toEqual({ needsAttention: true, q: 'ana' });
    expect(rosterQuery('paused', '')).toEqual({ status: 'PAUSED' });
    expect(rosterQuery('archived', '')).toEqual({ status: 'ARCHIVED' });
  });

  it('keeps URLs clean', () => {
    expect(rosterHref('all', '')).toBe('/coach/clients');
    expect(rosterHref('attention', 'x y')).toBe('/coach/clients?filter=attention&q=x+y');
  });
});

describe('column visibility', () => {
  it('defaults to all columns', () => {
    expect(parseColumns(null)).toEqual([...DEFAULT_COLUMNS]);
    expect(parseColumns('not json')).toEqual([...DEFAULT_COLUMNS]);
    expect(parseColumns('{}')).toEqual([...DEFAULT_COLUMNS]);
  });

  it('keeps known keys in canonical order', () => {
    expect(parseColumns('["rpe","program","bogus"]')).toEqual(['program', 'rpe']);
    expect(parseColumns('[]')).toEqual([]);
  });
});

describe('rpeTrend', () => {
  it('needs both weeks', () => {
    expect(rpeTrend(8, null)).toBeNull();
  });
  it('reports direction and rounded delta', () => {
    expect(rpeTrend(7.9, 8.1)).toEqual({ delta: -0.2, dir: 'down' });
    expect(rpeTrend(8.5, 8)).toEqual({ delta: 0.5, dir: 'up' });
    expect(rpeTrend(8, 8)).toEqual({ delta: 0, dir: 'flat' });
  });
});

describe('roster header and labels', () => {
  it('shows paused only when someone is paused', () => {
    expect(rosterMeta({ ACTIVE: 4, PAUSED: 1 })).toBe('4 active · 1 paused');
    expect(rosterMeta({ ACTIVE: 4, PAUSED: 0 })).toBe('4 active');
  });

  it('uses plain words for the lighter week flag', () => {
    expect(ATTENTION_LABELS.PENDING_DELOAD).toBe('Lighter week pending');
  });
});
