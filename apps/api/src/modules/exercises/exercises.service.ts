import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MuscleGroup, MuscleRole, Role } from '@coaching/shared';
import type { ExerciseAlternativesDto, ExerciseDto, ExerciseMuscleDto, LimitationFlag } from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExerciseDto, ListExercisesQuery, UpdateExerciseDto } from './dto/exercises.dto';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';
import { sortSafestFirst } from '../limitations/conflict';
import { LimitationsService } from '../limitations/limitations.service';
import { exerciseScope } from './exercise-visibility';

const withMuscles = { muscles: true } satisfies Prisma.ExerciseInclude;
type ExerciseRow = Prisma.ExerciseGetPayload<{ include: typeof withMuscles }>;

const MUSCLE_ORDER = Object.values(MuscleGroup);

/** Main muscle first, then other primaries, then secondaries; enum order within each group. */
function sortedMuscles(main: MuscleGroup, rows: readonly ExerciseMuscleDto[]): ExerciseMuscleDto[] {
  const rank = (m: ExerciseMuscleDto): number => (m.muscle === main ? 0 : m.role === MuscleRole.PRIMARY ? 1 : 2);
  return [...rows].sort((a, b) => rank(a) - rank(b) || MUSCLE_ORDER.indexOf(a.muscle) - MUSCLE_ORDER.indexOf(b.muscle));
}

/** One row per muscle; the main muscle is always PRIMARY, whatever `extras` says about it. */
export function muscleRows(main: MuscleGroup, extras: readonly ExerciseMuscleDto[] = []): ExerciseMuscleDto[] {
  const byMuscle = new Map<MuscleGroup, MuscleRole>();
  for (const m of extras) byMuscle.set(m.muscle, m.role);
  byMuscle.set(main, MuscleRole.PRIMARY);
  return sortedMuscles(main, [...byMuscle].map(([muscle, role]) => ({ muscle, role })));
}

const toDto = (e: ExerciseRow, overrideClientCount = 0, limitation: LimitationFlag | null = null): ExerciseDto => ({
  id: e.id,
  name: e.name,
  muscleGroup: e.muscleGroup,
  muscles: sortedMuscles(
    e.muscleGroup,
    e.muscles.map((m) => ({ muscle: m.muscle, role: m.role })),
  ),
  equipment: e.equipment,
  pattern: e.pattern,
  profile: e.profile,
  position: e.position,
  loadIncrementKg: e.loadIncrementKg.toString(),
  rpeCap: e.rpeCap?.toString() ?? null,
  repsMin: e.repsMin,
  repsMax: e.repsMax,
  archivedAt: e.archivedAt?.toISOString() ?? null,
  overrideClientCount,
  coachId: e.coachId,
  ownerId: e.ownerId,
  limitation,
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

/** Where a user's own custom exercises live: `coachId` for a coach, `ownerId` for an athlete. */
const ownedBy = (user: RequestUser): { coachId: string } | { ownerId: string } =>
  user.role === Role.COACH ? { coachId: user.id } : { ownerId: user.id };

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * One exercise library for coaches and athletes. Coaches own `coachId` rows, athletes own `ownerId` rows;
 * each edits, duplicates and archives only their own. Visibility always goes through `exerciseScope`.
 */
@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitations: LimitationsService,
  ) {}

  /**
   * Global library plus the coach's custom exercises plus (for an athlete) their own. Archived rows are hidden.
   * Coaches also get `overrideClientCount`; clients get the limitation flag active today.
   */
  async list(user: RequestUser, q: ListExercisesQuery): Promise<ExerciseDto[]> {
    const rows = await this.prisma.exercise.findMany({
      where: {
        archivedAt: null,
        ...(await this.scopeOf(user)),
        ...(q.muscleGroup ? { muscles: { some: { muscle: q.muscleGroup } } } : {}),
        ...(q.equipment ? { equipment: q.equipment } : {}),
        ...(q.profile ? { profile: q.profile } : {}),
        ...(q.q ? { name: { contains: q.q.trim(), mode: 'insensitive' } } : {}),
      },
      include: withMuscles,
      orderBy: { name: 'asc' },
    });
    if (user.role === Role.COACH) {
      const counts = await this.overrideClientCounts(user.id);
      return rows.map((r) => toDto(r, counts.get(r.id) ?? 0));
    }
    const flags = await this.limitations.flagsFor(user.id, rows, today());
    return rows.map((r) => toDto(r, 0, flags.get(r.id) ?? null));
  }

  async create(user: RequestUser, dto: CreateExerciseDto): Promise<ExerciseDto> {
    await this.assertNameFree(user, dto.name);
    const reps = resolveReps({ repsMin: null, repsMax: null }, dto);
    try {
      const row = await this.prisma.exercise.create({
        data: {
          ...ownedBy(user),
          name: dto.name,
          muscleGroup: dto.muscleGroup,
          equipment: dto.equipment ?? null,
          pattern: dto.pattern ?? null,
          profile: dto.profile ?? null,
          position: dto.position ?? null,
          rpeCap: dto.rpeCap ?? null,
          ...reps,
          ...(dto.loadIncrementKg !== undefined ? { loadIncrementKg: dto.loadIncrementKg } : {}),
          muscles: { create: muscleRows(dto.muscleGroup, dto.muscles) },
        },
        include: withMuscles,
      });
      return toDto(row);
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Only the caller's own custom exercises; global, archived or other users' rows are 404. */
  async update(user: RequestUser, id: string, dto: UpdateExerciseDto): Promise<ExerciseDto> {
    const existing = await this.findOwned(user, id);
    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameFree(user, dto.name);
    }
    const touchesReps = dto.repsMin !== undefined || dto.repsMax !== undefined;
    const reps = touchesReps ? resolveReps(existing, dto) : null;
    const touchesMuscles = dto.muscleGroup !== undefined || dto.muscles !== undefined;
    const main = dto.muscleGroup ?? existing.muscleGroup;
    const muscles = touchesMuscles ? muscleRows(main, dto.muscles ?? existing.muscles) : null;
    try {
      const row = await this.prisma.exercise.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.muscleGroup ? { muscleGroup: dto.muscleGroup } : {}),
          ...(dto.equipment !== undefined ? { equipment: dto.equipment } : {}),
          ...(dto.pattern !== undefined ? { pattern: dto.pattern } : {}),
          ...(dto.profile !== undefined ? { profile: dto.profile } : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
          ...(dto.loadIncrementKg !== undefined ? { loadIncrementKg: dto.loadIncrementKg } : {}),
          ...(dto.rpeCap !== undefined ? { rpeCap: dto.rpeCap } : {}),
          ...(reps ?? {}),
          ...(muscles ? { muscles: { deleteMany: {}, create: muscles } } : {}),
        },
        include: withMuscles,
      });
      return toDto(row);
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Copy of any visible exercise into the caller's own library, with a free "(copy)" name. */
  async duplicate(user: RequestUser, id: string): Promise<ExerciseDto> {
    const scope = await this.scopeOf(user);
    const src = await this.prisma.exercise.findFirst({ where: { id, archivedAt: null, ...scope }, include: withMuscles });
    if (!src) throw new NotFoundException('Exercise not found');

    const taken = await this.prisma.exercise.findMany({
      where: { name: { startsWith: src.name, mode: 'insensitive' }, ...scope },
      select: { name: true },
    });
    const used = new Set(taken.map((t) => t.name.toLowerCase()));
    let name = `${src.name} (copy)`;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${src.name} (copy ${n})`;

    try {
      const row = await this.prisma.exercise.create({
        data: {
          ...ownedBy(user),
          name,
          muscleGroup: src.muscleGroup,
          equipment: src.equipment,
          pattern: src.pattern,
          profile: src.profile,
          position: src.position,
          loadIncrementKg: src.loadIncrementKg,
          rpeCap: src.rpeCap,
          repsMin: src.repsMin,
          repsMax: src.repsMax,
          muscles: { create: muscleRows(src.muscleGroup, src.muscles) },
        },
        include: withMuscles,
      });
      return toDto(row);
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  /** Soft delete: hidden from lists and pickers; programs, logs and recommendations keep referencing it. */
  async archive(user: RequestUser, id: string): Promise<void> {
    await this.findOwned(user, id);
    await this.prisma.exercise.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  /** Same muscle group, not archived, visible to the client, each with the client's latest top set. */
  async alternatives(user: RequestUser, id: string): Promise<ExerciseAlternativesDto> {
    const scope = await this.scopeOf(user);
    // The source may itself be archived: the prescription still points at it.
    const source = await this.prisma.exercise.findFirst({ where: { id, ...scope } });
    if (!source) throw new NotFoundException('Exercise not found');

    const alts = await this.prisma.exercise.findMany({
      where: { id: { not: id }, muscleGroup: source.muscleGroup, archivedAt: null, ...scope },
      include: withMuscles,
      orderBy: { name: 'asc' },
    });
    const logs = await this.prisma.exerciseLog.findMany({
      where: { exerciseId: { in: alts.map((a) => a.id) }, workoutLog: { clientId: user.id } },
      orderBy: { workoutLog: { performedAt: 'desc' } },
      distinct: ['exerciseId'],
      include: { sets: { where: { isWarmup: false, reps: { gt: 0 } } }, workoutLog: { select: { performedAt: true } } },
    });
    const latest = new Map(logs.map((l) => [l.exerciseId, l]));
    const flags = await this.limitations.flagsFor(user.id, alts, today());

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

  private async findOwned(user: RequestUser, id: string): Promise<ExerciseRow> {
    const existing = await this.prisma.exercise.findFirst({ where: { id, ...ownedBy(user), archivedAt: null }, include: withMuscles });
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

  /** Coach: global + own. Athlete: global + their coach's (while the link is accessible) + their own. */
  private async scopeOf(user: RequestUser): Promise<Prisma.ExerciseWhereInput> {
    if (user.role === Role.COACH) return exerciseScope({ coachId: user.id });
    const link = await this.prisma.coachClient.findUnique({ where: { clientId: user.id } });
    return exerciseScope({ coachId: link && isAccessibleLink(link.status) ? link.coachId : null, ownerId: user.id });
  }

  /** Names are unique case-insensitively across everything the caller can see. */
  private async assertNameFree(user: RequestUser, name: string): Promise<void> {
    const clash = await this.prisma.exercise.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(await this.scopeOf(user)) },
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
