import { Injectable } from '@nestjs/common';
import { AssignmentStatus, Prisma, RecommendationStatus } from '@prisma/client';
import type { MuscleGroup, SessionMetrics, TodayDto, TodayExercise, TodayTarget } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { currentProgramWeek, dayKey } from '../clients/analytics';
import { isAccessibleLink } from '../clients/link-status';

const BANNER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const none: TodayTarget = { weightKg: null, repsMin: null, repsMax: null, rpe: null, source: 'NONE', note: null, overriddenBy: null, overriddenAt: null };

/** Client-only "Today" payload. Everything is keyed on the caller's own id. */
@Injectable()
export class TodayService {
  constructor(private readonly prisma: PrismaService) {}

  async get(clientId: string, now: Date = new Date()): Promise<TodayDto> {
    const [user, link, assignment, lastLog] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { name: true, displayName: true } }),
      this.prisma.coachClient.findUnique({ where: { clientId }, select: { status: true, coach: { select: { name: true, displayName: true } } } }),
      this.prisma.programAssignment.findFirst({
        where: { clientId, status: AssignmentStatus.ACTIVE },
        include: {
          program: {
            include: {
              workouts: {
                orderBy: [{ weekNumber: 'asc' }, { dayNumber: 'asc' }],
                include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: { select: { id: true, name: true, muscleGroup: true } } } } },
              },
            },
          },
        },
      }),
      this.prisma.workoutLog.findFirst({ where: { clientId }, orderBy: { performedAt: 'desc' }, select: { id: true } }),
    ]);

    const coach = link && isAccessibleLink(link.status) ? link.coach : null;
    const base = {
      greetingName: user.displayName ?? user.name.split(' ')[0] ?? user.name,
      coachName: coach ? (coach.displayName ?? coach.name) : null,
      lastSessionId: lastLog?.id ?? null,
      banner: await this.banner(clientId, now),
    };
    if (!assignment) {
      return { ...base, state: 'NO_PROGRAM', blockName: null, currentWeek: null, totalWeeks: null, weekProgress: null, workout: null };
    }

    const total = assignment.program.durationWeeks;
    // Before the start date the client sees week 1 so they can look ahead.
    const week = currentProgramWeek(assignment.startDate, total, dayKey(now)) ?? 1;
    const weekWorkouts = assignment.program.workouts.filter((w) => w.weekNumber === week);
    const logged = new Set(
      (
        await this.prisma.workoutLog.findMany({
          where: { clientId, assignmentId: assignment.id, workoutId: { in: weekWorkouts.map((w) => w.id) } },
          select: { workoutId: true },
        })
      ).flatMap((l) => (l.workoutId ? [l.workoutId] : [])),
    );
    const next = weekWorkouts.find((w) => !logged.has(w.id));
    const common = {
      ...base,
      blockName: assignment.program.name,
      currentWeek: week,
      totalWeeks: total,
      weekProgress: { completed: logged.size, total: weekWorkouts.length },
    };
    if (!next) return { ...common, state: 'WEEK_COMPLETE', workout: null };

    const exercises = await this.exercises(clientId, next.exercises);
    return {
      ...common,
      state: 'READY',
      workout: { id: next.id, assignmentId: assignment.id, name: next.name, weekNumber: next.weekNumber, dayNumber: next.dayNumber, exercises },
    };
  }

  /**
   * Target per exercise. Order: a still-current ACCEPTED recommendation (coach override wins over the engine's
   * numbers) → the prescription's weight → the last session's top weight → onboarding baseline.
   * An accepted recommendation is "current" only if the client has not logged the exercise since it was made.
   */
  private async exercises(
    clientId: string,
    prescriptions: Prisma.WorkoutExerciseGetPayload<{ include: { exercise: { select: { id: true; name: true; muscleGroup: true } } } }>[],
  ): Promise<TodayExercise[]> {
    const exerciseIds = prescriptions.map((p) => p.exerciseId);
    const [recs, lastLogs, baselines] = await Promise.all([
      this.prisma.progressionRecommendation.findMany({
        where: { clientId, exerciseId: { in: exerciseIds }, status: { in: [RecommendationStatus.ACCEPTED, RecommendationStatus.PENDING] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exerciseLog.findMany({
        where: { exerciseId: { in: exerciseIds }, workoutLog: { clientId } },
        orderBy: { workoutLog: { performedAt: 'desc' } },
        distinct: ['exerciseId'],
        include: { sets: { where: { isWarmup: false, reps: { gt: 0 } } }, workoutLog: { select: { createdAt: true } } },
      }),
      this.prisma.clientBaseline.findMany({ where: { clientId, exerciseId: { in: exerciseIds } } }),
    ]);
    const overriderIds = [...new Set(recs.flatMap((r) => (r.overriddenById ? [r.overriddenById] : [])))];
    const overriders = new Map(
      (await this.prisma.user.findMany({ where: { id: { in: overriderIds } }, select: { id: true, name: true, displayName: true } })).map((u) => [u.id, u]),
    );
    const lastBy = new Map(lastLogs.map((l) => [l.exerciseId, l]));
    const baselineBy = new Map(baselines.map((b) => [b.exerciseId, b]));

    return prescriptions.map((p): TodayExercise => {
      const last = lastBy.get(p.exerciseId);
      const mine = recs.filter((r) => r.exerciseId === p.exerciseId);
      const newest = mine[0] ?? null;
      const stale = (r: { createdAt: Date }): boolean => !!last && last.workoutLog.createdAt > r.createdAt;
      const current = mine.find((r) => r.status === RecommendationStatus.ACCEPTED && !stale(r)) ?? null;
      // "Why" opens the newest call that is still about the upcoming session.
      const why = newest && !stale(newest) ? newest : null;

      const rx = { repsMin: p.targetRepsMin, repsMax: p.targetRepsMax, rpe: p.targetRpe?.toString() ?? null };
      let target: TodayTarget;
      if (current && current.overrideWeightKg !== null) {
        const by = current.overriddenById ? overriders.get(current.overriddenById) : undefined;
        target = {
          weightKg: current.overrideWeightKg.toString(),
          repsMin: current.overrideRepsMin ?? rx.repsMin,
          repsMax: current.overrideRepsMax ?? rx.repsMax,
          rpe: current.overrideRpe?.toString() ?? rx.rpe,
          source: 'COACH_OVERRIDE',
          note: current.overrideNote,
          overriddenBy: by ? { id: by.id, name: by.displayName ?? by.name } : null,
          overriddenAt: current.overriddenAt?.toISOString() ?? null,
        };
      } else if (current) {
        target = {
          weightKg: current.recommendedWeightKg?.toString() ?? null,
          repsMin: current.recommendedRepsMin ?? rx.repsMin,
          repsMax: current.recommendedRepsMax ?? rx.repsMax,
          rpe: rx.rpe,
          source: 'RECOMMENDATION',
          note: null,
          overriddenBy: null,
          overriddenAt: null,
        };
      } else if (p.targetWeightKg) {
        target = { ...none, ...rx, weightKg: p.targetWeightKg.toString(), source: 'PRESCRIPTION' };
      } else if (last && last.sets.length > 0) {
        const top = last.sets.reduce((b, s) => (s.weightKg.greaterThan(b.weightKg) ? s : b));
        target = { ...none, ...rx, weightKg: top.weightKg.toString(), source: 'LAST_SESSION' };
      } else {
        const b = baselineBy.get(p.exerciseId);
        target = b?.weightKg ? { ...none, ...rx, weightKg: b.weightKg.toString(), source: 'BASELINE' } : { ...none, ...rx };
      }

      return {
        workoutExerciseId: p.id,
        exerciseId: p.exerciseId,
        name: p.exercise.name,
        muscleGroup: p.exercise.muscleGroup as MuscleGroup,
        order: p.order,
        sets: p.targetSets,
        restSeconds: p.restSeconds,
        notes: p.notes,
        target,
        recommendationId: why?.id ?? null,
        recommendationAction: why?.action ?? null,
      };
    });
  }

  /** Most recent ACCEPTED call resolved in the last 3 days. */
  private async banner(clientId: string, now: Date): Promise<TodayDto['banner']> {
    const rec = await this.prisma.progressionRecommendation.findFirst({
      where: { clientId, status: RecommendationStatus.ACCEPTED, resolvedAt: { gte: new Date(now.getTime() - BANNER_DAYS * DAY_MS) } },
      orderBy: { resolvedAt: 'desc' },
      include: { exercise: { select: { name: true } } },
    });
    if (!rec || !rec.resolvedAt) return null;

    let approvedByName: string | null = null;
    if (!rec.autoApproved) {
      const approver = rec.overriddenById
        ? await this.prisma.user.findUnique({ where: { id: rec.overriddenById }, select: { name: true, displayName: true } })
        : await this.prisma.coachClient.findUnique({ where: { clientId }, select: { coach: { select: { name: true, displayName: true } } } }).then((l) => l?.coach ?? null);
      approvedByName = approver ? (approver.displayName ?? approver.name) : null;
    }
    const metrics = rec.metrics as unknown as SessionMetrics[] | null;
    return {
      recommendationId: rec.id,
      action: rec.action,
      exerciseId: rec.exerciseId,
      exerciseName: rec.exercise.name,
      autoApproved: rec.autoApproved,
      approvedByName,
      resolvedAt: rec.resolvedAt.toISOString(),
      fromWeightKg: metrics?.[metrics.length - 1]?.topWeightKg ?? null,
      toWeightKg: (rec.overrideWeightKg ?? rec.recommendedWeightKg)?.toString() ?? null,
    };
  }
}
