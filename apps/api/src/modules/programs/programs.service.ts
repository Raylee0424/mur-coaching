import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, Prisma, Role } from '@prisma/client';
import type {
  AssignmentDto,
  ClientProgramConflictsDto,
  DuplicateProgramRequest,
  ProgramDto,
  ProgramSummaryDto,
  ProgramTreeInput,
} from '@coaching/shared';
import type { RequestUser } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import { exerciseScope } from '../exercises/exercise-visibility';
import { CONFLICT_EXERCISE_SELECT, programConflicts } from '../limitations/conflict';
import { LimitationsService } from '../limitations/limitations.service';
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
} satisfies Prisma.ProgramInclude;

type ProgramRow = Prisma.ProgramGetPayload<{ include: typeof treeInclude }>;

/** Program templates. Coaches own them; clients may read programs they are (or were) assigned. */
@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitations: LimitationsService,
  ) {}

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
      return program.id;
    });
    return this.get({ id: coachId, role: Role.COACH }, id);
  }

  async replace(coachId: string, id: string, input: ProgramTreeInput): Promise<ProgramDto> {
    const current = await this.prisma.program.findFirst({
      where: { id, coachId },
      select: { workouts: { select: { id: true, exercises: { select: { id: true } } } } },
    });
    if (!current) throw new NotFoundException('Program not found');
    const plan = this.plan(current, input);
    await this.assertExercisesVisible(coachId, input);
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
    });
    return this.get({ id: coachId, role: Role.COACH }, id);
  }

  /**
   * Deep copy owned by the same coach: workouts and prescriptions, no assignments or history.
   * `asTemplate` saves it as a template; otherwise the copy is a regular, assignable program.
   */
  async duplicate(coachId: string, id: string, req: DuplicateProgramRequest): Promise<ProgramDto> {
    const src = await this.prisma.program.findFirst({
      where: { id, coachId },
      include: { workouts: { include: { exercises: { orderBy: { order: 'asc' } } } } },
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

  /** Cancels the client's current ACTIVE assignment and starts the new one, atomically. */
  async assign(coachId: string, clientId: string, programId: string, startDate: string): Promise<AssignmentDto> {
    const program = await this.prisma.program.findFirst({ where: { id: programId, coachId }, select: { id: true } });
    if (!program) throw new BadRequestException('Unknown program');
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.programAssignment.updateMany({
        where: { clientId, status: AssignmentStatus.ACTIVE },
        data: { status: AssignmentStatus.CANCELLED },
      });
      return tx.programAssignment.create({ data: { programId, clientId, startDate: new Date(`${startDate}T00:00:00.000Z`) } });
    });
    return { id: row.id, programId: row.programId, clientId: row.clientId, startDate: row.startDate.toISOString(), status: row.status };
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
