import { describe, expect, it, vi } from 'vitest';
import { WorkoutLogsService } from './workout-logs.service';

function setup() {
  const prisma = {
    coachClient: { findUnique: vi.fn().mockResolvedValue(null) },
    exercise: { findMany: vi.fn().mockResolvedValue([{ id: 'x1' }]) },
    workoutLog: {
      create: vi.fn().mockResolvedValue({ id: 'l1', exerciseLogs: [{ exerciseId: 'x1' }] }),
      findFirst: vi.fn().mockResolvedValue({ id: 'l1', exerciseLogs: [{ exerciseId: 'x1' }, { exerciseId: 'x2' }] }),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
  const progression = { refreshExercise: vi.fn().mockResolvedValue(undefined) };
  const records = { rebuild: vi.fn().mockResolvedValue(undefined) };
  const schedule = { reconcileCompletion: vi.fn().mockResolvedValue(undefined) };
  return { prisma, records, progression, schedule, service: new WorkoutLogsService(prisma as never, progression as never, records as never, schedule as never) };
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

describe('WorkoutLogsService calendar', () => {
  it('reconciles the calendar row of a new log, and survives a failure', async () => {
    const { service, prisma, schedule } = setup();
    prisma.workoutLog.create.mockResolvedValue({ id: 'l1', assignmentId: 'a1', workoutId: 'w1', exerciseLogs: [{ exerciseId: 'x1' }] });
    await service.create('c1', { performedAt: new Date().toISOString(), exerciseLogs: [{ exerciseId: 'x1', sets: [{ reps: 5, weightKg: 100 }] }] });
    expect(schedule.reconcileCompletion).toHaveBeenCalledWith('a1', 'w1');
    schedule.reconcileCompletion.mockRejectedValueOnce(new Error('db down'));
    await expect(service.create('c1', { performedAt: new Date().toISOString(), exerciseLogs: [{ exerciseId: 'x1', sets: [{ reps: 5, weightKg: 100 }] }] })).resolves.toBeDefined();
  });
});

describe('WorkoutLogsService records', () => {
  it('rebuilds records for the exercises of a new log', async () => {
    const { service, records } = setup();
    await service.create('c1', { performedAt: new Date().toISOString(), exerciseLogs: [{ exerciseId: 'x1', sets: [{ reps: 5, weightKg: 100 }] }] });
    expect(records.rebuild).toHaveBeenCalledWith('c1', 'x1');
  });

  it('rebuilds every exercise of a deleted log', async () => {
    const { service, records } = setup();
    await service.remove('c1', 'l1');
    expect(records.rebuild.mock.calls.map((c) => c[1]).sort()).toEqual(['x1', 'x2']);
  });

  it('keeps the log when a rebuild fails', async () => {
    const { service, records, progression } = setup();
    records.rebuild.mockRejectedValue(new Error('db down'));
    await expect(service.remove('c1', 'l1')).resolves.toBeUndefined();
    expect(progression.refreshExercise).toHaveBeenCalled();
  });
});
