import { describe, expect, it } from 'vitest';
import type { ProgramDto } from '@coaching/shared';
import {
  addDay,
  addExercise,
  copyWeekToAll,
  daysOfWeek,
  duplicateDay,
  fingerprint,
  fromProgram,
  moveExercise,
  setDuration,
  toInput,
} from './builder-model';

const program: ProgramDto = {
  id: 'p1',
  name: 'Block',
  description: null,
  durationWeeks: 2,
  isTemplate: false,
  mesocycles: [],
  sports: [],
  shareActive: false,
  createdAt: '',
  updatedAt: '',
  activeClientIds: [],
  workouts: [
    {
      id: 'w1',
      weekNumber: 1,
      dayNumber: 1,
      name: 'Upper',
      exercises: [
        { id: 'e1', exerciseId: 'bench', exercise: { id: 'bench', name: 'Bench', muscleGroup: 'CHEST' }, order: 1, targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, targetRpe: 8, restSeconds: 150, notes: null },
        { id: 'e2', exerciseId: 'row', exercise: { id: 'row', name: 'Row', muscleGroup: 'BACK' }, order: 2, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, targetRpe: null, restSeconds: null, notes: null },
      ],
    },
    {
      id: 'w2',
      weekNumber: 2,
      dayNumber: 1,
      name: 'Old upper',
      exercises: [
        { id: 'e3', exerciseId: 'bench', exercise: { id: 'bench', name: 'Bench', muscleGroup: 'CHEST' }, order: 1, targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, targetRpe: 8, restSeconds: 150, notes: null },
      ],
    },
    { id: 'w3', weekNumber: 2, dayNumber: 3, name: 'Extra', exercises: [] },
  ],
};

describe('builder model', () => {
  it('round-trips a program into the same API payload', () => {
    const r = toInput(fromProgram(program));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.workouts.map((w) => [w.id, w.weekNumber, w.dayNumber, w.exercises.map((e) => e.id)])).toEqual([
      ['w1', 1, 1, ['e1', 'e2']],
      ['w2', 2, 1, ['e3']],
      ['w3', 2, 3, []],
    ]);
    expect(r.input.workouts[0]?.exercises[1]).toMatchObject({ targetRpe: null, restSeconds: null });
  });

  it('copies a week onto others, keeping matched ids and dropping extras', () => {
    const d = copyWeekToAll(fromProgram(program), 1);
    const week2 = daysOfWeek(d, 2);
    expect(week2.map((x) => [x.id, x.dayNumber, x.name])).toEqual([['w2', 1, 'Upper']]);
    expect(week2[0]?.exercises.map((e) => [e.id, e.exerciseId])).toEqual([
      ['e3', 'bench'],
      [undefined, 'row'],
    ]);
  });

  it('adds days in free slots, duplicates as new rows and caps at seven', () => {
    let d = fromProgram(program);
    const added = addDay(d, 1);
    expect(daysOfWeek(added.draft, 1).map((x) => x.dayNumber)).toEqual([1, 2]);
    const dup = duplicateDay(added.draft, daysOfWeek(added.draft, 1)[0]?.key ?? '');
    const copy = daysOfWeek(dup.draft, 1).find((x) => x.name === 'Upper (copy)');
    expect(copy?.dayNumber).toBe(3);
    expect(copy?.id).toBeUndefined();
    expect(copy?.exercises.every((e) => e.id === undefined)).toBe(true);
    for (let i = 0; i < 10; i++) d = addDay(d, 1).draft;
    expect(daysOfWeek(d, 1)).toHaveLength(7);
    expect(addDay(d, 1).dayKey).toBeNull();
  });

  it('reorders, adds exercises and shrinks the duration', () => {
    let d = fromProgram(program);
    const day = daysOfWeek(d, 1)[0];
    if (!day) throw new Error('no day');
    d = moveExercise(d, day.key, day.exercises[1]?.key ?? '', -1);
    expect(daysOfWeek(d, 1)[0]?.exercises.map((e) => e.id)).toEqual(['e2', 'e1']);
    d = addExercise(d, day.key, { id: 'squat', name: 'Squat', muscleGroup: 'QUADS' });
    expect(daysOfWeek(d, 1)[0]?.exercises.at(-1)).toMatchObject({ exerciseId: 'squat', sets: '3', repsMin: '8' });
    d = setDuration(d, 1);
    expect(d.days.every((x) => x.weekNumber === 1)).toBe(true);
  });

  it('reports field errors and ignores keys in the fingerprint', () => {
    const d = fromProgram(program);
    const bad = { ...d, name: ' ', days: d.days.map((x, i) => (i === 0 ? { ...x, exercises: x.exercises.map((e) => ({ ...e, repsMin: '9', repsMax: '8', rpe: '8.3' })) } : x)) };
    const r = toInput(bad);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).filter((k) => k.endsWith('repsMax') || k.endsWith('rpe')).length).toBe(4);
    expect(r.errors.name).toBeDefined();
    expect(fingerprint(fromProgram(program))).toBe(fingerprint(fromProgram(program)));
  });
});

describe('periodization in the draft', () => {
  it('round-trips blocks and sports through the API shape', () => {
    const withBlocks: ProgramDto = {
      ...program,
      sports: [{ id: 'powerlifting', name: 'Powerlifting', group: 'Strength' }],
      mesocycles: [
        {
          id: 'm1',
          name: 'Hypertrophy',
          focus: null,
          startWeek: 1,
          endWeek: 2,
          microcycles: [{ id: 'c1', label: 'Deload', startWeek: 2, endWeek: 2, isDeload: true, rpeMin: '6.0', rpeMax: null, volumeDeltaPct: -35 }],
        },
      ],
    };
    const r = toInput(fromProgram(withBlocks));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.sportCategoryIds).toEqual(['powerlifting']);
    expect(r.input.mesocycles?.[0]).toMatchObject({ id: 'm1', name: 'Hypertrophy', startWeek: 1, endWeek: 2 });
    expect(r.input.mesocycles?.[0]?.microcycles[0]).toMatchObject({ id: 'c1', isDeload: true, rpeMin: 6, rpeMax: null, volumeDeltaPct: -35 });
  });

  it('blocks saving when a block overlaps and trims blocks when the program shrinks', () => {
    const d = fromProgram({
      ...program,
      durationWeeks: 4,
      mesocycles: [
        { id: 'a', name: 'A', focus: null, startWeek: 1, endWeek: 3, microcycles: [] },
        { id: 'b', name: 'B', focus: null, startWeek: 3, endWeek: 4, microcycles: [] },
      ],
    });
    const r = toInput(d);
    expect(!r.ok && r.errors['periodization']).toMatch(/overlaps/);
    expect(setDuration(d, 2).mesocycles.map((m) => [m.startWeek, m.endWeek])).toEqual([['1', '2']]);
  });
});
