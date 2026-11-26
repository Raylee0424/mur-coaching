import { describe, expect, it } from 'vitest';
import { ProgressionReasonCase } from '@coaching/shared';
import type { RecommendationQueueItem } from '@coaching/shared';
import { plainReason } from './reason-model';

type Item = Pick<RecommendationQueueItem, 'reason' | 'reasonCase' | 'proposed' | 'basis'>;

const make = (over: Partial<Item> = {}, basis: Partial<Item['basis']> = {}): Item => ({
  reason: 'Engine reason.',
  reasonCase: 'INCREASE_REPS',
  proposed: { weightKg: '65', repsMin: 13, repsMax: 15 },
  basis: {
    sessionsUsed: 3,
    latest: { weightKg: '65', repsPerSet: [12, 12, 12], workingSets: 3, avgRpe: '8' },
    rule: { sets: 3, repsMin: 8, repsMax: 15, rpeCap: '8', loadMarginRpe: '0', highRpe: '9', loadIncrementKg: '2.5', deloadPercent: 10 },
    ...basis,
  },
  ...over,
});

describe('plainReason', () => {
  it('gives a non-empty sentence that differs from the engine reason for every case', () => {
    for (const reasonCase of Object.values(ProgressionReasonCase)) {
      const text = plainReason(make({ reasonCase }), 'KG');
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe('Engine reason.');
    }
  });
  it('reproduces the ticket example', () => {
    expect(plainReason(make(), 'KG')).toBe('All sets hit 12 reps at 65 kg and felt like an 8/10. Aim for 13+ next time.');
  });
  it('uses "a" for 9 and drops a trailing .0', () => {
    const text = plainReason(make({}, { latest: { weightKg: '65', repsPerSet: [12], workingSets: 1, avgRpe: '9.0' } }), 'KG');
    expect(text).toContain('felt like a 9/10');
  });
  it('shows a rep range when sets differ', () => {
    const text = plainReason(make({}, { latest: { weightKg: '65', repsPerSet: [10, 12, 11], workingSets: 3, avgRpe: '8' } }), 'KG');
    expect(text).toContain('10-12 reps');
  });
  it('shows pounds when the unit is LB', () => {
    expect(plainReason(make({ reasonCase: 'INCREASE_LOAD', proposed: { weightKg: '67.5', repsMin: 8, repsMax: 10 } }), 'LB')).toContain('lb');
  });
  it('falls back to the engine reason when the case is null or a number is missing', () => {
    expect(plainReason(make({ reasonCase: null }), 'KG')).toBe('Engine reason.');
    expect(plainReason(make({ proposed: { weightKg: '65', repsMin: null, repsMax: null } }), 'KG')).toBe('Engine reason.');
  });
});
