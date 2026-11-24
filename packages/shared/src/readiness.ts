import type { DecimalString, IsoDateString } from './common';

// ─── Readiness survey ───

export const READINESS_LIMITS = { minScale: 1, maxScale: 5, minSleepHours: 0, maxSleepHours: 16, maxNote: 280, historyDays: 14 } as const;

export interface ReadinessInput {
  /** 1 poor – 5 restorative. */
  sleepQuality: number;
  sleepHours?: number | null;
  /** 1 fresh – 5 very sore. */
  soreness: number;
  /** 1 calm – 5 very stressed. */
  stress: number;
  /** 1 flat – 5 eager. */
  motivation: number;
}

/**
 * 0–100 readiness. Weights: sleep quality 30%, sleep hours 10% (8 h+ full, 4 h or less none), soreness 25%,
 * stress 20%, motivation 15%. Without hours, sleep quality carries the full 40%.
 */
export function readinessScore(i: ReadinessInput): number {
  const up = (v: number): number => (v - 1) / 4;
  const down = (v: number): number => (5 - v) / 4;
  const hours = i.sleepHours === null || i.sleepHours === undefined ? null : Math.min(1, Math.max(0, (i.sleepHours - 4) / 4));
  const sleep = hours === null ? up(i.sleepQuality) * 0.4 : up(i.sleepQuality) * 0.3 + hours * 0.1;
  return Math.round((sleep + down(i.soreness) * 0.25 + down(i.stress) * 0.2 + up(i.motivation) * 0.15) * 100);
}

export type ReadinessBand = 'READY' | 'MODERATE' | 'LOW';
export const readinessBand = (score: number): ReadinessBand => (score >= 75 ? 'READY' : score >= 50 ? 'MODERATE' : 'LOW');
export const READINESS_BAND_LABELS: Record<ReadinessBand, string> = { READY: 'Ready to push', MODERATE: 'Train as planned', LOW: 'Auto-regulate today' };

export interface ReadinessDto extends Required<Omit<ReadinessInput, 'sleepHours'>> {
  date: string;
  sleepHours: DecimalString | null;
  score: number;
  note: string | null;
  updatedAt: IsoDateString;
}

export interface SaveReadinessRequest extends ReadinessInput {
  date: string;
  note?: string | null;
}

export interface ReadinessHistoryDto {
  today: ReadinessDto | null;
  /** Newest first, `historyDays` days. */
  recent: ReadinessDto[];
}

// ─── Cycle context (owner-only, encrypted at rest) ───

export const CyclePhase = { MENSTRUAL: 'MENSTRUAL', FOLLICULAR: 'FOLLICULAR', OVULATORY: 'OVULATORY', LUTEAL: 'LUTEAL' } as const;
export type CyclePhase = (typeof CyclePhase)[keyof typeof CyclePhase];

export const CYCLE_PHASE_META: Record<CyclePhase, { label: string; cue: string }> = {
  MENSTRUAL: { label: 'Menstrual', cue: 'Auto-regulate RIR' },
  FOLLICULAR: { label: 'Follicular', cue: 'Rising recovery' },
  OVULATORY: { label: 'Ovulatory window', cue: 'High force output' },
  LUTEAL: { label: 'Luteal', cue: 'Steady effort cap' },
};

export const CYCLE_SYMPTOMS = ['CRAMPS', 'FATIGUE', 'BLOATING', 'HEADACHE', 'LOW_MOOD', 'HIGH_ENERGY'] as const;
export type CycleSymptom = (typeof CYCLE_SYMPTOMS)[number];
export const CYCLE_SYMPTOM_LABELS: Record<CycleSymptom, string> = {
  CRAMPS: 'Cramps',
  FATIGUE: 'Fatigue',
  BLOATING: 'Bloating',
  HEADACHE: 'Headache',
  LOW_MOOD: 'Low mood',
  HIGH_ENERGY: 'High energy',
};

export const CYCLE_LIMITS = { minLength: 21, maxLength: 45, defaultLength: 28, maxNote: 500, historyDays: 120 } as const;

/** Decrypted day entry. Never leaves the owner's own routes. */
export interface CycleEntryDto {
  date: string;
  periodStart: boolean;
  /** Set on period-start days; later starts override earlier ones. */
  cycleLengthDays: number | null;
  symptoms: CycleSymptom[];
  note: string | null;
}

export interface SaveCycleEntryRequest {
  date: string;
  periodStart: boolean;
  cycleLengthDays?: number | null;
  symptoms: CycleSymptom[];
  note?: string | null;
}

export interface CycleSummary {
  phase: CyclePhase;
  /** 1 = first day of the latest period start. */
  dayOfCycle: number;
  cycleLengthDays: number;
  /** Past the expected length: the next start has not been logged. */
  overdue: boolean;
}

export interface CycleContextDto {
  /** False when the server has no encryption key: logging is unavailable. */
  configured: boolean;
  sharedWithCoach: boolean;
  summary: CycleSummary | null;
  entries: CycleEntryDto[];
}

/** The only cycle data a coach can ever read, and only after the client shares it. */
export interface CoachCycleSummaryDto {
  phase: CyclePhase;
  dayOfCycle: number;
}

/**
 * Phase for a cycle day. Ovulation is estimated at length − 14; the window is that day ±1.
 * Days 1–5 menstrual; luteal runs to the end (and beyond, flagged overdue).
 */
export function cyclePhase(dayOfCycle: number, cycleLengthDays: number): CyclePhase {
  const ovulation = cycleLengthDays - 14;
  if (dayOfCycle <= 5) return 'MENSTRUAL';
  if (dayOfCycle < ovulation - 1) return 'FOLLICULAR';
  if (dayOfCycle <= ovulation + 1) return 'OVULATORY';
  return 'LUTEAL';
}

/** Summary from entries (any order) as of `today` (YYYY-MM-DD). Null without a period start on or before today. */
export function summarizeCycle(entries: readonly Pick<CycleEntryDto, 'date' | 'periodStart' | 'cycleLengthDays'>[], today: string): CycleSummary | null {
  const starts = entries.filter((e) => e.periodStart && e.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const latest = starts[0];
  if (!latest) return null;
  const length = starts.find((s) => s.cycleLengthDays !== null)?.cycleLengthDays ?? CYCLE_LIMITS.defaultLength;
  const day = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latest.date}T00:00:00Z`)) / 86_400_000) + 1;
  return { phase: cyclePhase(day, length), dayOfCycle: day, cycleLengthDays: length, overdue: day > length };
}
