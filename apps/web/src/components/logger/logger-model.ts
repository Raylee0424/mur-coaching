import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { CreateWorkoutLogRequest, ExerciseLogInput, SwapReason, WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { toNumber } from '@/lib/format';
import { displayToKg, kgToDisplay, unitLabel } from '@/lib/units';

/** Draft values stay strings while editing so half-typed numbers are never mangled. */
export interface DraftSet {
  key: string;
  reps: string;
  /** In the draft's display unit (kg or lb); converted to kg on submit. */
  weight: string;
  rpe: string;
  isWarmup: boolean;
}

export interface DraftExercise {
  key: string;
  exerciseId: string;
  /** Prescription this exercise fulfils; lets the engine evaluate the new log. */
  workoutExerciseId?: string;
  /** Set when the client swapped away from the prescribed exercise; `undo` restores it. */
  swap?: { fromExerciseId: string; fromWorkoutExerciseId?: string; reason: SwapReason; note: string };
  sets: DraftSet[];
}

export interface DraftLog {
  /** `datetime-local` value, browser-local time. */
  performedAtLocal: string;
  /** Unit the weights are typed in. */
  unit: WeightUnit;
  notes: string;
  assignmentId?: string;
  workoutId?: string;
  exercises: DraftExercise[];
}

export type DraftErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true; request: CreateWorkoutLogRequest }
  | { ok: false; errors: DraftErrors };

let keySeq = 0;
const nextKey = (): string => `k${++keySeq}`;

const pad = (n: number): string => String(n).padStart(2, '0');

/** `YYYY-MM-DDTHH:mm` in the date's local time (the `datetime-local` format). */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function blankSet(): DraftSet {
  return { key: nextKey(), reps: '', weight: '', rpe: '', isWarmup: false };
}

export function blankExercise(): DraftExercise {
  return { key: nextKey(), exerciseId: '', sets: [blankSet()] };
}

export function emptyDraft(performedAtLocal: string, unit: WeightUnit): DraftLog {
  return { performedAtLocal, unit, notes: '', exercises: [blankExercise()] };
}

/** Copies exercises, set values and prescription links from a previous session. */
export function fromLastLog(log: WorkoutLogDto, performedAtLocal: string, unit: WeightUnit): DraftLog {
  return {
    performedAtLocal,
    unit,
    notes: '',
    ...(log.assignmentId ? { assignmentId: log.assignmentId } : {}),
    ...(log.workoutId ? { workoutId: log.workoutId } : {}),
    exercises: log.exerciseLogs.map((exerciseLog) => ({
      key: nextKey(),
      exerciseId: exerciseLog.exerciseId,
      ...(exerciseLog.workoutExerciseId ? { workoutExerciseId: exerciseLog.workoutExerciseId } : {}),
      sets: exerciseLog.sets.map((set) => ({
        key: nextKey(),
        reps: String(set.reps),
        weight: String(kgToDisplay(toNumber(set.weightKg), unit)),
        rpe: set.rpe === null ? '' : String(toNumber(set.rpe)),
        isWarmup: set.isWarmup,
      })),
    })),
  };
}

// ── Immutable edits ──────────────────────────────────────────────────────────

export function addExercise(draft: DraftLog): DraftLog {
  return { ...draft, exercises: [...draft.exercises, blankExercise()] };
}

export function removeExercise(draft: DraftLog, exerciseKey: string): DraftLog {
  return { ...draft, exercises: draft.exercises.filter((e) => e.key !== exerciseKey) };
}

/** Starting weight from onboarding (kg). */
export interface Baseline {
  weightKg: number;
  reps: number | null;
}

/**
 * Picking a different exercise drops the prescription link (it no longer matches). When the sets are
 * still blank and the client has a starting weight for the lift, the sets are prefilled from it.
 */
export function setExerciseId(draft: DraftLog, exerciseKey: string, exerciseId: string, baseline?: Baseline): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => {
    if (exercise.exerciseId === exerciseId) return exercise;
    const blank = exercise.sets.every((s) => s.weight.trim() === '' && s.reps.trim() === '');
    const sets =
      blank && baseline
        ? exercise.sets.map((s) => ({
            ...s,
            weight: String(kgToDisplay(baseline.weightKg, draft.unit)),
            reps: baseline.reps === null ? s.reps : String(baseline.reps),
          }))
        : exercise.sets;
    return { key: exercise.key, exerciseId, sets };
  });
}

/**
 * Swap to an alternative mid-session. The prescription link is dropped (it no longer matches) but kept
 * on the swap so `undoSwap` can restore it. Swapping twice still records the originally prescribed lift.
 */
export function swapExercise(
  draft: DraftLog,
  exerciseKey: string,
  toExerciseId: string,
  reason: SwapReason,
  note: string,
): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => {
    const fromExerciseId = exercise.swap?.fromExerciseId ?? exercise.exerciseId;
    const fromWorkoutExerciseId = exercise.swap?.fromWorkoutExerciseId ?? exercise.workoutExerciseId;
    if (!fromExerciseId || toExerciseId === fromExerciseId) return exercise;
    return {
      key: exercise.key,
      exerciseId: toExerciseId,
      swap: { fromExerciseId, ...(fromWorkoutExerciseId ? { fromWorkoutExerciseId } : {}), reason, note: note.trim() },
      sets: exercise.sets,
    };
  });
}

export function undoSwap(draft: DraftLog, exerciseKey: string): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => {
    if (!exercise.swap) return exercise;
    const { fromExerciseId, fromWorkoutExerciseId } = exercise.swap;
    return {
      key: exercise.key,
      exerciseId: fromExerciseId,
      ...(fromWorkoutExerciseId ? { workoutExerciseId: fromWorkoutExerciseId } : {}),
      sets: exercise.sets,
    };
  });
}

/** New set starts as a copy of the previous one (minus warm-up flag). */
export function addSet(draft: DraftLog, exerciseKey: string): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => {
    const last = exercise.sets[exercise.sets.length - 1];
    const next: DraftSet = last ? { ...last, key: nextKey(), isWarmup: false } : blankSet();
    return { ...exercise, sets: [...exercise.sets, next] };
  });
}

export function removeSet(draft: DraftLog, exerciseKey: string, setKey: string): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.filter((s) => s.key !== setKey),
  }));
}

export function patchSet(
  draft: DraftLog,
  exerciseKey: string,
  setKey: string,
  patch: Partial<Omit<DraftSet, 'key'>>,
): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)),
  }));
}

function mapExercise(draft: DraftLog, key: string, fn: (e: DraftExercise) => DraftExercise): DraftLog {
  return { ...draft, exercises: draft.exercises.map((e) => (e.key === key ? fn(e) : e)) };
}

// ── Validation (mirrors the API DTO via WORKOUT_LOG_LIMITS) ──────────────────

const WHOLE = /^\d+$/;
const DECIMAL_2 = /^\d+(\.\d{1,2})?$/;
const DECIMAL_1 = /^\d+(\.\d)?$/;

export function validateDraft(draft: DraftLog, now: Date): ValidationResult {
  const errors: DraftErrors = {};
  const L = WORKOUT_LOG_LIMITS;

  const performedAt = draft.performedAtLocal ? new Date(draft.performedAtLocal) : null;
  if (!performedAt || Number.isNaN(performedAt.getTime())) {
    errors['performedAt'] = 'Choose a date and time.';
  } else if (performedAt.getTime() > now.getTime()) {
    errors['performedAt'] = 'The session cannot be in the future.';
  }

  if (draft.exercises.length < 1) errors['exercises'] = 'Add at least one exercise.';
  if (draft.exercises.length > L.maxExercises) errors['exercises'] = `At most ${L.maxExercises} exercises.`;

  const exerciseLogs: ExerciseLogInput[] = [];
  draft.exercises.forEach((exercise, i) => {
    const base = `exercises.${i}`;
    if (!exercise.exerciseId) errors[`${base}.exerciseId`] = 'Choose an exercise.';
    if (exercise.sets.length < 1) errors[`${base}.sets`] = 'Add at least one set.';
    if (exercise.sets.length > L.maxSets) errors[`${base}.sets`] = `At most ${L.maxSets} sets.`;

    const sets: ExerciseLogInput['sets'] = [];
    exercise.sets.forEach((set, j) => {
      const key = `${base}.sets.${j}`;
      const reps = set.reps.trim();
      const weight = set.weight.trim();
      const weightKg = displayToKg(Number(weight), draft.unit);
      const rpe = set.rpe.trim();

      if (!WHOLE.test(reps) || Number(reps) > L.maxReps) errors[`${key}.reps`] = `Whole number, 0–${L.maxReps}.`;
      if (!DECIMAL_2.test(weight) || weightKg > L.maxWeightKg) {
        const max = kgToDisplay(L.maxWeightKg, draft.unit);
        errors[`${key}.weight`] = `0–${Math.floor(max)} ${unitLabel(draft.unit)}, up to 2 decimals.`;
      }
      if (rpe !== '' && (!DECIMAL_1.test(rpe) || Number(rpe) < L.rpeMin || Number(rpe) > L.rpeMax)) {
        errors[`${key}.rpe`] = `${L.rpeMin}–${L.rpeMax}, up to 1 decimal.`;
      }

      sets.push({
        reps: Number(reps),
        weightKg,
        ...(rpe !== '' ? { rpe: Number(rpe) } : {}),
        ...(set.isWarmup ? { isWarmup: true } : {}),
      });
    });

    if (exercise.swap && exercise.swap.note.length > 200) errors[`${base}.swap`] = 'Swap note: at most 200 characters.';
    exerciseLogs.push({
      exerciseId: exercise.exerciseId,
      ...(exercise.workoutExerciseId ? { workoutExerciseId: exercise.workoutExerciseId } : {}),
      ...(exercise.swap
        ? {
            swappedFromExerciseId: exercise.swap.fromExerciseId,
            swapReason: exercise.swap.reason,
            ...(exercise.swap.note ? { swapNote: exercise.swap.note } : {}),
          }
        : {}),
      sets,
    });
  });

  if (Object.keys(errors).length > 0 || !performedAt) return { ok: false, errors };

  const notes = draft.notes.trim();
  return {
    ok: true,
    request: {
      ...(draft.assignmentId ? { assignmentId: draft.assignmentId } : {}),
      ...(draft.workoutId ? { workoutId: draft.workoutId } : {}),
      performedAt: performedAt.toISOString(),
      ...(notes ? { notes } : {}),
      exerciseLogs,
    },
  };
}

// ── Set-by-set flow ──────────────────────────────────────────────────────────

/** Numbers behind the three steppers, in the draft's display unit. */
export interface StepValues {
  weight: number;
  reps: number;
  rpe: number;
}

export interface PlanTarget {
  weightKg: number | null;
  repsMin: number | null;
  repsMax: number | null;
  rpe: number | null;
}

/** What the coach (or the last session) asked for, per draft exercise key. */
export interface ExercisePlan {
  name: string;
  /** Prescribed set count; 0 = freeform (open-ended). */
  plannedSets: number;
  restSeconds: number | null;
  target: PlanTarget | null;
  /** Values of the session being repeated, one entry per set. */
  previous: StepValues[];
  /** Weight stepper size in the display unit. */
  weightStep: number;
  /** Plan before a swap, so Undo can restore it. */
  original?: ExercisePlan;
}

export type Plans = Record<string, ExercisePlan>;

/** The logger asks for RPE 6–10; the API itself accepts 1–10 (WORKOUT_LOG_LIMITS). */
export const LOGGER_RPE = { min: 6, max: 10, step: 0.5 } as const;
export const RPE_ERROR = 'RPE must be between 6.0 and 10.0 to log this set.';

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** One stepper press: rounds away float noise (0.1 + 0.2) and clamps to [min, max]. */
export function stepValue(value: number, delta: number, min: number, max: number): number {
  return r2(Math.min(max, Math.max(min, value + delta)));
}

export function rpeError(rpe: number | null): string | null {
  return rpe === null || rpe < LOGGER_RPE.min || rpe > LOGGER_RPE.max ? RPE_ERROR : null;
}

/** Weight step in the display unit from the exercise's kg increment (lb snaps to 2.5 lb multiples). */
export function weightStepFor(incrementKg: number, unit: WeightUnit): number {
  if (unit === 'KG') return incrementKg > 0 ? r2(incrementKg) : 2.5;
  const lb = kgToDisplay(incrementKg, unit);
  return Math.max(2.5, Math.round(lb / 2.5) * 2.5);
}

export function formatStepValue(kind: 'weight' | 'reps' | 'rpe', value: number): string {
  if (kind === 'reps') return String(Math.round(value));
  if (kind === 'rpe') return value.toFixed(1);
  return String(r2(value));
}

/** "6–8", or "5" when both bounds agree. */
export function formatReps(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const lo = min ?? max ?? 0;
  const hi = max ?? min ?? 0;
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

/** "157.5 kg × 5 @ RPE 8.5"; omits what the target leaves open. */
export function formatTargetLine(
  t: { weightKg: number | null; repsMin: number | null; repsMax: number | null; rpe: number | null },
  unit: WeightUnit,
): string {
  const reps = formatReps(t.repsMin, t.repsMax);
  const weight = t.weightKg === null ? null : `${formatStepValue('weight', kgToDisplay(t.weightKg, unit))} ${unitLabel(unit)}`;
  let line = '';
  if (weight && reps) line = `${weight} × ${reps}`;
  else if (weight) line = weight;
  else if (reps) line = `${reps} reps`;
  if (t.rpe !== null) line = line ? `${line} @ RPE ${t.rpe.toFixed(1)}` : `RPE ${t.rpe.toFixed(1)}`;
  return line;
}

export function setValuesOf(set: DraftSet): StepValues {
  return { weight: Number(set.weight), reps: Number(set.reps), rpe: set.rpe === '' ? 8 : Number(set.rpe) };
}

/**
 * What the steppers show for the next set: the previous logged set, else the repeated session's set,
 * else the target (lower rep bound), else the starting weight, else a neutral 5 reps at RPE 8.
 */
export function nextSetDefaults(
  plan: ExercisePlan | undefined,
  logged: DraftSet[],
  unit: WeightUnit,
  baseline?: Baseline,
): StepValues {
  const last = logged[logged.length - 1];
  if (last) return setValuesOf(last);
  const index = logged.length;
  const prev = plan?.previous[index] ?? plan?.previous[plan.previous.length - 1];
  if (prev) return prev;
  const t = plan?.target;
  if (t && (t.weightKg !== null || t.repsMin !== null || t.repsMax !== null)) {
    return {
      weight: t.weightKg === null ? 0 : kgToDisplay(t.weightKg, unit),
      reps: t.repsMin ?? t.repsMax ?? 5,
      rpe: t.rpe ?? 8,
    };
  }
  if (baseline) return { weight: kgToDisplay(baseline.weightKg, unit), reps: baseline.reps ?? 5, rpe: 8 };
  return { weight: 0, reps: 5, rpe: 8 };
}

/** "SET 2 OF 3", "SET 4 · EXTRA" past the prescription, "SET 2" when freeform. */
export function setLabel(plan: ExercisePlan | undefined, loggedCount: number): string {
  const n = loggedCount + 1;
  const planned = plan?.plannedSets ?? 0;
  if (planned <= 0) return `SET ${n}`;
  return n > planned ? `SET ${n} · EXTRA` : `SET ${n} OF ${planned}`;
}

/** Header eyebrow: set position plus what to aim for. */
export function eyebrow(plan: ExercisePlan | undefined, loggedCount: number, unit: WeightUnit): string {
  const label = setLabel(plan, loggedCount);
  if (plan?.target) {
    const line = formatTargetLine(plan.target, unit);
    if (line) return `${label} · TARGET: ${line}`;
  }
  const prev = plan?.previous[loggedCount] ?? plan?.previous[(plan?.previous.length ?? 0) - 1];
  if (prev) {
    const line = `${formatStepValue('weight', prev.weight)} ${unitLabel(unit)} × ${prev.reps} @ RPE ${prev.rpe.toFixed(1)}`;
    return `${label} · LAST TIME: ${line}`;
  }
  return label;
}

export interface ExerciseSource {
  id: string;
  name: string;
  loadIncrementKg: number;
}

/** A plan for an exercise picked freely (or swapped to). */
export function freeformPlan(source: ExerciseSource, unit: WeightUnit, target: PlanTarget | null = null): ExercisePlan {
  return {
    name: source.name,
    plannedSets: 0,
    restSeconds: null,
    target,
    previous: [],
    weightStep: weightStepFor(source.loadIncrementKg, unit),
  };
}

export interface FlowStart {
  draft: DraftLog;
  plans: Plans;
}

export interface TodayWorkoutInput {
  id: string;
  assignmentId: string;
  exercises: Array<{
    workoutExerciseId: string;
    exerciseId: string;
    name: string;
    sets: number;
    restSeconds: number | null;
    target: { weightKg: string | number | null; repsMin: number | null; repsMax: number | null; rpe: string | number | null };
  }>;
}

/** Today's prescription as an empty draft (sets are logged one by one) plus a plan per exercise. */
export function startFromToday(
  workout: TodayWorkoutInput,
  incrementKg: Record<string, number>,
  performedAtLocal: string,
  unit: WeightUnit,
): FlowStart {
  const plans: Plans = {};
  const exercises: DraftExercise[] = workout.exercises.map((e) => {
    const key = nextKey();
    plans[key] = {
      name: e.name,
      plannedSets: e.sets,
      restSeconds: e.restSeconds,
      target: {
        weightKg: e.target.weightKg === null ? null : Number(e.target.weightKg),
        repsMin: e.target.repsMin,
        repsMax: e.target.repsMax,
        rpe: e.target.rpe === null ? null : Number(e.target.rpe),
      },
      previous: [],
      weightStep: weightStepFor(incrementKg[e.exerciseId] ?? 2.5, unit),
    };
    return { key, exerciseId: e.exerciseId, workoutExerciseId: e.workoutExerciseId, sets: [] };
  });
  return {
    draft: { performedAtLocal, unit, notes: '', assignmentId: workout.assignmentId, workoutId: workout.id, exercises },
    plans,
  };
}

/** Repeat a session: same exercises and prescription links, each set's numbers become the stepper defaults. */
export function startFromLastLog(
  log: WorkoutLogDto,
  incrementKg: Record<string, number>,
  performedAtLocal: string,
  unit: WeightUnit,
): FlowStart {
  const copy = fromLastLog(log, performedAtLocal, unit);
  const plans: Plans = {};
  const exercises = copy.exercises.map((e, i) => {
    const previous = e.sets.filter((s) => !s.isWarmup).map(setValuesOf);
    plans[e.key] = {
      name: log.exerciseLogs[i]?.exercise.name ?? '',
      plannedSets: previous.length,
      restSeconds: null,
      target: null,
      previous,
      weightStep: weightStepFor(incrementKg[e.exerciseId] ?? 2.5, unit),
    };
    return { ...e, sets: [] };
  });
  return { draft: { ...copy, exercises }, plans };
}

export function startFreeform(performedAtLocal: string, unit: WeightUnit): FlowStart {
  const draft = emptyDraft(performedAtLocal, unit);
  const first = draft.exercises[0];
  return { draft: { ...draft, exercises: first ? [{ ...first, sets: [] }] : [] }, plans: {} };
}

/** Logs the steppers' numbers as the next set of an exercise. */
export function commitSet(draft: DraftLog, exerciseKey: string, v: StepValues): DraftLog {
  return mapExercise(draft, exerciseKey, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, { key: nextKey(), weight: String(v.weight), reps: String(v.reps), rpe: String(v.rpe), isWarmup: false }],
  }));
}

/** Rewrites one logged set from edited numbers (keeps the warm-up flag). */
export function editSetValues(draft: DraftLog, exerciseKey: string, setKey: string, v: StepValues): DraftLog {
  return patchSet(draft, exerciseKey, setKey, { weight: String(v.weight), reps: String(v.reps), rpe: String(v.rpe) });
}

/** Exercises with no logged sets are skipped on finish. */
export function dropEmptyExercises(draft: DraftLog): DraftLog {
  return { ...draft, exercises: draft.exercises.filter((e) => e.sets.length > 0) };
}

export function countSets(draft: DraftLog): number {
  return draft.exercises.reduce((n, e) => n + e.sets.length, 0);
}

// ── Rest timer ───────────────────────────────────────────────────────────────

/** "02:45", or "1:02:45" past an hour. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export interface RestClock {
  seconds: number;
  /** `down` counts to the prescribed rest, `up` counts time since the last set. */
  mode: 'down' | 'up';
  done: boolean;
}

export function restClock(startedAtMs: number | null, nowMs: number, restSeconds: number | null): RestClock {
  if (startedAtMs === null) return { seconds: restSeconds ?? 0, mode: restSeconds === null ? 'up' : 'down', done: false };
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  if (restSeconds === null) return { seconds: elapsed, mode: 'up', done: false };
  const left = restSeconds - elapsed;
  return { seconds: Math.max(0, left), mode: 'down', done: left <= 0 };
}

// ── RPE guide ────────────────────────────────────────────────────────────────

export interface RpeRow {
  rpe: number;
  note: string;
  tone: 'rose' | 'amber' | 'primary' | 'emerald' | 'ink';
}

const RPE_BASE: RpeRow[] = [
  { rpe: 10, note: 'Max effort. 0 reps left in the tank.', tone: 'rose' },
  { rpe: 9, note: 'Very hard. 1 rep left in the tank.', tone: 'amber' },
  { rpe: 8, note: '2 reps left in the tank.', tone: 'primary' },
  { rpe: 7, note: 'Moderate. 3 reps left, fast bar speed.', tone: 'emerald' },
  { rpe: 6, note: 'Warm-up or speed work. 4+ reps left.', tone: 'ink' },
];

const HALF_NOTES: Record<number, string> = {
  9.5: 'No more reps, but you could add a little load.',
  8.5: '1 definite rep left, maybe 2.',
  7.5: '2 to 3 reps left.',
  6.5: '3 to 4 reps left.',
};

/** The five anchor rows, plus the target row when it sits on a half point (so it can be marked). */
export function rpeGuideRows(target: number | null): RpeRow[] {
  const rows = [...RPE_BASE];
  if (target !== null && HALF_NOTES[target] && !rows.some((r) => r.rpe === target)) {
    rows.push({ rpe: target, note: HALF_NOTES[target] ?? '', tone: 'primary' });
    rows.sort((a, b) => b.rpe - a.rpe);
  }
  return rows;
}
