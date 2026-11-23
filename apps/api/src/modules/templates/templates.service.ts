import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TemplateFolderDto as FolderView, WorkoutTemplateDto as TemplateView } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertExercisesVisible } from '../exercises/exercise-visibility';
import type { CreateWorkoutTemplateDto, TemplateExerciseDto, UpdateWorkoutTemplateDto } from './dto/templates.dto';

const templateInclude = {
  exercises: { orderBy: { order: 'asc' }, include: { exercise: { select: { name: true } } } },
} satisfies Prisma.WorkoutTemplateInclude;

type TemplateRow = Prisma.WorkoutTemplateGetPayload<{ include: typeof templateInclude }>;

const toTemplate = (t: TemplateRow): TemplateView => ({
  id: t.id,
  folderId: t.folderId,
  name: t.name,
  notes: t.notes,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
  exercises: t.exercises.map((e) => ({
    id: e.id,
    exerciseId: e.exerciseId,
    exerciseName: e.exercise.name,
    order: e.order,
    targetSets: e.targetSets,
    repsMin: e.repsMin,
    repsMax: e.repsMax,
    restSeconds: e.restSeconds,
    tempo: e.tempo,
  })),
});

const exerciseRows = (list: readonly TemplateExerciseDto[]): Prisma.WorkoutTemplateExerciseCreateWithoutTemplateInput[] =>
  list.map((e, i) => ({
    order: i + 1,
    exercise: { connect: { id: e.exerciseId } },
    targetSets: e.targetSets,
    repsMin: e.repsMin ?? null,
    repsMax: e.repsMax ?? null,
    restSeconds: e.restSeconds ?? null,
    tempo: e.tempo ?? null,
  }));

function assertRepRanges(list: readonly TemplateExerciseDto[]): void {
  for (const e of list) {
    if (e.repsMin !== undefined && e.repsMax !== undefined && e.repsMax < e.repsMin) {
      throw new BadRequestException('repsMax must be at least repsMin');
    }
    if (e.repsMin === undefined && e.repsMax !== undefined) throw new BadRequestException('repsMax requires repsMin');
  }
}

/** The athlete's own templates and folders. Every query is scoped by `clientId` (the caller's id); other ids are 404. */
@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async listFolders(clientId: string): Promise<FolderView[]> {
    const rows = await this.prisma.templateFolder.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { templates: true } } },
    });
    return rows.map((f) => ({ id: f.id, name: f.name, templateCount: f._count.templates, createdAt: f.createdAt.toISOString() }));
  }

  async createFolder(clientId: string, name: string): Promise<FolderView> {
    return this.writeFolder(() => this.prisma.templateFolder.create({ data: { clientId, name }, include: { _count: { select: { templates: true } } } }));
  }

  async renameFolder(clientId: string, id: string, name: string): Promise<FolderView> {
    await this.ownedFolder(clientId, id);
    return this.writeFolder(() => this.prisma.templateFolder.update({ where: { id }, data: { name }, include: { _count: { select: { templates: true } } } }));
  }

  /** Templates inside survive (folderId → null). */
  async removeFolder(clientId: string, id: string): Promise<void> {
    await this.ownedFolder(clientId, id);
    await this.prisma.templateFolder.delete({ where: { id } });
  }

  async list(clientId: string, folderId?: string): Promise<TemplateView[]> {
    const rows = await this.prisma.workoutTemplate.findMany({
      where: { clientId, ...(folderId ? { folderId } : {}) },
      orderBy: [{ name: 'asc' }],
      include: templateInclude,
    });
    return rows.map(toTemplate);
  }

  async get(clientId: string, id: string): Promise<TemplateView> {
    return toTemplate(await this.owned(clientId, id));
  }

  async create(clientId: string, dto: CreateWorkoutTemplateDto): Promise<TemplateView> {
    assertRepRanges(dto.exercises);
    if (dto.folderId) await this.ownedFolder(clientId, dto.folderId);
    await assertExercisesVisible(this.prisma, clientId, dto.exercises.map((e) => e.exerciseId));
    const row = await this.prisma.workoutTemplate.create({
      data: {
        clientId,
        name: dto.name,
        notes: dto.notes || null,
        folderId: dto.folderId ?? null,
        exercises: { create: exerciseRows(dto.exercises) },
      },
      include: templateInclude,
    });
    return toTemplate(row);
  }

  async update(clientId: string, id: string, dto: UpdateWorkoutTemplateDto): Promise<TemplateView> {
    await this.owned(clientId, id);
    if (dto.exercises) {
      assertRepRanges(dto.exercises);
      await assertExercisesVisible(this.prisma, clientId, dto.exercises.map((e) => e.exerciseId));
    }
    if (dto.folderId) await this.ownedFolder(clientId, dto.folderId);
    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.exercises) await tx.workoutTemplateExercise.deleteMany({ where: { templateId: id } });
      return tx.workoutTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
          ...(dto.folderId !== undefined ? { folderId: dto.folderId } : {}),
          ...(dto.exercises ? { exercises: { create: exerciseRows(dto.exercises) } } : {}),
        },
        include: templateInclude,
      });
    });
    return toTemplate(row);
  }

  async remove(clientId: string, id: string): Promise<void> {
    await this.owned(clientId, id);
    await this.prisma.workoutTemplate.delete({ where: { id } });
  }

  private async owned(clientId: string, id: string): Promise<TemplateRow> {
    const row = await this.prisma.workoutTemplate.findFirst({ where: { id, clientId }, include: templateInclude });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  private async ownedFolder(clientId: string, id: string): Promise<void> {
    const row = await this.prisma.templateFolder.findFirst({ where: { id, clientId }, select: { id: true } });
    if (!row) throw new NotFoundException('Folder not found');
  }

  private async writeFolder(op: () => Promise<{ id: string; name: string; createdAt: Date; _count: { templates: number } }>): Promise<FolderView> {
    try {
      const f = await op();
      return { id: f.id, name: f.name, templateCount: f._count.templates, createdAt: f.createdAt.toISOString() };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('A folder with that name already exists');
      throw err;
    }
  }
}
