import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CheckInCadence, openPeriod, resolveCheckInAnswers, validateCheckInTemplate } from '@coaching/shared';
import type {
  CheckInAnswer,
  CheckInInboxDto,
  CheckInQuestionDto,
  CheckInResponseDto,
  CheckInTemplateDto,
  ClientCheckInsDto,
  CreateCheckInScheduleRequest,
  DueCheckInDto,
  ReviewCheckInRequest,
  SaveCheckInTemplateRequest,
  SubmitCheckInRequest,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES, isAccessibleLink } from '../clients/link-status';

const day = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
/** Server UTC date, as roadmaps use. */
const todayUtc = (): string => day(new Date());

const INBOX_LIMIT = 100;

const templateInclude = {
  questions: { orderBy: { position: 'asc' } },
  schedules: { where: { active: true }, include: { client: { select: { name: true, displayName: true } } }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CheckInTemplateInclude;

type QuestionRow = Prisma.CheckInQuestionGetPayload<object>;
const toQuestion = (q: QuestionRow): CheckInQuestionDto => ({ id: q.id, prompt: q.prompt, kind: q.kind, required: q.required, unit: q.unit });

const toTemplate = (t: Prisma.CheckInTemplateGetPayload<{ include: typeof templateInclude }>): CheckInTemplateDto => ({
  id: t.id,
  title: t.title,
  questions: t.questions.map(toQuestion),
  schedules: t.schedules.map((s) => ({
    id: s.id,
    clientId: s.clientId,
    clientName: s.client.displayName ?? s.client.name,
    cadence: s.cadence,
    weekday: s.weekday,
    dueDate: s.dueDate ? day(s.dueDate) : null,
  })),
});

const responseInclude = {
  schedule: { select: { template: { select: { title: true } } } },
} satisfies Prisma.CheckInResponseInclude;

const toResponse = (r: Prisma.CheckInResponseGetPayload<{ include: typeof responseInclude }>): CheckInResponseDto => ({
  id: r.id,
  templateTitle: r.schedule.template.title,
  periodDate: day(r.periodDate),
  submittedAt: r.submittedAt.toISOString(),
  answers: r.answers as unknown as CheckInAnswer[],
  reviewedAt: r.reviewedAt?.toISOString() ?? null,
  coachReply: r.coachReply,
});

@Injectable()
export class CheckInsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Coach: templates ───

  private async ownedTemplate(coachId: string, id: string): Promise<void> {
    const found = await this.prisma.checkInTemplate.findFirst({ where: { id, coachId }, select: { id: true } });
    if (!found) throw new NotFoundException('Check-in not found');
  }

  private questionRows(input: SaveCheckInTemplateRequest) {
    return input.questions.map((q, position) => ({ position, prompt: q.prompt, kind: q.kind, required: q.required, unit: q.kind === 'NUMBER' ? q.unit || null : null }));
  }

  async createTemplate(coachId: string, input: SaveCheckInTemplateRequest): Promise<CheckInTemplateDto> {
    const problem = validateCheckInTemplate(input);
    if (problem) throw new BadRequestException(problem);
    const row = await this.prisma.checkInTemplate.create({
      data: { coachId, title: input.title, questions: { create: this.questionRows(input) } },
      include: templateInclude,
    });
    return toTemplate(row);
  }

  /** Replaces the questions. Submitted answers keep their own copy of each prompt. */
  async updateTemplate(coachId: string, id: string, input: SaveCheckInTemplateRequest): Promise<CheckInTemplateDto> {
    const problem = validateCheckInTemplate(input);
    if (problem) throw new BadRequestException(problem);
    await this.ownedTemplate(coachId, id);
    const [, , row] = await this.prisma.$transaction([
      this.prisma.checkInQuestion.deleteMany({ where: { templateId: id } }),
      this.prisma.checkInTemplate.update({ where: { id }, data: { title: input.title, questions: { create: this.questionRows(input) } } }),
      this.prisma.checkInTemplate.findUniqueOrThrow({ where: { id }, include: templateInclude }),
    ]);
    return toTemplate(row);
  }

  /** Refused once any client has answered it, so history is never lost. Unassign instead. */
  async deleteTemplate(coachId: string, id: string): Promise<void> {
    await this.ownedTemplate(coachId, id);
    const answered = await this.prisma.checkInResponse.count({ where: { schedule: { templateId: id } } });
    if (answered > 0) throw new ConflictException('Clients have answered this check-in. Unassign it instead of deleting it.');
    await this.prisma.checkInTemplate.delete({ where: { id } });
  }

  // ─── Coach: schedules ───

  /** Assigning the same template to the same client again replaces the cadence and restarts it today. */
  async assign(coachId: string, input: CreateCheckInScheduleRequest): Promise<CheckInTemplateDto> {
    await this.ownedTemplate(coachId, input.templateId);
    const link = await this.prisma.coachClient.count({ where: { coachId, clientId: input.clientId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } });
    if (!link) throw new NotFoundException('Client not found');

    const weekly = input.cadence === CheckInCadence.WEEKLY;
    if (weekly && input.weekday === undefined) throw new BadRequestException('Pick the day the weekly check-in is due.');
    if (!weekly && !input.dueDate) throw new BadRequestException('Pick the due date.');
    if (!weekly && input.dueDate && Number.isNaN(asDate(input.dueDate).getTime())) throw new BadRequestException('That due date is not a real date.');
    const today = todayUtc();
    if (!weekly && input.dueDate && input.dueDate < today) throw new BadRequestException('The due date is in the past.');

    const data = {
      cadence: input.cadence,
      weekday: weekly ? (input.weekday ?? null) : null,
      dueDate: weekly ? null : asDate(input.dueDate as string),
      startDate: asDate(today),
      active: true,
    };
    await this.prisma.checkInSchedule.upsert({
      where: { templateId_clientId: { templateId: input.templateId, clientId: input.clientId } },
      create: { templateId: input.templateId, clientId: input.clientId, ...data },
      update: data,
    });
    return toTemplate(await this.prisma.checkInTemplate.findUniqueOrThrow({ where: { id: input.templateId }, include: templateInclude }));
  }

  /** Soft: past answers stay in the inbox. */
  async unassign(coachId: string, scheduleId: string): Promise<void> {
    const { count } = await this.prisma.checkInSchedule.updateMany({ where: { id: scheduleId, template: { coachId } }, data: { active: false } });
    if (!count) throw new NotFoundException('Assignment not found');
  }

  // ─── Coach: inbox ───

  async inbox(coachId: string): Promise<CheckInInboxDto> {
    const accessible = { coachLink: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } } satisfies Prisma.UserWhereInput;
    const [responses, unreviewed, templates, links] = await Promise.all([
      this.prisma.checkInResponse.findMany({
        where: { schedule: { template: { coachId } }, client: accessible },
        include: { ...responseInclude, client: { select: { name: true, displayName: true } } },
        orderBy: { submittedAt: 'desc' },
        take: INBOX_LIMIT,
      }),
      this.prisma.checkInResponse.count({ where: { schedule: { template: { coachId } }, client: accessible, reviewedAt: null } }),
      this.prisma.checkInTemplate.findMany({ where: { coachId }, include: templateInclude, orderBy: { createdAt: 'asc' } }),
      this.prisma.coachClient.findMany({
        where: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } },
        select: { client: { select: { id: true, name: true, displayName: true } } },
        orderBy: { client: { name: 'asc' } },
      }),
    ]);

    // Latest bodyweight on or before each submission, from one read per page.
    const clientIds = [...new Set(responses.map((r) => r.clientId))];
    const oldest = responses.at(-1)?.submittedAt;
    const weights = oldest
      ? await this.prisma.bodyweightEntry.findMany({
          where: { clientId: { in: clientIds }, date: { gte: new Date(oldest.getTime() - 30 * 86_400_000) } },
          orderBy: { date: 'desc' },
          select: { clientId: true, date: true, weightKg: true },
        })
      : [];
    const weightAt = (clientId: string, at: Date): string | null =>
      weights.find((w) => w.clientId === clientId && day(w.date) <= day(at))?.weightKg.toString() ?? null;

    return {
      responses: responses.map((r) => ({
        ...toResponse(r),
        clientId: r.clientId,
        clientName: r.client.displayName ?? r.client.name,
        bodyweightKg: weightAt(r.clientId, r.submittedAt),
      })),
      unreviewed,
      templates: templates.map(toTemplate),
      clients: links.map(({ client }) => ({ id: client.id, name: client.displayName ?? client.name })),
    };
  }

  async review(coachId: string, id: string, input: ReviewCheckInRequest): Promise<void> {
    const row = await this.prisma.checkInResponse.findFirst({
      where: { id, schedule: { template: { coachId } }, client: { coachLink: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } } },
      select: { id: true, reviewedAt: true },
    });
    if (!row) throw new NotFoundException('Check-in not found');
    const now = new Date();
    await this.prisma.checkInResponse.update({
      where: { id },
      data: {
        reviewedAt: input.reviewed ? (row.reviewedAt ?? now) : null,
        ...(input.reply !== undefined ? { coachReply: input.reply || null, repliedAt: input.reply ? now : null } : {}),
      },
    });
  }

  // ─── Client ───

  private async currentCoach(clientId: string): Promise<string | null> {
    const link = await this.prisma.coachClient.findUnique({ where: { clientId }, select: { coachId: true, status: true } });
    return link && isAccessibleLink(link.status) ? link.coachId : null;
  }

  private activeSchedules(clientId: string, coachId: string) {
    return this.prisma.checkInSchedule.findMany({
      where: { clientId, active: true, template: { coachId } },
      include: { template: { include: { questions: { orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async forClient(clientId: string, today = todayUtc()): Promise<ClientCheckInsDto> {
    const recent = await this.prisma.checkInResponse.findMany({ where: { clientId }, include: responseInclude, orderBy: { submittedAt: 'desc' }, take: 10 });
    const coachId = await this.currentCoach(clientId);
    if (!coachId) return { due: [], recent: recent.map(toResponse) };

    const schedules = await this.activeSchedules(clientId, coachId);
    const answered = await this.prisma.checkInResponse.findMany({
      where: { scheduleId: { in: schedules.map((s) => s.id) } },
      select: { scheduleId: true, periodDate: true },
    });
    const done = new Set(answered.map((a) => `${a.scheduleId}:${day(a.periodDate)}`));
    const due: DueCheckInDto[] = [];
    for (const s of schedules) {
      const period = openPeriod({ cadence: s.cadence, weekday: s.weekday, dueDate: s.dueDate ? day(s.dueDate) : null, startDate: day(s.startDate) }, today);
      if (period && !done.has(`${s.id}:${period}`)) {
        due.push({ scheduleId: s.id, templateTitle: s.template.title, periodDate: period, questions: s.template.questions.map(toQuestion) });
      }
    }
    return { due, recent: recent.map(toResponse) };
  }

  async submit(clientId: string, scheduleId: string, input: SubmitCheckInRequest, today = todayUtc()): Promise<CheckInResponseDto> {
    const coachId = await this.currentCoach(clientId);
    const schedule = coachId ? (await this.activeSchedules(clientId, coachId)).find((s) => s.id === scheduleId) : undefined;
    if (!schedule) throw new NotFoundException('Check-in not found');
    const period = openPeriod(
      { cadence: schedule.cadence, weekday: schedule.weekday, dueDate: schedule.dueDate ? day(schedule.dueDate) : null, startDate: day(schedule.startDate) },
      today,
    );
    if (period !== input.periodDate) throw new BadRequestException('This check-in is not open right now. Reload the page.');
    const resolved = resolveCheckInAnswers(schedule.template.questions.map(toQuestion), input.answers);
    if ('error' in resolved) throw new BadRequestException(resolved.error);
    try {
      const row = await this.prisma.checkInResponse.create({
        data: { scheduleId, clientId, periodDate: asDate(period), answers: resolved.answers as unknown as Prisma.InputJsonValue },
        include: responseInclude,
      });
      return toResponse(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('You already sent this check-in.');
      throw err;
    }
  }
}
