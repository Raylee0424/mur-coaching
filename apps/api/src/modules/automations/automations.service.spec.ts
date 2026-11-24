import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { lastDuePeriod, renderAutomationMessage } from '@coaching/shared';
import { AutomationsService } from './automations.service';

const rule = {
  id: 'r1',
  coachId: 'c1',
  name: 'Missed',
  trigger: 'SESSION_MISSED',
  delayHours: 24,
  messageBody: 'Hey {firstName}, {coachName} here.',
  enabled: true,
  createdAt: new Date('2026-11-20T00:00:00Z'),
  updatedAt: new Date('2026-11-20T00:00:00Z'),
} as const;

describe('automation rules', () => {
  it('finds the last due period', () => {
    const weekly = { cadence: 'WEEKLY' as const, weekday: 0, dueDate: null, startDate: '2026-11-01' };
    expect(lastDuePeriod(weekly, '2026-11-24')).toBe('2026-11-22'); // Tuesday → last Sunday
    expect(lastDuePeriod(weekly, '2026-11-22')).toBe('2026-11-22');
    expect(lastDuePeriod({ ...weekly, startDate: '2026-11-23' }, '2026-11-24')).toBeNull();
    expect(lastDuePeriod({ cadence: 'ONCE', weekday: null, dueDate: '2026-11-30', startDate: '2026-11-01' }, '2026-11-24')).toBeNull();
  });

  it('fills placeholders', () => {
    expect(renderAutomationMessage(rule.messageBody, { firstName: 'Sam', coachName: 'Alex' })).toBe('Hey Sam, Alex here.');
  });

  it('fires missed sessions due after the rule was created, once per event', async () => {
    const prisma = {
      scheduledWorkout: {
        findMany: vi.fn().mockResolvedValue([
          { id: 's-old', clientId: 'k1', date: new Date('2026-11-18T00:00:00Z') }, // due 11-20 00:00 = createdAt: fires
          { id: 's-new', clientId: 'k1', date: new Date('2026-11-22T00:00:00Z') }, // due 11-24 00:00
          { id: 's-early', clientId: 'k1', date: new Date('2026-11-17T00:00:00Z') }, // due before the rule existed
          { id: 's-fresh', clientId: 'k1', date: new Date('2026-11-23T00:00:00Z') }, // not due yet
        ]),
      },
      automationRun: { findMany: vi.fn().mockResolvedValue([{ idempotencyKey: 'r1:session:s-old:2026-11-18' }]) },
    };
    const service = new AutomationsService(prisma as never);
    const list = await service.candidates(rule as never, new Date('2026-11-24T12:00:00Z'));
    expect(list.map((c) => c.key)).toEqual(['session:s-new:2026-11-22']);
  });

  it('treats a duplicate idempotency key as already fired', async () => {
    const dup = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
    const prisma = { $transaction: vi.fn().mockRejectedValue(dup) };
    const service = new AutomationsService(prisma as never);
    const fired = await service.fire(rule as never, { clientId: 'k1', key: 'session:s:2026-11-22', subject: '', dueAt: new Date() }, { firstName: 'Sam', coachName: 'Alex' });
    expect(fired).toBe(false);
  });
});
