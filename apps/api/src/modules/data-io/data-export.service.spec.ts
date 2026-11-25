import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { DataExportService } from './data-export.service';

function setup() {
  const empty = vi.fn().mockResolvedValue([]);
  const prisma = {
    user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ email: 'a@b.c', name: 'A', displayName: null, weightUnit: 'KG', createdAt: new Date('2026-01-01') }) },
    workoutLog: { findMany: empty },
    personalRecord: { findMany: empty },
    bodyweightEntry: { findMany: vi.fn().mockResolvedValue([{ date: new Date('2026-01-02T00:00:00Z'), weightKg: new Prisma.Decimal('80.5') }]) },
    bodyGoal: { findUnique: vi.fn().mockResolvedValue(null) },
    progressPhoto: { findMany: empty },
    readinessSurvey: { findMany: empty },
    mealEntry: { findMany: empty },
    waterLog: { findMany: empty },
    nutritionTarget: { findUnique: vi.fn().mockResolvedValue(null) },
    dailyHealthMetric: { findMany: empty },
    stepGoal: { findUnique: vi.fn().mockResolvedValue(null) },
    exerciseAlias: { findMany: empty },
    importJob: { findMany: empty },
    cycleLog: { findMany: vi.fn().mockResolvedValue([{ id: 'c1', ciphertext: 'iv.tag.data', keyVersion: 1 }]) },
  };
  const readiness = { exportCycle: vi.fn().mockResolvedValue({ configured: true, entries: [{ date: '2026-01-01', periodStart: true, cycleLengthDays: 28, symptoms: [], note: null }] }) };
  return { prisma, readiness, service: new DataExportService(prisma as never, readiness as never) };
}

describe('DataExportService', () => {
  it('leaves cycle data out by default and never touches cycle rows directly', async () => {
    const { service, readiness, prisma } = setup();
    const out = await service.json('u1', false);
    expect(out).not.toHaveProperty('cycle');
    expect(readiness.exportCycle).not.toHaveBeenCalled();
    expect(prisma.cycleLog.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(out)).not.toMatch(/ciphertext|keyVersion|passwordHash/);
    expect((out.body as { bodyweight: unknown[] }).bodyweight).toEqual([{ date: '2026-01-02', weightKg: '80.5' }]);
  });

  it('includes decrypted cycle entries only on the owner flag, without ciphertext', async () => {
    const { service } = setup();
    const out = await service.json('u1', true);
    expect(out.cycle).toEqual({ configured: true, entries: [expect.objectContaining({ periodStart: true })] });
    expect(JSON.stringify(out)).not.toMatch(/ciphertext|keyVersion/);
  });
});
