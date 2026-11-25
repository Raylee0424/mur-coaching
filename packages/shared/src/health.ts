import type { IsoDateString } from './common';

// ─── Step goals and daily health metrics ───

export const HealthSource = { MANUAL: 'MANUAL', APPLE_HEALTH: 'APPLE_HEALTH', HEALTH_CONNECT: 'HEALTH_CONNECT', CSV: 'CSV' } as const;
export type HealthSource = (typeof HealthSource)[keyof typeof HealthSource];

export const HEALTH_SOURCE_LABELS: Record<HealthSource, string> = {
  MANUAL: 'Manual entry',
  APPLE_HEALTH: 'Apple Health',
  HEALTH_CONNECT: 'Health Connect',
  CSV: 'CSV import',
};

export const HEALTH_LIMITS = {
  minGoal: 1000,
  maxGoal: 100_000,
  defaultGoal: 10_000,
  maxSteps: 200_000,
  maxSleepMinutes: 1440,
  minHrvMs: 1,
  maxHrvMs: 300,
  minRestingHr: 20,
  maxRestingHr: 250,
  /** One sync call; a year of daily rows fits. */
  maxBatch: 400,
  /** Oldest accepted day for imports. */
  maxAgeDays: 3650,
  defaultDays: 30,
  minDays: 7,
  maxDays: 90,
} as const;

export interface HealthMetricInput {
  date: string;
  steps?: number | null;
  sleepMinutes?: number | null;
  hrvMs?: number | null;
  restingHr?: number | null;
}

export interface SyncHealthMetricsRequest {
  source: HealthSource;
  entries: HealthMetricInput[];
}

export interface SyncHealthMetricsResponse {
  upserted: number;
}

export interface SaveStepGoalRequest {
  dailySteps: number;
}

/** One calendar day merged across sources. Steps take the highest source so two devices never double count. */
export interface HealthDayDto {
  date: string;
  steps: number | null;
  sleepMinutes: number | null;
  hrvMs: number | null;
  restingHr: number | null;
  sources: HealthSource[];
}

export interface HealthOverviewDto {
  dailyStepGoal: number;
  today: HealthDayDto;
  /** Sum of the 7 days ending today ÷ 7 (a missing day counts as 0). Null with no step data in the window. */
  avg7Steps: number | null;
  /** Consecutive days at or over the goal, ending today, or yesterday while today is still short. */
  streakDays: number;
  remainingToday: number;
  /** Newest first, `days` long, only days with data. */
  days: HealthDayDto[];
  lastSyncedAt: IsoDateString | null;
}

export interface StepDay {
  date: string;
  steps: number | null;
}

const DAY_MS = 86_400_000;
const shift = (iso: string, days: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Sum of the 7 days ending `today` ÷ 7. Null when none of them has steps. */
export function stepAverage7(days: readonly StepDay[], today: string): number | null {
  const from = shift(today, -6);
  const window = days.filter((d) => d.date >= from && d.date <= today && d.steps !== null);
  if (window.length === 0) return null;
  return Math.round(window.reduce((s, d) => s + (d.steps ?? 0), 0) / 7);
}

/** Days in a row at or over `goal`, ending today; today only counts once it is met, so a short day so far never breaks it. */
export function stepStreak(days: readonly StepDay[], goal: number, today: string): number {
  const met = new Set(days.filter((d) => (d.steps ?? 0) >= goal).map((d) => d.date));
  let cursor = met.has(today) ? today : shift(today, -1);
  let streak = 0;
  while (met.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}

/** Merge rows of one day from several sources: highest steps, longest sleep, mean HRV and resting HR. */
export function mergeHealthDay(date: string, rows: readonly (Omit<HealthMetricInput, 'date'> & { source: HealthSource })[]): HealthDayDto {
  const pick = (k: 'steps' | 'sleepMinutes'): number | null => {
    const v = rows.map((r) => r[k]).filter((x): x is number => typeof x === 'number');
    return v.length ? Math.max(...v) : null;
  };
  const mean = (k: 'hrvMs' | 'restingHr'): number | null => {
    const v = rows.map((r) => r[k]).filter((x): x is number => typeof x === 'number');
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  return { date, steps: pick('steps'), sleepMinutes: pick('sleepMinutes'), hrvMs: mean('hrvMs'), restingHr: mean('restingHr'), sources: [...new Set(rows.map((r) => r.source))] };
}
