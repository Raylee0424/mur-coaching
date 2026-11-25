import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AI_DAILY_CAPS } from '@coaching/shared';
import { AiContextService } from './ai-context.service';
import { AiUsageService } from './ai-usage.service';
import { ConnectorsService, hashToken } from './connectors.service';

/** A Prisma double that fails the test if anything touches cycle data. */
function guarded<T extends object>(models: T): T {
  return new Proxy(models, {
    get(target, prop) {
      if (prop === 'cycleLog') throw new Error('CycleLog must never be read by AI tools');
      return (target as Record<string | symbol, unknown>)[prop];
    },
  });
}

describe('AiUsageService', () => {
  it('counts until the cap, then refunds and answers 429', async () => {
    let count = AI_DAILY_CAPS.COACH - 1;
    const prisma = {
      aiUsage: {
        upsert: vi.fn().mockImplementation(() => ({ count: ++count })),
        update: vi.fn().mockImplementation(() => ({ count: --count })),
      },
    };
    const usage = new AiUsageService(prisma as never);
    await expect(usage.consume('c1', 'COACH')).resolves.toBe(0);
    await expect(usage.consume('c1', 'COACH')).rejects.toMatchObject({ status: 429 });
    expect(count).toBe(AI_DAILY_CAPS.COACH);
  });
});

describe('AiContextService', () => {
  it('builds context from owner-scoped reads and never reads CycleLog', async () => {
    const where: unknown[] = [];
    const rec = (result: unknown) => vi.fn().mockImplementation((args: { where?: unknown }) => (where.push(args.where), result));
    const prisma = guarded({
      user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ weightUnit: 'KG' }) },
      workoutLog: {
        findMany: rec([
          {
            id: 'w1',
            performedAt: new Date(),
            workout: { name: 'Lower A' },
            exerciseLogs: [{ exercise: { name: 'Back Squat' }, sets: [{ reps: 5, weightKg: 150, rpe: 8 }, { reps: 5, weightKg: 155, rpe: 8.5 }] }],
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      personalRecord: { findMany: rec([]) },
      progressionRecommendation: { findMany: rec([]) },
      readinessSurvey: { findFirst: rec(null) },
      exercise: { findMany: vi.fn().mockResolvedValue([]) },
    });
    const limitations = { activeRows: vi.fn().mockResolvedValue([]) };
    const ctx = await new AiContextService(prisma as never, limitations as never).build('me');
    expect(ctx.sessions[0]).toMatchObject({ id: 'w1', lines: ['Back Squat 155 kg × 5 @ RPE 8.5'] });
    expect(ctx.stats).toMatchObject({ sessionsIndexed: 1, avgRpe7d: '8.3' });
    expect(where.every((w) => (w as { clientId?: string }).clientId === 'me')).toBe(true);
    expect(limitations.activeRows).toHaveBeenCalledWith('me', expect.any(String));
  });
});

describe('ConnectorsService', () => {
  function setup(features: string[] = ['AI_COACH']) {
    const grants: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const prisma = guarded({
      connectorGrant: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(({ data }) => {
          const row = { id: `g${grants.length}`, createdAt: new Date(), revokedAt: null, lastUsedAt: null, ...data };
          grants.push(row);
          return row;
        }),
        findUnique: vi.fn().mockImplementation(({ where }) => grants.find((g) => g.tokenHash === where.tokenHash) ?? null),
        findFirst: vi.fn().mockImplementation(({ where }) => grants.find((g) => g.id === where.id && g.clientId === where.clientId) ?? null),
        update: vi.fn().mockImplementation(({ where, data }) => Object.assign(grants.find((g) => g.id === where.id)!, data)),
      },
      connectorAudit: { create: vi.fn().mockImplementation(({ data }) => audits.push(data)) },
      bodyweightEntry: { findMany: vi.fn().mockResolvedValue([{ date: new Date('2026-11-20T00:00:00Z'), weightKg: { toString: () => '82.40' } }]) },
      readinessSurvey: { findMany: vi.fn().mockResolvedValue([]) },
    });
    const entitlements = { resolve: vi.fn().mockResolvedValue({ features }) };
    return { grants, audits, service: new ConnectorsService(prisma as never, entitlements as never) };
  }

  it('stores only the SHA-256 of the token and shows the token once', async () => {
    const { service, grants } = setup();
    const { token, grant } = await service.create('me', { name: 'Claude Desktop', scopes: ['BODYWEIGHT'], expiresInDays: 30 });
    expect(token).toMatch(/^mur_ct_/);
    expect(grants[0]!.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(grants[0])).not.toContain(token);
    expect(grant).not.toHaveProperty('tokenHash');
  });

  it('serves a granted scope and audits it', async () => {
    const { service, audits } = setup();
    const { token } = await service.create('me', { name: 'x', scopes: ['BODYWEIGHT'], expiresInDays: 30 });
    await expect(service.read(`Bearer ${token}`, 'bodyweight')).resolves.toMatchObject({ scope: 'BODYWEIGHT', data: { entries: [{ date: '2026-11-20', weightKg: '82.40' }] } });
    expect(audits).toEqual([expect.objectContaining({ scope: 'BODYWEIGHT', status: 200 })]);
  });

  it('denies other scopes (403), unknown resources such as cycle (404), and revoked tokens (401)', async () => {
    const { service, audits } = setup();
    const { token, grant } = await service.create('me', { name: 'x', scopes: ['BODYWEIGHT'], expiresInDays: 30 });
    await expect(service.read(`Bearer ${token}`, 'readiness')).rejects.toMatchObject({ status: 403 });
    await expect(service.read(`Bearer ${token}`, 'cycle')).rejects.toMatchObject({ status: 404 });
    await service.revoke('me', grant.id);
    await expect(service.read(`Bearer ${token}`, 'bodyweight')).rejects.toMatchObject({ status: 401 });
    expect(audits.map((a) => a.status)).toEqual([403, 404, 401]);
  });

  it('rejects missing or unknown tokens, another owner revoking, and a lapsed plan', async () => {
    const { service } = setup([]);
    const { token, grant } = await service.create('me', { name: 'x', scopes: ['BODYWEIGHT'], expiresInDays: 30 });
    await expect(service.read(undefined, 'bodyweight')).rejects.toMatchObject({ status: 401 });
    await expect(service.read('Bearer mur_ct_nope', 'bodyweight')).rejects.toMatchObject({ status: 401 });
    await expect(service.revoke('someone-else', grant.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.read(`Bearer ${token}`, 'bodyweight')).rejects.toBeInstanceOf(HttpException);
    await expect(service.read(`Bearer ${token}`, 'bodyweight')).rejects.toMatchObject({ status: 402 });
  });
});
