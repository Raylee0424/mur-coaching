import { MUSCLE_GROUP_LABELS, MUSCLE_WINDOWS } from '@coaching/shared';
import type { MappedMuscle, MuscleStatDto } from '@coaching/shared';
import type { BadgeTone } from '@/components/ui/Badge';

export type MapView = 'volume' | 'frequency';
export type StatusKey = 'HIGH' | 'PRODUCTIVE' | 'MAINTAIN' | 'BELOW' | 'NONE' | 'FREQ_HIGH' | 'FREQ_OPTIMAL' | 'FREQ_ONCE' | 'FREQ_LOW';

export interface Status {
  key: StatusKey;
  label: string;
  /** SVG fill utility (ApexMetric tokens). */
  fill: string;
  tone: BadgeTone;
}

const S: Record<StatusKey, Status> = {
  HIGH: { key: 'HIGH', label: 'High · recovery-limited', fill: 'fill-rose', tone: 'red' },
  PRODUCTIVE: { key: 'PRODUCTIVE', label: 'Productive', fill: 'fill-primary', tone: 'signal' },
  MAINTAIN: { key: 'MAINTAIN', label: 'Maintain', fill: 'fill-emerald', tone: 'emerald' },
  BELOW: { key: 'BELOW', label: 'Below target', fill: 'fill-amber', tone: 'amber' },
  NONE: { key: 'NONE', label: 'Not trained', fill: 'fill-line-strong', tone: 'slate' },
  FREQ_HIGH: { key: 'FREQ_HIGH', label: '3+ per week', fill: 'fill-emerald', tone: 'emerald' },
  FREQ_OPTIMAL: { key: 'FREQ_OPTIMAL', label: '2–3 per week', fill: 'fill-primary', tone: 'signal' },
  FREQ_ONCE: { key: 'FREQ_ONCE', label: '1–2 per week', fill: 'fill-sky', tone: 'sky' },
  FREQ_LOW: { key: 'FREQ_LOW', label: 'Under 1 per week', fill: 'fill-amber', tone: 'amber' },
};

/** Volume view uses the stimulus band on weekly effective sets; frequency view uses sessions per week. */
export function muscleStatus(m: Pick<MuscleStatDto, 'hardSets' | 'band' | 'perWeek'>, view: MapView): Status {
  if (m.hardSets === 0) return S.NONE;
  if (view === 'frequency') return m.perWeek > 3 ? S.FREQ_HIGH : m.perWeek >= 2 ? S.FREQ_OPTIMAL : m.perWeek >= 1 ? S.FREQ_ONCE : S.FREQ_LOW;
  return S[m.band];
}

export const LEGEND: Record<MapView, Status[]> = {
  volume: [S.HIGH, S.PRODUCTIVE, S.MAINTAIN, S.BELOW, S.NONE],
  frequency: [S.FREQ_HIGH, S.FREQ_OPTIMAL, S.FREQ_ONCE, S.FREQ_LOW, S.NONE],
};

export const VOLUME_RANGES: Record<'HIGH' | 'PRODUCTIVE' | 'MAINTAIN' | 'BELOW', string> = {
  HIGH: 'over 20 effective sets / wk',
  PRODUCTIVE: '10–20 / wk',
  MAINTAIN: '6–9 / wk',
  BELOW: 'under 6 / wk',
};

export const muscleLabel = (m: MappedMuscle): string => MUSCLE_GROUP_LABELS[m];

export type SortKey = 'muscle' | 'weeklyEffectiveSets' | 'hardSets' | 'perWeek' | 'tonnageKg';

export function sortMuscles(rows: readonly MuscleStatDto[], key: SortKey, dir: 'asc' | 'desc'): MuscleStatDto[] {
  const val = (m: MuscleStatDto): number | string => (key === 'muscle' ? muscleLabel(m.muscle) : key === 'tonnageKg' ? Number(m.tonnageKg) : m[key]);
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const c = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
    return c * sign || muscleLabel(a.muscle).localeCompare(muscleLabel(b.muscle));
  });
}

/** `?days=` → one of 7 / 14 / 30 (default 7). */
export function parseDays(raw: string | undefined): (typeof MUSCLE_WINDOWS)[number] {
  const n = Number(raw);
  return (MUSCLE_WINDOWS as readonly number[]).includes(n) ? (n as (typeof MUSCLE_WINDOWS)[number]) : 7;
}

/** Inclusive window of `days` ending `today`. */
export function windowFor(today: string, days: number): { from: string; to: string } {
  return { from: new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10), to: today };
}

type Shape = { x: number; y: number; w: number; h: number } | { points: string };

/** Simplified 160×280 silhouettes from the Stitch screen, one entry per muscle region per side. */
export const BODY_REGIONS: Record<'front' | 'back', { muscle: MappedMuscle; shapes: Shape[] }[]> = {
  front: [
    { muscle: 'SHOULDERS', shapes: [{ x: 38, y: 46, w: 20, h: 22 }, { x: 102, y: 46, w: 20, h: 22 }] },
    { muscle: 'CHEST', shapes: [{ x: 56, y: 48, w: 22, h: 28 }, { x: 82, y: 48, w: 22, h: 28 }] },
    { muscle: 'BICEPS', shapes: [{ x: 36, y: 72, w: 16, h: 48 }, { x: 108, y: 72, w: 16, h: 48 }] },
    { muscle: 'CORE', shapes: [{ x: 64, y: 80, w: 32, h: 44 }] },
    { muscle: 'QUADS', shapes: [{ x: 56, y: 132, w: 20, h: 72 }, { x: 84, y: 132, w: 20, h: 72 }] },
    { muscle: 'CALVES', shapes: [{ x: 58, y: 210, w: 16, h: 52 }, { x: 86, y: 210, w: 16, h: 52 }] },
  ],
  back: [
    { muscle: 'SHOULDERS', shapes: [{ x: 38, y: 46, w: 14, h: 18 }, { x: 108, y: 46, w: 14, h: 18 }] },
    { muscle: 'BACK', shapes: [{ points: '54,44 106,44 94,82 66,82' }, { points: '52,58 66,84 62,112 48,88' }, { points: '108,58 94,84 98,112 112,88' }, { x: 66, y: 86, w: 28, h: 34 }] },
    { muscle: 'TRICEPS', shapes: [{ x: 32, y: 70, w: 14, h: 46 }, { x: 114, y: 70, w: 14, h: 46 }] },
    { muscle: 'GLUTES', shapes: [{ x: 56, y: 124, w: 22, h: 30 }, { x: 82, y: 124, w: 22, h: 30 }] },
    { muscle: 'HAMSTRINGS', shapes: [{ x: 56, y: 158, w: 20, h: 50 }, { x: 84, y: 158, w: 20, h: 50 }] },
    { muscle: 'CALVES', shapes: [{ x: 58, y: 212, w: 16, h: 50 }, { x: 86, y: 212, w: 16, h: 50 }] },
  ],
};
