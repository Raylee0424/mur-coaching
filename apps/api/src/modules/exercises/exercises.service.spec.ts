import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { exerciseScope } from './exercise-visibility';
import { ExercisesService, muscleRows } from './exercises.service';

const athlete = { id: 'a1', role: 'CLIENT' } as never;
const coach = { id: 'coach1', role: 'COACH' } as never;

const row = (over: Record<string, unknown> = {}) => ({
  id: 'x1', name: 'Belt Squat', muscleGroup: 'QUADS', equipment: 'MACHINE', pattern: 'SQUAT', profile: null, position: 'STANDING',
  loadIncrementKg: new Prisma.Decimal(5), rpeCap: null, repsMin: null, repsMax: null, archivedAt: null,
  coachId: null, ownerId: 'a1', createdAt: new Date('2026-11-24T10:00:00Z'),
  muscles: [{ exerciseId: 'x1', muscle: 'GLUTES', role: 'SECONDARY' }, { exerciseId: 'x1', muscle: 'QUADS', role: 'PRIMARY' }],
  ...over,
});

function setup() {
  const prisma = {
    exercise: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(row()),
      update: vi.fn().mockResolvedValue(row()),
    },
    coachClient: { findUnique: vi.fn().mockResolvedValue({ coachId: 'coach1', status: 'ACTIVE' }), findMany: vi.fn().mockResolvedValue([]) },
  };
  const limitations = { flagsFor: vi.fn().mockResolvedValue(new Map()) };
  return { prisma, limitations, service: new ExercisesService(prisma as never, limitations as never) };
}

describe('exerciseScope', () => {
  it('global means no coach AND no owner, so athlete rows never leak', () => {
    expect(exerciseScope({})).toEqual({ OR: [{ coachId: null, ownerId: null }] });
    expect(exerciseScope({ coachId: 'c', ownerId: 'a' })).toEqual({ OR: [{ coachId: null, ownerId: null }, { coachId: 'c' }, { ownerId: 'a' }] });
  });
});

describe('muscleRows', () => {
  it('forces the main muscle to PRIMARY and dedupes', () => {
    expect(muscleRows('QUADS', [{ muscle: 'QUADS', role: 'SECONDARY' }, { muscle: 'GLUTES', role: 'SECONDARY' }, { muscle: 'GLUTES', role: 'PRIMARY' }])).toEqual([
      { muscle: 'QUADS', role: 'PRIMARY' },
      { muscle: 'GLUTES', role: 'PRIMARY' },
    ]);
  });
});

describe('ExercisesService ownership', () => {
  it('an athlete creates into their own library, never the coach or global one', async () => {
    const { service, prisma } = setup();
    const dto = await service.create(athlete, { name: 'Belt Squat', muscleGroup: 'QUADS', muscles: [{ muscle: 'GLUTES', role: 'SECONDARY' }], equipment: 'MACHINE' });
    const data = prisma.exercise.create.mock.calls[0]![0].data;
    expect(data.ownerId).toBe('a1');
    expect(data.coachId).toBeUndefined();
    expect(data.muscles.create).toEqual([
      { muscle: 'QUADS', role: 'PRIMARY' },
      { muscle: 'GLUTES', role: 'SECONDARY' },
    ]);
    expect(dto.muscles[0]).toEqual({ muscle: 'QUADS', role: 'PRIMARY' });
    expect(dto.ownerId).toBe('a1');
  });

  it('name clash check spans global, the coach library and the athlete own rows', async () => {
    const { service, prisma } = setup();
    await service.create(athlete, { name: 'Belt Squat', muscleGroup: 'QUADS' });
    expect(prisma.exercise.findFirst.mock.calls[0]![0].where.OR).toEqual([{ coachId: null, ownerId: null }, { coachId: 'coach1' }, { ownerId: 'a1' }]);
  });

  it('an athlete cannot edit or archive a coach or global exercise (404)', async () => {
    const { service, prisma } = setup();
    await expect(service.update(athlete, 'coach-ex', { name: 'Mine now' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.archive(athlete, 'coach-ex')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.exercise.findFirst.mock.calls[0]![0].where).toMatchObject({ id: 'coach-ex', ownerId: 'a1' });
    expect(prisma.exercise.update).not.toHaveBeenCalled();
  });

  it('a coach edits only coach-owned rows', async () => {
    const { service, prisma } = setup();
    await expect(service.archive(coach, 'athlete-ex')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.exercise.findFirst.mock.calls[0]![0].where).toMatchObject({ id: 'athlete-ex', coachId: 'coach1' });
  });

  it('client lists carry limitation flags; coach lists do not ask for them', async () => {
    const { service, prisma, limitations } = setup();
    prisma.exercise.findMany.mockResolvedValue([row()]);
    limitations.flagsFor.mockResolvedValue(new Map([['x1', { limitationId: 'l1', severity: 'CAUTION', note: null }]]));
    const [dto] = await service.list(athlete, { muscleGroup: 'GLUTES', equipment: 'MACHINE' });
    expect(dto!.limitation?.severity).toBe('CAUTION');
    expect(prisma.exercise.findMany.mock.calls[0]![0].where).toMatchObject({ muscles: { some: { muscle: 'GLUTES' } }, equipment: 'MACHINE' });

    limitations.flagsFor.mockClear();
    await service.list(coach, {});
    expect(limitations.flagsFor).not.toHaveBeenCalled();
  });
});
