import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { inviteCode, SocialService } from './social.service';

const user = (id: string) => ({ id, name: id.toUpperCase(), displayName: null });

function setup() {
  const members = [
    { groupId: 'g1', userId: 'me', role: 'MEMBER', shareStats: true, joinedAt: new Date(1), user: user('me') },
    { groupId: 'g1', userId: 'ann', role: 'OWNER', shareStats: true, joinedAt: new Date(0), user: user('ann') },
    { groupId: 'g1', userId: 'bob', role: 'MEMBER', shareStats: true, joinedAt: new Date(2), user: user('bob') },
    { groupId: 'g1', userId: 'cy', role: 'MEMBER', shareStats: false, joinedAt: new Date(3), user: user('cy') },
  ];
  const blocks = [{ blockerId: 'bob', blockedId: 'me' }];
  const prisma = {
    trainingGroupMember: {
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(members.find((m) => m.groupId === where.groupId_userId.groupId && m.userId === where.groupId_userId.userId) ?? null)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(members.filter((m) => m.groupId === where.groupId && (!where.shareStats || m.shareStats)))),
    },
    userBlock: { findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(blocks.filter((b) => where.OR.some((o: Record<string, string>) => Object.entries(o).every(([k, v]) => b[k as keyof typeof b] === v))))) },
    personalRecord: { groupBy: vi.fn().mockResolvedValue([{ clientId: 'ann', _count: { _all: 2 } }]) },
    sharedWorkout: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const health = {
    stepStats: vi.fn().mockImplementation((ids: string[]) => Promise.resolve(new Map(ids.map((id) => [id, { avg7Steps: id === 'me' ? 12000 : 9000, streakDays: 1 }])))),
  };
  return { prisma, health, service: new SocialService(prisma as never, health as never) };
}

describe('SocialService privacy', () => {
  it('hides every group route from non-members with 404', async () => {
    const { service } = setup();
    await expect(service.leaderboard('stranger', 'g1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.feed('stranger', 'g1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ranks opted-in members only, dropping a user who blocked the viewer', async () => {
    const { service, health } = setup();
    const board = await service.leaderboard('me', 'g1');
    expect(board.rows.map((r) => [r.rank, r.userId, r.prs7d])).toEqual([
      [1, 'me', 0],
      [2, 'ann', 2],
    ]);
    expect(health.stepStats).toHaveBeenCalledWith(['me', 'ann']);
  });

  it('filters blocked authors out of the feed query', async () => {
    const { service, prisma } = setup();
    await service.feed('me', 'g1');
    expect(prisma.sharedWorkout.findMany.mock.calls[0]![0].where).toEqual({ groupId: 'g1', userId: { notIn: ['bob'] } });
  });

  it('makes unambiguous 8-character invite codes', () => {
    const codes = new Set(Array.from({ length: 200 }, inviteCode));
    expect([...codes].every((c) => /^[A-HJ-NP-Z2-9]{8}$/.test(c))).toBe(true);
    expect(codes.size).toBe(200);
  });
});
