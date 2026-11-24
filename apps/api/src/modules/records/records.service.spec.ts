import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RecordsService } from './records.service';

const dec = (n: number) => ({ toNumber: () => n });
const at = (day: number) => new Date(Date.UTC(2026, 10, day));
const setRow = (id: string, reps: number, kg: number, isWarmup = false, day = 10) => ({
  id, reps, weightKg: dec(kg), rpe: null, isWarmup, exerciseLog: { workoutLog: { performedAt: at(day) } },
});

function setup(opts: { sets?: ReturnType<typeof setRow>[]; visible?: boolean; logs?: unknown[]; stored?: unknown[] } = {}) {
  const { sets = [], visible = true, logs = [], stored = [] } = opts;
  const prisma = {
    coachClient: { findUnique: vi.fn().mockResolvedValue(null) },
    setLog: { findMany: vi.fn().mockResolvedValue(sets) },
    exercise: { findFirst: vi.fn().mockResolvedValue(visible ? { id: 'x1', name: 'Squat' } : null) },
    exerciseLog: { findMany: vi.fn().mockResolvedValue(logs) },
    personalRecord: {
      deleteMany: vi.fn().mockReturnValue('delete'),
      createMany: vi.fn().mockReturnValue('create'),
      findMany: vi.fn().mockResolvedValue(stored),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };
  return { prisma, service: new RecordsService(prisma as never) };
}

describe('RecordsService.rebuild', () => {
  it('replaces the client+exercise rows with the best working set per rep count', async () => {
    const { service, prisma } = setup({ sets: [setRow('a', 5, 100), setRow('b', 5, 110), setRow('w', 5, 200, true), setRow('c', 1, 130)] });
    await service.rebuild('c1', 'x1');
    expect(prisma.personalRecord.deleteMany).toHaveBeenCalledWith({ where: { clientId: 'c1', exerciseId: 'x1' } });
    const data = prisma.personalRecord.createMany.mock.calls[0]?.[0].data;
    expect(data.map((r: { reps: number; setLogId: string }) => [r.reps, r.setLogId])).toEqual([[1, 'c'], [5, 'b']]);
    expect(prisma.$transaction).toHaveBeenCalledWith(['delete', 'create']);
  });

  it('leaves no rows when every set is gone', async () => {
    const { service, prisma } = setup();
    await service.rebuild('c1', 'x1');
    expect(prisma.personalRecord.createMany.mock.calls[0]?.[0].data).toEqual([]);
  });
});

describe('RecordsService.stats', () => {
  it('404s for an exercise outside the client scope', async () => {
    const { service } = setup({ visible: false });
    await expect(service.stats('c1', 'x9')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns empty stats for a never-logged exercise', async () => {
    const { service } = setup();
    const out = await service.stats('c1', 'x1', at(20));
    expect(out).toMatchObject({ trend: [], netDeltaKg: null, netDeltaPct: null, sessions: 0 });
    expect(out.records.every((c) => c === null)).toBe(true);
  });

  it('builds the trend oldest first from working sets only', async () => {
    const log = (id: string, day: number, kg: number) => ({
      id, workoutLog: { id: `w${id}`, performedAt: at(day) },
      sets: [{ reps: 5, weightKg: dec(kg), rpe: null, isWarmup: false }, { reps: 5, weightKg: dec(300), rpe: null, isWarmup: true }],
    });
    const { service } = setup({ logs: [log('b', 18, 110), log('a', 10, 100)] });
    const out = await service.stats('c1', 'x1', at(20));
    expect(out.trend.map((p) => p.topWeightKg)).toEqual([100, 110]);
    expect(out.netDeltaKg).toBe(11.6);
    expect(out.summary.sets).toBe(2);
  });
});

describe('RecordsService.list', () => {
  it('scopes every query to the caller', async () => {
    const { service, prisma } = setup();
    await service.list('c1', at(20));
    expect(prisma.personalRecord.findMany.mock.calls[0]?.[0].where).toEqual({ clientId: 'c1' });
    expect(prisma.exerciseLog.findMany.mock.calls[0]?.[0].where.workoutLog.clientId).toBe('c1');
  });

  it('groups records per exercise with bracket cells and a new-record count', async () => {
    const row = (reps: number, kg: number, day: number) => ({
      exerciseId: 'x1', exercise: { name: 'Squat' }, reps, weightKg: dec(kg), e1rmKg: dec(kg * (1 + reps / 30)), setLogId: `s${reps}`, achievedAt: at(day),
    });
    const { service } = setup({ stored: [row(1, 180, 18), row(5, 150, 2)] });
    const out = await service.list('c1', at(20));
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0]?.cells.map((c) => c?.weightKg ?? null).slice(0, 4)).toEqual(['180.00', '150.00', '150.00', null]);
    expect(out.newRecords).toBe(2);
  });
});
