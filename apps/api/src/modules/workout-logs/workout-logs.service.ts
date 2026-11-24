import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { RecordsService } from '../records/records.service';
import { ScheduleService } from '../schedule/schedule.service';
import { formatSwapReason } from '@coaching/shared';
import { isAccessibleLink } from '../clients/link-status';
import { exerciseScope } from '../exercises/exercise-visibility';
import {
  CreateWorkoutLogDto,
  ExerciseLogDto,
  ListWorkoutLogsQuery,
  UpdateWorkoutLogDto,
} from './dto/workout-log.dto';

const logInclude = {
  exerciseLogs: {
    orderBy: { order: 'asc' },
    include: {
      exercise: { select: { id: true, name: true } },
      swappedFrom: { select: { id: true, name: true } },
      sets: { orderBy: { setNumber: 'asc' } },
    },
  },
} satisfies Prisma.WorkoutLogInclude;

export type WorkoutLogView = Prisma.WorkoutLogGetPayload<{ include: typeof logInclude }>;

const DEFAULT_PAGE = 20;
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

/** Authorization (who may touch which log) is the controller's job; this service trusts its clientId. */
@Injectable()
export class WorkoutLogsService {
  private readonly logger = new Logger(WorkoutLogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
    private readonly records: RecordsService,
    private readonly schedule: ScheduleService,
  ) {}

  async create(clientId: string, dto: CreateWorkoutLogDto): Promise<WorkoutLogView> {
    const performedAt = this.parseDate(dto.performedAt);
    await this.validateReferences(clientId, dto);

    const log = await this.prisma.workoutLog.create({
      data: {
        clientId,
        assignmentId: dto.assignmentId ?? null,
        workoutId: dto.workoutId ?? null,
        performedAt,
        notes: dto.notes ?? null,
        exerciseLogs: { create: this.exerciseLogsData(dto.exerciseLogs) },
      },
      include: logInclude,
    });

    await this.reconcileSchedule(log.assignmentId, log.workoutId);
    await this.refreshProgression(clientId, this.exerciseIds(dto.exerciseLogs));
    return log;
  }

  async list(clientId: string, q: ListWorkoutLogsQuery): Promise<{ items: WorkoutLogView[]; nextCursor: string | null }> {
    const limit = q.limit ?? DEFAULT_PAGE;
    const rows = await this.prisma.workoutLog.findMany({
      where: {
        clientId,
        performedAt: {
          ...(q.from ? { gte: this.parseDate(q.from, false) } : {}),
          ...(q.to ? { lte: this.parseDate(q.to, false) } : {}),
        },
      },
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: logInclude,
    });
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? (items[items.length - 1]?.id ?? null) : null };
  }

  async getById(id: string): Promise<WorkoutLogView> {
    const log = await this.prisma.workoutLog.findUnique({ where: { id }, include: logInclude });
    if (!log) throw new NotFoundException('Workout log not found');
    return log;
  }

  /** Owner-only. Returns 404 for logs belonging to someone else. */
  async update(clientId: string, id: string, dto: UpdateWorkoutLogDto): Promise<WorkoutLogView> {
    const existing = await this.findOwned(clientId, id);
    if (dto.exerciseLogs) {
      await this.validateReferences(clientId, {
        assignmentId: existing.assignmentId ?? undefined,
        workoutId: existing.workoutId ?? undefined,
        exerciseLogs: dto.exerciseLogs,
      });
    }

    const log = await this.prisma.$transaction(async (tx) => {
      if (dto.exerciseLogs) {
        await tx.exerciseLog.deleteMany({ where: { workoutLogId: id } });
      }
      return tx.workoutLog.update({
        where: { id },
        data: {
          ...(dto.performedAt ? { performedAt: this.parseDate(dto.performedAt) } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.exerciseLogs ? { exerciseLogs: { create: this.exerciseLogsData(dto.exerciseLogs) } } : {}),
        },
        include: logInclude,
      });
    });

    // Date or sets may have changed what counts as the latest sessions.
    const affected = new Set([...existing.exerciseLogs.map((e) => e.exerciseId), ...log.exerciseLogs.map((e) => e.exerciseId)]);
    await this.refreshProgression(clientId, [...affected]);
    return log;
  }

  async remove(clientId: string, id: string): Promise<void> {
    const existing = await this.findOwned(clientId, id);
    await this.prisma.workoutLog.delete({ where: { id } });
    await this.reconcileSchedule(existing.assignmentId, existing.workoutId);
    await this.refreshProgression(clientId, existing.exerciseLogs.map((e) => e.exerciseId));
  }

  private async findOwned(clientId: string, id: string) {
    const log = await this.prisma.workoutLog.findFirst({
      where: { id, clientId },
      include: { exerciseLogs: { select: { exerciseId: true } } },
    });
    if (!log) throw new NotFoundException('Workout log not found');
    return log;
  }

  /** Marks the calendar row done (or open again); like the engine refresh, it must never fail the log. */
  private async reconcileSchedule(assignmentId: string | null, workoutId: string | null): Promise<void> {
    try {
      await this.schedule.reconcileCompletion(assignmentId, workoutId);
    } catch (err) {
      this.logger.error(`Calendar update failed for assignment ${assignmentId}, workout ${workoutId}`, err);
    }
  }

  /**
   * Runs after the write has committed; a failing engine or record rebuild must never undo or fail the log.
   * Public for writers outside this service (live sessions) that add sets to a client's log.
   */
  async refreshProgression(clientId: string, exerciseIds: readonly string[]): Promise<void> {
    for (const exerciseId of new Set(exerciseIds)) {
      try {
        await this.progression.refreshExercise(clientId, exerciseId);
      } catch (err) {
        this.logger.error(`Progression refresh failed for client ${clientId}, exercise ${exerciseId}`, err);
      }
      try {
        await this.records.rebuild(clientId, exerciseId);
      } catch (err) {
        this.logger.error(`Record rebuild failed for client ${clientId}, exercise ${exerciseId}`, err);
      }
    }
  }

  private exerciseIds(logs: readonly ExerciseLogDto[]): string[] {
    return logs.map((l) => l.exerciseId);
  }

  private exerciseLogsData(logs: readonly ExerciseLogDto[]): Prisma.ExerciseLogCreateWithoutWorkoutLogInput[] {
    return logs.map((l, i) => ({
      order: i + 1,
      exercise: { connect: { id: l.exerciseId } },
      notes: l.notes?.trim() || null,
      ...(l.workoutExerciseId ? { workoutExercise: { connect: { id: l.workoutExerciseId } } } : {}),
      ...(l.swappedFromExerciseId && l.swapReason
        ? {
            swappedFrom: { connect: { id: l.swappedFromExerciseId } },
            swapReason: formatSwapReason(l.swapReason, l.swapNote),
          }
        : {}),
      sets: {
        create: l.sets.map((s, j) => ({
          setNumber: j + 1,
          reps: s.reps,
          weightKg: s.weightKg,
          rpe: s.rpe ?? null,
          isWarmup: s.isWarmup ?? false,
          rir: s.rir ?? null,
          tempo: s.tempo ?? null,
          restSeconds: s.restSeconds ?? null,
        })),
      },
    }));
  }

  private parseDate(value: string, rejectFuture = true): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    if (rejectFuture && d.getTime() > Date.now() + MAX_FUTURE_MS) {
      throw new BadRequestException('performedAt cannot be in the future');
    }
    return d;
  }

  /** Every referenced id must belong to this client's world; otherwise 400 (never leak other tenants' rows). */
  private async validateReferences(
    clientId: string,
    input: { assignmentId?: string | undefined; workoutId?: string | undefined; exerciseLogs: readonly ExerciseLogDto[] },
  ): Promise<void> {
    const { assignmentId, workoutId, exerciseLogs } = input;

    let programId: string | null = null;
    if (workoutId && !assignmentId) throw new BadRequestException('assignmentId is required with workoutId');
    if (assignmentId) {
      const assignment = await this.prisma.programAssignment.findFirst({
        // Ownership only: a session may follow a program that was later replaced (CANCELLED) and still be logged again.
        where: { id: assignmentId, clientId },
        select: { programId: true },
      });
      if (!assignment) throw new BadRequestException('Unknown assignment');
      programId = assignment.programId;
    }
    if (workoutId) {
      const workout = await this.prisma.workout.findFirst({ where: { id: workoutId, programId: programId ?? '' }, select: { id: true } });
      if (!workout) throw new BadRequestException('Workout is not part of the assignment program');
    }

    const link = await this.prisma.coachClient.findUnique({ where: { clientId } });
    const coachId = link && isAccessibleLink(link.status) ? link.coachId : null;
    for (const l of exerciseLogs) {
      if (l.swappedFromExerciseId && !l.swapReason) throw new BadRequestException('A swap needs a reason');
      if (l.swapReason && !l.swappedFromExerciseId) throw new BadRequestException('swapReason requires swappedFromExerciseId');
      if (l.swappedFromExerciseId === l.exerciseId) throw new BadRequestException('Swap to a different exercise');
    }
    const exerciseIds = [
      ...new Set([
        ...this.exerciseIds(exerciseLogs),
        ...exerciseLogs.flatMap((l) => (l.swappedFromExerciseId ? [l.swappedFromExerciseId] : [])),
      ]),
    ];
    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: exerciseIds }, ...exerciseScope({ coachId, ownerId: clientId }) },
      select: { id: true },
    });
    if (exercises.length !== exerciseIds.length) throw new BadRequestException('Unknown exercise');

    const prescriptionIds = exerciseLogs.flatMap((l) => (l.workoutExerciseId ? [l.workoutExerciseId] : []));
    if (prescriptionIds.length > 0) {
      if (!workoutId) throw new BadRequestException('workoutId is required with workoutExerciseId');
      const found = await this.prisma.workoutExercise.findMany({
        where: { id: { in: prescriptionIds }, workoutId },
        select: { id: true, exerciseId: true },
      });
      const byId = new Map(found.map((w) => [w.id, w.exerciseId]));
      for (const l of exerciseLogs) {
        if (l.workoutExerciseId && byId.get(l.workoutExerciseId) !== l.exerciseId) {
          throw new BadRequestException('workoutExerciseId does not match exerciseId in this workout');
        }
      }
    }
  }
}
