import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LiveService } from './live.service';

function setup(existingRequest: boolean) {
  const tx = {
    $executeRaw: vi.fn(),
    setLog: { findUnique: vi.fn().mockResolvedValue(existingRequest ? { id: 's1' } : null), aggregate: vi.fn().mockResolvedValue({ _max: { setNumber: 2 } }), create: vi.fn().mockResolvedValue({ id: 's3' }) },
    liveParticipant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ workoutLogId: 'w1' }), update: vi.fn() },
    workoutLog: { create: vi.fn() },
    exerciseLog: { findMany: vi.fn().mockResolvedValue([{ id: 'e1', exerciseId: 'x1', order: 1 }]), create: vi.fn() },
    sessionFeedback: { create: vi.fn() },
  };
  const prisma = {
    liveSession: {
      findFirst: vi.fn().mockResolvedValue({ id: 'l1', title: 'Lower A', startedAt: new Date(), endedAt: null, participants: [], coach: { name: 'A', displayName: null } }),
    },
    liveParticipant: { findFirst: vi.fn().mockResolvedValue({ id: 'p1' }) },
    exercise: { findFirst: vi.fn().mockResolvedValue({ id: 'x1' }) },
    coachClient: { count: vi.fn().mockResolvedValue(2) },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const logs = { refreshProgression: vi.fn() };
  return { tx, prisma, logs, service: new LiveService(prisma as never, logs as never) };
}

const input = { requestId: '7b4c1d1e-1111-4a4a-8a8a-123456789abc', clientId: 'k1', exerciseId: 'x1', weightKg: '100', reps: 5, cue: 'Brace' };

describe('LiveService', () => {
  it('appends to the current lift with the next set number and stores the cue as set feedback', async () => {
    const { service, tx, logs } = setup(false);
    await service.logSet('c1', 'l1', input);
    expect(tx.exerciseLog.create).not.toHaveBeenCalled();
    expect(tx.setLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ exerciseLogId: 'e1', setNumber: 3, requestId: input.requestId }) });
    expect(tx.sessionFeedback.create).toHaveBeenCalledWith({ data: expect.objectContaining({ setLogId: 's3', body: 'Brace', coachId: 'c1' }) });
    expect(logs.refreshProgression).toHaveBeenCalledWith('k1', ['x1']);
  });

  it('treats a repeated request id as already logged', async () => {
    const { service, tx, logs } = setup(true);
    await service.logSet('c1', 'l1', input);
    expect(tx.setLog.create).not.toHaveBeenCalled();
    expect(logs.refreshProgression).not.toHaveBeenCalled();
  });

  it('keeps remote sessions one-to-one', async () => {
    const { service } = setup(false);
    await expect(service.start('c1', { title: 'x', mode: 'REMOTE', clientIds: ['k1', 'k2'] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
