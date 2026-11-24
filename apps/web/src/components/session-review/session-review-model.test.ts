import { describe, expect, it } from 'vitest';
import type { ReviewSet, SessionFeedbackDto } from '@coaching/shared';
import { groupFeedback, liftSummary } from './session-review-model';

const fb = (id: string, over: Partial<SessionFeedbackDto> = {}): SessionFeedbackDto => ({
  id, workoutLogId: 'l1', exerciseLogId: null, setLogId: null, body: 'x', carryForward: false, createdAt: '', updatedAt: '', ...over,
});
const set = (n: number, over: Partial<ReviewSet> = {}): ReviewSet => ({ id: `s${n}`, setNumber: n, reps: 5, weightKg: '157.50', rpe: '7.5', isWarmup: false, ...over });

describe('groupFeedback', () => {
  it('files each comment under its narrowest scope', () => {
    const g = groupFeedback([fb('a'), fb('b', { exerciseLogId: 'e1' }), fb('c', { exerciseLogId: 'e1', setLogId: 's2' }), fb('d', { exerciseLogId: 'e1' })]);
    expect(g.session.map((f) => f.id)).toEqual(['a']);
    expect(g.exercise.get('e1')?.map((f) => f.id)).toEqual(['b', 'd']);
    expect(g.set.get('s2')?.map((f) => f.id)).toEqual(['c']);
  });
});

describe('liftSummary', () => {
  it('summarises equal loads once', () => {
    expect(liftSummary([set(1), set(2), set(3, { rpe: '8.0' })], 'KG')).toBe('157.5 kg × 5, 5, 5 @ RPE 7.5, 7.5, 8');
  });
  it('lists each load when they differ, skips warm-ups, and marks missing RPE', () => {
    expect(liftSummary([set(1, { isWarmup: true, weightKg: '60.00' }), set(2, { weightKg: '100.00', rpe: null }), set(3, { weightKg: '105.00', rpe: '8.0' })], 'KG')).toBe(
      '100 kg × 5, 105 kg × 5 @ RPE –, 8',
    );
  });
  it('returns null with only warm-ups', () => {
    expect(liftSummary([set(1, { isWarmup: true })], 'KG')).toBeNull();
  });
});
