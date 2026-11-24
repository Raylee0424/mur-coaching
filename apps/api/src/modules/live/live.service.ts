import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CoachLiveDto, LiveSessionDto, LiveSetDto, LogLiveSetRequest, StartLiveSessionRequest } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import { exerciseScope } from '../exercises/exercise-visibility';
import { WorkoutLogsService } from '../workout-logs/workout-logs.service';

const RECENT = 10;
const name = (u: { name: string; displayName: string | null }): string => u.displayName ?? u.name;

const sessionInclude = {
  coach: { select: { name: true, displayName: true } },
  participants: {
    orderBy: { joinedAt: 'asc' },
    include: {
      client: { select: { name: true, displayName: true } },
      workoutLog: {
        select: {
          exerciseLogs: {
            orderBy: { order: 'asc' },
            select: {
              exerciseId: true,
              exercise: { select: { name: true } },
              sets: {
                orderBy: { setNumber: 'asc' },
                select: { id: true, setNumber: true, weightKg: true, reps: true, rpe: true, feedback: { select: { body: true }, orderBy: { createdAt: 'asc' } } },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LiveSessionInclude;
type SessionRow = Prisma.LiveSessionGetPayload<{ include: typeof sessionInclude }>;

function toSession(s: SessionRow): LiveSessionDto {
  return {
    id: s.id,
    title: s.title,
    mode: s.mode,
    coachName: name(s.coach),
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
    participants: s.participants.map((p) => ({
      clientId: p.clientId,
      clientName: name(p.client),
      workoutLogId: p.workoutLogId,
      sets: (p.workoutLog?.exerciseLogs ?? []).flatMap((e) =>
        e.sets.map(
          (set): LiveSetDto => ({
            setLogId: set.id,
            exerciseId: e.exerciseId,
            exerciseName: e.exercise.name,
            setNumber: set.setNumber,
            weightKg: set.weightKg.toString(),
            reps: set.reps,
            rpe: set.rpe?.toString() ?? null,
            cue: set.feedback.map((f) => f.body).join('\n') || null,
          }),
        ),
      ),
    })),
  };
}

/**
 * Coach-run sessions. The coach writes sets straight into each participant's own WorkoutLog (stamped
 * `loggedById`), so the engine, records and history treat them like any other log.
 */
@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: WorkoutLogsService,
  ) {}

  async coachView(coachId: string): Promise<CoachLiveDto> {
    const [active, recent, links, exercises] = await Promise.all([
      this.prisma.liveSession.findFirst({ where: { coachId, endedAt: null }, include: sessionInclude }),
      this.prisma.liveSession.findMany({
        where: { coachId, endedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: RECENT,
        include: { participants: { select: { workoutLog: { select: { exerciseLogs: { select: { _count: { select: { sets: true } } } } } } } } },
      }),
      this.prisma.coachClient.findMany({
        where: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
        select: { client: { select: { id: true, name: true, displayName: true } } },
      }),
      this.prisma.exercise.findMany({ where: { archivedAt: null, ...exerciseScope({ coachId }) }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    return {
      active: active && toSession(active),
      recent: recent.map((s) => ({
        id: s.id,
        title: s.title,
        mode: s.mode,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        participantCount: s.participants.length,
        setCount: s.participants.reduce((n, p) => n + (p.workoutLog?.exerciseLogs.reduce((m, e) => m + e._count.sets, 0) ?? 0), 0),
      })),
      clients: links.map(({ client }) => ({ id: client.id, name: name(client) })).sort((a, b) => a.name.localeCompare(b.name)),
      exercises,
    };
  }

  async start(coachId: string, input: StartLiveSessionRequest): Promise<LiveSessionDto> {
    const ids = [...new Set(input.clientIds)];
    const roster = await this.prisma.coachClient.count({ where: { coachId, clientId: { in: ids }, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } });
    if (roster !== ids.length) throw new NotFoundException('Client not found');
    if (input.mode === 'REMOTE' && ids.length > 1) throw new BadRequestException('A remote session is one-to-one. Use in-person mode for a group.');
    try {
      const row = await this.prisma.liveSession.create({
        data: { coachId, title: input.title, mode: input.mode, participants: { create: ids.map((clientId) => ({ clientId })) } },
        include: sessionInclude,
      });
      return toSession(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('End your open session before starting another.');
      throw err;
    }
  }

  /** Tenancy: the session is the coach's; 404 otherwise. */
  private async openSession(coachId: string, id: string) {
    const s = await this.prisma.liveSession.findFirst({ where: { id, coachId }, select: { id: true, title: true, startedAt: true, endedAt: true } });
    if (!s) throw new NotFoundException('Session not found');
    if (s.endedAt) throw new ConflictException('This session has ended.');
    return s;
  }

  async get(coachId: string, id: string): Promise<LiveSessionDto> {
    const s = await this.prisma.liveSession.findFirst({ where: { id, coachId }, include: sessionInclude });
    if (!s) throw new NotFoundException('Session not found');
    return toSession(s);
  }

  /**
   * Appends one set to the participant's log, creating the log on the first set. A repeated `requestId`
   * (offline retry) returns the session unchanged. Writes for one participant are serialized by an advisory lock
   * so concurrent sets cannot collide on order or set number.
   */
  async logSet(coachId: string, id: string, input: LogLiveSetRequest): Promise<LiveSessionDto> {
    const session = await this.openSession(coachId, id);
    const participant = await this.prisma.liveParticipant.findFirst({
      where: { sessionId: session.id, clientId: input.clientId, client: { coachLink: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } } },
    });
    if (!participant) throw new NotFoundException('Client not found');
    const exercise = await this.prisma.exercise.findFirst({ where: { id: input.exerciseId, ...exerciseScope({ coachId, ownerId: input.clientId }) }, select: { id: true } });
    if (!exercise) throw new BadRequestException('Unknown exercise');

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`live:${participant.id}`}))`;
      if (await tx.setLog.findUnique({ where: { requestId: input.requestId }, select: { id: true } })) return false;
      const current = await tx.liveParticipant.findUniqueOrThrow({ where: { id: participant.id }, select: { workoutLogId: true } });
      let workoutLogId = current.workoutLogId;
      if (!workoutLogId) {
        const log = await tx.workoutLog.create({
          data: { clientId: input.clientId, performedAt: session.startedAt, loggedById: coachId, notes: `Live session: ${session.title}` },
        });
        await tx.liveParticipant.update({ where: { id: participant.id }, data: { workoutLogId: log.id } });
        workoutLogId = log.id;
      }
      const exercises = await tx.exerciseLog.findMany({ where: { workoutLogId }, select: { id: true, exerciseId: true, order: true }, orderBy: { order: 'asc' } });
      // Sets of the same lift group under its latest entry unless another lift came after it.
      const last = exercises.at(-1);
      const exerciseLog =
        last?.exerciseId === input.exerciseId
          ? last
          : await tx.exerciseLog.create({ data: { workoutLogId, exerciseId: input.exerciseId, order: (last?.order ?? 0) + 1 }, select: { id: true, exerciseId: true, order: true } });
      const top = await tx.setLog.aggregate({ where: { exerciseLogId: exerciseLog.id }, _max: { setNumber: true } });
      const set = await tx.setLog.create({
        data: {
          exerciseLogId: exerciseLog.id,
          setNumber: (top._max.setNumber ?? 0) + 1,
          reps: input.reps,
          weightKg: input.weightKg,
          rpe: input.rpe ?? null,
          requestId: input.requestId,
        },
      });
      if (input.cue) {
        await tx.sessionFeedback.create({ data: { workoutLogId, exerciseLogId: exerciseLog.id, setLogId: set.id, coachId, body: input.cue } });
      }
      return true;
    });

    if (created) await this.logs.refreshProgression(input.clientId, [input.exerciseId]);
    return this.get(coachId, session.id);
  }

  /** Undo a mistaken set. An exercise left with no sets is removed so the log stays clean. */
  async removeSet(coachId: string, id: string, setLogId: string): Promise<LiveSessionDto> {
    const session = await this.openSession(coachId, id);
    const set = await this.prisma.setLog.findFirst({
      where: { id: setLogId, exerciseLog: { workoutLog: { liveEntry: { sessionId: session.id } } } },
      select: { id: true, exerciseLogId: true, exerciseLog: { select: { exerciseId: true, workoutLog: { select: { clientId: true } } } } },
    });
    if (!set) throw new NotFoundException('Set not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.setLog.delete({ where: { id: set.id } });
      if ((await tx.setLog.count({ where: { exerciseLogId: set.exerciseLogId } })) === 0) await tx.exerciseLog.delete({ where: { id: set.exerciseLogId } });
    });
    await this.logs.refreshProgression(set.exerciseLog.workoutLog.clientId, [set.exerciseLog.exerciseId]);
    return this.get(coachId, session.id);
  }

  /** Ends the session. Participants with no sets leave no log behind. */
  async end(coachId: string, id: string): Promise<void> {
    const session = await this.openSession(coachId, id);
    await this.prisma.$transaction(async (tx) => {
      const empty = await tx.workoutLog.findMany({ where: { liveEntry: { sessionId: session.id }, exerciseLogs: { none: {} } }, select: { id: true } });
      if (empty.length) await tx.workoutLog.deleteMany({ where: { id: { in: empty.map((l) => l.id) } } });
      await tx.liveSession.update({ where: { id: session.id }, data: { endedAt: new Date() } });
    });
  }

  /** The client's open session, read-only. */
  async mine(clientId: string): Promise<LiveSessionDto | null> {
    const s = await this.prisma.liveSession.findFirst({
      where: { endedAt: null, participants: { some: { clientId } }, coach: { coachedClients: { some: { clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } } } },
      include: sessionInclude,
    });
    if (!s) return null;
    const dto = toSession(s);
    // A client sees only their own sets.
    return { ...dto, participants: dto.participants.filter((p) => p.clientId === clientId) };
  }
}
