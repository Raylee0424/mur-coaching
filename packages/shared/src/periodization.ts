import type { DecimalString, IsoDateString } from './common';

export const PERIODIZATION_LIMITS = {
  maxMesocycles: 26,
  maxMicrocyclesPerMesocycle: 12,
  maxSports: 8,
  maxNameLength: 60,
  maxFocusLength: 120,
} as const;

/** A run of weeks inside a mesocycle that shares one intensity / volume intent. A deload is a microcycle. */
export interface MicrocycleInput {
  id?: string;
  label: string;
  startWeek: number;
  endWeek: number;
  isDeload: boolean;
  rpeMin?: number | null;
  rpeMax?: number | null;
  /** Volume change versus the block baseline, percent (a deload is negative). */
  volumeDeltaPct?: number | null;
}

/** A training block. Blocks never overlap; their microcycles stay inside them and never overlap. */
export interface MesocycleInput {
  id?: string;
  name: string;
  focus?: string | null;
  startWeek: number;
  endWeek: number;
  microcycles: MicrocycleInput[];
}

export interface MicrocycleDto {
  id: string;
  label: string;
  startWeek: number;
  endWeek: number;
  isDeload: boolean;
  rpeMin: DecimalString | null;
  rpeMax: DecimalString | null;
  volumeDeltaPct: number | null;
}

export interface MesocycleDto {
  id: string;
  name: string;
  focus: string | null;
  startWeek: number;
  endWeek: number;
  microcycles: MicrocycleDto[];
}

export interface SportCategoryDto {
  id: string;
  name: string;
  group: string;
}

/** First problem found, or null. Pure: the API and the builder run the same check. */
export function validatePeriodization(mesocycles: readonly MesocycleInput[], durationWeeks: number): string | null {
  const blocks = [...mesocycles].sort((a, b) => a.startWeek - b.startWeek);
  let previousEnd = 0;
  for (const m of blocks) {
    const label = `Mesocycle "${m.name}"`;
    if (!Number.isInteger(m.startWeek) || !Number.isInteger(m.endWeek) || m.startWeek < 1 || m.endWeek < m.startWeek) {
      return `${label}: weeks must run from a start week to a later or equal end week`;
    }
    if (m.endWeek > durationWeeks) return `${label}: ends after week ${durationWeeks}, the last week of the program`;
    if (m.startWeek <= previousEnd) return `${label}: overlaps the previous mesocycle`;
    previousEnd = m.endWeek;

    let microEnd = m.startWeek - 1;
    for (const c of [...m.microcycles].sort((a, b) => a.startWeek - b.startWeek)) {
      const cl = `${label}, microcycle "${c.label}"`;
      if (!Number.isInteger(c.startWeek) || !Number.isInteger(c.endWeek) || c.endWeek < c.startWeek) return `${cl}: end week is before the start week`;
      if (c.startWeek < m.startWeek || c.endWeek > m.endWeek) return `${cl}: must sit inside weeks ${m.startWeek}-${m.endWeek}`;
      if (c.startWeek <= microEnd) return `${cl}: overlaps another microcycle`;
      microEnd = c.endWeek;
      if (c.rpeMin != null && c.rpeMax != null && c.rpeMin > c.rpeMax) return `${cl}: RPE minimum is above the maximum`;
    }
  }
  return null;
}

/** The mesocycle (and microcycle) covering a week, for the week strip. */
export function blockForWeek<M extends { startWeek: number; endWeek: number; microcycles: readonly { startWeek: number; endWeek: number }[] }>(
  mesocycles: readonly M[],
  week: number,
): { meso: M; micro: M['microcycles'][number] | null } | null {
  const meso = mesocycles.find((m) => week >= m.startWeek && week <= m.endWeek);
  if (!meso) return null;
  return { meso, micro: meso.microcycles.find((c) => week >= c.startWeek && week <= c.endWeek) ?? null };
}

// ─────────────── Client groups ───────────────

export const CLIENT_GROUP_LIMITS = { maxName: 60, maxMembers: 200 } as const;

export interface ClientGroupDto {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: IsoDateString;
}

export interface SaveClientGroupRequest {
  name: string;
  memberIds: string[];
}

export interface GroupAssignRequest {
  programId: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
}

export interface GroupAssignOutcome {
  clientId: string;
  ok: boolean;
  error?: string;
}

// ─────────────── Read-only preview link ───────────────

/** Returned once when a link is created: the raw token is never stored. */
export interface ProgramShareDto {
  token: string;
}

export interface SharedProgramDto {
  name: string;
  description: string | null;
  durationWeeks: number;
  coachName: string;
  sports: SportCategoryDto[];
  mesocycles: MesocycleDto[];
  workouts: {
    weekNumber: number;
    dayNumber: number;
    name: string;
    exercises: { name: string; sets: number; repsMin: number; repsMax: number; rpe: DecimalString | null; restSeconds: number | null }[];
  }[];
}
