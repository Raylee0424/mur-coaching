import { ScheduledStatus } from '@coaching/shared';
import { addDays } from '../clients/analytics';

/** Pure scheduling rules. Dates are `YYYY-MM-DD` (UTC). */

export interface PlanWorkout {
  id: string;
  weekNumber: number;
  dayNumber: number;
}

export interface PlanRow {
  id: string;
  workoutId: string;
  date: string;
  status: ScheduledStatus;
  /** A coach moved it by hand. */
  moved: boolean;
}

export interface SchedulePlan {
  create: { workoutId: string; date: string }[];
  redate: { id: string; date: string }[];
}

/** Where the program's (week, day) formula puts a workout: start + (week - 1) * 7 + (day - 1). */
export const formulaDate = (startDate: string, w: Pick<PlanWorkout, 'weekNumber' | 'dayNumber'>): string =>
  addDays(startDate, (w.weekNumber - 1) * 7 + (w.dayNumber - 1));

/**
 * Brings the calendar in line with the program without rewriting history. `initial` (a brand-new assignment) creates
 * every row. Otherwise only the future changes: a workout added to the program gets a row if its date is today or
 * later, and a PLANNED row the coach never moved follows its workout to a new date, unless either date is already
 * past. COMPLETED, SKIPPED, moved and past rows stay as they are.
 */
export function planScheduleSync(input: {
  startDate: string;
  workouts: readonly PlanWorkout[];
  rows: readonly PlanRow[];
  today: string;
  initial?: boolean;
}): SchedulePlan {
  const byWorkout = new Map(input.rows.map((r) => [r.workoutId, r]));
  const plan: SchedulePlan = { create: [], redate: [] };
  for (const w of input.workouts) {
    const date = formulaDate(input.startDate, w);
    const row = byWorkout.get(w.id);
    if (!row) {
      if (input.initial || date >= input.today) plan.create.push({ workoutId: w.id, date });
      continue;
    }
    if (row.status === ScheduledStatus.PLANNED && !row.moved && row.date !== date && row.date >= input.today && date >= input.today) {
      plan.redate.push({ id: row.id, date });
    }
  }
  return plan;
}

export interface MoveCheck {
  row: Pick<PlanRow, 'status' | 'date'>;
  /** Requested change: a new date and/or a new status. */
  date?: string;
  status?: typeof ScheduledStatus.PLANNED | typeof ScheduledStatus.SKIPPED;
  today: string;
  /** Dates holding another session of this assignment, skipped or not: the calendar shows one session a day. */
  occupied: ReadonlySet<string>;
}

const isRealDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && addDays(d, 0) === d;

/** First problem with a coach edit, or null. */
export function checkScheduleEdit(c: MoveCheck): string | null {
  if (c.date === undefined && c.status === undefined) return 'Nothing to change';
  if (c.date !== undefined && !isRealDate(c.date)) return 'Choose a valid date';
  if (c.row.status === ScheduledStatus.COMPLETED) return 'A completed session is history and cannot be changed';
  if (c.date !== undefined) {
    if (c.row.status === ScheduledStatus.SKIPPED && c.status !== ScheduledStatus.PLANNED) return 'Restore the skipped session before moving it';
    if (c.date < c.today) return 'Sessions cannot be moved into the past';
  }
  if (c.date !== undefined && c.date !== c.row.date && c.occupied.has(c.date)) return 'That day already has a session';
  return null;
}
