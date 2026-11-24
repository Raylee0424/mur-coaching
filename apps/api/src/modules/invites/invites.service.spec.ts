import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InvitesService } from './invites.service';

const invite = {
  id: 'i1', coachId: 'c1', email: 'new@x.co', name: 'New', programId: null, startDate: null, weightUnit: 'KG',
  acceptedAt: null, expiresAt: new Date(Date.now() + 86_400_000), program: null, coach: { name: 'Coach', displayName: null },
};

function setup(verdict: unknown) {
  const prisma = {
    invite: { findUnique: vi.fn().mockResolvedValue(invite) },
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockResolvedValue({ id: 'k1', role: 'CLIENT' }),
  };
  const entitlements = { seatFor: vi.fn().mockResolvedValue(verdict) };
  const auth = { issueToken: vi.fn().mockReturnValue({ accessToken: 't' }) };
  return { prisma, entitlements, service: new InvitesService(prisma as never, auth as never, {} as never, entitlements as never) };
}

describe('InvitesService.accept plan checks', () => {
  it('rejects with 402 when the coach plan lapsed, before creating anything', async () => {
    const { service, prisma } = setup({ ok: false, reason: 'NO_PLAN' });
    const err = await service.accept('raw', { name: 'New', password: 'password1' } as never).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(402);
    expect(err.message).toContain('plan is not active');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects with 402 when the roster is full', async () => {
    const err = await setup({ ok: false, reason: 'FULL', used: 5, limit: 5 }).service.accept('raw', { name: 'New', password: 'password1' } as never).catch((e) => e);
    expect(err.getStatus()).toBe(402);
    expect(err.message).toContain('roster is full');
  });

  it('accepts when a seat is free, leaving this invite out of the count', async () => {
    const { service, entitlements } = setup({ ok: true });
    await expect(service.accept('raw', { name: 'New', password: 'password1' } as never)).resolves.toEqual({ accessToken: 't' });
    expect(entitlements.seatFor).toHaveBeenCalledWith('c1', 'new@x.co');
  });
});
