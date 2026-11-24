import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MESSAGE_LIMITS } from '@coaching/shared';
import { MessagingService } from './messaging.service';

const msg = (i: number, sender = 'k1') => ({ id: `m${i}`, conversationId: 'cv', senderId: sender, body: `b${i}`, createdAt: new Date(Date.UTC(2026, 10, 24, 10, 0, i)) });

function setup() {
  const prisma = {
    coachClient: { findFirst: vi.fn().mockResolvedValue({ client: { name: 'Kai', displayName: null } }), findUnique: vi.fn() },
    conversation: { upsert: vi.fn().mockResolvedValue({ id: 'cv' }) },
    message: { findFirst: vi.fn(), findMany: vi.fn() },
    messageRead: { findUnique: vi.fn().mockResolvedValue({ lastReadAt: new Date(Date.UTC(2026, 10, 24, 10, 0, 5)) }) },
  };
  return { prisma, service: new MessagingService(prisma as never) };
}

const participant = { conversationId: 'cv', viewerId: 'c1', otherId: 'k1', otherName: 'Kai' };

describe('MessagingService', () => {
  it('404s a coach outside the roster and a client without an active coach', async () => {
    const { service, prisma } = setup();
    prisma.coachClient.findFirst.mockResolvedValue(null);
    await expect(service.asCoach('c1', 'stranger')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.conversation.upsert).not.toHaveBeenCalled();
    prisma.coachClient.findUnique.mockResolvedValue({ coachId: 'c1', status: 'ARCHIVED', coach: { name: 'C', displayName: null } });
    await expect(service.asClient('k1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the latest page oldest first with a cursor to older history', async () => {
    const { service, prisma } = setup();
    const desc = Array.from({ length: MESSAGE_LIMITS.pageSize + 1 }, (_, i) => msg(100 - i));
    prisma.message.findMany.mockResolvedValue(desc);
    const page = await service.thread(participant, {});
    expect(page.messages).toHaveLength(MESSAGE_LIMITS.pageSize);
    expect(page.messages[0]?.id).toBe(`m${100 - MESSAGE_LIMITS.pageSize + 1}`);
    expect(page.messages.at(-1)?.id).toBe('m100');
    expect(page.olderCursor).toBe(page.messages[0]?.id);
    expect(page.otherReadAt).toBe('2026-11-24T10:00:05.000Z');
    expect(page.messages[0]?.mine).toBe(false);
  });

  it('pages before a cursor by (createdAt, id) and refuses a cursor from another thread', async () => {
    const { service, prisma } = setup();
    prisma.message.findFirst.mockResolvedValue({ id: 'm5', createdAt: msg(5).createdAt });
    prisma.message.findMany.mockResolvedValue([msg(4), msg(3)]);
    const page = await service.thread(participant, { before: 'm5' });
    expect(page.olderCursor).toBeNull();
    expect(prisma.message.findMany.mock.calls[0]?.[0].where.OR).toEqual([{ createdAt: { lt: msg(5).createdAt } }, { createdAt: msg(5).createdAt, id: { lt: 'm5' } }]);

    prisma.message.findFirst.mockResolvedValue(null);
    await expect(service.thread(participant, { after: 'foreign' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.thread(participant, { before: 'a', after: 'b' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
