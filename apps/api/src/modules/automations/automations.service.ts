import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AutomationTrigger, PaymentStatus, Prisma, ScheduledStatus } from '@prisma/client';
import type { AutomationRule } from '@prisma/client';
import { AUTOMATION_LIMITS, dueAfterDay, lastDuePeriod, renderAutomationMessage } from '@coaching/shared';
import type { AutomationCandidateDto, AutomationRuleDto, AutomationsDto, SaveAutomationRuleRequest } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';

const HOUR_MS = 3_600_000;
const day = (d: Date): string => d.toISOString().slice(0, 10);
const firstName = (u: { name: string; displayName: string | null }): string => (u.displayName ?? u.name).split(/\s+/)[0] ?? '';

/** One event a rule would act on. `key` is the rule-scoped part of the idempotency key. */
export interface Candidate {
  clientId: string;
  key: string;
  subject: string;
  dueAt: Date;
}

/**
 * Deterministic triggers. A candidate is an event whose due time (event + delay) has passed and falls after the
 * rule was created. Firing writes the run (unique idempotency key) and the message in one transaction, so a
 * rule acts once per event even when two workers race or a run is retried.
 */
@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Rules ───

  async overview(coachId: string): Promise<AutomationsDto> {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const [rules, monthly, last, runs] = await Promise.all([
      this.prisma.automationRule.findMany({ where: { coachId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.automationRun.groupBy({ by: ['ruleId'], where: { rule: { coachId }, firedAt: { gte: monthStart } }, _count: { _all: true } }),
      this.prisma.automationRun.groupBy({ by: ['ruleId'], where: { rule: { coachId } }, _max: { firedAt: true } }),
      this.prisma.automationRun.findMany({
        where: { rule: { coachId } },
        orderBy: { firedAt: 'desc' },
        take: AUTOMATION_LIMITS.runLog,
        include: { rule: { select: { name: true } }, client: { select: { name: true, displayName: true } } },
      }),
    ]);
    const counts = new Map(monthly.map((m) => [m.ruleId, m._count._all]));
    const lastAt = new Map(last.map((m) => [m.ruleId, m._max.firedAt]));
    return {
      rules: rules.map((r) => this.toRule(r, counts.get(r.id) ?? 0, lastAt.get(r.id) ?? null)),
      runs: runs.map((r) => ({ id: r.id, ruleName: r.rule.name, clientName: r.client.displayName ?? r.client.name, firedAt: r.firedAt.toISOString() })),
    };
  }

  private toRule(r: AutomationRule, runsThisMonth = 0, lastRunAt: Date | null = null): AutomationRuleDto {
    return {
      id: r.id,
      name: r.name,
      trigger: r.trigger,
      delayHours: r.delayHours,
      messageBody: r.messageBody,
      enabled: r.enabled,
      createdAt: r.createdAt.toISOString(),
      runsThisMonth,
      lastRunAt: lastRunAt?.toISOString() ?? null,
    };
  }

  async create(coachId: string, input: SaveAutomationRuleRequest): Promise<AutomationRuleDto> {
    const count = await this.prisma.automationRule.count({ where: { coachId } });
    if (count >= AUTOMATION_LIMITS.maxRules) throw new ConflictException(`You can keep ${AUTOMATION_LIMITS.maxRules} rules.`);
    return this.toRule(await this.prisma.automationRule.create({ data: { coachId, ...input } }));
  }

  async update(coachId: string, id: string, input: SaveAutomationRuleRequest): Promise<AutomationRuleDto> {
    const { count } = await this.prisma.automationRule.updateMany({ where: { id, coachId }, data: input });
    if (!count) throw new NotFoundException('Rule not found');
    return this.toRule(await this.prisma.automationRule.findUniqueOrThrow({ where: { id } }));
  }

  async remove(coachId: string, id: string): Promise<void> {
    const { count } = await this.prisma.automationRule.deleteMany({ where: { id, coachId } });
    if (!count) throw new NotFoundException('Rule not found');
  }

  // ─── Triggers ───

  /** Events for one rule that are due by `now` and have not fired yet. */
  async candidates(rule: AutomationRule, now: Date): Promise<Candidate[]> {
    const delay = rule.delayHours * HOUR_MS;
    const roster = { coachLink: { coachId: rule.coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } };
    let found: Candidate[] = [];

    if (rule.trigger === AutomationTrigger.PAYMENT_RECEIVED) {
      const rows = await this.prisma.payment.findMany({
        where: { coachId: rule.coachId, status: PaymentStatus.SUCCEEDED, paidAt: { gte: new Date(rule.createdAt.getTime() - delay), lte: new Date(now.getTime() - delay) }, client: roster },
        select: { id: true, clientId: true, paidAt: true },
      });
      found = rows.map((p) => ({ clientId: p.clientId, key: `payment:${p.id}`, subject: `Payment on ${day(p.paidAt)}`, dueAt: new Date(p.paidAt.getTime() + delay) }));
    }

    if (rule.trigger === AutomationTrigger.SESSION_MISSED) {
      // Due when the session's UTC day ends plus the delay; the date bound keeps the scan to that window.
      const rows = await this.prisma.scheduledWorkout.findMany({
        where: {
          status: ScheduledStatus.PLANNED,
          date: { gte: new Date(rule.createdAt.getTime() - delay - 86_400_000), lte: new Date(now.getTime() - delay) },
          client: roster,
        },
        select: { id: true, clientId: true, date: true },
      });
      found = rows.map((s) => ({ clientId: s.clientId, key: `session:${s.id}:${day(s.date)}`, subject: `Session on ${day(s.date)}`, dueAt: new Date(dueAfterDay(day(s.date), rule.delayHours)) }));
    }

    if (rule.trigger === AutomationTrigger.CHECK_IN_OVERDUE) {
      const schedules = await this.prisma.checkInSchedule.findMany({
        where: { active: true, template: { coachId: rule.coachId }, client: roster },
        select: { id: true, clientId: true, cadence: true, weekday: true, dueDate: true, startDate: true },
      });
      const lateBy = (period: string): boolean => dueAfterDay(period, rule.delayHours) <= now.getTime();
      const due = schedules.flatMap((s) => {
        // The newest period already past its delay: step back a week when this week's is not late yet.
        const today = day(now);
        let period = lastDuePeriod({ cadence: s.cadence, weekday: s.weekday, dueDate: s.dueDate && day(s.dueDate), startDate: day(s.startDate) }, today);
        if (period && !lateBy(period) && s.cadence === 'WEEKLY') {
          const prev = new Date(Date.parse(`${period}T00:00:00Z`) - 86_400_000);
          period = lastDuePeriod({ cadence: s.cadence, weekday: s.weekday, dueDate: null, startDate: day(s.startDate) }, day(prev));
        }
        return period && lateBy(period) ? [{ s, period }] : [];
      });
      const answered = due.length
        ? await this.prisma.checkInResponse.findMany({
            where: { OR: due.map(({ s, period }) => ({ scheduleId: s.id, periodDate: new Date(`${period}T00:00:00Z`) })) },
            select: { scheduleId: true, periodDate: true },
          })
        : [];
      const done = new Set(answered.map((a) => `${a.scheduleId}:${day(a.periodDate)}`));
      found = due
        .filter(({ s, period }) => !done.has(`${s.id}:${period}`))
        .map(({ s, period }) => ({ clientId: s.clientId, key: `checkin:${s.id}:${period}`, subject: `Check-in due ${period}`, dueAt: new Date(dueAfterDay(period, rule.delayHours)) }));
    }

    const live = found.filter((c) => c.dueAt.getTime() >= rule.createdAt.getTime() && c.dueAt.getTime() <= now.getTime());
    if (live.length === 0) return [];
    const fired = await this.prisma.automationRun.findMany({ where: { idempotencyKey: { in: live.map((c) => this.idempotencyKey(rule, c)) } }, select: { idempotencyKey: true } });
    const seen = new Set(fired.map((f) => f.idempotencyKey));
    return live.filter((c) => !seen.has(this.idempotencyKey(rule, c)));
  }

  idempotencyKey(rule: Pick<AutomationRule, 'id'>, c: Pick<Candidate, 'key'>): string {
    return `${rule.id}:${c.key}`;
  }

  async dryRun(coachId: string, id: string): Promise<AutomationCandidateDto[]> {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, coachId } });
    if (!rule) throw new NotFoundException('Rule not found');
    const list = await this.candidates(rule, new Date());
    const names = await this.names(list.map((c) => c.clientId));
    return list.map((c) => ({ clientId: c.clientId, clientName: names.get(c.clientId)?.full ?? '', subject: c.subject, dueAt: c.dueAt.toISOString() }));
  }

  private async names(ids: string[]): Promise<Map<string, { full: string; first: string }>> {
    const users = await this.prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, displayName: true } });
    return new Map(users.map((u) => [u.id, { full: u.displayName ?? u.name, first: firstName(u) }]));
  }

  // ─── Firing ───

  /** Runs every enabled rule (one coach, or all for the worker). Returns how many messages went out. */
  async runDue(now: Date, coachId?: string): Promise<number> {
    const rules = await this.prisma.automationRule.findMany({
      where: { enabled: true, ...(coachId ? { coachId } : {}) },
      include: { coach: { select: { name: true, displayName: true } } },
    });
    let sent = 0;
    for (const rule of rules) {
      try {
        const list = await this.candidates(rule, now);
        const names = await this.names(list.map((c) => c.clientId));
        for (const c of list) {
          if (await this.fire(rule, c, { firstName: names.get(c.clientId)?.first ?? '', coachName: rule.coach.displayName ?? rule.coach.name })) sent++;
        }
      } catch (err) {
        this.logger.error(`Automation rule ${rule.id} failed`, err);
      }
    }
    return sent;
  }

  /** Run row and message commit together; a duplicate key means another run already fired it. */
  async fire(rule: AutomationRule, c: Candidate, vars: { firstName: string; coachName: string }): Promise<boolean> {
    const body = renderAutomationMessage(rule.messageBody, vars).slice(0, 4000);
    const at = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const run = await tx.automationRun.create({ data: { ruleId: rule.id, clientId: c.clientId, idempotencyKey: this.idempotencyKey(rule, c) } });
        const conversation = await tx.conversation.upsert({
          where: { coachId_clientId: { coachId: rule.coachId, clientId: c.clientId } },
          create: { coachId: rule.coachId, clientId: c.clientId, lastMessageAt: at },
          update: { lastMessageAt: at },
        });
        const message = await tx.message.create({ data: { conversationId: conversation.id, senderId: rule.coachId, body, createdAt: at } });
        await tx.automationRun.update({ where: { id: run.id }, data: { messageId: message.id } });
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
      throw err;
    }
  }
}
