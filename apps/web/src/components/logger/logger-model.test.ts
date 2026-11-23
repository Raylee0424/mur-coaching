import { describe, expect, it } from 'vitest';
import type { WorkoutLogDto } from '@coaching/shared';
import {
  addSet,
  emptyDraft,
  fromLastLog,
  patchSet,
  setExerciseId,
  toLocalInput,
  validateDraft,
  type DraftLog,
} from './logger-model';

const NOW = new Date(2026, 10, 21, 12, 0, 0);
const NOW_LOCAL = toLocalInput(NOW);

const lastLog: WorkoutLogDto = {
  id: 'l1',
  clientId: 'c1',
  assignmentId: 'a1',
  workoutId: 'w1',
  performedAt: '2026-11-14T10:00:00.000Z',
  notes: 'old note',
  createdAt: '2026-11-14T10:00:00.000Z',
  exerciseLogs: [
    {
      id: 'e1',
      workoutLogId: 'l1',
      exerciseId: 'bench',
      workoutExerciseId: 'we1',
      order: 1,
      exercise: { id: 'bench', name: 'Bench' },
      swappedFromExerciseId: null,
      swapReason: null,
      swappedFrom: null,
      notes: null,
      sets: [
        { id: 's1', exerciseLogId: 'e1', setNumber: 1, reps: 8, weightKg: '100.00', rpe: '8.5', isWarmup: false, rir: null, tempo: null, restSeconds: null },
        { id: 's2', exerciseLogId: 'e1', setNumber: 2, reps: 5, weightKg: '60.00', rpe: null, isWarmup: true, rir: null, tempo: null, restSeconds: null },
      ],
    },
  ],
};

function valid(): DraftLog {
  const d = fromLastLog(lastLog, NOW_LOCAL, 'KG');
  return d;
}

describe('fromLastLog', () => {
  it('copies prescription ids and normalises numbers, but not the old notes', () => {
    const d = fromLastLog(lastLog, NOW_LOCAL, 'KG');
    expect(d.assignmentId).toBe('a1');
    expect(d.workoutId).toBe('w1');
    expect(d.notes).toBe('');
    expect(d.exercises[0]?.workoutExerciseId).toBe('we1');
    expect(d.exercises[0]?.sets.map((s) => [s.weight, s.reps, s.rpe, s.isWarmup])).toEqual([
      ['100', '8', '8.5', false],
      ['60', '5', '', true],
    ]);
  });
});

describe('validateDraft', () => {
  it('builds the exact request shape', () => {
    const r = validateDraft(valid(), NOW);
    expect(r).toEqual({
      ok: true,
      request: {
        assignmentId: 'a1',
        workoutId: 'w1',
        performedAt: new Date(NOW_LOCAL).toISOString(),
        exerciseLogs: [
          {
            exerciseId: 'bench',
            workoutExerciseId: 'we1',
            sets: [
              { reps: 8, weightKg: 100, rpe: 8.5 },
              { reps: 5, weightKg: 60, isWarmup: true },
            ],
          },
        ],
      },
    });
  });

  it('rejects an empty session', () => {
    const r = validateDraft({ ...valid(), exercises: [] }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors['exercises']).toBeDefined();
  });

  it('rejects bad reps, rpe, weight precision and missing exercise', () => {
    let d = emptyDraft(NOW_LOCAL, 'KG');
    const ex = d.exercises[0]!;
    const set = ex.sets[0]!;
    d = patchSet(d, ex.key, set.key, { reps: '1.5', weight: '100.123', rpe: '11' });
    const r = validateDraft(d, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual([
        'exercises.0.exerciseId',
        'exercises.0.sets.0.reps',
        'exercises.0.sets.0.rpe',
        'exercises.0.sets.0.weight',
      ]);
    }
  });

  it('rejects a future date and a missing date', () => {
    const future = toLocalInput(new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000));
    const a = validateDraft({ ...valid(), performedAtLocal: future }, NOW);
    expect(a.ok).toBe(false);
    const b = validateDraft({ ...valid(), performedAtLocal: '' }, NOW);
    expect(b.ok).toBe(false);
  });
});

describe('edits', () => {
  it('changing the exercise clears the prescription link', () => {
    const d = valid();
    const key = d.exercises[0]!.key;
    expect(setExerciseId(d, key, 'bench').exercises[0]?.workoutExerciseId).toBe('we1');
    expect(setExerciseId(d, key, 'squat').exercises[0]?.workoutExerciseId).toBeUndefined();
  });

  it('addSet copies the previous set without the warm-up flag', () => {
    const d = valid();
    const key = d.exercises[0]!.key;
    const sets = addSet(d, key).exercises[0]!.sets;
    expect(sets).toHaveLength(3);
    expect(sets[2]).toMatchObject({ reps: '5', weight: '60', isWarmup: false });
  });
});

import { swapExercise, undoSwap } from './logger-model';

describe('swapExercise', () => {
  it('drops the prescription link, records the swap and can undo it', () => {
    let d = fromLastLog(lastLog, NOW_LOCAL, 'KG');
    const ex = d.exercises[0];
    if (!ex) throw new Error('no exercise');
    d = swapExercise(d, ex.key, 'db-press', 'EQUIPMENT_BUSY', '  rack taken ');
    expect(d.exercises[0]).toMatchObject({ exerciseId: 'db-press', swap: { fromExerciseId: 'bench', fromWorkoutExerciseId: 'we1', reason: 'EQUIPMENT_BUSY', note: 'rack taken' } });
    expect(d.exercises[0]?.workoutExerciseId).toBeUndefined();

    d = swapExercise(d, ex.key, 'machine-press', 'PAIN', '');
    expect(d.exercises[0]?.swap?.fromExerciseId).toBe('bench');

    const r = validateDraft(d, NOW);
    expect(r.ok && r.request.exerciseLogs[0]).toMatchObject({ exerciseId: 'machine-press', swappedFromExerciseId: 'bench', swapReason: 'PAIN' });
    expect(r.ok && 'workoutExerciseId' in (r.request.exerciseLogs[0] ?? {})).toBe(false);

    d = undoSwap(d, ex.key);
    expect(d.exercises[0]).toMatchObject({ exerciseId: 'bench', workoutExerciseId: 'we1' });
    expect(d.exercises[0]?.swap).toBeUndefined();
  });
});


describe('baseline prefill', () => {
  it('fills blank sets from the starting weight, in the draft unit', () => {
    const d = emptyDraft(NOW_LOCAL, 'LB');
    const key = d.exercises[0]?.key ?? '';
    const filled = setExerciseId(d, key, 'squat', { weightKg: 102.05, reps: 5 });
    expect(filled.exercises[0]?.sets[0]).toMatchObject({ weight: '225', reps: '5' });
    const touched = patchSet(d, key, d.exercises[0]?.sets[0]?.key ?? '', { reps: '8' });
    expect(setExerciseId(touched, key, 'squat', { weightKg: 100, reps: 5 }).exercises[0]?.sets[0]).toMatchObject({ weight: '', reps: '8' });
  });
});

import {
  commitSet,
  setExerciseNote,
  dropEmptyExercises,
  editSetValues,
  eyebrow,
  formatClock,
  formatStepValue,
  formatTargetLine,
  nextSetDefaults,
  restClock,
  rpeError,
  rpeGuideRows,
  setLabel,
  startFreeform,
  startFromLastLog,
  startFromToday,
  stepValue,
  weightStepFor,
} from './logger-model';

describe('steppers', () => {
  it('steps and clamps without float noise', () => {
    expect(stepValue(157.5, 2.5, 0, 9999)).toBe(160);
    expect(stepValue(0.1, 0.2, 0, 10)).toBe(0.3);
    expect(stepValue(1, -1, 1, 1000)).toBe(1);
    expect(stepValue(9.5, 0.5, 1, 10)).toBe(10);
    expect(stepValue(10, 0.5, 1, 10)).toBe(10);
  });

  it('flags RPE outside 6.0-10.0', () => {
    expect(rpeError(8)).toBeNull();
    expect(rpeError(6)).toBeNull();
    expect(rpeError(10)).toBeNull();
    expect(rpeError(5.5)).toMatch(/between 6\.0 and 10\.0/);
  });

  it('picks the weight step from the exercise increment', () => {
    expect(weightStepFor(2.5, 'KG')).toBe(2.5);
    expect(weightStepFor(1.25, 'KG')).toBe(1.25);
    expect(weightStepFor(0, 'KG')).toBe(2.5);
    expect(weightStepFor(2.5, 'LB')).toBe(5);
    expect(weightStepFor(1.25, 'LB')).toBe(2.5);
    expect(weightStepFor(5, 'LB')).toBe(10);
  });

  it('formats stepper values like the design', () => {
    expect(formatStepValue('weight', 157.5)).toBe('157.5');
    expect(formatStepValue('weight', 160)).toBe('160');
    expect(formatStepValue('reps', 5)).toBe('5');
    expect(formatStepValue('rpe', 8)).toBe('8.0');
  });
});

describe('targets and labels', () => {
  it('formats a target line in the display unit', () => {
    expect(formatTargetLine({ weightKg: 157.5, repsMin: 5, repsMax: 5, rpe: 8.5 }, 'KG')).toBe('157.5 kg × 5 @ RPE 8.5');
    expect(formatTargetLine({ weightKg: 100, repsMin: 6, repsMax: 8, rpe: null }, 'KG')).toBe('100 kg × 6–8');
    expect(formatTargetLine({ weightKg: 102.06, repsMin: 5, repsMax: 5, rpe: null }, 'LB')).toBe('225 lb × 5');
    expect(formatTargetLine({ weightKg: null, repsMin: 8, repsMax: 12, rpe: null }, 'KG')).toBe('8–12 reps');
    expect(formatTargetLine({ weightKg: null, repsMin: null, repsMax: null, rpe: null }, 'KG')).toBe('');
  });

  it('numbers the set against the prescription', () => {
    const plan = { name: 'Squat', plannedSets: 3, restSeconds: 180, target: null, previous: [], weightStep: 2.5 };
    expect(setLabel(plan, 0)).toBe('SET 1 OF 3');
    expect(setLabel(plan, 2)).toBe('SET 3 OF 3');
    expect(setLabel(plan, 3)).toBe('SET 4 · EXTRA');
    expect(setLabel({ ...plan, plannedSets: 0 }, 1)).toBe('SET 2');
    expect(setLabel(undefined, 0)).toBe('SET 1');
  });

  it('builds the logger eyebrow', () => {
    const plan = {
      name: 'Squat',
      plannedSets: 3,
      restSeconds: null,
      target: { weightKg: 157.5, repsMin: 5, repsMax: 5, rpe: 8.5 },
      previous: [],
      weightStep: 2.5,
    };
    expect(eyebrow(plan, 1, 'KG')).toBe('SET 2 OF 3 · TARGET: 157.5 kg × 5 @ RPE 8.5');
    const repeat = { ...plan, target: null, previous: [{ weight: 100, reps: 8, rpe: 8 }] };
    expect(eyebrow(repeat, 0, 'KG')).toBe('SET 1 OF 3 · LAST TIME: 100 kg × 8 @ RPE 8.0');
    expect(eyebrow(undefined, 0, 'KG')).toBe('SET 1');
  });
});

describe('set flow', () => {
  const today = {
    id: 'w1',
    assignmentId: 'a1',
    exercises: [
      {
        workoutExerciseId: 'we1',
        exerciseId: 'squat',
        name: 'Squat',
        sets: 3,
        restSeconds: 180,
        target: { weightKg: '157.50', repsMin: 5, repsMax: 5, rpe: '8.5' },
      },
      {
        workoutExerciseId: 'we2',
        exerciseId: 'rdl',
        name: 'RDL',
        sets: 2,
        restSeconds: null,
        target: { weightKg: null, repsMin: 8, repsMax: 10, rpe: null },
      },
    ],
  };

  it('starts from today with empty sets, links and prefilled defaults', () => {
    const { draft, plans } = startFromToday(today, { squat: 2.5, rdl: 5 }, NOW_LOCAL, 'KG');
    expect(draft.assignmentId).toBe('a1');
    expect(draft.workoutId).toBe('w1');
    expect(draft.exercises.map((e) => [e.exerciseId, e.workoutExerciseId, e.sets.length])).toEqual([
      ['squat', 'we1', 0],
      ['rdl', 'we2', 0],
    ]);
    const [a, b] = draft.exercises;
    expect(plans[a!.key]).toMatchObject({ plannedSets: 3, restSeconds: 180, weightStep: 2.5 });
    expect(nextSetDefaults(plans[a!.key], [], 'KG')).toEqual({ weight: 157.5, reps: 5, rpe: 8.5 });
    expect(nextSetDefaults(plans[b!.key], [], 'KG')).toEqual({ weight: 0, reps: 8, rpe: 8 });
    expect(plans[b!.key]?.weightStep).toBe(5);
  });

  it('logs sets, defaults the next one to the previous set, edits and validates', () => {
    const { draft: start, plans } = startFromToday(today, { squat: 2.5 }, NOW_LOCAL, 'KG');
    const key = start.exercises[0]!.key;
    let d = commitSet(start, key, { weight: 157.5, reps: 5, rpe: 8 });
    expect(nextSetDefaults(plans[key], d.exercises[0]!.sets, 'KG')).toEqual({ weight: 157.5, reps: 5, rpe: 8 });
    d = commitSet(d, key, { weight: 160, reps: 4, rpe: 9 });
    const second = d.exercises[0]!.sets[1]!;
    d = editSetValues(d, key, second.key, { weight: 155, reps: 5, rpe: 8.5 });
    expect(d.exercises[0]!.sets.map((s) => [s.weight, s.reps, s.rpe])).toEqual([
      ['157.5', '5', '8'],
      ['155', '5', '8.5'],
    ]);

    const finished = dropEmptyExercises(d);
    expect(finished.exercises).toHaveLength(1);
    const r = validateDraft(finished, NOW);
    expect(r.ok && r.request.exerciseLogs[0]).toMatchObject({
      exerciseId: 'squat',
      workoutExerciseId: 'we1',
      sets: [
        { reps: 5, weightKg: 157.5, rpe: 8 },
        { reps: 5, weightKg: 155, rpe: 8.5 },
      ],
    });
    expect(r.ok && r.request.assignmentId).toBe('a1');
  });

  it('converts lb sets to kg on submit', () => {
    const { draft } = startFromToday(today, {}, NOW_LOCAL, 'LB');
    const d = commitSet(draft, draft.exercises[0]!.key, { weight: 225, reps: 5, rpe: 8 });
    const r = validateDraft(dropEmptyExercises(d), NOW);
    expect(r.ok && r.request.exerciseLogs[0]?.sets[0]?.weightKg).toBe(102.05);
  });

  it('repeats the last session: previous numbers become defaults, links kept', () => {
    const { draft, plans } = startFromLastLog(lastLog, { bench: 2.5 }, NOW_LOCAL, 'KG');
    const ex = draft.exercises[0]!;
    expect(ex.sets).toEqual([]);
    expect(ex.workoutExerciseId).toBe('we1');
    expect(draft.assignmentId).toBe('a1');
    // The warm-up set is not repeated as a working set.
    expect(plans[ex.key]).toMatchObject({ name: 'Bench', plannedSets: 1, previous: [{ weight: 100, reps: 8, rpe: 8.5 }] });
    expect(nextSetDefaults(plans[ex.key], [], 'KG')).toEqual({ weight: 100, reps: 8, rpe: 8.5 });
  });

  it('freeform starts with one empty exercise and neutral defaults', () => {
    const { draft, plans } = startFreeform(NOW_LOCAL, 'KG');
    expect(draft.exercises).toHaveLength(1);
    expect(draft.exercises[0]!.sets).toEqual([]);
    expect(nextSetDefaults(plans[draft.exercises[0]!.key], [], 'KG')).toEqual({ weight: 0, reps: 5, rpe: 8 });
    expect(nextSetDefaults(undefined, [], 'LB', { weightKg: 102.05, reps: 3 })).toEqual({ weight: 225, reps: 3, rpe: 8 });
  });
});

describe('rest timer', () => {
  it('formats mm:ss', () => {
    expect(formatClock(165)).toBe('02:45');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('counts down to the prescribed rest, then reports done', () => {
    expect(restClock(1000, 1000 + 15_000, 180)).toEqual({ seconds: 165, mode: 'down', done: false });
    expect(restClock(1000, 1000 + 180_000, 180)).toEqual({ seconds: 0, mode: 'down', done: true });
    expect(restClock(1000, 1000 + 400_000, 180)).toEqual({ seconds: 0, mode: 'down', done: true });
  });

  it('counts up without a prescription and idles before the first set', () => {
    expect(restClock(1000, 1000 + 61_000, null)).toEqual({ seconds: 61, mode: 'up', done: false });
    expect(restClock(null, 5000, 120)).toEqual({ seconds: 120, mode: 'down', done: false });
    expect(restClock(null, 5000, null)).toEqual({ seconds: 0, mode: 'up', done: false });
  });
});

describe('rpeGuideRows', () => {
  it('lists the anchors, descending', () => {
    expect(rpeGuideRows(null).map((r) => r.rpe)).toEqual([10, 9, 8, 7, 6]);
    expect(rpeGuideRows(8).map((r) => r.rpe)).toEqual([10, 9, 8, 7, 6]);
  });
  it('adds a half-point target so it can be marked', () => {
    expect(rpeGuideRows(8.5).map((r) => r.rpe)).toEqual([10, 9, 8.5, 8, 7, 6]);
  });
});

describe('tempo and exercise notes', () => {
  const base = () => {
    const blank = emptyDraft(NOW_LOCAL, 'KG');
    let d = setExerciseId(blank, blank.exercises[0]!.key, 'squat');
    const key = d.exercises[0]!.key;
    d = { ...d, exercises: [{ ...d.exercises[0]!, sets: [] }] };
    d = commitSet(d, key, { weight: 100, reps: 5, rpe: 8 }, ' 3-1-x-0 ');
    return { d, key };
  };

  it('sends a tempo (upper-cased) and a trimmed exercise note', () => {
    const { d, key } = base();
    const r = validateDraft(setExerciseNote(d, key, '  felt heavy  '), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.request.exerciseLogs[0]?.notes).toBe('felt heavy');
      expect(r.request.exerciseLogs[0]?.sets[0]?.tempo).toBe('3-1-X-0');
    }
  });

  it('omits blank tempo and notes', () => {
    const { d, key } = base();
    const cleared = patchSet(d, key, d.exercises[0]!.sets[0]!.key, { tempo: '' });
    const r = validateDraft(setExerciseNote(cleared, key, '   '), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.request.exerciseLogs[0]?.notes).toBeUndefined();
      expect(r.request.exerciseLogs[0]?.sets[0]).not.toHaveProperty('tempo');
    }
  });

  it('rejects a malformed tempo and an over-long note', () => {
    const { d, key } = base();
    const bad = patchSet(d, key, d.exercises[0]!.sets[0]!.key, { tempo: '3-1-1' });
    const r1 = validateDraft(bad, NOW);
    expect(r1.ok).toBe(false);
    const r2 = validateDraft(setExerciseNote(d, key, 'x'.repeat(1001)), NOW);
    expect(r2.ok).toBe(false);
  });
});
