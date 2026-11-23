import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { TemplatesService } from './templates.service';
import type { CreateWorkoutTemplateDto } from './dto/templates.dto';

const row = {
  id: 't1', clientId: 'c1', folderId: null, name: 'Push A', notes: null,
  createdAt: new Date('2026-11-24T10:00:00Z'), updatedAt: new Date('2026-11-24T10:00:00Z'),
  exercises: [{ id: 'e1', exerciseId: 'x1', order: 1, targetSets: 3, repsMin: 5, repsMax: 8, restSeconds: 120, tempo: '3-1-1-0', exercise: { name: 'Bench Press' } }],
};

function setup(opts: { visibleExercises?: number; ownedTemplate?: boolean; ownedFolder?: boolean } = {}) {
  const { visibleExercises = 1, ownedTemplate = true, ownedFolder = true } = opts;
  const tx = {
    workoutTemplateExercise: { deleteMany: vi.fn().mockResolvedValue({}) },
    workoutTemplate: { update: vi.fn().mockResolvedValue(row) },
  };
  const prisma = {
    coachClient: { findUnique: vi.fn().mockResolvedValue({ coachId: 'coach1' }) },
    exercise: { count: vi.fn().mockResolvedValue(visibleExercises) },
    workoutTemplate: {
      findFirst: vi.fn().mockResolvedValue(ownedTemplate ? row : null),
      create: vi.fn().mockResolvedValue(row),
      delete: vi.fn().mockResolvedValue({}),
    },
    templateFolder: {
      findFirst: vi.fn().mockResolvedValue(ownedFolder ? { id: 'f1' } : null),
      create: vi.fn().mockResolvedValue({ id: 'f1', name: 'Push', createdAt: new Date(), _count: { templates: 0 } }),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx, service: new TemplatesService(prisma as never) };
}

const body: CreateWorkoutTemplateDto = { name: 'Push A', exercises: [{ exerciseId: 'x1', targetSets: 3, repsMin: 5, repsMax: 8 }] };

describe('TemplatesService', () => {
  it('creates a template owned by the caller with ordered exercises', async () => {
    const { service, prisma } = setup();
    const dto = await service.create('c1', body);
    const data = prisma.workoutTemplate.create.mock.calls[0]?.[0].data;
    expect(data.clientId).toBe('c1');
    expect(data.exercises.create[0]).toMatchObject({ order: 1, targetSets: 3, repsMin: 5, repsMax: 8 });
    expect(dto.exercises[0]).toMatchObject({ exerciseName: 'Bench Press', tempo: '3-1-1-0' });
  });

  it('rejects an exercise the athlete cannot see', async () => {
    const { service, prisma } = setup({ visibleExercises: 0 });
    await expect(service.create('c1', body)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.workoutTemplate.create).not.toHaveBeenCalled();
  });

  it('rejects repsMax below repsMin and repsMax without repsMin', async () => {
    const { service } = setup();
    await expect(service.create('c1', { ...body, exercises: [{ exerciseId: 'x1', targetSets: 3, repsMin: 8, repsMax: 5 }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create('c1', { ...body, exercises: [{ exerciseId: 'x1', targetSets: 3, repsMax: 5 }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("404s on another athlete's template or folder", async () => {
    const t = setup({ ownedTemplate: false });
    await expect(t.service.get('c2', 't1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(t.service.update('c2', 't1', { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(t.service.remove('c2', 't1')).rejects.toBeInstanceOf(NotFoundException);
    expect(t.prisma.workoutTemplate.delete).not.toHaveBeenCalled();
    const f = setup({ ownedFolder: false });
    await expect(f.service.create('c1', { ...body, folderId: 'other' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaces the exercise list in one transaction on update', async () => {
    const { service, tx } = setup();
    await service.update('c1', 't1', { exercises: body.exercises });
    expect(tx.workoutTemplateExercise.deleteMany).toHaveBeenCalledWith({ where: { templateId: 't1' } });
    expect(tx.workoutTemplate.update).toHaveBeenCalled();
  });

  it('maps a duplicate folder name to 409', async () => {
    const { service, prisma } = setup();
    prisma.templateFolder.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.createFolder('c1', 'Push')).rejects.toBeInstanceOf(ConflictException);
  });
});
