import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CheckInsService } from './check-ins.service';

const schedule = {
  id: 's1',
  cadence: 'WEEKLY',
  weekday: 0,
  dueDate: null,
  startDate: new Date('2026-11-01T00:00:00Z'),
  template: { title: 'Weekly', questions: [{ id: 'q', prompt: 'Sleep', kind: 'SCALE', required: true, unit: null, position: 0 }] },
};

function setup(status = 'ACTIVE') {
  const prisma = {
    coachClient: { findUnique: vi.fn().mockResolvedValue({ coachId: 'c1', status }), count: vi.fn().mockResolvedValue(1) },
    checkInSchedule: { findMany: vi.fn().mockResolvedValue([schedule]), upsert: vi.fn() },
    checkInResponse: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'r', periodDate: new Date('2026-11-22T00:00:00Z'), submittedAt: new Date(), answers: [], reviewedAt: null, coachReply: null, schedule: { template: { title: 'Weekly' } } }), count: vi.fn() },
    checkInTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 't1' }), delete: vi.fn() },
  };
  return { prisma, service: new CheckInsService(prisma as never) };
}

describe('CheckInsService', () => {
  it('lists the open period as due until it is answered', async () => {
    const { service, prisma } = setup();
    expect((await service.forClient('k1', '2026-11-20')).due).toMatchObject([{ scheduleId: 's1', periodDate: '2026-11-22' }]);
    prisma.checkInResponse.findMany.mockImplementation((args: { where: { scheduleId?: unknown } }) =>
      Promise.resolve(args.where.scheduleId ? [{ scheduleId: 's1', periodDate: new Date('2026-11-22T00:00:00Z') }] : []),
    );
    expect((await service.forClient('k1', '2026-11-20')).due).toEqual([]);
  });

  it('shows nothing due once the coach link is archived', async () => {
    const { service, prisma } = setup('ARCHIVED');
    expect((await service.forClient('k1', '2026-11-20')).due).toEqual([]);
    expect(prisma.checkInSchedule.findMany).not.toHaveBeenCalled();
    await expect(service.submit('k1', 's1', { periodDate: '2026-11-22', answers: [] }, '2026-11-20')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a period that is not open and a second answer for the same period', async () => {
    const { service, prisma } = setup();
    await expect(service.submit('k1', 's1', { periodDate: '2026-11-15', answers: [{ questionId: 'q', value: '3' }] }, '2026-11-20')).rejects.toBeInstanceOf(BadRequestException);

    const { Prisma } = await import('@prisma/client');
    prisma.checkInResponse.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.submit('k1', 's1', { periodDate: '2026-11-22', answers: [{ questionId: 'q', value: '3' }] }, '2026-11-20')).rejects.toBeInstanceOf(ConflictException);
  });

  it('will not assign to a client outside the roster, nor delete an answered template', async () => {
    const { service, prisma } = setup();
    prisma.coachClient.count.mockResolvedValue(0);
    await expect(service.assign('c1', { templateId: 't1', clientId: 'x', cadence: 'WEEKLY', weekday: 0 })).rejects.toBeInstanceOf(NotFoundException);
    prisma.checkInResponse.count.mockResolvedValue(2);
    await expect(service.deleteTemplate('c1', 't1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.checkInTemplate.delete).not.toHaveBeenCalled();
  });
});
