import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { decodeCursor, encodeCursor, ModerationService, snapshotPreview } from './moderation.service';

const person = (id: string, displayName: string | null = null) => ({ id, name: id.toUpperCase(), displayName });

function row(i: number, over: Record<string, unknown> = {}) {
  return {
    id: `r${i}`,
    reporterId: 'rep',
    targetType: 'USER',
    targetId: 'u1',
    reason: 'SPAM',
    details: null,
    status: 'OPEN',
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 100 - i)),
    reporter: person('rep'),
    ...over,
  };
}

function setup(rows: ReturnType<typeof row>[] = []) {
  const prisma = {
    contentReport: {
      findMany: vi.fn().mockResolvedValue(rows),
      findUnique: vi.fn().mockResolvedValue({ id: 'r1' }),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve(row(1, data))),
      groupBy: vi.fn().mockImplementation(({ by }: { by: string[] }) =>
        Promise.resolve(by.includes('status') ? [{ status: 'OPEN', _count: { _all: 3 } }] : [{ targetType: 'USER', targetId: 'u1', _count: { _all: 2 } }]),
      ),
    },
    user: { findMany: vi.fn().mockResolvedValue([person('u1', 'Jordan')]) },
    trainingGroup: { findMany: vi.fn().mockResolvedValue([{ id: 'g1', name: 'Crew', _count: { members: 4 } }]) },
    sharedWorkout: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 's1',
          kind: 'TEMPLATE',
          caption: 'cap',
          summary: { title: 'Upper A', volumeKg: null, lifts: [{ exercise: 'A' }, { exercise: 'B' }, { exercise: 'C' }, { exercise: 'D' }] },
          createdAt: new Date(0),
          user: person('au', 'Author'),
          group: { name: 'Crew' },
        },
      ]),
    },
  };
  return { prisma, service: new ModerationService(prisma as never) };
}

describe('ModerationService.list', () => {
  it('defaults to OPEN, newest first, one extra row', async () => {
    const { service, prisma } = setup();
    await service.list({});
    const args = prisma.contentReport.findMany.mock.calls[0]![0];
    expect(args.where).toEqual({ status: 'OPEN' });
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.take).toBe(31);
    await service.list({ status: 'REVIEWED' });
    expect(prisma.contentReport.findMany.mock.calls[1]![0].where.status).toBe('REVIEWED');
  });

  it('pages with a cursor of the 30th row, and none on the last page', async () => {
    const full = Array.from({ length: 31 }, (_, i) => row(i));
    const { service } = setup(full);
    const page = await service.list({});
    expect(page.items).toHaveLength(30);
    expect(decodeCursor(page.nextCursor!)).toEqual({ createdAt: full[29]!.createdAt, id: full[29]!.id });
    expect((await setup(full.slice(0, 5)).service.list({})).nextCursor).toBeNull();
  });

  it('adds the keyset clause for a cursor and rejects a malformed one', async () => {
    const { service, prisma } = setup();
    const at = new Date('2026-01-01T00:00:00.000Z');
    await service.list({ cursor: encodeCursor({ createdAt: at, id: 'r5' }) });
    expect(prisma.contentReport.findMany.mock.calls[0]![0].where.OR).toEqual([{ createdAt: { lt: at } }, { createdAt: at, id: { lt: 'r5' } }]);
    await expect(service.list({ cursor: 'bm9waXBl' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list({ cursor: Buffer.from('not-a-date|x').toString('base64url') })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list({ cursor: Buffer.from(`${at.toISOString()}|`).toString('base64url') })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('round-trips cursors', () => {
    const c = { createdAt: new Date('2026-03-04T05:06:07.000Z'), id: 'abc' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it('builds previews for every target kind and null for a missing target', async () => {
    const { service } = setup([
      row(1, { targetType: 'USER', targetId: 'u1' }),
      row(2, { targetType: 'GROUP', targetId: 'g1' }),
      row(3, { targetType: 'SHARED_WORKOUT', targetId: 's1' }),
      row(4, { targetType: 'USER', targetId: 'gone' }),
    ]);
    const { items } = await service.list({});
    expect(items[0]!.preview).toEqual({ type: 'USER', name: 'Jordan' });
    expect(items[1]!.preview).toEqual({ type: 'GROUP', name: 'Crew', memberCount: 4 });
    expect(items[2]!.preview).toMatchObject({
      type: 'SHARED_WORKOUT',
      kind: 'TEMPLATE',
      author: { userId: 'au', name: 'Author' },
      groupName: 'Crew',
      title: 'Upper A',
      liftCount: 4,
      topLifts: ['A', 'B', 'C'],
      volumeKg: null,
      caption: 'cap',
    });
    expect(items[3]!.preview).toBeNull();
    expect(items[0]!.reporter).toEqual({ userId: 'rep', name: 'REP' });
  });

  it('batches one query per kind, skipping kinds with no ids', async () => {
    const all = setup([row(1), row(2, { targetType: 'GROUP', targetId: 'g1' }), row(3, { targetType: 'SHARED_WORKOUT', targetId: 's1' })]);
    await all.service.list({});
    expect(all.prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(all.prisma.trainingGroup.findMany).toHaveBeenCalledTimes(1);
    expect(all.prisma.sharedWorkout.findMany).toHaveBeenCalledTimes(1);
    const users = setup([row(1), row(2)]);
    await users.service.list({});
    expect(users.prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(users.prisma.trainingGroup.findMany).not.toHaveBeenCalled();
    expect(users.prisma.sharedWorkout.findMany).not.toHaveBeenCalled();
  });

  it('fills repeat counts and status counts', async () => {
    const { service } = setup([row(1), row(2, { targetId: 'other' })]);
    const page = await service.list({});
    expect(page.items.map((i) => i.openReportsOnTarget)).toEqual([2, 0]);
    expect(page.counts).toEqual({ OPEN: 3, REVIEWED: 0 });
  });
});

describe('snapshotPreview', () => {
  it('survives bad input', () => {
    expect(snapshotPreview(null)).toEqual({ title: 'Shared workout', liftCount: 0, topLifts: [], volumeKg: null });
    expect(snapshotPreview({ lifts: 'x', volumeKg: 5 })).toEqual({ title: 'Shared workout', liftCount: 0, topLifts: [], volumeKg: null });
    expect(snapshotPreview({ title: 'T', volumeKg: '120', lifts: [{ exercise: 'A' }] })).toEqual({ title: 'T', liftCount: 1, topLifts: ['A'], volumeKg: '120' });
  });
});

describe('ModerationService.setStatus', () => {
  it('updates and returns the hydrated report', async () => {
    const { service, prisma } = setup();
    const dto = await service.setStatus('r1', 'REVIEWED');
    expect(prisma.contentReport.update.mock.calls[0]![0].data).toEqual({ status: 'REVIEWED' });
    expect(dto).toMatchObject({ id: 'r1', status: 'REVIEWED', preview: { type: 'USER', name: 'Jordan' } });
  });

  it('404s for an unknown report without updating', async () => {
    const { service, prisma } = setup();
    prisma.contentReport.findUnique.mockResolvedValue(null);
    await expect(service.setStatus('nope', 'OPEN')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contentReport.update).not.toHaveBeenCalled();
  });
});
