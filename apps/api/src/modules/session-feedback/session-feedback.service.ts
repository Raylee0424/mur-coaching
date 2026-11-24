import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionFeedback } from '@prisma/client';
import type { SessionFeedbackDto, SessionReviewDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { mean } from '../clients/analytics';
import { activeCues, type ActiveCues } from './cues';
import type { CreateSessionFeedbackDto, UpdateSessionFeedbackDto } from './dto/session-feedback.dto';

const toDto = (f: SessionFeedback): SessionFeedbackDto => ({
  id: f.id,
  workoutLogId: f.workoutLogId,
  exerciseLogId: f.exerciseLogId,
  setLogId: f.setLogId,
  body: f.body,
  carryForward: f.carryForward,
  createdAt: f.createdAt.toISOString(),
  updatedAt: f.updatedAt.toISOString(),
});

/** Coach feedback on logged sessions. Callers (controllers) have verified the coach may access `clientId`. */
@Injectable()
export class SessionFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async review(clientId: string, logId: string): Promise<SessionReviewDto> {
    const log = await this.prisma.workoutLog.findFirst({
      where: { id: logId, clientId },
      include: {
        client: { select: { name: true, displayName: true } },
        workout: { select: { name: true } },
        feedback: { orderBy: { createdAt: 'asc' } },
        exerciseLogs: {
          orderBy: { order: 'asc' },
          include: {
            exercise: { select: { id: true, name: true } },
            swappedFrom: { select: { name: true } },
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });
    if (!log) throw new NotFoundException('Session not found');

    const working = log.exerciseLogs.flatMap((e) => e.sets.filter((s) => !s.isWarmup && s.reps > 0));
    return {
      logId: log.id,
      clientId,
      clientName: log.client.displayName ?? log.client.name,
      workoutName: log.workout?.name ?? null,
      performedAt: log.performedAt.toISOString(),
      clientNotes: log.notes,
      volumeKg: Math.round(working.reduce((n, s) => n + s.reps * s.weightKg.toNumber(), 0)),
      avgRpe: mean(working.flatMap((s) => (s.rpe ? [s.rpe.toNumber()] : []))),
      workingSets: working.length,
      exercises: log.exerciseLogs.map((e) => ({
        id: e.id,
        exerciseId: e.exercise.id,
        name: e.exercise.name,
        order: e.order,
        notes: e.notes,
        swappedFromName: e.swappedFrom?.name ?? null,
        sets: e.sets.map((s) => ({
          id: s.id,
          setNumber: s.setNumber,
          reps: s.reps,
          weightKg: s.weightKg.toString(),
          rpe: s.rpe?.toString() ?? null,
          isWarmup: s.isWarmup,
        })),
      })),
      feedback: log.feedback.map(toDto),
    };
  }

  async create(coachId: string, clientId: string, logId: string, dto: CreateSessionFeedbackDto): Promise<SessionFeedbackDto> {
    const log = await this.prisma.workoutLog.findFirst({
      where: { id: logId, clientId },
      select: { id: true, exerciseLogs: { select: { id: true, sets: { select: { id: true } } } } },
    });
    if (!log) throw new NotFoundException('Session not found');
    if (dto.setLogId && !dto.exerciseLogId) throw new BadRequestException('A set comment needs its exercise');
    const exercise = dto.exerciseLogId ? log.exerciseLogs.find((e) => e.id === dto.exerciseLogId) : undefined;
    if (dto.exerciseLogId && !exercise) throw new BadRequestException('That exercise is not part of this session');
    if (dto.setLogId && !exercise?.sets.some((s) => s.id === dto.setLogId)) throw new BadRequestException('That set is not part of this exercise');

    const row = await this.prisma.sessionFeedback.create({
      data: {
        workoutLogId: logId,
        exerciseLogId: dto.exerciseLogId ?? null,
        setLogId: dto.setLogId ?? null,
        coachId,
        body: dto.body,
        carryForward: dto.carryForward ?? false,
      },
    });
    return toDto(row);
  }

  async update(clientId: string, id: string, dto: UpdateSessionFeedbackDto): Promise<SessionFeedbackDto> {
    await this.findForClient(clientId, id);
    const row = await this.prisma.sessionFeedback.update({
      where: { id },
      data: { ...(dto.body !== undefined ? { body: dto.body } : {}), ...(dto.carryForward !== undefined ? { carryForward: dto.carryForward } : {}) },
    });
    return toDto(row);
  }

  async remove(clientId: string, id: string): Promise<void> {
    await this.findForClient(clientId, id);
    await this.prisma.sessionFeedback.delete({ where: { id } });
  }

  /** Pinned comments that still apply to the client's next session (see `activeCues`). */
  async cuesFor(clientId: string): Promise<ActiveCues> {
    const pinned = await this.prisma.sessionFeedback.findMany({
      where: { carryForward: true, workoutLog: { clientId } },
      select: {
        id: true,
        body: true,
        exerciseLog: { select: { exerciseId: true } },
        setLog: { select: { setNumber: true } },
        workoutLog: { select: { performedAt: true } },
      },
    });
    if (pinned.length === 0) return { session: [], byExercise: new Map() };
    const earliest = pinned.reduce((min, p) => (p.workoutLog.performedAt < min ? p.workoutLog.performedAt : min), pinned[0]!.workoutLog.performedAt);
    const logs = await this.prisma.workoutLog.findMany({
      where: { clientId, performedAt: { gt: earliest } },
      select: { performedAt: true, exerciseLogs: { select: { exerciseId: true } } },
    });
    return activeCues(
      pinned.map((p) => ({
        feedbackId: p.id,
        body: p.body,
        exerciseId: p.exerciseLog?.exerciseId ?? null,
        setNumber: p.setLog?.setNumber ?? null,
        performedAt: p.workoutLog.performedAt,
      })),
      logs.map((l) => ({ performedAt: l.performedAt, exerciseIds: l.exerciseLogs.map((e) => e.exerciseId) })),
    );
  }

  private async findForClient(clientId: string, id: string): Promise<void> {
    const found = await this.prisma.sessionFeedback.findFirst({ where: { id, workoutLog: { clientId } }, select: { id: true } });
    if (!found) throw new NotFoundException('Feedback not found');
  }
}
