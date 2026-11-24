import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ClientsService } from './clients.service';

const row = { status: 'ACTIVE', notes: null, createdAt: new Date(), client: { id: 'k1', email: 'k@x.co', name: 'K', createdAt: new Date(), assignments: [] } };

function setup(current: string, seatOk = true) {
  const prisma = {
    coachClient: { findFirst: vi.fn().mockResolvedValue({ id: 'l1', status: current }), update: vi.fn().mockResolvedValue(row) },
  };
  const entitlements = { assertSeat: vi.fn(seatOk ? () => Promise.resolve() : () => Promise.reject(new HttpException('full', 402))) };
  return { prisma, entitlements, service: new ClientsService(prisma as never, entitlements as never) };
}

describe('ClientsService.update seat checks', () => {
  it.each([
    ['ARCHIVED', 'ACTIVE'],
    ['ARCHIVED', 'PAUSED'],
  ])('needs a seat to move %s to %s', async (from, to) => {
    const { service, entitlements, prisma } = setup(from, false);
    await expect(service.update('c1', 'k1', { status: to } as never)).rejects.toBeInstanceOf(HttpException);
    expect(entitlements.assertSeat).toHaveBeenCalledWith('c1');
    expect(prisma.coachClient.update).not.toHaveBeenCalled();
  });

  it.each([
    ['ACTIVE', 'PAUSED'],
    ['PAUSED', 'ACTIVE'],
    ['ACTIVE', 'ARCHIVED'],
  ])('does not need a seat to move %s to %s', async (from, to) => {
    const { service, entitlements } = setup(from);
    await service.update('c1', 'k1', { status: to } as never);
    expect(entitlements.assertSeat).not.toHaveBeenCalled();
  });
});
