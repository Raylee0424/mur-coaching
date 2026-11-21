/**
 * Deterministic demo program + logged history. No randomness: every value is
 * spelled out so the future progression engine has known expected outcomes.
 */

export interface PrescriptionSeed {
  exercise: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rpe: number;
  restSeconds: number;
  /** Add one warm-up set (60% of working weight, 5 reps, no RPE). */
  warmup?: boolean;
}

export interface WorkoutSeed {
  dayNumber: number;
  name: string;
  exercises: readonly PrescriptionSeed[];
}

export const PROGRAM_NAME = 'Upper/Lower Strength Block';
export const PROGRAM_WEEKS = 4;

/** Same four training days every week; progression happens through load/reps. */
export const WORKOUT_TEMPLATE: readonly WorkoutSeed[] = [
  {
    dayNumber: 1,
    name: 'Upper A',
    exercises: [
      { exercise: 'Barbell Bench Press', sets: 4, repsMin: 6, repsMax: 8, rpe: 8, restSeconds: 150, warmup: true },
      { exercise: 'Barbell Row', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 120 },
      { exercise: 'Lat Pulldown', sets: 3, repsMin: 10, repsMax: 12, rpe: 8, restSeconds: 90 },
    ],
  },
  {
    dayNumber: 2,
    name: 'Lower A',
    exercises: [
      { exercise: 'Back Squat', sets: 4, repsMin: 5, repsMax: 7, rpe: 8, restSeconds: 180, warmup: true },
      { exercise: 'Romanian Deadlift', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 120 },
      { exercise: 'Standing Calf Raise', sets: 3, repsMin: 12, repsMax: 15, rpe: 8, restSeconds: 60 },
    ],
  },
  {
    dayNumber: 4,
    name: 'Upper B',
    exercises: [
      { exercise: 'Overhead Press', sets: 3, repsMin: 6, repsMax: 8, rpe: 8, restSeconds: 120, warmup: true },
      { exercise: 'Incline Dumbbell Press', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 90 },
      { exercise: 'Dumbbell Biceps Curl', sets: 3, repsMin: 10, repsMax: 12, rpe: 8, restSeconds: 60 },
      { exercise: 'Triceps Pushdown', sets: 3, repsMin: 10, repsMax: 12, rpe: 8, restSeconds: 60 },
    ],
  },
  {
    dayNumber: 5,
    name: 'Lower B',
    exercises: [
      { exercise: 'Leg Press', sets: 4, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 120 },
      { exercise: 'Hip Thrust', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 120 },
    ],
  },
];

type Week4<T> = readonly [T, T, T, T];

/** One lift's four sessions. `reps` is per-set reps when an array, else same for every set. */
export interface LiftHistory {
  weightKg: Week4<number>;
  reps: Week4<number | readonly number[]>;
  /** Same RPE on every working set of the session. */
  rpe: Week4<number>;
}

export interface ClientPlan {
  email: string;
  name: string;
  profile: {
    goals: string[];
    experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    daysPerWeek: number;
    trainingDays: number[];
    sessionLengthMin: number;
    limitations: string[];
    limitationsNote?: string;
  };
  history: Readonly<Record<string, LiftHistory>>;
}

/**
 * Alex: clean progressor. Final session of nearly every lift hits the top of
 * the rep range at RPE <= 8 → INCREASE_LOAD. Triceps Pushdown is the exception
 * (stuck at 10 reps, RPE ~8.5-9 → HOLD).
 */
const ALEX: ClientPlan = {
  email: 'demo.alex@coaching.demo',
  name: 'Alex Carter (Demo)',
  profile: {
    goals: ['Strength', 'Muscle'],
    experience: 'INTERMEDIATE',
    daysPerWeek: 4,
    trainingDays: [1, 2, 4, 5],
    sessionLengthMin: 75,
    limitations: ['None'],
  },
  history: {
    'Barbell Bench Press': { weightKg: [80, 80, 82.5, 82.5], reps: [7, 8, 6, 8], rpe: [8, 7.5, 8, 8] },
    'Barbell Row': { weightKg: [60, 60, 62.5, 62.5], reps: [9, 10, 8, 10], rpe: [8, 7.5, 8, 8] },
    'Lat Pulldown': { weightKg: [55, 55, 57.5, 57.5], reps: [11, 12, 10, 12], rpe: [8, 7.5, 8, 8] },
    'Back Squat': { weightKg: [100, 100, 105, 105], reps: [6, 7, 5, 7], rpe: [8, 7.5, 8, 8] },
    'Romanian Deadlift': { weightKg: [90, 90, 95, 95], reps: [9, 10, 8, 10], rpe: [8, 7.5, 8, 8] },
    'Standing Calf Raise': { weightKg: [60, 60, 65, 65], reps: [13, 15, 12, 15], rpe: [8, 7.5, 8, 8] },
    'Overhead Press': { weightKg: [45, 45, 47.5, 47.5], reps: [7, 8, 6, 8], rpe: [8, 7.5, 8, 8] },
    'Incline Dumbbell Press': { weightKg: [26, 26, 28, 28], reps: [9, 10, 8, 10], rpe: [8, 7.5, 8, 8] },
    'Dumbbell Biceps Curl': { weightKg: [15, 15, 15, 15], reps: [10, 11, 11, 12], rpe: [8, 8, 8, 8] },
    'Triceps Pushdown': { weightKg: [30, 30, 30, 30], reps: [10, 10, 10, 10], rpe: [8.5, 8.5, 9, 8.5] },
    'Leg Press': { weightKg: [160, 160, 170, 170], reps: [9, 10, 8, 10], rpe: [8, 7.5, 8, 8] },
    'Hip Thrust': { weightKg: [100, 100, 110, 110], reps: [9, 10, 8, 10], rpe: [8, 7.5, 8, 8] },
  },
};

/**
 * Jordan: Bench Press plateau — identical load/reps for 4 sessions, RPE >= 9
 * on the last 3 → DELOAD. Incline DB Press sits in the double-progression zone
 * (fixed 24 kg, reps creeping up, not every set at 10) → INCREASE_REPS.
 * Back Squat is flat-ish at RPE 8.5-9 (HOLD territory).
 */
const JORDAN: ClientPlan = {
  email: 'demo.jordan@coaching.demo',
  name: 'Jordan Lee (Demo)',
  profile: {
    goals: ['Powerlifting'],
    experience: 'ADVANCED',
    daysPerWeek: 4,
    trainingDays: [1, 2, 4, 5],
    sessionLengthMin: 90,
    limitations: ['Shoulders'],
    limitationsNote: 'Left shoulder gets cranky on heavy bench.',
  },
  history: {
    'Barbell Bench Press': { weightKg: [85, 85, 85, 85], reps: [7, 7, 7, 7], rpe: [8.5, 9, 9, 9.5] },
    'Incline Dumbbell Press': {
      weightKg: [24, 24, 24, 24],
      reps: [[8, 8, 8], [9, 8, 8], [9, 9, 8], [10, 9, 9]],
      rpe: [8, 8, 8, 8],
    },
    'Barbell Row': { weightKg: [70, 70, 72.5, 72.5], reps: [9, 10, 8, 9], rpe: [8, 8, 8, 8.5] },
    'Lat Pulldown': { weightKg: [50, 50, 52.5, 52.5], reps: [11, 12, 10, 11], rpe: [8, 7.5, 8, 8] },
    'Back Squat': { weightKg: [110, 110, 110, 110], reps: [5, 6, 6, 6], rpe: [8.5, 8.5, 8.5, 9] },
    'Romanian Deadlift': { weightKg: [100, 100, 105, 105], reps: [9, 10, 8, 9], rpe: [8, 8, 8, 8] },
    'Standing Calf Raise': { weightKg: [70, 70, 70, 75], reps: [13, 14, 15, 12], rpe: [8, 8, 8, 8] },
    'Overhead Press': { weightKg: [50, 50, 52.5, 52.5], reps: [7, 8, 6, 7], rpe: [8, 8, 8, 8.5] },
    'Dumbbell Biceps Curl': { weightKg: [14, 14, 14, 14], reps: [10, 11, 11, 11], rpe: [8, 8, 8, 8] },
    'Triceps Pushdown': { weightKg: [27.5, 27.5, 27.5, 30], reps: [11, 12, 12, 10], rpe: [8, 8, 8, 8] },
    'Leg Press': { weightKg: [180, 180, 190, 190], reps: [9, 10, 8, 9], rpe: [8, 8, 8, 8] },
    'Hip Thrust': { weightKg: [110, 110, 120, 120], reps: [9, 10, 8, 9], rpe: [8, 8, 8, 8] },
  },
};

export const CLIENT_PLANS: readonly ClientPlan[] = [ALEX, JORDAN];

/** Extra demo clients that exercise roster states. They reuse Alex's lift history. */
export interface ExtraClientSeed {
  plan: ClientPlan;
  status: 'ACTIVE' | 'PAUSED';
  /** Last program week with logged sessions. */
  lastLoggedWeek: number;
  /** Deterministic skips to produce low adherence. */
  skips?: (week: number, dayNumber: number) => boolean;
  autoApprove?: { maxKg: number };
  /** Per-client engine overrides on the coach-client link. */
  overrides?: { loadIncrementKg?: number; rpeCap?: number };
}

const asExtra = (email: string, name: string, profile: ClientPlan['profile']): ClientPlan => ({
  email,
  name,
  profile,
  history: ALEX.history,
});

export const EXTRA_CLIENTS: readonly ExtraClientSeed[] = [
  {
    // Still training, but skips about half of the sessions: low adherence; INCREASE_LOAD calls auto-approve.
    plan: asExtra('demo.riley@coaching.demo', 'Riley Brooks (Demo)', {
      goals: ['Muscle'],
      experience: 'BEGINNER',
      daysPerWeek: 4,
      trainingDays: [1, 2, 4, 5],
      sessionLengthMin: 60,
      limitations: ['None'],
    }),
    status: 'ACTIVE',
    lastLoggedWeek: 5,
    skips: (week, day) => week >= 2 && (week + day) % 2 === 0,
    autoApprove: { maxKg: 5 },
  },
  {
    // Went quiet after week 3: no session in over a week.
    plan: asExtra('demo.taylor@coaching.demo', 'Taylor Kim (Demo)', {
      goals: ['General fitness'],
      experience: 'INTERMEDIATE',
      daysPerWeek: 4,
      trainingDays: [1, 2, 4, 5],
      sessionLengthMin: 60,
      limitations: ['Knees'],
    }),
    status: 'ACTIVE',
    lastLoggedWeek: 3,
  },
  {
    // On hold (travelling). Carries per-client engine overrides, so the exercise library shows an override count.
    plan: asExtra('demo.casey@coaching.demo', 'Casey Nguyen (Demo)', {
      goals: ['Strength'],
      experience: 'INTERMEDIATE',
      daysPerWeek: 4,
      trainingDays: [1, 2, 4, 5],
      sessionLengthMin: 75,
      limitations: ['None'],
    }),
    status: 'PAUSED',
    lastLoggedWeek: 2,
    overrides: { loadIncrementKg: 1.25, rpeCap: 8.5 },
  },
];

/** Templates the coach can start from (not assigned to anyone). */
export const TEMPLATE_NAME = 'Full Body 3-Day Template';
export const TEMPLATE_WEEKS = 4;
export const TEMPLATE_DAYS: readonly WorkoutSeed[] = [
  {
    dayNumber: 1,
    name: 'Full Body A',
    exercises: [
      { exercise: 'Back Squat', sets: 3, repsMin: 5, repsMax: 8, rpe: 8, restSeconds: 150 },
      { exercise: 'Barbell Bench Press', sets: 3, repsMin: 6, repsMax: 8, rpe: 8, restSeconds: 120 },
      { exercise: 'Barbell Row', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 90 },
    ],
  },
  {
    dayNumber: 3,
    name: 'Full Body B',
    exercises: [
      { exercise: 'Romanian Deadlift', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 120 },
      { exercise: 'Overhead Press', sets: 3, repsMin: 6, repsMax: 8, rpe: 8, restSeconds: 120 },
      { exercise: 'Lat Pulldown', sets: 3, repsMin: 10, repsMax: 12, rpe: 8, restSeconds: 90 },
    ],
  },
  {
    dayNumber: 5,
    name: 'Full Body C',
    exercises: [
      { exercise: 'Leg Press', sets: 3, repsMin: 8, repsMax: 12, rpe: 8, restSeconds: 120 },
      { exercise: 'Incline Dumbbell Press', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 90 },
      { exercise: 'Hip Thrust', sets: 3, repsMin: 8, repsMax: 10, rpe: 8, restSeconds: 120 },
    ],
  },
];

export interface SetSeed {
  setNumber: number;
  reps: number;
  weightKg: number;
  rpe: number | null;
  isWarmup: boolean;
}

const roundToPlate = (kg: number): number => Math.round(kg / 2.5) * 2.5;

/** Expand one prescription + one week of a lift's history into concrete sets. */
export function buildSets(rx: PrescriptionSeed, lift: LiftHistory, weekIndex: number): SetSeed[] {
  const weightKg = lift.weightKg[weekIndex];
  const reps = lift.reps[weekIndex];
  const rpe = lift.rpe[weekIndex];
  if (weightKg === undefined || reps === undefined || rpe === undefined) {
    throw new Error(`Missing history for ${rx.exercise}, week index ${weekIndex}`);
  }

  const sets: SetSeed[] = [];
  if (rx.warmup) {
    sets.push({ setNumber: 1, reps: 5, weightKg: roundToPlate(weightKg * 0.6), rpe: null, isWarmup: true });
  }
  for (let i = 0; i < rx.sets; i++) {
    const setReps = typeof reps === 'number' ? reps : reps[i];
    if (setReps === undefined) throw new Error(`Missing reps for ${rx.exercise} set ${i + 1}`);
    sets.push({ setNumber: sets.length + 1, reps: setReps, weightKg, rpe, isWarmup: false });
  }
  return sets;
}
