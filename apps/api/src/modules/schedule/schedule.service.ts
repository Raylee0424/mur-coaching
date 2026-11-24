import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, Prisma, ScheduledStatus } from '@prisma/client';
import type { ScheduledWorkoutDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { dayKey } from '../clients/analytics';
import { checkScheduleEdit, planScheduleSync } from './schedule-plan';
import type { UpdateScheduledWorkoutDto } from './dto/schedule.dto';

const utcDay = (key: string): Date => new Date(`${key}T00:00:00.000Z`);

/** Dated sessions on a client's calendar: built from the program, then moved or skipped by the coach. */
@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Brings an ACTIVE assignment's calendar in line with its program (see `planScheduleSync`: future rows only).
   * Pass `db` to run inside the caller's transaction, and `initial` for a brand-new assignment.
   */
  async syncAssignment(assignmentId: string, opts: { initial?: boolean; now?: Date; db?: Prisma.TransactionClient } = {}): Promise<void> {
    const db = opts.db ?? this.prisma;
    const a = await db.programAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        clientId: true,
        startDate: true,
        status: true,
        program: { select: { workouts: { select: { id: true, weekNumber: true, dayNumber: true } } } },
        scheduled: { select: { id: true, workoutId: true, date: true, status: true, movedAt: true } },
      },
    });
    if (!a || a.status !== AssignmentStatus.ACTIVE) return;

    const plan = planScheduleSync({
      startDate: dayKey(a.startDate),
      workouts: a.program.workouts,
      rows: a.scheduled.map((r) => ({ id: r.id, workoutId: r.workoutId, date: dayKey(r.date), status: r.status, moved: r.movedAt !== null })),
      today: dayKey(opts.now ?? new Date()),
      ...(opts.initial ? { initial: true } : {}),
    });
    if (plan.create.length > 0) {
      await db.scheduledWorkout.createMany({
        data: plan.create.map((c) => ({ assignmentId, clientId: a.clientId, workoutId: c.workoutId, date: utcDay(c.date) })),
        skipDuplicates: true,
      });
    }
    for (const r of plan.redate) await db.scheduledWorkout.update({ where: { id: r.id }, data: { date: utcDay(r.date) } });
  }

  /** After a program edit: every ACTIVE assignment of the program follows, future sessions only. */
  async syncProgram(programId: string, now?: Date): Promise<void> {
    const assignments = await this.prisma.programAssignment.findMany({
      where: { programId, status: AssignmentStatus.ACTIVE },
      select: { id: true },
    });
    for (const a of assignments) await this.syncAssignment(a.id, now ? { now } : {});
  }

  /** A superseded assignment keeps its completed sessions as history and drops what was never done. */
  async dropPlanned(assignmentIds: readonly string[], db: Prisma.TransactionClient = this.prisma): Promise<void> {
    if (assignmentIds.length === 0) return;
    await db.scheduledWorkout.deleteMany({ where: { assignmentId: { in: [...assignmentIds] }, status: { not: ScheduledStatus.COMPLETED } } });
  }

  /** Keeps a row's status honest after a log is created or deleted: logged = COMPLETED, no log left = PLANNED. */
  async reconcileCompletion(assignmentId: string | null, workoutId: string | null): Promise<void> {
    if (!assignmentId || !workoutId) return;
    const logged = (await this.prisma.workoutLog.count({ where: { assignmentId, workoutId } })) > 0;
    await this.prisma.scheduledWorkout.updateMany({
      where: { assignmentId, workoutId, status: { in: logged ? [ScheduledStatus.PLANNED, ScheduledStatus.SKIPPED] : [ScheduledStatus.COMPLETED] } },
      data: { status: logged ? ScheduledStatus.COMPLETED : ScheduledStatus.PLANNED },
    });
  }

  async list(clientId: string, from: string, to: string): Promise<ScheduledWorkoutDto[]> {
    const rows = await this.prisma.scheduledWorkout.findMany({
      where: { clientId, assignment: { status: AssignmentStatus.ACTIVE }, date: { gte: utcDay(from), lte: utcDay(to) } },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, workoutId: r.workoutId, date: dayKey(r.date), status: r.status }));
  }

  /** Coach edit: move to another day and/or skip or restore. The controller has verified the coach owns `clientId`. */
  async update(clientId: string, id: string, dto: UpdateScheduledWorkoutDto, now: Date = new Date()): Promise<ScheduledWorkoutDto> {
    const row = await this.prisma.scheduledWorkout.findFirst({
      where: { id, clientId, assignment: { status: AssignmentStatus.ACTIVE } },
    });
    if (!row) throw new NotFoundException('Scheduled session not found');
    const others = await this.prisma.scheduledWorkout.findMany({
      where: { assignmentId: row.assignmentId, id: { not: id } },
      select: { date: true },
    });
    const problem = checkScheduleEdit({
      row: { status: row.status, date: dayKey(row.date) },
      ...(dto.date !== undefined ? { date: dto.date } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      today: dayKey(now),
      occupied: new Set(others.map((o) => dayKey(o.date))),
    });
    if (problem) throw new BadRequestException(problem);

    const moved = dto.date !== undefined && dto.date !== dayKey(row.date);
    const saved = await this.prisma.scheduledWorkout.update({
      where: { id },
      data: {
        ...(dto.date !== undefined ? { date: utcDay(dto.date) } : {}),
        ...(moved ? { movedAt: now } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    return { id: saved.id, workoutId: saved.workoutId, date: dayKey(saved.date), status: saved.status };
  }
}
