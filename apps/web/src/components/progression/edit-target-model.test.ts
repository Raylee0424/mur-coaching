import { describe, expect, it } from 'vitest';
import { initialDraft, validateDraft, type EditTargetSubject } from './edit-target-model';

const subject: EditTargetSubject = {
  recommendationId: 'r1',
  clientId: 'c1',
  exerciseId: 'e1',
  exerciseName: 'Squat',
  action: 'INCREASE_LOAD',
  status: 'PENDING',
  reason: 'r',
  engine: { weightKg: '157.5', repsMin: 5, repsMax: 5 },
  rpeCap: 8.5,
  override: null,
};

describe('initialDraft', () => {
  it('starts from the engine target and RPE cap', () => {
    expect(initialDraft(subject, 'KG')).toEqual({ weight: '157.5', repsMin: '5', repsMax: '5', rpe: '8.5', note: '' });
  });
  it('prefers an existing override and its note', () => {
    const s = { ...subject, override: { weightKg: '160', repsMin: 4, repsMax: 4, rpe: '8', note: 'Heavy top set' } };
    expect(initialDraft(s, 'KG')).toEqual({ weight: '160', repsMin: '4', repsMax: '4', rpe: '8', note: 'Heavy top set' });
  });
  it('shows pounds when the coach uses lb', () => {
    expect(initialDraft({ ...subject, engine: { weightKg: '100', repsMin: 5, repsMax: 5 } }, 'LB').weight).toBe('220.5');
  });
});

describe('validateDraft', () => {
  const ok = { weight: '160', repsMin: '4', repsMax: '4', rpe: '8.5', note: ' hi ' };
  it('accepts a good draft and trims the note', () => {
    const r = validateDraft(ok, 'KG');
    expect(r.errors).toEqual({});
    expect(r.body).toEqual({ weightKg: 160, repsMin: 4, repsMax: 4, rpe: 8.5, note: 'hi' });
  });
  it('lets RPE be empty', () => {
    expect(validateDraft({ ...ok, rpe: '' }, 'KG').body.rpe).toBeNull();
  });
  it('flags bad values', () => {
    const r = validateDraft({ weight: '', repsMin: '6', repsMax: '4', rpe: '8.3', note: '' }, 'KG');
    expect(Object.keys(r.errors).sort()).toEqual(['repsMax', 'rpe', 'weight']);
  });
});
