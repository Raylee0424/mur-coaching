import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Exercise, Prisma } from '@prisma/client';
import { Role } from '@coaching/shared';
import type { ExerciseAlternativesDto, ExerciseDto } from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto, ListExercisesQuery, UpdateExerciseDto } from './dto/exercises.dto';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';
import { sortSafestFirst } from '../limitations/conflict';
import { LimitationsService } from '../limitations/limitations.service';

const toDto = (e: Exercise, overrideClientCount = 0): ExerciseDto => ({
  id: e.id,
  name: e.name,
  muscleGroup: e.muscleGroup,
  equipment: e.equipment,
  loadIncrementKg: e.loadIncrementKg.toString(),
  rpeCap: e.rpeCap?.toString() ?? null,
  repsMin: e.repsMin,
  repsMax: e.repsMax,
  archivedAt: e.archivedAt?.toISOString() ?? null,
  overrideClientCount,
  coachId: e.coachId,
  createdAt: e.createdAt.toISOString(),
});

/** The rep range is all-or-nothing and ordered. Returns the resulting pair for the write. */
function resolveReps(
  current: { repsMin: number | null; repsMax: number | null },
  dto: { repsMin?: number | null; repsMax?: number | null },
): { repsMin: number | null; repsMax: number | null } {
  const repsMin = dto.repsMin !== undefined ? dto.repsMin : current.repsMin;
  const repsMax = dto.repsMax !== undefined ? dto.repsMax : current.repsMax;
  if ((repsMin === null) !== (repsMax === null)) throw new BadRequestException('Set both repsMin and repsMax, or neither');
  if (repsMin !== null && repsMax !== null && repsMin > repsMax) throw new BadRequestException('repsMin cannot exceed repsMax');
  return { repsMin, repsMax };
}

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitations: LimitationsService,
  ) {}

  /**
   * Global library plus the viewer's coach's custom exercises (a coach sees their own). Archived rows are hidden.
   * Coaches also get `overrideClientCount`; clients always see 0.
   */
  async list(user: RequestUser, q: ListExercisesQuery): Promise<ExerciseDto[]> {
    const coachId = await this.coachIdOf(user);
    const rows = await this.prisma.exercise.findMany({
      where: {
        archivedAt: null,
        OR: [{ coachId: null }, ...(coachId ? [{ coachId }] : [])],
        ...(q.muscleGroup ? { muscleGroup: q.muscleGroup } : {}),
        ...(q.q ? { name: { contains: q.q.trim(), mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    const counts = user.role === Role.COACH ? await this.overrideClientCounts(user.id) : new Map<string, number>();
    return rows.map((r) => toDto(r, counts.get(r.id) ?? 0));
  }

  async create(coachId: string, dto: CreateExerciseDto): Promise<ExerciseDto> {
    await this.assertNameFree(coachId, dto.name);
    const reps = resolveReps({ repsMin: null, repsMax: null }, dto);
    try {
      const row = await this.prisma.exercise.create({
        data: {
          coachId,
          name: dto.name,
          muscleGroup: dto.muscleGroup,
          equipment: dto.equipment ?? null,
          rpeCap: dto.rpeCap ?? null,
          ...reps,
          ...(dto.loadIncrementKg !== undefined ? { loadIncrementKg: dto.loadIncrementKg } : {}),
        },
      });
      return toDto(row);
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Only the coach's own custom exercises; global, archived or other coaches' rows are 404. */
  async update(coachId: string, id: string, dto: UpdateExerciseDto): Promise<ExerciseDto> {
    const existing = await this.findOwned(coachId, id);
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameFree(coachId, dto.name);
    }
    const touchesReps = dto.repsMin !== undefined || dto.repsMax !== undefined;
    const reps = touchesReps ? resolveReps(existing, dto) : null;
    try {
      const row = await this.prisma.exercise.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.muscleGroup ? { muscleGroup: dto.muscleGroup } : {}),
          ...(dto.equipment !== undefined ? { equipment: dto.equipment } : {}),
          ...(dto.loadIncrementKg !== undefined ? { loadIncrementKg: dto.loadIncrementKg } : {}),
          ...(dto.rpeCap !== undefined ? { rpeCap: dto.rpeCap } : {}),
          ...(reps ?? {}),
        },
      });
      return toDto(row);
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Copy of a global or own exercise into the coach's library, with a free "(copy)" name. */
  async duplicate(coachId: string, id: string): Promise<ExerciseDto> {
    const src = await this.prisma.exercise.findFirst({ where: { id, archivedAt: null, OR: [{ coachId: null }, { coachId }] } });
    if (!src) throw new NotFoundException('Exercise not found');

    const taken = await this.prisma.exercise.findMany({
      where: { name: { startsWith: src.name, mode: 'insensitive' }, OR: [{ coachId: null }, { coachId }] },
      select: { name: true },
    });
    const used = new Set(taken.map((t) => t.name.toLowerCase()));
    let name = `${src.name} (copy)`;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${src.name} (copy ${n})`;

    try {
      const row = await this.prisma.exercise.create({
        data: {
          coachId,
          name,
          muscleGroup: src.muscleGroup,
          equipment: src.equipment,
          loadIncrementKg: src.loadIncrementKg,
          rpeCap: src.rpeCap,
          repsMin: src.repsMin,
          repsMax: src.repsMax,
        },
      });
      return toDto(row);
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Soft delete: hidden from lists and pickers; programs, logs and recommendations keep referencing it. */
  async archive(coachId: string, id: string): Promise<void> {
    await this.findOwned(coachId, id);
    await this.prisma.exercise.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  /** Same muscle group, not archived, visible to the client's coach, each with the client's latest top set. */
  async alternatives(user: RequestUser, id: string): Promise<ExerciseAlternativesDto> {
    const coachId = await this.coachIdOf(user);
    const visible: Prisma.ExerciseWhereInput['OR'] = [{ coachId: null }, ...(coachId ? [{ coachId }] : [])];
    // The source may itself be archived: the prescription still points at it.
    const source = await this.prisma.exercise.findFirst({ where: { id, OR: visible } });
    if (!source) throw new NotFoundException('Exercise not found');

    const alts = await this.prisma.exercise.findMany({
      where: { id: { not: id }, muscleGroup: source.muscleGroup, archivedAt: null, OR: visible },
      orderBy: { name: 'asc' },
    });
    const logs = await this.prisma.exerciseLog.findMany({
      where: { exerciseId: { in: alts.map((a) => a.id) }, workoutLog: { clientId: user.id } },
      orderBy: { workoutLog: { performedAt: 'desc' } },
      distinct: ['exerciseId'],
      include: { sets: { where: { isWarmup: false, reps: { gt: 0 } } }, workoutLog: { select: { performedAt: true } } },
    });
    const latest = new Map(logs.map((l) => [l.exerciseId, l]));
    const flags = await this.limitations.flagsFor(user.id, alts, new Date().toISOString().slice(0, 10));

    const options = alts.map((a) => {
        const log = latest.get(a.id);
        const top = log?.sets.reduce<(typeof log.sets)[number] | null>((best, s) => {
          if (!best) return s;
          const heavier = s.weightKg.greaterThan(best.weightKg);
          const sameWeightMoreReps = s.weightKg.equals(best.weightKg) && s.reps > best.reps;
          return heavier || sameWeightMoreReps ? s : best;
        }, null);
        return {
          id: a.id,
          name: a.name,
          muscleGroup: a.muscleGroup,
          equipment: a.equipment,
          suggested:
            log && top
              ? {
                  weightKg: top.weightKg.toString(),
                  reps: top.reps,
                  rpe: top.rpe?.toString() ?? null,
                  performedAt: log.workoutLog.performedAt.toISOString(),
                }
              : null,
          limitation: flags.get(a.id) ?? null,
        };
    });
    return {
      exercise: { id: source.id, name: source.name, muscleGroup: source.muscleGroup },
      // Safe swaps first: unflagged, then CAUTION, then AVOID.
      alternatives: sortSafestFirst(options),
    };
  }

  private async findOwned(coachId: string, id: string): Promise<Exercise> {
    const existing = await this.prisma.exercise.findFirst({ where: { id, coachId, archivedAt: null } });
    if (!existing) throw new NotFoundException('Exercise not found');
    return existing;
  }

  /**
   * exerciseId → number of the coach's clients who logged it AND carry per-client engine overrides
   * (rpeCap, rep range, increment, deload %, sessions analysed). There is no per-exercise client override.
   */
  private async overrideClientCounts(coachId: string): Promise<Map<string, number>> {
    const links = await this.prisma.coachClient.findMany({
      where: {
        coachId,
        status: { in: [...ACCESSIBLE_LINK_STATUSES] },
        OR: [
          { rpeCap: { not: null } },
          { repsMin: { not: null } },
          { repsMax: { not: null } },
          { loadIncrementKg: { not: null } },
          { deloadPercent: { not: null } },
          { sessionsAnalyzed: { not: null } },
        ],
      },
      select: { clientId: true },
    });
    if (links.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<{ exerciseId: string; n: number }[]>(Prisma.sql`
      SELECT el."exerciseId", COUNT(DISTINCT wl."clientId")::int AS n
      FROM "ExerciseLog" el
      JOIN "WorkoutLog" wl ON wl."id" = el."workoutLogId"
      WHERE wl."clientId" IN (${Prisma.join(links.map((l) => l.clientId))})
      GROUP BY el."exerciseId"`);
    return new Map(rows.map((r) => [r.exerciseId, r.n]));
  }

  private async coachIdOf(user: RequestUser): Promise<string | null> {
    if (user.role === Role.COACH) return user.id;
    const link = await this.prisma.coachClient.findUnique({ where: { clientId: user.id } });
    return link && isAccessibleLink(link.status) ? link.coachId : null;
  }

  /** Names are unique case-insensitively across the global library and the coach's own exercises. */
  private async assertNameFree(coachId: string, name: string): Promise<void> {
    const clash = await this.prisma.exercise.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, OR: [{ coachId: null }, { coachId }] },
      select: { id: true },
    });
    if (clash) throw new ConflictException('An exercise with this name already exists');
  }

  private mapDuplicate(err: unknown): unknown {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
      ? new ConflictException('An exercise with this name already exists')
      : err;
  }
}
