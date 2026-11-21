import { PROGRAM_LIMITS as L } from '@coaching/shared';
import type { ExerciseDto, MuscleGroup, ProgramDto, ProgramTreeInput } from '@coaching/shared';

/** Inputs stay strings while editing so half-typed numbers survive. */
export interface DraftRx {
  key: string;
  id?: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: string;
  repsMin: string;
  repsMax: string;
  rpe: string;
  rest: string;
}

export interface DraftDay {
  key: string;
  id?: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
  exercises: DraftRx[];
}

export interface ProgramDraft {
  name: string;
  description: string;
  durationWeeks: number;
  days: DraftDay[];
}

export type BuilderErrors = Record<string, string>;

let seq = 0;
const key = (): string => `b${++seq}`;
const str = (n: number | null): string => (n === null ? '' : String(n));

export function emptyProgram(): ProgramDraft {
  return { name: '', description: '', durationWeeks: 4, days: [] };
}

export function fromProgram(p: ProgramDto): ProgramDraft {
  return {
    name: p.name,
    description: p.description ?? '',
    durationWeeks: p.durationWeeks,
    days: p.workouts.map((w) => ({
      key: key(),
      id: w.id,
      weekNumber: w.weekNumber,
      dayNumber: w.dayNumber,
      name: w.name,
      exercises: w.exercises.map((e) => ({
        key: key(),
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: e.exercise.name,
        muscleGroup: e.exercise.muscleGroup,
        sets: String(e.targetSets),
        repsMin: String(e.targetRepsMin),
        repsMax: String(e.targetRepsMax),
        rpe: str(e.targetRpe),
        rest: str(e.restSeconds),
      })),
    })),
  };
}

export const daysOfWeek = (d: ProgramDraft, week: number): DraftDay[] =>
  d.days.filter((x) => x.weekNumber === week).sort((a, b) => a.dayNumber - b.dayNumber);

export const freeDayNumbers = (d: ProgramDraft, week: number): number[] => {
  const used = new Set(daysOfWeek(d, week).map((x) => x.dayNumber));
  return [1, 2, 3, 4, 5, 6, 7].filter((n) => !used.has(n));
};

const mapDay = (d: ProgramDraft, dayKey: string, fn: (x: DraftDay) => DraftDay): ProgramDraft => ({
  ...d,
  days: d.days.map((x) => (x.key === dayKey ? fn(x) : x)),
});

// ── Edits ────────────────────────────────────────────────────────────────────

export function addDay(d: ProgramDraft, week: number): { draft: ProgramDraft; dayKey: string | null } {
  const free = freeDayNumbers(d, week)[0];
  if (free === undefined) return { draft: d, dayKey: null };
  const day: DraftDay = { key: key(), weekNumber: week, dayNumber: free, name: `Day ${free}`, exercises: [] };
  return { draft: { ...d, days: [...d.days, day] }, dayKey: day.key };
}

/** Copies a day into the next free slot of the same week, as new rows. */
export function duplicateDay(d: ProgramDraft, dayKey: string): { draft: ProgramDraft; dayKey: string | null } {
  const src = d.days.find((x) => x.key === dayKey);
  const free = src ? freeDayNumbers(d, src.weekNumber)[0] : undefined;
  if (!src || free === undefined) return { draft: d, dayKey: null };
  const copy: DraftDay = {
    key: key(),
    weekNumber: src.weekNumber,
    dayNumber: free,
    name: `${src.name} (copy)`,
    exercises: src.exercises.map((rx) => {
      const copy: DraftRx = { ...rx, key: key() };
      delete copy.id;
      return copy;
    }),
  };
  return { draft: { ...d, days: [...d.days, copy] }, dayKey: copy.key };
}

export const removeDay = (d: ProgramDraft, dayKey: string): ProgramDraft => ({
  ...d,
  days: d.days.filter((x) => x.key !== dayKey),
});

export const patchDay = (d: ProgramDraft, dayKey: string, patch: Partial<Pick<DraftDay, 'name' | 'dayNumber'>>): ProgramDraft =>
  mapDay(d, dayKey, (x) => ({ ...x, ...patch }));

export function addExercise(d: ProgramDraft, dayKey: string, ex: Pick<ExerciseDto, 'id' | 'name' | 'muscleGroup'>): ProgramDraft {
  return mapDay(d, dayKey, (x) => {
    if (x.exercises.length >= L.maxExercisesPerWorkout) return x;
    const rx: DraftRx = {
      key: key(),
      exerciseId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: '3',
      repsMin: '8',
      repsMax: '10',
      rpe: '8',
      rest: '90',
    };
    return { ...x, exercises: [...x.exercises, rx] };
  });
}

export const patchExercise = (
  d: ProgramDraft,
  dayKey: string,
  rxKey: string,
  patch: Partial<Pick<DraftRx, 'sets' | 'repsMin' | 'repsMax' | 'rpe' | 'rest'>>,
): ProgramDraft => mapDay(d, dayKey, (x) => ({ ...x, exercises: x.exercises.map((r) => (r.key === rxKey ? { ...r, ...patch } : r)) }));

export const removeExercise = (d: ProgramDraft, dayKey: string, rxKey: string): ProgramDraft =>
  mapDay(d, dayKey, (x) => ({ ...x, exercises: x.exercises.filter((r) => r.key !== rxKey) }));

export function moveExercise(d: ProgramDraft, dayKey: string, rxKey: string, delta: -1 | 1): ProgramDraft {
  return mapDay(d, dayKey, (x) => {
    const i = x.exercises.findIndex((r) => r.key === rxKey);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= x.exercises.length) return x;
    const next = [...x.exercises];
    [next[i], next[j]] = [next[j] as DraftRx, next[i] as DraftRx];
    return { ...x, exercises: next };
  });
}

/** Shrinking drops the weeks beyond the new length; growing adds empty weeks. */
export function setDuration(d: ProgramDraft, weeks: number): ProgramDraft {
  const n = Math.min(Math.max(Math.round(weeks), 1), L.maxWeeks);
  return { ...d, durationWeeks: n, days: d.days.filter((x) => x.weekNumber <= n) };
}

/**
 * Makes every other week mirror `week`. Days and prescriptions already in those weeks keep their ids
 * (matched by day number, then by position) so logged history stays linked; extras are removed.
 */
export function copyWeekToAll(d: ProgramDraft, week: number): ProgramDraft {
  const source = daysOfWeek(d, week);
  const days: DraftDay[] = d.days.filter((x) => x.weekNumber === week);
  for (let w = 1; w <= d.durationWeeks; w++) {
    if (w === week) continue;
    const existing = daysOfWeek(d, w);
    for (const src of source) {
      const target = existing.find((x) => x.dayNumber === src.dayNumber);
      days.push({
        key: target?.key ?? key(),
        ...(target?.id ? { id: target.id } : {}),
        weekNumber: w,
        dayNumber: src.dayNumber,
        name: src.name,
        exercises: src.exercises.map((rx, i) => {
          const keep = target?.exercises[i];
          const next: DraftRx = { ...rx, key: keep?.key ?? key() };
          if (keep?.id) next.id = keep.id;
          else delete next.id;
          return next;
        }),
      });
    }
  }
  return { ...d, days };
}

// ── Validation → API payload ─────────────────────────────────────────────────

const intIn = (s: string, min: number, max: number): number | null => {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
};

export function toInput(d: ProgramDraft): { ok: true; input: ProgramTreeInput } | { ok: false; errors: BuilderErrors } {
  const errors: BuilderErrors = {};
  if (!d.name.trim()) errors.name = 'Name the program.';
  if (d.description.length > 1000) errors.description = 'At most 1000 characters.';

  const workouts: ProgramTreeInput['workouts'] = [];
  for (const day of d.days) {
    if (!day.name.trim()) errors[`day.${day.key}.name`] = 'Name this day.';
    const exercises = day.exercises.map((rx) => {
      const p = `rx.${rx.key}`;
      const sets = intIn(rx.sets, 1, L.maxSets);
      const min = intIn(rx.repsMin, 1, L.maxReps);
      const max = intIn(rx.repsMax, 1, L.maxReps);
      if (sets === null) errors[`${p}.sets`] = `1–${L.maxSets}`;
      if (min === null) errors[`${p}.repsMin`] = `1–${L.maxReps}`;
      if (max === null) errors[`${p}.repsMax`] = `1–${L.maxReps}`;
      else if (min !== null && min > max) errors[`${p}.repsMax`] = '≥ min';
      const rpeText = rx.rpe.trim();
      const rpe = rpeText === '' ? null : Number(rpeText);
      if (rpe !== null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10 || Math.round(rpe * 2) !== rpe * 2)) {
        errors[`${p}.rpe`] = '1–10, .5 steps';
      }
      const restText = rx.rest.trim();
      const rest = restText === '' ? null : intIn(restText, 0, L.maxRestSeconds);
      if (restText !== '' && rest === null) errors[`${p}.rest`] = `0–${L.maxRestSeconds}s`;
      return {
        ...(rx.id ? { id: rx.id } : {}),
        exerciseId: rx.exerciseId,
        targetSets: sets ?? 0,
        targetRepsMin: min ?? 0,
        targetRepsMax: max ?? 0,
        targetRpe: rpe,
        restSeconds: rest,
      };
    });
    workouts.push({
      ...(day.id ? { id: day.id } : {}),
      weekNumber: day.weekNumber,
      dayNumber: day.dayNumber,
      name: day.name.trim(),
      exercises,
    });
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  workouts.sort((a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber);
  return {
    ok: true,
    input: { name: d.name.trim(), description: d.description.trim() || null, durationWeeks: d.durationWeeks, workouts },
  };
}

/** Stable fingerprint for dirty checks (ignores local keys). */
export const fingerprint = (d: ProgramDraft): string =>
  JSON.stringify({
    name: d.name,
    description: d.description,
    durationWeeks: d.durationWeeks,
    days: [...d.days]
      .sort((a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber)
      .map((day) => ({
        id: day.id,
        weekNumber: day.weekNumber,
        dayNumber: day.dayNumber,
        name: day.name,
        exercises: day.exercises.map((r) => [r.id, r.exerciseId, r.sets, r.repsMin, r.repsMax, r.rpe, r.rest]),
      })),
  });
