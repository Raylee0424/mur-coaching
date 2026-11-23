import { describe, expect, it } from 'vitest';
import type { WorkoutTemplateDto } from '@coaching/shared';
import {
  appendExercise,
  appendTemplate,
  commitSet,
  draftToTemplateExercises,
  editSetValues,
  restTaken,
  rirFromRpe,
  rpeFromRir,
  startFreeform,
  startFromTemplate,
  validateDraft,
} from './logger-model';

const AT = '2026-11-21T10:00';
const NOW = new Date(2026, 10, 21, 12, 0, 0);

const template: WorkoutTemplateDto = {
  id: 't1',
  folderId: null,
  name: 'Upper A',
  notes: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  exercises: [
    { id: 'te2', exerciseId: 'row', exerciseName: 'Barbell Row', order: 1, targetSets: 3, repsMin: 6, repsMax: 8, restSeconds: 120, tempo: null },
    { id: 'te1', exerciseId: 'bench', exerciseName: 'Bench Press', order: 0, targetSets: 4, repsMin: null, repsMax: null, restSeconds: null, tempo: null },
  ],
};

describe('RIR mode', () => {
  it('maps RIR to RPE and back', () => {
    expect(rpeFromRir(2)).toBe(8);
    expect(rirFromRpe(8)).toBe(2);
    expect(rirFromRpe(10)).toBe(0);
    expect(rirFromRpe(6)).toBe(4);
    expect(rirFromRpe(5)).toBe(4);
  });

  it('sends rir and restSeconds on the request', () => {
    const start = startFreeform(AT, 'KG');
    const withEx = appendExercise(start, { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    const key = withEx.draft.exercises[0]!.key;
    const draft = commitSet(withEx.draft, key, { weight: 100, reps: 5, rpe: 8 }, '', { rir: 2, restSeconds: 95 });
    const result = validateDraft(draft, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.exerciseLogs[0]!.sets[0]).toMatchObject({ rpe: 8, rir: 2, restSeconds: 95 });
  });

  it('omits rir in RPE mode', () => {
    const withEx = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    const key = withEx.draft.exercises[0]!.key;
    const draft = commitSet(withEx.draft, key, { weight: 100, reps: 5, rpe: 8 });
    const result = validateDraft(draft, NOW);
    if (result.ok) expect(result.request.exerciseLogs[0]!.sets[0]).not.toHaveProperty('rir');
  });

  it('rejects out-of-range rir and rest', () => {
    const withEx = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    const key = withEx.draft.exercises[0]!.key;
    const draft = commitSet(withEx.draft, key, { weight: 100, reps: 5, rpe: 8 }, '', { rir: 11, restSeconds: 4000 });
    const result = validateDraft(draft, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(['exercises.0.sets.0.rir', 'exercises.0.sets.0.restSeconds']));
  });

  it('keeps rir in step when a set is edited', () => {
    const withEx = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    const key = withEx.draft.exercises[0]!.key;
    const logged = commitSet(withEx.draft, key, { weight: 100, reps: 5, rpe: 8 }, '', { rir: 2 });
    const setKey = logged.exercises[0]!.sets[0]!.key;
    const edited = editSetValues(logged, key, setKey, { weight: 100, reps: 5, rpe: 9 });
    expect(edited.exercises[0]!.sets[0]!.rir).toBe(1);
    const plain = commitSet(withEx.draft, key, { weight: 100, reps: 5, rpe: 8 });
    const plainEdited = editSetValues(plain, key, plain.exercises[0]!.sets[0]!.key, { weight: 100, reps: 5, rpe: 9 });
    expect(plainEdited.exercises[0]!.sets[0]!.rir).toBeUndefined();
  });
});

describe('restTaken', () => {
  it('is undefined without a running timer', () => expect(restTaken(null, 5000)).toBeUndefined());
  it('floors whole seconds', () => expect(restTaken(1000, 91_900)).toBe(90));
  it('caps at the API limit', () => expect(restTaken(0, 10_000_000)).toBe(3600));
  it('ignores a clock that went backwards', () => expect(restTaken(5000, 1000)).toBeUndefined());
});

describe('free exercise and templates', () => {
  it('replaces the blank freeform slot with the picked exercise', () => {
    const next = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    expect(next.draft.exercises).toHaveLength(1);
    expect(next.draft.exercises[0]!.exerciseId).toBe('squat');
    expect(next.plans[next.draft.exercises[0]!.key]!.name).toBe('Squat');
  });

  it('appends after existing exercises', () => {
    const first = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    const second = appendExercise(first, { id: 'row', name: 'Row', loadIncrementKg: 2.5 }, 'KG');
    expect(second.draft.exercises.map((e) => e.exerciseId)).toEqual(['squat', 'row']);
  });

  it('starts from a template in order, with its sets, reps and rest as the plan', () => {
    const flow = startFromTemplate(template, {}, AT, 'KG');
    expect(flow.draft.exercises.map((e) => e.exerciseId)).toEqual(['bench', 'row']);
    expect(flow.draft.assignmentId).toBeUndefined();
    const [bench, row] = flow.draft.exercises;
    expect(flow.plans[bench!.key]).toMatchObject({ name: 'Bench Press', plannedSets: 4, target: null });
    expect(flow.plans[row!.key]).toMatchObject({ plannedSets: 3, restSeconds: 120, target: { repsMin: 6, repsMax: 8 } });
  });

  it('falls back to freeform for an empty template', () => {
    const flow = startFromTemplate({ ...template, exercises: [] }, {}, AT, 'KG');
    expect(flow.draft.exercises).toHaveLength(1);
    expect(flow.draft.exercises[0]!.exerciseId).toBe('');
  });

  it('appending a template drops the blank slot', () => {
    const flow = appendTemplate(startFreeform(AT, 'KG'), template, {}, 'KG');
    expect(flow.draft.exercises).toHaveLength(2);
  });

  it('saves the working sets, rep range, last rest and tempo', () => {
    const base = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    const key = base.draft.exercises[0]!.key;
    let d = commitSet(base.draft, key, { weight: 100, reps: 8, rpe: 8 }, '3-1-1-0');
    d = commitSet(d, key, { weight: 100, reps: 6, rpe: 8 }, '', { restSeconds: 120 });
    d = commitSet(d, key, { weight: 100, reps: 7, rpe: 9 }, '', { restSeconds: 150 });
    expect(draftToTemplateExercises(d)).toEqual([
      { exerciseId: 'squat', targetSets: 3, repsMin: 6, repsMax: 8, restSeconds: 150, tempo: '3-1-1-0' },
    ]);
  });

  it('skips unfinished exercises', () => {
    const base = appendExercise(startFreeform(AT, 'KG'), { id: 'squat', name: 'Squat', loadIncrementKg: 2.5 }, 'KG');
    expect(draftToTemplateExercises(base.draft)).toEqual([]);
  });
});
