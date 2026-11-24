import type { DecimalString } from './common';

export const ROADMAP_LIMITS = {
  maxPhases: 12,
  maxGoals: 8,
  maxEvents: 6,
  maxTitle: 120,
  maxName: 60,
  maxFocus: 120,
  maxUnit: 12,
  maxNotes: 1000,
  maxEventName: 80,
  maxLocation: 120,
  maxEventNotes: 500,
  /** Longest span: two years. */
  maxDays: 731,
} as const;

export interface RoadmapPhaseInput {
  name: string;
  /** Free text such as "8-12 reps, RPE 7.5". */
  focus?: string | null;
  /** `YYYY-MM-DD`. */
  startDate: string;
  endDate: string;
  programId?: string | null;
}

export interface RoadmapGoalInput {
  label: string;
  unit: string;
  targetValue: DecimalString;
  currentValue?: DecimalString | null;
  dueDate?: string | null;
}

export interface RoadmapEventInput {
  name: string;
  date: string;
  location?: string | null;
  notes?: string | null;
}

/** The whole roadmap. Saving replaces the previous one. */
export interface RoadmapInput {
  title: string;
  notes?: string | null;
  startDate: string;
  endDate: string;
  phases: RoadmapPhaseInput[];
  goals: RoadmapGoalInput[];
  events: RoadmapEventInput[];
}

export interface RoadmapPhaseDto {
  id: string;
  name: string;
  focus: string | null;
  startDate: string;
  endDate: string;
  programId: string | null;
  programName: string | null;
}

export interface RoadmapGoalDto {
  id: string;
  label: string;
  unit: string;
  targetValue: DecimalString;
  currentValue: DecimalString | null;
  dueDate: string | null;
}

export interface RoadmapEventDto {
  id: string;
  name: string;
  date: string;
  location: string | null;
  notes: string | null;
}

export interface RoadmapDto {
  id: string;
  clientId: string;
  title: string;
  notes: string | null;
  startDate: string;
  endDate: string;
  phases: RoadmapPhaseDto[];
  goals: RoadmapGoalDto[];
  events: RoadmapEventDto[];
  updatedAt: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_RE = /^-?\d{1,6}(\.\d{1,2})?$/;

/** `YYYY-MM-DD` to a UTC day number; null when malformed or not a real calendar date. */
export function dayNumber(date: string): number | null {
  if (!DATE_RE.test(date)) return null;
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) return null;
  return ms / 86_400_000;
}

/** First problem found, or null. Pure: the API and the editor run the same check. */
export function validateRoadmap(input: RoadmapInput): string | null {
  const L = ROADMAP_LIMITS;
  const start = dayNumber(input.startDate);
  const end = dayNumber(input.endDate);
  if (!input.title.trim()) return 'Name the roadmap.';
  if (start === null || end === null) return 'Roadmap dates must be real dates.';
  if (end < start) return 'The roadmap ends before it starts.';
  if (end - start > L.maxDays) return 'A roadmap spans at most two years.';
  if (input.phases.length > L.maxPhases) return `At most ${L.maxPhases} phases.`;
  if (input.goals.length > L.maxGoals) return `At most ${L.maxGoals} goals.`;
  if (input.events.length > L.maxEvents) return `At most ${L.maxEvents} events.`;

  let previousEnd = start - 1;
  const phases = input.phases
    .map((p) => ({ p, s: dayNumber(p.startDate), e: dayNumber(p.endDate) }))
    .sort((a, b) => (a.s ?? 0) - (b.s ?? 0));
  for (const { p, s, e } of phases) {
    const label = `Phase "${p.name.trim() || 'untitled'}"`;
    if (!p.name.trim()) return 'Every phase needs a name.';
    if (s === null || e === null) return `${label}: dates must be real dates.`;
    if (e < s) return `${label}: ends before it starts.`;
    if (s < start || e > end) return `${label}: must sit inside the roadmap dates.`;
    if (s <= previousEnd) return `${label}: overlaps the previous phase.`;
    previousEnd = e;
  }

  for (const g of input.goals) {
    const label = `Goal "${g.label.trim() || 'untitled'}"`;
    if (!g.label.trim()) return 'Every goal needs a label.';
    if (!g.unit.trim()) return `${label}: add a unit.`;
    if (!DECIMAL_RE.test(g.targetValue)) return `${label}: target must be a number with at most two decimals.`;
    if (g.currentValue != null && g.currentValue !== '' && !DECIMAL_RE.test(g.currentValue)) return `${label}: current value must be a number.`;
    if (g.dueDate && dayNumber(g.dueDate) === null) return `${label}: due date must be a real date.`;
  }

  for (const ev of input.events) {
    if (!ev.name.trim()) return 'Every event needs a name.';
    if (dayNumber(ev.date) === null) return `Event "${ev.name}": date must be a real date.`;
  }
  return null;
}

/** Whole days from `today` to `date` (negative once passed); null for malformed input. */
export function daysUntil(date: string, today: string): number | null {
  const d = dayNumber(date);
  const t = dayNumber(today);
  return d === null || t === null ? null : d - t;
}
