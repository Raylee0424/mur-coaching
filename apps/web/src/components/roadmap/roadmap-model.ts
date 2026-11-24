import { dayNumber, daysUntil } from '@coaching/shared';
import type { DecimalString, RoadmapEventDto, RoadmapGoalDto, RoadmapPhaseDto } from '@coaching/shared';

export interface Span {
  leftPct: number;
  widthPct: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Position of an inclusive date range inside the roadmap, in percent of its length. */
export function spanOf(start: string, end: string, rangeStart: string, rangeEnd: string): Span {
  const rs = dayNumber(rangeStart) ?? 0;
  const total = (dayNumber(rangeEnd) ?? rs) - rs + 1;
  const s = (dayNumber(start) ?? rs) - rs;
  const e = (dayNumber(end) ?? rs) - rs + 1;
  return { leftPct: (s / total) * 100, widthPct: ((e - s) / total) * 100 };
}

/** One column per calendar month the roadmap touches. */
export function monthColumns(rangeStart: string, rangeEnd: string): (Span & { key: string; label: string })[] {
  const columns: (Span & { key: string; label: string })[] = [];
  let [year, month] = [Number(rangeStart.slice(0, 4)), Number(rangeStart.slice(5, 7))];
  const [endYear, endMonth] = [Number(rangeEnd.slice(0, 4)), Number(rangeEnd.slice(5, 7))];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const first = `${year}-${String(month).padStart(2, '0')}-01`;
    const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const from = first < rangeStart ? rangeStart : first;
    const to = last > rangeEnd ? rangeEnd : last;
    columns.push({ key: first.slice(0, 7), label: `${MONTHS[month - 1]} ${year}`, ...spanOf(from, to, rangeStart, rangeEnd) });
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
  return columns;
}

/** Percent position of today, or null when it falls outside the roadmap. */
export function todayMarker(today: string, rangeStart: string, rangeEnd: string): number | null {
  if (today < rangeStart || today > rangeEnd) return null;
  const rs = dayNumber(rangeStart) ?? 0;
  const total = (dayNumber(rangeEnd) ?? rs) - rs + 1;
  return (((dayNumber(today) ?? rs) - rs + 0.5) / total) * 100;
}

export type PhaseState = 'past' | 'active' | 'upcoming';

export function phaseState(phase: Pick<RoadmapPhaseDto, 'startDate' | 'endDate'>, today: string): PhaseState {
  if (today > phase.endDate) return 'past';
  return today >= phase.startDate ? 'active' : 'upcoming';
}

/** Whole weeks a phase spans, rounded up. */
export function phaseWeeks(phase: Pick<RoadmapPhaseDto, 'startDate' | 'endDate'>): number {
  return Math.ceil(((dayNumber(phase.endDate) ?? 0) - (dayNumber(phase.startDate) ?? 0) + 1) / 7);
}

/** The soonest event today or later, with its day count; null when none is ahead. */
export function nextEvent(events: readonly RoadmapEventDto[], today: string): { event: RoadmapEventDto; days: number } | null {
  let best: { event: RoadmapEventDto; days: number } | null = null;
  for (const event of events) {
    const days = daysUntil(event.date, today);
    if (days !== null && days >= 0 && (!best || days < best.days)) best = { event, days };
  }
  return best;
}

export function countdownLabel(days: number): string {
  if (days === 0) return 'Today';
  return days === 1 ? '1 day to go' : `${days} days to go`;
}

/** Trim trailing zeros: "540.00" -> "540", "512.50" -> "512.5". */
export function trimDecimal(value: DecimalString): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}

export interface GoalProgress {
  /** Distance still to cover, signed (negative when the goal is a drop). */
  remaining: string | null;
  /** 0-100 of the way from zero to target; null without a current value. */
  pct: number | null;
}

export function goalProgress(goal: Pick<RoadmapGoalDto, 'targetValue' | 'currentValue'>): GoalProgress {
  if (goal.currentValue === null) return { remaining: null, pct: null };
  const target = Number(goal.targetValue);
  const current = Number(goal.currentValue);
  const diff = Math.round((target - current) * 100) / 100;
  return {
    remaining: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${trimDecimal(Math.abs(diff).toFixed(2))}`,
    pct: target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : null,
  };
}
