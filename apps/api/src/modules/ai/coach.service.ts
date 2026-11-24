import { Injectable, NotFoundException } from '@nestjs/common';
import type { AiConversation, AiMessage, Prisma } from '@prisma/client';
import { AI_LIMITS, AiUsageKind } from '@coaching/shared';
import type { AiCitation, AiConversationDto, AiConversationSummaryDto, AiMessageDto, AiSource, AskCoachResponse, CoachOverviewDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AiContextService } from './ai-context.service';
import { AiProviderService } from './ai-provider.service';
import { AiUsageService } from './ai-usage.service';
import { coachSystemPrompt, pickCitations, rulesAnswer } from './coach-rules';

const toMessage = (m: AiMessage): AiMessageDto => ({
  id: m.id,
  role: m.role,
  content: m.content,
  citations: (m.citations as unknown as AiCitation[]) ?? [],
  source: (m.source as AiSource | null) ?? null,
  createdAt: m.createdAt.toISOString(),
});

const toSummary = (c: AiConversation & { _count: { messages: number } }): AiConversationSummaryDto => ({
  id: c.id,
  title: c.title,
  updatedAt: c.updatedAt.toISOString(),
  messageCount: c._count.messages,
});

/** MUR AI Training Coach. Read-only over training data: it stores its own conversation and nothing else. */
@Injectable()
export class CoachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: AiContextService,
    private readonly provider: AiProviderService,
    private readonly usage: AiUsageService,
  ) {}

  async overview(clientId: string): Promise<CoachOverviewDto> {
    const [conversations, ctx] = await Promise.all([this.list(clientId), this.context.build(clientId)]);
    return { conversations, stats: ctx.stats, modelEnabled: this.provider.enabled };
  }

  async list(clientId: string): Promise<AiConversationSummaryDto[]> {
    const rows = await this.prisma.aiConversation.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      take: AI_LIMITS.conversationsListed,
      include: { _count: { select: { messages: true } } },
    });
    return rows.map(toSummary);
  }

  async get(clientId: string, id: string): Promise<AiConversationDto> {
    const row = await this.prisma.aiConversation.findFirst({
      where: { id, clientId },
      include: { _count: { select: { messages: true } }, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Conversation not found');
    return { ...toSummary(row), messages: row.messages.map(toMessage) };
  }

  async remove(clientId: string, id: string): Promise<void> {
    const { count } = await this.prisma.aiConversation.deleteMany({ where: { id, clientId } });
    if (count === 0) throw new NotFoundException('Conversation not found');
  }

  async ask(clientId: string, question: string, conversationId?: string): Promise<AskCoachResponse> {
    // Ownership first, so a foreign id is a 404 and never uses up the cap.
    const history = conversationId ? (await this.get(clientId, conversationId)).messages : [];
    const remainingToday = await this.usage.consume(clientId, AiUsageKind.COACH);
    const ctx = await this.context.build(clientId);
    const citations = pickCitations(question, ctx);

    const turns = [
      ...history.slice(-AI_LIMITS.historyTurns).map((m) => ({ role: m.role === 'USER' ? ('user' as const) : ('assistant' as const), content: m.content })),
      { role: 'user' as const, content: question },
    ];
    const modelText = await this.provider.text(coachSystemPrompt(ctx), turns);
    const source: AiSource = modelText ? 'MODEL' : 'RULES';
    const answer = modelText ?? rulesAnswer(question, ctx, citations);

    const id = await this.prisma.$transaction(async (tx) => {
      const convo = conversationId
        ? await tx.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
        : await tx.aiConversation.create({ data: { clientId, title: question.slice(0, AI_LIMITS.maxTitle) } });
      await tx.aiMessage.create({ data: { conversationId: convo.id, role: 'USER', content: question } });
      await tx.aiMessage.create({
        data: { conversationId: convo.id, role: 'ASSISTANT', content: answer, citations: citations as unknown as Prisma.InputJsonValue, source },
      });
      return convo.id;
    });
    return { conversation: await this.get(clientId, id), stats: ctx.stats, remainingToday };
  }
}
