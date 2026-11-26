import { NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ModeratorGuard } from './moderator.guard';

const ctx = (user?: { id: string; role: string }) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

function setup(email: string | null, list = 'mod@example.com') {
  const prisma = { user: { findUnique: vi.fn().mockResolvedValue(email === null ? null : { email }) } };
  const env = { get: vi.fn().mockReturnValue(list) };
  return { prisma, env, guard: new ModeratorGuard(prisma as never, env as never) };
}

describe('ModeratorGuard', () => {
  it('passes an allowlisted coach and an allowlisted client', async () => {
    const { guard } = setup('Mod@Example.com');
    await expect(guard.canActivate(ctx({ id: 'u1', role: 'COACH' }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ id: 'u2', role: 'CLIENT' }))).resolves.toBe(true);
  });

  it('answers 404 for a user who is not listed', async () => {
    const { guard } = setup('someone@example.com');
    await expect(guard.canActivate(ctx({ id: 'u1', role: 'COACH' }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 404 for a missing user row or no request user', async () => {
    await expect(setup(null).guard.canActivate(ctx({ id: 'u1', role: 'COACH' }))).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup('mod@example.com').guard.canActivate(ctx())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reads the list on every request', async () => {
    const { guard, env } = setup('mod@example.com');
    await expect(guard.canActivate(ctx({ id: 'u1', role: 'COACH' }))).resolves.toBe(true);
    env.get.mockReturnValue('');
    await expect(guard.canActivate(ctx({ id: 'u1', role: 'COACH' }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('loads the email from the DB by the request user id', async () => {
    const { guard, prisma } = setup('mod@example.com');
    await guard.canActivate(ctx({ id: 'u9', role: 'CLIENT' }));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u9' }, select: { email: true } });
  });
});
