import { Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, Prisma } from '@prisma/client';
import { ENGINE_DEFAULTS } from '@coaching/shared';
import type { CalendarTopSet, ClientOverviewDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { estimateOneRepMax } from '../progression/engine';
import {
  DAY_MS,
  adherenceWindows,
  addDays,
  assignmentSlots,
  countedSlots,
  buildCalendar,
  dayKey,
  delta,
  markCompleted,
  mean,
  streaks,
  type CalendarLog,
} from './analytics';

const logInclude = {
  workout: { select: { name: true } },
  exerciseLogs: {
    select: {
      exercise: { select: { id: true, name: true } },
      sets: { where: { isWarmup: false, reps: { gt: 0 } }, select: { reps: true, weightKg: true, rpe: true } },
    },
  },
} satisfies Prisma.WorkoutLogInclude;

type LogRow = Prisma.WorkoutLogGetPayload<{ include: typeof logInclude }>;

function toCalendarLog(l: LogRow): CalendarLog {
  const rpes: number[] = [];
  let best: { score: number; top: CalendarTopSet } | null = null;
  for (const el of l.exerciseLogs) {
    for (const s of el.sets) {
      if (s.rpe) rpes.push(s.rpe.toNumber());
      const score = estimateOneRepMax(s.weightKg.toNumber(), s.reps);
      if (!best || score > best.score) {
        best = {
          score,
          top: {
            exerciseId: el.exercise.id,
            exerciseName: el.exercise.name,
            weightKg: s.weightKg.toString(),
            reps: s.reps,
            rpe: s.rpe?.toString() ?? null,
          },
        };
      }
    }
  }
  return {
    id: l.id,
    workoutId: l.workoutId,
    performedAt: l.performedAt,
    notes: l.notes,
    avgRpe: mean(rpes),
    workoutName: l.workout?.name ?? null,
    topSet: best?.top ?? null,
  };
}

/** Coach-only. The controller has already verified the coach owns `clientId`. */
@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async get(clientId: string, month: string | undefined, now: Date = new Date()): Promise<ClientOverviewDto> {
    const today = dayKey(now);
    const monthKey = month ?? today.slice(0, 7);
    const monthStart = `${monthKey}-01`;
    const monthEnd = dayKey(new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0)));

    const link = await this.prisma.coachClient.findUnique({
      where: { clientId },
      select: { rpeCap: true, coach: { select: { engineRules: { select: { rpeCap: true } } } } },
    });
    if (!link) throw new NotFoundException('Client not found');
    const rpeCap = (link.rpeCap ?? link.coach.engineRules?.rpeCap)?.toNumber() ?? ENGINE_DEFAULTS.rpeCap;

    const assignment = await this.prisma.programAssignment.findFirst({
      where: { clientId, status: AssignmentStatus.ACTIVE },
      select: {
        id: true,
        startDate: true,
        program: { select: { workouts: { select: { id: true, weekNumber: true, dayNumber: true, name: true } } } },
        scheduled: { select: { id: true, date: true, status: true, workout: { select: { id: true, name: true, weekNumber: true } } } },
      },
    });
    const rawSlots = assignment ? assignmentSlots(assignment.startDate, assignment.program.workouts, assignment.scheduled) : [];
    const monthSlotWorkoutIds = rawSlots.filter((s) => s.date >= monthStart && s.date <= monthEnd).map((s) => s.workoutId);

    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
    const from = new Date(`${addDays(monthStart, -1)}T00:00:00.000Z`);
    const to = new Date(`${addDays(monthEnd, 2)}T00:00:00.000Z`);

    const [slotLogs, monthLogs, recentSets] = await Promise.all([
      assignment
        ? this.prisma.workoutLog.findMany({
            where: { assignmentId: assignment.id, workoutId: { not: null } },
            select: { workoutId: true },
          })
        : Promise.resolve([] as { workoutId: string | null }[]),
      this.prisma.workoutLog.findMany({
        where: {
          clientId,
          OR: [{ performedAt: { gte: from, lt: to } }, ...(monthSlotWorkoutIds.length ? [{ workoutId: { in: monthSlotWorkoutIds } }] : [])],
        },
        include: logInclude,
        orderBy: { performedAt: 'asc' },
      }),
      this.prisma.setLog.findMany({
        where: { isWarmup: false, reps: { gt: 0 }, exerciseLog: { workoutLog: { clientId, performedAt: { gt: twoWeeksAgo } } } },
        select: { reps: true, weightKg: true, rpe: true, exerciseLog: { select: { workoutLog: { select: { performedAt: true } } } } },
      }),
    ]);

    const loggedIds = new Set(slotLogs.flatMap((l) => (l.workoutId ? [l.workoutId] : [])));
    // A skipped session is neither done nor missed: it stays on the calendar but out of adherence and streaks.
    const slots = markCompleted(countedSlots(rawSlots), loggedIds);
    const adh = adherenceWindows(slots, today);

    const cur = recentSets.filter((s) => s.exerciseLog.workoutLog.performedAt > weekAgo);
    const prev = recentSets.filter((s) => s.exerciseLog.workoutLog.performedAt <= weekAgo);
    const volume = (rows: typeof recentSets): number => Math.round(rows.reduce((n, s) => n + s.reps * s.weightKg.toNumber(), 0));
    const rpes = (rows: typeof recentSets): number[] => rows.flatMap((s) => (s.rpe ? [s.rpe.toNumber()] : []));
    const volCur = cur.length ? volume(cur) : null;
    const volPrev = prev.length ? volume(prev) : null;
    const rpeCur = mean(rpes(cur));
    const rpePrev = mean(rpes(prev));

    return {
      clientId,
      month: monthKey,
      adherence: { value: adh.current, previous: adh.previous, delta: delta(adh.current, adh.previous, 0) },
      weeklyVolumeKg: { value: volCur, previous: volPrev, delta: delta(volCur, volPrev, 0) },
      avgRpe: { value: rpeCur, previous: rpePrev, delta: delta(rpeCur, rpePrev), cap: rpeCap },
      streak: streaks(slots, today),
      days: buildCalendar(monthKey, rawSlots, monthLogs.map(toCalendarLog), today, rpeCap),
    };
  }
}
