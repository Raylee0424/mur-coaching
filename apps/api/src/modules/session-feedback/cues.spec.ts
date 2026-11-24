import { describe, expect, it } from 'vitest';
import { activeCues, type PinnedFeedback } from './cues';

const at = (iso: string): Date => new Date(`${iso}T10:00:00.000Z`);
const pin = (over: Partial<PinnedFeedback> & Pick<PinnedFeedback, 'feedbackId'>): PinnedFeedback => ({
  body: 'Brace harder',
  exerciseId: 'squat',
  setNumber: null,
  performedAt: at('2026-11-10'),
  ...over,
});

describe('activeCues', () => {
  it('keeps a lift cue until that lift is logged again', () => {
    const logs = [{ performedAt: at('2026-11-12'), exerciseIds: ['bench'] }];
    expect(activeCues([pin({ feedbackId: 'f1' })], logs).byExercise.get('squat')).toHaveLength(1);
    const after = [...logs, { performedAt: at('2026-11-14'), exerciseIds: ['squat'] }];
    expect(activeCues([pin({ feedbackId: 'f1' })], after).byExercise.size).toBe(0);
  });

  it('ignores logs on or before the commented session', () => {
    const logs = [{ performedAt: at('2026-11-10'), exerciseIds: ['squat'] }, { performedAt: at('2026-11-01'), exerciseIds: ['squat'] }];
    expect(activeCues([pin({ feedbackId: 'f1' })], logs).byExercise.get('squat')).toHaveLength(1);
  });

  it('keeps a session cue until any later session', () => {
    const p = pin({ feedbackId: 's1', exerciseId: null });
    expect(activeCues([p], []).session).toHaveLength(1);
    expect(activeCues([p], [{ performedAt: at('2026-11-11'), exerciseIds: [] }]).session).toHaveLength(0);
  });

  it('orders newest first and carries the set number and source date', () => {
    const cues = activeCues(
      [pin({ feedbackId: 'old', performedAt: at('2026-11-03') }), pin({ feedbackId: 'new', setNumber: 3 })],
      [],
    ).byExercise.get('squat');
    expect(cues?.map((c) => c.feedbackId)).toEqual(['new', 'old']);
    expect(cues?.[0]).toMatchObject({ setNumber: 3, fromDate: '2026-11-10' });
  });
});
