import { setWeightForRir, stimulusBand } from './calculators';
import type { StimulusBand } from './calculators';
import type { DecimalString } from './common';
import type { MuscleGroup } from './enums';

/** Muscles drawn on the 2D map. FULL_BODY is a tag, not a region, so it is never counted. */
export const MAPPED_MUSCLES = ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'CORE', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES'] as const satisfies readonly MuscleGroup[];
export type MappedMuscle = (typeof MAPPED_MUSCLES)[number];

export const MUSCLE_ROLE_WEIGHT = { PRIMARY: 1, SECONDARY: 0.5 } as const;
/** Effort assumed when a set carries neither RIR nor RPE: counted as a full hard set. */
export const DEFAULT_RIR = 2;
export const MUSCLE_WINDOWS = [7, 14, 30] as const;
export const MAX_ANALYTICS_DAYS = 90;

/** One logged working set (warm-ups already removed) with the exercise's muscle tags. */
export interface AnalyticsSet {
  sessionId: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  rpe: number | null;
  muscles: { muscle: MuscleGroup; role: 'PRIMARY' | 'SECONDARY' }[];
}

export interface MuscleStatDto {
  muscle: MappedMuscle;
  /** Sets weighted by role only (primary 1, secondary 0.5). */
  hardSets: number;
  /** hardSets further weighted by proximity to failure (setWeightForRir). */
  effectiveSets: number;
  /** effectiveSets scaled to 7 days; the band is judged on this. */
  weeklyEffectiveSets: number;
  /** Distinct sessions that trained the muscle. */
  sessions: number;
  /** sessions scaled to 7 days. */
  perWeek: number;
  /** weight × reps × role weight. */
  tonnageKg: DecimalString;
  band: StimulusBand;
}

export interface MuscleAnalyticsDto {
  from: string;
  to: string;
  days: number;
  sessionCount: number;
  totalHardSets: number;
  muscles: MuscleStatDto[];
}

/** RIR from the set: logged RIR wins, else 10 − RPE, else DEFAULT_RIR. */
export function effectiveRir(rir: number | null, rpe: number | null): number {
  if (rir !== null) return rir;
  if (rpe !== null) return Math.max(0, 10 - rpe);
  return DEFAULT_RIR;
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Pure per-muscle volume, stimulus and frequency over a `days`-long window. Every mapped muscle is returned. */
export function muscleAnalytics(sets: readonly AnalyticsSet[], days: number): Omit<MuscleAnalyticsDto, 'from' | 'to' | 'days'> {
  const acc = new Map<MappedMuscle, { hard: number; eff: number; tonnage: number; sessions: Set<string> }>();
  for (const m of MAPPED_MUSCLES) acc.set(m, { hard: 0, eff: 0, tonnage: 0, sessions: new Set() });
  const sessions = new Set<string>();
  for (const s of sets) {
    sessions.add(s.sessionId);
    const effort = setWeightForRir(effectiveRir(s.rir, s.rpe));
    for (const tag of s.muscles) {
      const row = acc.get(tag.muscle as MappedMuscle);
      if (!row) continue;
      const w = MUSCLE_ROLE_WEIGHT[tag.role];
      row.hard += w;
      row.eff += w * effort;
      row.tonnage += s.weightKg * s.reps * w;
      row.sessions.add(s.sessionId);
    }
  }
  const scale = 7 / Math.max(1, days);
  const muscles: MuscleStatDto[] = MAPPED_MUSCLES.map((muscle) => {
    const a = acc.get(muscle)!;
    const weekly = r1(a.eff * scale);
    return {
      muscle,
      hardSets: r1(a.hard),
      effectiveSets: r1(a.eff),
      weeklyEffectiveSets: weekly,
      sessions: a.sessions.size,
      perWeek: r1(a.sessions.size * scale),
      tonnageKg: String(Math.round(a.tonnage)),
      band: stimulusBand(weekly),
    };
  });
  return { sessionCount: sessions.size, totalHardSets: r1(muscles.reduce((s, m) => s + m.hardSets, 0)), muscles };
}
