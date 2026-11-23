import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LimitationsService } from './limitations.service';
import type { CreateLimitationDto } from './dto/limitations.dto';

const user = { id: 'coach1', role: 'COACH' } as never;
const created = {
  id: 'l1', clientId: 'c1', target: 'MUSCLE', muscleGroup: 'SHOULDERS', exerciseId: null, severity: 'CAUTION', note: null,
  startsOn: new Date('2026-11-24T00:00:00Z'), endsOn: null, createdAt: new Date('2026-11-24T10:00:00Z'), updatedAt: new Date(), exercise: null,
};

function setup(denied = false) {
  const prisma = {
    limitation: { create: vi.fn().mockResolvedValue(created), findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    exercise: { findFirst: vi.fn().mockResolvedValue(null) },
    coachClient: { findUnique: vi.fn().mockResolvedValue({ coachId: 'coach1' }) },
  };
  const access = { assertCanAccessClient: denied ? vi.fn().mockRejectedValue(new NotFoundException()) : vi.fn().mockResolvedValue(undefined) };
  return { prisma, access, service: new LimitationsService(prisma as never, access as never) };
}

const muscle: CreateLimitationDto = { target: 'MUSCLE', muscleGroup: 'SHOULDERS', severity: 'CAUTION' };

describe('LimitationsService', () => {
  it('checks tenancy before touching data', async () => {
    const { service, prisma } = setup(true);
    await expect(service.create(user, 'c1', muscle)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.limitation.create).not.toHaveBeenCalled();
    await expect(service.list(user, 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('defaults the start date to today and stores a muscle target without an exercise', async () => {
    const { service, prisma } = setup();
    await service.create(user, 'c1', muscle, '2026-11-24');
    const data = prisma.limitation.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ target: 'MUSCLE', muscleGroup: 'SHOULDERS', exerciseId: null, endsOn: null });
    expect(data.startsOn.toISOString()).toBe('2026-11-24T00:00:00.000Z');
  });

  it('rejects an end date before the start date and a bad calendar date', async () => {
    const { service } = setup();
    await expect(service.create(user, 'c1', { ...muscle, startsOn: '2026-11-24', endsOn: '2026-11-20' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(user, 'c1', { ...muscle, startsOn: '2026-02-31' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an exercise target the client cannot see', async () => {
    const { service, prisma } = setup();
    await expect(service.create(user, 'c1', { target: 'EXERCISE', exerciseId: 'nope', severity: 'AVOID' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.limitation.create).not.toHaveBeenCalled();
  });

  it('404s when updating another client\'s limitation', async () => {
    const { service } = setup();
    await expect(service.update(user, 'c1', 'other', { severity: 'AVOID' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
