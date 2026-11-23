import { describe, expect, it, vi } from 'vitest';
import { WorkoutLogsService } from './workout-logs.service';

function setup() {
  const prisma = {
    coachClient: { findUnique: vi.fn().mockResolvedValue(null) },
    exercise: { findMany: vi.fn().mockResolvedValue([{ id: 'x1' }]) },
    workoutLog: { create: vi.fn().mockResolvedValue({ id: 'l1', exerciseLogs: [] }) },
  };
  const progression = { refreshExercise: vi.fn().mockResolvedValue(undefined) };
  return { prisma, service: new WorkoutLogsService(prisma as never, progression as never) };
}

describe('WorkoutLogsService.create', () => {
  it('stores rir, tempo, restSeconds per set and notes per exercise', async () => {
    const { service, prisma } = setup();
    await service.create('c1', {
      performedAt: new Date().toISOString(),
      exerciseLogs: [
        { exerciseId: 'x1', notes: '  felt heavy  ', sets: [{ reps: 5, weightKg: 100, rir: 2, tempo: '3-1-1-0', restSeconds: 180 }, { reps: 5, weightKg: 100 }] },
      ],
    });
    const log = prisma.workoutLog.create.mock.calls[0]?.[0].data.exerciseLogs.create[0];
    expect(log.notes).toBe('felt heavy');
    expect(log.sets.create[0]).toMatchObject({ rir: 2, tempo: '3-1-1-0', restSeconds: 180 });
    expect(log.sets.create[1]).toMatchObject({ rir: null, tempo: null, restSeconds: null });
  });
});
