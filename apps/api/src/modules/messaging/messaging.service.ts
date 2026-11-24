import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Message, Prisma } from '@prisma/client';
import { MESSAGE_LIMITS } from '@coaching/shared';
import type { CoachInboxDto, MessageDto, MessageThreadDto, ThreadQuery } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';

/** A conversation as seen by one participant. */
export interface Participant {
  conversationId: string;
  viewerId: string;
  otherId: string;
  otherName: string;
}

const toDto = (m: Message, viewerId: string): MessageDto => ({
  id: m.id,
  senderId: m.senderId,
  mine: m.senderId === viewerId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});

/** Keyset order: createdAt, then id, so equal timestamps never skip or repeat a message. */
const olderThan = (c: Pick<Message, 'createdAt' | 'id'>): Prisma.MessageWhereInput => ({
  OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }],
});
const newerThan = (c: Pick<Message, 'createdAt' | 'id'>): Prisma.MessageWhereInput => ({
  OR: [{ createdAt: { gt: c.createdAt } }, { createdAt: c.createdAt, id: { gt: c.id } }],
});

/** Upper bound on one poll; the page reloads the latest history if a gap is larger. */
const POLL_LIMIT = 100;

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private async open(coachId: string, clientId: string): Promise<string> {
    const row = await this.prisma.conversation.upsert({
      where: { coachId_clientId: { coachId, clientId } },
      create: { coachId, clientId },
      update: {},
      select: { id: true },
    });
    return row.id;
  }

  /** Coach side. 404 unless the client is on the coach's accessible roster. */
  async asCoach(coachId: string, clientId: string): Promise<Participant> {
    const link = await this.prisma.coachClient.findFirst({
      where: { coachId, clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
      select: { client: { select: { name: true, displayName: true } } },
    });
    if (!link) throw new NotFoundException('Client not found');
    return { conversationId: await this.open(coachId, clientId), viewerId: coachId, otherId: clientId, otherName: link.client.displayName ?? link.client.name };
  }

  /** Client side: the thread with their current coach. 404 once the link is archived. */
  async asClient(clientId: string): Promise<Participant> {
    const link = await this.prisma.coachClient.findUnique({
      where: { clientId },
      select: { coachId: true, status: true, coach: { select: { name: true, displayName: true } } },
    });
    if (!link || !isAccessibleLink(link.status)) throw new NotFoundException('You have no active coach to message.');
    return { conversationId: await this.open(link.coachId, clientId), viewerId: clientId, otherId: link.coachId, otherName: link.coach.displayName ?? link.coach.name };
  }

  async thread(p: Participant, query: ThreadQuery): Promise<MessageThreadDto> {
    if (query.before && query.after) throw new BadRequestException('Use either before or after, not both.');
    const cursorId = query.before ?? query.after;
    const cursor = cursorId
      ? await this.prisma.message.findFirst({ where: { id: cursorId, conversationId: p.conversationId }, select: { id: true, createdAt: true } })
      : null;
    if (cursorId && !cursor) throw new NotFoundException('Message not found');

    let messages: Message[];
    let olderCursor: string | null = null;
    if (query.after && cursor) {
      messages = await this.prisma.message.findMany({
        where: { conversationId: p.conversationId, ...newerThan(cursor) },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: POLL_LIMIT,
      });
    } else {
      const page = await this.prisma.message.findMany({
        where: { conversationId: p.conversationId, ...(cursor ? olderThan(cursor) : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: MESSAGE_LIMITS.pageSize + 1,
      });
      const hasMore = page.length > MESSAGE_LIMITS.pageSize;
      messages = page.slice(0, MESSAGE_LIMITS.pageSize).reverse();
      olderCursor = hasMore ? (messages[0]?.id ?? null) : null;
    }

    const otherRead = await this.prisma.messageRead.findUnique({
      where: { conversationId_userId: { conversationId: p.conversationId, userId: p.otherId } },
      select: { lastReadAt: true },
    });
    return {
      conversationId: p.conversationId,
      otherName: p.otherName,
      messages: messages.map((m) => toDto(m, p.viewerId)),
      olderCursor,
      otherReadAt: otherRead?.lastReadAt.toISOString() ?? null,
    };
  }

  async send(p: Participant, body: string): Promise<MessageDto> {
    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId: p.conversationId, senderId: p.viewerId, body, createdAt: now } }),
      this.prisma.conversation.update({ where: { id: p.conversationId }, data: { lastMessageAt: now } }),
      // Sending implies the sender has seen everything before it.
      this.readUpsert(p, now),
    ]);
    return toDto(message, p.viewerId);
  }

  async markRead(p: Participant): Promise<void> {
    await this.readUpsert(p, new Date());
  }

  private readUpsert(p: Participant, at: Date) {
    return this.prisma.messageRead.upsert({
      where: { conversationId_userId: { conversationId: p.conversationId, userId: p.viewerId } },
      create: { conversationId: p.conversationId, userId: p.viewerId, lastReadAt: at },
      update: { lastReadAt: at },
    });
  }

  /** Every accessible client, with or without a thread; unread threads first, then most recent. */
  async coachInbox(coachId: string): Promise<CoachInboxDto> {
    const [links, conversations, unreadRows] = await Promise.all([
      this.prisma.coachClient.findMany({
        where: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
        select: { client: { select: { id: true, name: true, displayName: true } } },
      }),
      this.prisma.conversation.findMany({
        where: { coachId },
        select: { clientId: true, lastMessageAt: true, messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, select: { body: true } } },
      }),
      this.prisma.$queryRaw<{ clientId: string; unread: number }[]>`
        SELECT c."clientId", COUNT(m.id)::int AS unread
        FROM "Conversation" c
        JOIN "Message" m ON m."conversationId" = c.id AND m."senderId" <> c."coachId"
        LEFT JOIN "MessageRead" r ON r."conversationId" = c.id AND r."userId" = c."coachId"
        WHERE c."coachId" = ${coachId} AND (r."lastReadAt" IS NULL OR m."createdAt" > r."lastReadAt")
        GROUP BY c."clientId"`,
    ]);
    const byClient = new Map(conversations.map((c) => [c.clientId, c]));
    const unread = new Map(unreadRows.map((r) => [r.clientId, Number(r.unread)]));
    const rows = links.map(({ client }) => {
      const c = byClient.get(client.id);
      return {
        clientId: client.id,
        clientName: client.displayName ?? client.name,
        lastMessage: c?.messages[0]?.body ?? null,
        lastMessageAt: c?.lastMessageAt?.toISOString() ?? null,
        unread: unread.get(client.id) ?? 0,
      };
    });
    rows.sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '') || a.clientName.localeCompare(b.clientName));
    return { conversations: rows, totalUnread: rows.reduce((s, r) => s + r.unread, 0) };
  }
}
