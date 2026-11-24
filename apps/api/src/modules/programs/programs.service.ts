import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, Prisma, Role } from '@prisma/client';
import { PERIODIZATION_LIMITS, validatePeriodization } from '@coaching/shared';
import type {
  AssignmentDto,
  ClientProgramConflictsDto,
  DuplicateProgramRequest,
  MesocycleDto,
  MesocycleInput,
  ProgramDto,
  ProgramShareDto,
  ProgramSummaryDto,
  ProgramTreeInput,
  SharedProgramDto,
  SportCategoryDto,
} from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import { exerciseScope } from '../exercises/exercise-visibility';
import { CONFLICT_EXERCISE_SELECT, programConflicts } from '../limitations/conflict';
import { LimitationsService } from '../limitations/limitations.service';
import { ScheduleService } from '../schedule/schedule.service';
import { planTreeSync, referencedExerciseIds, type TreePlan } from './tree-diff';

const treeInclude = {
  workouts: {
    orderBy: [{ weekNumber: 'asc' }, { dayNumber: 'asc' }],
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: { exercise: { select: { id: true, name: true, muscleGroup: true } } },
      },
    },
  },
  assignments: { where: { status: AssignmentStatus.ACTIVE }, select: { clientId: true } },
  mesocycles: { orderBy: { position: 'asc' }, include: { microcycles: { orderBy: { startWeek: 'asc' } } } },
  sports: { include: { sport: true }, orderBy: { sport: { name: 'asc' } } },
} satisfies Prisma.ProgramInclude;

type ProgramRow = Prisma.ProgramGetPayload<{ include: typeof treeInclude }>;

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

function toMesocycleDto(m: ProgramRow['mesocycles'][number]): MesocycleDto {
  return {
    id: m.id,
    name: m.name,
    focus: m.focus,
    startWeek: m.startWeek,
    endWeek: m.endWeek,
    microcycles: m.microcycles.map((c) => ({
      id: c.id,
      label: c.label,
      startWeek: c.startWeek,
      endWeek: c.endWeek,
      isDeload: c.isDeload,
      rpeMin: c.rpeMin?.toString() ?? null,
      rpeMax: c.rpeMax?.toString() ?? null,
      volumeDeltaPct: c.volumeDeltaPct,
    })),
  };
}

/** Program templates. Coaches own them; clients may read programs they are (or were) assigned. */
@Injectable()
export class ProgramsService {
  private readonly logger = new Logger(ProgramsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly limitations: LimitationsService,
    private readonly schedule: ScheduleService,
  ) {}

  async sportCategories(): Promise<SportCategoryDto[]> {
    return this.prisma.sportCategory.findMany({ orderBy: [{ group: 'asc' }, { name: 'asc' }], select: { id: true, name: true, group: true } });
  }

  /** `template`: true = templates only, false = regular programs only, undefined = all. */
  async list(coachId: string, template?: boolean): Promise<ProgramSummaryDto[]> {
    const rows = await this.prisma.program.findMany({
      where: { coachId, ...(template === undefined ? {} : { isTemplate: template }) },
      orderBy: { updatedAt: 'desc' },
      include: {
        workouts: { where: { weekNumber: 1 }, select: { dayNumber: true } },
        _count: { select: { assignments: { where: { status: AssignmentStatus.ACTIVE } } } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationWeeks: p.durationWeeks,
      isTemplate: p.isTemplate,
      daysPerWeek: new Set(p.workouts.map((w) => w.dayNumber)).size,
      activeAssignments: p._count.assignments,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async get(user: RequestUser, id: string): Promise<ProgramDto> {
    const where: Prisma.ProgramWhereInput =
      user.role === Role.COACH
        ? { id, coachId: user.id }
        : { id, assignments: { some: { clientId: user.id, status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] } } } };
    const row = await this.prisma.program.findFirst({ where, include: treeInclude });
    if (!row) throw new NotFoundException('Program not found');
    return this.toDto(row);
  }

  async create(coachId: string, input: ProgramTreeInput): Promise<ProgramDto> {
    const plan = this.plan({ workouts: [] }, input);
    await this.assertExercisesVisible(coachId, input);
    this.assertPeriodization(input.mesocycles ?? [], input.durationWeeks);
    await this.assertSports(input.sportCategoryIds);
    const id = await this.prisma.$transaction(async (tx) => {
      const program = await tx.program.create({
        data: {
          coachId,
          name: input.name,
          description: input.description || null,
          durationWeeks: input.durationWeeks,
          isTemplate: input.isTemplate ?? false,
        },
      });
      await this.apply(tx, program.id, plan);
      await this.writePeriodization(tx, program.id, input);
      return program.id;
    });
    return this.get({ id: coachId, role: Role.COACH }, id);
  }

  async replace(coachId: string, id: string, input: ProgramTreeInput): Promise<ProgramDto> {
    const current = await this.prisma.program.findFirst({
      where: { id, coachId },
      select: {
        workouts: { select: { id: true, exercises: { select: { id: true } } } },
        mesocycles: { include: { microcycles: true } },
      },
    });
    if (!current) throw new NotFoundException('Program not found');
    const plan = this.plan(current, input);
    await this.assertExercisesVisible(coachId, input);
    // Blocks left untouched must still fit a shortened program.
    this.assertPeriodization(
      input.mesocycles ?? current.mesocycles.map((m) => ({ ...m, microcycles: m.microcycles.map((c) => ({ ...c, rpeMin: c.rpeMin?.toNumber() ?? null, rpeMax: c.rpeMax?.toNumber() ?? null })) })),
      input.durationWeeks,
    );
    await this.assertSports(input.sportCategoryIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.program.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description || null,
          durationWeeks: input.durationWeeks,
          ...(input.isTemplate !== undefined ? { isTemplate: input.isTemplate } : {}),
        },
      });
      await this.apply(tx, id, plan);
      await this.writePeriodization(tx, id, input);
    });
    // Saved: now move the clients' future sessions. Failing here must not report the save as failed.
    await this.schedule.syncProgram(id).catch((err: unknown) => this.logger.error(`Calendar sync failed for program ${id}`, err));
    return this.get({ id: coachId, role: Role.COACH }, id);
  }

  /**
   * Deep copy owned by the same coach: workouts and prescriptions, no assignments or history.
   * `asTemplate` saves it as a template; otherwise the copy is a regular, assignable program.
   */
  async duplicate(coachId: string, id: string, req: DuplicateProgramRequest): Promise<ProgramDto> {
    const src = await this.prisma.program.findFirst({
      where: { id, coachId },
      include: {
        workouts: { include: { exercises: { orderBy: { order: 'asc' } } } },
        mesocycles: { orderBy: { position: 'asc' }, include: { microcycles: true } },
        sports: { select: { sportCategoryId: true } },
      },
    });
    if (!src) throw new NotFoundException('Program not found');
    const copyId = await this.prisma.$transaction(async (tx) => {
      const copy = await tx.program.create({
        data: {
          coachId,
          name: req.name?.trim() || `${src.name} (copy)`,
          description: src.description,
          durationWeeks: src.durationWeeks,
          isTemplate: req.asTemplate ?? false,
          sports: { create: src.sports.map((x) => ({ sportCategoryId: x.sportCategoryId })) },
          mesocycles: {
            create: src.mesocycles.map((m) => ({
              name: m.name,
              focus: m.focus,
              startWeek: m.startWeek,
              endWeek: m.endWeek,
              position: m.position,
              microcycles: {
                create: m.microcycles.map((c) => ({
                  label: c.label,
                  startWeek: c.startWeek,
                  endWeek: c.endWeek,
                  isDeload: c.isDeload,
                  rpeMin: c.rpeMin,
                  rpeMax: c.rpeMax,
                  volumeDeltaPct: c.volumeDeltaPct,
                })),
              },
            })),
          },
          workouts: {
            create: src.workouts.map((w) => ({
              weekNumber: w.weekNumber,
              dayNumber: w.dayNumber,
              name: w.name,
              exercises: {
                create: w.exercises.map((e) => ({
                  exerciseId: e.exerciseId,
                  order: e.order,
                  targetSets: e.targetSets,
                  targetRepsMin: e.targetRepsMin,
                  targetRepsMax: e.targetRepsMax,
                  targetRpe: e.targetRpe,
                  targetWeightKg: e.targetWeightKg,
                  restSeconds: e.restSeconds,
                  notes: e.notes,
                })),
              },
            })),
          },
        },
      });
      return copy.id;
    });
    return this.get({ id: coachId, role: Role.COACH }, copyId);
  }

  async remove(coachId: string, id: string): Promise<void> {
    const program = await this.prisma.program.findFirst({
      where: { id, coachId },
      select: { _count: { select: { assignments: true } } },
    });
    if (!program) throw new NotFoundException('Program not found');
    if (program._count.assignments > 0) {
      throw new ConflictException('This program has been assigned to clients and cannot be deleted');
    }
    await this.prisma.program.delete({ where: { id } });
  }

  /**
   * Cancels the client's current ACTIVE assignment and starts the new one, atomically, with a dated calendar.
   * `groupId` records a bulk assignment. The old plan's undone sessions go; its completed ones stay as history.
   */
  async assign(coachId: string, clientId: string, programId: string, startDate: string, groupId: string | null = null): Promise<AssignmentDto> {
    const program = await this.prisma.program.findFirst({ where: { id: programId, coachId }, select: { id: true } });
    if (!program) throw new BadRequestException('Unknown program');
    const row = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.programAssignment.findMany({ where: { clientId, status: AssignmentStatus.ACTIVE }, select: { id: true } });
      await tx.programAssignment.updateMany({ where: { clientId, status: AssignmentStatus.ACTIVE }, data: { status: AssignmentStatus.CANCELLED } });
      await this.schedule.dropPlanned(previous.map((a) => a.id), tx);
      const created = await tx.programAssignment.create({ data: { programId, clientId, groupId, startDate: new Date(`${startDate}T00:00:00.000Z`) } });
      await this.schedule.syncAssignment(created.id, { initial: true, db: tx });
      return created;
    });
    return { id: row.id, programId: row.programId, clientId: row.clientId, groupId: row.groupId, startDate: row.startDate.toISOString(), status: row.status };
  }

  /** Mints a read-only preview link, replacing any earlier one. The raw token is returned once; only its hash is kept. */
  async createShare(coachId: string, id: string): Promise<ProgramShareDto> {
    const token = randomBytes(32).toString('base64url');
    const { count } = await this.prisma.program.updateMany({ where: { id, coachId }, data: { shareTokenHash: hashToken(token) } });
    if (count === 0) throw new NotFoundException('Program not found');
    return { token };
  }

  async revokeShare(coachId: string, id: string): Promise<void> {
    const { count } = await this.prisma.program.updateMany({ where: { id, coachId }, data: { shareTokenHash: null } });
    if (count === 0) throw new NotFoundException('Program not found');
  }

  /** Public, read-only. Exposes the plan only: no clients, no coach contact details, no notes. */
  async getShared(token: string): Promise<SharedProgramDto> {
    const row = await this.prisma.program.findUnique({
      where: { shareTokenHash: hashToken(token) },
      include: {
        coach: { select: { name: true, displayName: true } },
        mesocycles: { orderBy: { position: 'asc' }, include: { microcycles: { orderBy: { startWeek: 'asc' } } } },
        sports: { include: { sport: true }, orderBy: { sport: { name: 'asc' } } },
        workouts: {
          orderBy: [{ weekNumber: 'asc' }, { dayNumber: 'asc' }],
          include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: { select: { name: true } } } } },
        },
      },
    });
    if (!row) throw new NotFoundException('This preview link is no longer valid');
    return {
      name: row.name,
      description: row.description,
      durationWeeks: row.durationWeeks,
      coachName: row.coach.displayName ?? row.coach.name,
      sports: row.sports.map((x) => ({ id: x.sport.id, name: x.sport.name, group: x.sport.group })),
      mesocycles: row.mesocycles.map(toMesocycleDto),
      workouts: row.workouts.map((w) => ({
        weekNumber: w.weekNumber,
        dayNumber: w.dayNumber,
        name: w.name,
        exercises: w.exercises.map((e) => ({
          name: e.exercise.name,
          sets: e.targetSets,
          repsMin: e.targetRepsMin,
          repsMax: e.targetRepsMax,
          rpe: e.targetRpe?.toString() ?? null,
          restSeconds: e.restSeconds,
        })),
      })),
    };
  }

  /**
   * Advisory limitation conflicts for one of the coach's programs, using limitations active on `day`.
   * With `clientIds`: those clients, e.g. before assigning. Without: every client on an ACTIVE assignment of it.
   * Tenancy: only clients with an accessible link to this coach are considered; other ids are silently dropped.
   * Only clients with at least one conflict are returned.
   */
  async conflicts(coachId: string, programId: string, clientIds?: readonly string[], day = new Date().toISOString().slice(0, 10)): Promise<ClientProgramConflictsDto[]> {
    const program = await this.prisma.program.findFirst({
      where: { id: programId, coachId },
      include: {
        workouts: {
          orderBy: [{ weekNumber: 'asc' }, { dayNumber: 'asc' }],
          include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: { select: { ...CONFLICT_EXERCISE_SELECT, name: true } } } } },
        },
        assignments: { where: { status: AssignmentStatus.ACTIVE }, select: { clientId: true } },
      },
    });
    if (!program) throw new NotFoundException('Program not found');

    const candidateIds = clientIds ? [...clientIds] : program.assignments.map((a) => a.clientId);
    const clients = await this.prisma.user.findMany({
      where: { id: { in: candidateIds }, coachLink: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const out: ClientProgramConflictsDto[] = [];
    for (const c of clients) {
      const rows = await this.limitations.activeRows(c.id, day);
      if (rows.length === 0) continue;
      const conflicts = programConflicts(rows, program.workouts, day);
      if (conflicts.length > 0) out.push({ clientId: c.id, clientName: c.name, conflicts });
    }
    return out;
  }

  private assertPeriodization(mesocycles: readonly MesocycleInput[], durationWeeks: number): void {
    if (mesocycles.length > PERIODIZATION_LIMITS.maxMesocycles) throw new BadRequestException(`At most ${PERIODIZATION_LIMITS.maxMesocycles} mesocycles`);
    const problem = validatePeriodization(mesocycles, durationWeeks);
    if (problem) throw new BadRequestException(problem);
  }

  private async assertSports(ids: readonly string[] | undefined): Promise<void> {
    if (!ids || ids.length === 0) return;
    if (new Set(ids).size !== ids.length) throw new BadRequestException('A sport is listed twice');
    if (ids.length > PERIODIZATION_LIMITS.maxSports) throw new BadRequestException(`Choose at most ${PERIODIZATION_LIMITS.maxSports} sports`);
    if ((await this.prisma.sportCategory.count({ where: { id: { in: [...ids] } } })) !== ids.length) throw new BadRequestException('Unknown sport');
  }

  /** Blocks and sports are replaced wholesale (nothing else references them); omitted fields stay as they are. */
  private async writePeriodization(tx: Prisma.TransactionClient, programId: string, input: ProgramTreeInput): Promise<void> {
    if (input.mesocycles !== undefined) {
      await tx.mesocycle.deleteMany({ where: { programId } });
      for (const [position, m] of [...input.mesocycles].sort((a, b) => a.startWeek - b.startWeek).entries()) {
        await tx.mesocycle.create({
          data: {
            programId,
            position,
            name: m.name.trim(),
            focus: m.focus?.trim() || null,
            startWeek: m.startWeek,
            endWeek: m.endWeek,
            microcycles: {
              create: m.microcycles.map((c) => ({
                label: c.label.trim(),
                startWeek: c.startWeek,
                endWeek: c.endWeek,
                isDeload: c.isDeload,
                rpeMin: c.rpeMin ?? null,
                rpeMax: c.rpeMax ?? null,
                volumeDeltaPct: c.volumeDeltaPct ?? null,
              })),
            },
          },
        });
      }
    }
    if (input.sportCategoryIds !== undefined) {
      await tx.programSportCategory.deleteMany({ where: { programId } });
      await tx.programSportCategory.createMany({ data: input.sportCategoryIds.map((sportCategoryId) => ({ programId, sportCategoryId })) });
    }
  }

  private plan(existing: Parameters<typeof planTreeSync>[0], input: ProgramTreeInput): TreePlan {
    const result = planTreeSync(existing, input);
    if (!result.ok) throw new BadRequestException(result.error);
    return result.plan;
  }

  private async assertExercisesVisible(coachId: string, input: ProgramTreeInput): Promise<void> {
    const ids = referencedExerciseIds(input);
    if (ids.length === 0) return;
    const found = await this.prisma.exercise.count({ where: { id: { in: ids }, ...exerciseScope({ coachId }) } });
    if (found !== ids.length) throw new BadRequestException('Unknown exercise');
  }

  /**
   * Executes a plan. Unique (week, day) and (workout, order) slots can collide mid-update when rows swap
   * places, so existing rows are first parked on negative values, then written to their final slots.
   * Workouts are deleted last: a prescription may be moving out of one, and deleting first would cascade it.
   */
  private async apply(tx: Prisma.TransactionClient, programId: string, plan: TreePlan): Promise<void> {
    if (plan.deleteExerciseIds.length > 0) await tx.workoutExercise.deleteMany({ where: { id: { in: plan.deleteExerciseIds } } });

    for (const [i, w] of plan.updateWorkouts.entries()) {
      await tx.workout.update({ where: { id: w.id }, data: { dayNumber: -(i + 1) } });
    }
    for (const [i, id] of plan.deleteWorkoutIds.entries()) {
      await tx.workout.update({ where: { id }, data: { dayNumber: -(1000 + i) } });
    }
    for (const [i, e] of plan.updateExercises.entries()) {
      await tx.workoutExercise.update({ where: { id: e.id }, data: { order: -(i + 1) } });
    }

    const refToId = new Map<string, string>();
    for (const w of plan.updateWorkouts) {
      await tx.workout.update({ where: { id: w.id }, data: { weekNumber: w.weekNumber, dayNumber: w.dayNumber, name: w.name } });
      refToId.set(w.id, w.id);
    }
    for (const w of plan.createWorkouts) {
      const row = await tx.workout.create({ data: { programId, weekNumber: w.weekNumber, dayNumber: w.dayNumber, name: w.name } });
      refToId.set(w.ref, row.id);
    }

    const workoutId = (ref: string): string => {
      const id = refToId.get(ref);
      if (!id) throw new Error(`unresolved workout ref ${ref}`);
      return id;
    };
    for (const { id, workoutRef, ...fields } of plan.updateExercises) {
      await tx.workoutExercise.update({ where: { id }, data: { ...fields, workoutId: workoutId(workoutRef) } });
    }
    if (plan.deleteWorkoutIds.length > 0) await tx.workout.deleteMany({ where: { id: { in: plan.deleteWorkoutIds }, programId } });
    if (plan.createExercises.length > 0) {
      await tx.workoutExercise.createMany({
        data: plan.createExercises.map(({ workoutRef, ...fields }) => ({ ...fields, workoutId: workoutId(workoutRef) })),
      });
    }
  }

  private toDto(p: ProgramRow): ProgramDto {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      durationWeeks: p.durationWeeks,
      isTemplate: p.isTemplate,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      activeClientIds: p.assignments.map((a) => a.clientId),
      shareActive: p.shareTokenHash !== null,
      mesocycles: p.mesocycles.map(toMesocycleDto),
      sports: p.sports.map((x) => ({ id: x.sport.id, name: x.sport.name, group: x.sport.group })),
      workouts: p.workouts.map((w) => ({
        id: w.id,
        weekNumber: w.weekNumber,
        dayNumber: w.dayNumber,
        name: w.name,
        exercises: w.exercises.map((e) => ({
          id: e.id,
          exerciseId: e.exerciseId,
          exercise: e.exercise,
          order: e.order,
          targetSets: e.targetSets,
          targetRepsMin: e.targetRepsMin,
          targetRepsMax: e.targetRepsMax,
          targetRpe: e.targetRpe?.toNumber() ?? null,
          restSeconds: e.restSeconds,
          notes: e.notes,
        })),
      })),
    };
  }
}
