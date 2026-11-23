import { describe, expect, it } from 'vitest';
import type { LimitationDto } from '@coaching/shared';
import { emptyDraft, sortLimitations, statusOf, targetLabel, validateDraft } from './limitations-model';

const TODAY = '2026-11-24';
const dto = (over: Partial<LimitationDto>): LimitationDto => ({
  id: 'l', clientId: 'c', target: 'MUSCLE', muscleGroup: 'SHOULDERS', exerciseId: null, exerciseName: null,
  severity: 'CAUTION', note: null, startsOn: '2026-11-01', endsOn: null, createdAt: '2026-11-01T00:00:00Z', ...over,
});

describe('validateDraft', () => {
  it('requires the target field that matches the target kind', () => {
    const d = emptyDraft(TODAY);
    expect(validateDraft(d)).toMatchObject({ ok: false, errors: { muscleGroup: expect.any(String) } });
    expect(validateDraft({ ...d, target: 'EXERCISE' })).toMatchObject({ ok: false, errors: { exerciseId: expect.any(String) } });
  });

  it('builds a request with only the matching target id and trimmed note', () => {
    const r = validateDraft({ ...emptyDraft(TODAY), muscleGroup: 'CHEST', note: '  strain  ' });
    expect(r).toEqual({ ok: true, request: { target: 'MUSCLE', muscleGroup: 'CHEST', severity: 'CAUTION', note: 'strain', startsOn: TODAY, endsOn: null } });
    const e = validateDraft({ ...emptyDraft(TODAY), target: 'EXERCISE', exerciseId: 'bench', severity: 'AVOID' });
    expect(e).toMatchObject({ ok: true, request: { target: 'EXERCISE', exerciseId: 'bench', severity: 'AVOID' } });
    expect(e.ok && 'muscleGroup' in e.request).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    expect(validateDraft({ ...emptyDraft(TODAY), muscleGroup: 'CHEST', endsOn: '2026-11-01' })).toMatchObject({ ok: false, errors: { endsOn: expect.any(String) } });
  });
});

describe('sortLimitations / statusOf', () => {
  it('lists active AVOID, active CAUTION, then ended', () => {
    const list = [
      dto({ id: 'ended', endsOn: '2026-11-10' }),
      dto({ id: 'caution' }),
      dto({ id: 'avoid', severity: 'AVOID' }),
    ];
    expect(sortLimitations(list, TODAY).map((l) => l.id)).toEqual(['avoid', 'caution', 'ended']);
  });

  it('classifies by date', () => {
    expect(statusOf(dto({}), TODAY)).toBe('active');
    expect(statusOf(dto({ endsOn: '2026-11-23' }), TODAY)).toBe('ended');
    expect(statusOf(dto({ startsOn: '2026-12-01' }), TODAY)).toBe('upcoming');
  });
});

describe('targetLabel', () => {
  it('uses the muscle label or the exercise name', () => {
    expect(targetLabel(dto({}))).toBe('Shoulders');
    expect(targetLabel(dto({ target: 'EXERCISE', muscleGroup: null, exerciseName: 'Bench press' }))).toBe('Bench press');
  });
});
