import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { mergeHealthDay, stepAverage7, stepStreak } from '@coaching/shared';
import { HealthService } from './health.service';

const iso = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

describe('step math', () => {
  const today = '2026-03-10';
  const days = [
    { date: '2026-03-10', steps: 4000 },
    { date: '2026-03-09', steps: 12000 },
    { date: '2026-03-08', steps: 10000 },
    { date: '2026-03-07', steps: 11000 },
    { date: '2026-03-05', steps: 15000 },
    { date: '2026-03-02', steps: 30000 },
  ];

  it('averages the 7 days ending today, a missing day counting as zero', () => {
    expect(stepAverage7(days, today)).toBe(Math.round((4000 + 12000 + 10000 + 11000 + 15000) / 7));
    expect(stepAverage7([], today)).toBeNull();
  });

  it('counts the streak from yesterday while today is short, and breaks on a gap', () => {
    expect(stepStreak(days, 10000, today)).toBe(3);
    expect(stepStreak(days, 4000, today)).toBe(4);
    expect(stepStreak([{ date: '2026-03-08', steps: 20000 }], 10000, today)).toBe(0);
  });

  it('merges sources without double counting steps', () => {
    expect(
      mergeHealthDay('2026-03-10', [
        { source: 'APPLE_HEALTH', steps: 9000, sleepMinutes: 420, hrvMs: 60, restingHr: 50 },
        { source: 'MANUAL', steps: 8000, sleepMinutes: null, hrvMs: 70, restingHr: null },
      ]),
    ).toEqual({ date: '2026-03-10', steps: 9000, sleepMinutes: 420, hrvMs: 65, restingHr: 50, sources: ['APPLE_HEALTH', 'MANUAL'] });
  });
});

function setup() {
  const rows: { userId: string; date: Date; source: string; steps: number | null; updatedAt: Date }[] = [];
  const prisma = {
    stepGoal: { findUnique: vi.fn().mockResolvedValue({ dailySteps: 8000 }), findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn() },
    dailyHealthMetric: {
      findMany: vi.fn().mockImplementation(() => Promise.resolve(rows)),
      upsert: vi.fn().mockImplementation(({ where, create, update }) => {
        const k = where.userId_date_source;
        const hit = rows.find((r) => r.userId === k.userId && r.date.getTime() === k.date.getTime() && r.source === k.source);
        if (hit) Object.assign(hit, update, { updatedAt: new Date() });
        else rows.push({ steps: null, ...create, updatedAt: new Date() });
        return Promise.resolve();
      }),
    },
    $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { rows, service: new HealthService(prisma as never) };
}

describe('HealthService', () => {
  it('sync is idempotent per day and source, and the streak follows the goal', async () => {
    const { rows, service } = setup();
    const batch = { source: 'MANUAL' as const, entries: [0, 1, 2].map((n) => ({ date: iso(n), steps: 9000 })) };
    await service.sync('u1', batch);
    await service.sync('u1', batch);
    expect(rows).toHaveLength(3);
    const o = await service.overview('u1', 30);
    expect(o).toMatchObject({ dailyStepGoal: 8000, streakDays: 3, remainingToday: 0, avg7Steps: Math.round(27000 / 7) });
  });

  it('keeps fields a resync leaves out', async () => {
    const { rows, service } = setup();
    await service.sync('u1', { source: 'MANUAL', entries: [{ date: iso(0), steps: 5000, sleepMinutes: 400 }] });
    await service.sync('u1', { source: 'MANUAL', entries: [{ date: iso(0), steps: 6000 }] });
    expect(rows[0]).toMatchObject({ steps: 6000, sleepMinutes: 400 });
  });

  it('rejects impossible and future dates', async () => {
    const { service } = setup();
    await expect(service.sync('u1', { source: 'MANUAL', entries: [{ date: '2026-02-30', steps: 1 }] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.sync('u1', { source: 'MANUAL', entries: [{ date: iso(-5), steps: 1 }] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
