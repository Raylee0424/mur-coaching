import {
  ADHERENCE_ATTENTION_PCT,
  NO_SESSION_ATTENTION_DAYS,
  type AttentionReason,
  type CalendarDay,
  type CalendarDayStatus,
  type CalendarTopSet,
  type CoachClientStatus,
} from '@coaching/shared';

/** Pure schedule / adherence / streak / calendar helpers. All dates are UTC; day keys are `YYYY-MM-DD`. */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const ADHERENCE_WINDOW_DAYS = 28;

export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);
const fromKey = (key: string): Date => new Date(`${key}T00:00:00.000Z`);
export const addDays = (key: string, days: number): string => dayKey(new Date(fromKey(key).getTime() + days * DAY_MS));

export interface ScheduleWorkout {
  id: string;
  weekNumber: number;
  dayNumber: number;
  name: string;
}

export interface ScheduledSlot {
  date: string;
  workoutId: string;
  name: string;
  weekNumber: number;
}

export interface SlotStatus extends ScheduledSlot {
  completed: boolean;
}

/** A workout is scheduled on assignment start + (week - 1) * 7 + (day - 1) days. Sorted by date. */
export function scheduleSlots(startDate: Date, workouts: readonly ScheduleWorkout[]): ScheduledSlot[] {
  const start = dayKey(startDate);
  return workouts
    .map((w) => ({
      date: addDays(start, (w.weekNumber - 1) * 7 + (w.dayNumber - 1)),
      workoutId: w.id,
      name: w.name,
      weekNumber: w.weekNumber,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** A slot is completed when the client logged a session against that workout (any date). */
export function markCompleted(slots: readonly ScheduledSlot[], loggedWorkoutIds: ReadonlySet<string>): SlotStatus[] {
  return slots.map((s) => ({ ...s, completed: loggedWorkoutIds.has(s.workoutId) }));
}

/** Slots that can already count: in the past, or done (today's session counts only once logged). */
const countable = (s: SlotStatus, today: string): boolean => s.date < today || s.completed;

/** Completed / scheduled over [from, to] inclusive, as a rounded percent. Null when nothing was scheduled. */
export function adherencePct(slots: readonly SlotStatus[], from: string, to: string, today: string): number | null {
  const inWindow = slots.filter((s) => s.date >= from && s.date <= to && countable(s, today));
  if (inWindow.length === 0) return null;
  return Math.round((inWindow.filter((s) => s.completed).length / inWindow.length) * 100);
}

/** Last 28 days ending today, and the 28 days before that. */
export function adherenceWindows(slots: readonly SlotStatus[], today: string): { current: number | null; previous: number | null } {
  const span = ADHERENCE_WINDOW_DAYS;
  return {
    current: adherencePct(slots, addDays(today, -(span - 1)), today, today),
    previous: adherencePct(slots, addDays(today, -(2 * span - 1)), addDays(today, -span), today),
  };
}

/** Consecutive scheduled sessions completed: the run ending at the latest countable slot, and the longest run ever. */
export function streaks(slots: readonly SlotStatus[], today: string): { current: number; best: number } {
  const ordered = slots.filter((s) => countable(s, today)).sort((a, b) => a.date.localeCompare(b.date));
  let run = 0;
  let best = 0;
  for (const s of ordered) {
    run = s.completed ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

/** 1-based week of the program for `today`, clamped to the program length. Null before the start date. */
export function currentProgramWeek(startDate: Date, totalWeeks: number, today: string): number | null {
  const diffDays = Math.floor((fromKey(today).getTime() - fromKey(dayKey(startDate)).getTime()) / DAY_MS);
  if (diffDays < 0) return null;
  return Math.min(totalWeeks, Math.floor(diffDays / 7) + 1);
}

export const mean = (values: readonly number[], dp = 2): number | null => {
  if (values.length === 0) return null;
  const f = 10 ** dp;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * f) / f;
};

export const delta = (value: number | null, previous: number | null, dp = 2): number | null => {
  if (value === null || previous === null) return null;
  const f = 10 ** dp;
  return Math.round((value - previous) * f) / f;
};

export interface AttentionInput {
  status: CoachClientStatus;
  /** An ACTIVE assignment that has already started. */
  hasStartedAssignment: boolean;
  adherencePct: number | null;
  pendingDeload: boolean;
  lastSessionAt: Date | null;
  now: Date;
}

/**
 * Needs attention (ACTIVE clients only): a pending DELOAD, adherence under 85%, or no session in 7 days
 * (the last one only once they have a started program, so a brand-new client is not instantly flagged).
 */
export function attentionReasons(i: AttentionInput): AttentionReason[] {
  if (i.status !== 'ACTIVE') return [];
  const reasons: AttentionReason[] = [];
  if (i.pendingDeload) reasons.push('PENDING_DELOAD');
  if (i.adherencePct !== null && i.adherencePct < ADHERENCE_ATTENTION_PCT) reasons.push('LOW_ADHERENCE');
  if (i.hasStartedAssignment) {
    const cutoff = i.now.getTime() - NO_SESSION_ATTENTION_DAYS * DAY_MS;
    if (i.lastSessionAt === null || i.lastSessionAt.getTime() < cutoff) reasons.push('NO_RECENT_SESSION');
  }
  return reasons;
}

export interface CalendarLog {
  id: string;
  workoutId: string | null;
  performedAt: Date;
  notes: string | null;
  /** Mean working-set RPE of the session. */
  avgRpe: number | null;
  /** Name of the workout the log followed, for ad-hoc display. */
  workoutName: string | null;
  topSet: CalendarTopSet | null;
}

/** Every day of `month` (`YYYY-MM`) with its scheduled workout, status, top set and notes. */
export function buildCalendar(
  month: string,
  slots: readonly ScheduledSlot[],
  logs: readonly CalendarLog[],
  today: string,
  rpeCap: number,
): CalendarDay[] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const slotByDate = new Map(slots.map((s) => [s.date, s]));
  const logByWorkout = new Map(logs.flatMap((l) => (l.workoutId ? [[l.workoutId, l] as const] : [])));
  const adhocByDate = new Map(logs.filter((l) => !l.workoutId || !slots.some((s) => s.workoutId === l.workoutId)).map((l) => [dayKey(l.performedAt), l]));

  return Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    const slot = slotByDate.get(date);
    const empty: CalendarDay = {
      date, workoutName: null, workoutId: null, status: null, workoutLogId: null, performedAt: null, topSet: null, notes: null,
    };
    if (slot) {
      const log = logByWorkout.get(slot.workoutId);
      let status: CalendarDayStatus;
      if (log) status = log.avgRpe !== null && log.avgRpe > rpeCap ? 'HIGH_RPE' : 'COMPLETED';
      else if (date < today) status = 'MISSED';
      else status = date === today ? 'TODAY' : 'SCHEDULED';
      return {
        ...empty,
        workoutName: slot.name,
        workoutId: slot.workoutId,
        status,
        workoutLogId: log?.id ?? null,
        performedAt: log?.performedAt.toISOString() ?? null,
        topSet: log?.topSet ?? null,
        notes: log?.notes ?? null,
      };
    }
    const adhoc = adhocByDate.get(date);
    if (adhoc) {
      return {
        ...empty,
        workoutName: adhoc.workoutName ?? 'Ad-hoc session',
        status: adhoc.avgRpe !== null && adhoc.avgRpe > rpeCap ? 'HIGH_RPE' : 'COMPLETED',
        workoutLogId: adhoc.id,
        performedAt: adhoc.performedAt.toISOString(),
        topSet: adhoc.topSet,
        notes: adhoc.notes,
      };
    }
    return empty;
  });
}
