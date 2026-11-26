import { describe, expect, it, vi } from 'vitest';
import { seedRecords } from './records';

const dec = (n: number) => ({ toNumber: () => n });
const performedAt = new Date(Date.UTC(2026, 10, 20));
const set = (id: string, reps: number, kg: number, isWarmup = false) => ({
  id, reps, weightKg: dec(kg), rpe: null, isWarmup, exerciseLog: { workoutLog: { performedAt } },
});

describe('seedRecords', () => {
  it('turns seeded working sets into PR rows per client and exercise; warm-ups never count', async () => {
    const sets: Record<string, ReturnType<typeof set>[]> = {
      squat: [set('w1', 5, 180, true), set('s1', 5, 140), set('s2', 3, 150)],
      bench: [set('w2', 8, 60, true)],
    };
    const prisma = {
      exerciseLog: { findMany: vi.fn().mockResolvedValue([{ exerciseId: 'squat' }, { exerciseId: 'bench' }]) },
      setLog: { findMany: vi.fn(({ where }) => Promise.resolve(sets[where.exerciseLog.exerciseId] ?? [])) },
      personalRecord: {
        deleteMany: vi.fn((args) => ({ op: 'delete', args })),
        createMany: vi.fn((args) => ({ op: 'create', args })),
        count: vi.fn().mockResolvedValue(2),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };

    const total = await seedRecords(prisma as never, ['alex']);

    expect(prisma.exerciseLog.findMany.mock.calls[0]?.[0].where).toEqual({ workoutLog: { clientId: 'alex' } });
    const created = prisma.personalRecord.createMany.mock.calls.map((c) => c[0].data);
    expect(created[0].map((r: { setLogId: string; reps: number; clientId: string }) => [r.clientId, r.reps, r.setLogId])).toEqual([
      ['alex', 3, 's2'],
      ['alex', 5, 's1'],
    ]);
    expect(created[1]).toEqual([]);
    expect(total).toBe(2);
  });
});
