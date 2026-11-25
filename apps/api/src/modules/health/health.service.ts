import { BadRequestException, Injectable } from '@nestjs/common';
import type { DailyHealthMetric } from '@prisma/client';
import { HEALTH_LIMITS, mergeHealthDay, stepAverage7, stepStreak } from '@coaching/shared';
import type { HealthDayDto, HealthOverviewDto, HealthSource, SyncHealthMetricsRequest, SyncHealthMetricsResponse } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_MS = 86_400_000;
const day = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);
const today = (): string => day(new Date());
/** Streaks look back at most a year. */
const STREAK_LOOKBACK_DAYS = 366;

export interface StepStats {
  avg7Steps: number | null;
  streakDays: number;
}

/** Group a user's rows by day (newest first) and merge each day across sources. */
function mergeDays(rows: readonly DailyHealthMetric[]): HealthDayDto[] {
  const byDay = new Map<string, DailyHealthMetric[]>();
  for (const r of rows) {
    const key = day(r.date);
    byDay.set(key, [...(byDay.get(key) ?? []), r]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, list]) => mergeHealthDay(date, list.map((r) => ({ ...r, source: r.source as HealthSource }))));
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  private async goal(userId: string): Promise<number> {
    const g = await this.prisma.stepGoal.findUnique({ where: { userId } });
    return g?.dailySteps ?? HEALTH_LIMITS.defaultGoal;
  }

  async overview(userId: string, days: number): Promise<HealthOverviewDto> {
    const lookback = Math.max(days, STREAK_LOOKBACK_DAYS);
    const [goal, rows] = await Promise.all([
      this.goal(userId),
      this.prisma.dailyHealthMetric.findMany({ where: { userId, date: { gte: new Date(Date.now() - lookback * DAY_MS) } }, orderBy: { date: 'desc' } }),
    ]);
    const merged = mergeDays(rows);
    const now = today();
    const todayRow = merged.find((d) => d.date === now) ?? { date: now, steps: null, sleepMinutes: null, hrvMs: null, restingHr: null, sources: [] };
    const from = day(new Date(Date.now() - (days - 1) * DAY_MS));
    const lastSynced = rows.reduce<Date | null>((max, r) => (!max || r.updatedAt > max ? r.updatedAt : max), null);
    return {
      dailyStepGoal: goal,
      today: todayRow,
      avg7Steps: stepAverage7(merged, now),
      streakDays: stepStreak(merged, goal, now),
      remainingToday: Math.max(0, goal - (todayRow.steps ?? 0)),
      days: merged.filter((d) => d.date >= from),
      lastSyncedAt: lastSynced?.toISOString() ?? null,
    };
  }

  /**
   * Idempotent: one row per (user, day, source), so resending a batch replaces the same rows. A field left out of an
   * entry keeps its stored value; an explicit null clears it. Duplicate days within one batch: the last one wins.
   */
  async sync(userId: string, input: SyncHealthMetricsRequest): Promise<SyncHealthMetricsResponse> {
    const oldest = Date.now() - HEALTH_LIMITS.maxAgeDays * DAY_MS;
    const byDate = new Map<string, (typeof input.entries)[number]>();
    for (const e of input.entries) {
      const d = asDate(e.date);
      if (Number.isNaN(d.getTime()) || day(d) !== e.date) throw new BadRequestException(`${e.date} is not a real date.`);
      if (d.getTime() > Date.now() + DAY_MS) throw new BadRequestException(`${e.date} is in the future.`);
      if (d.getTime() < oldest) throw new BadRequestException(`${e.date} is older than ${HEALTH_LIMITS.maxAgeDays} days.`);
      byDate.set(e.date, { ...byDate.get(e.date), ...e });
    }
    const pick = (e: (typeof input.entries)[number]) => {
      const out: { steps?: number | null; sleepMinutes?: number | null; hrvMs?: number | null; restingHr?: number | null } = {};
      for (const k of ['steps', 'sleepMinutes', 'hrvMs', 'restingHr'] as const) if (e[k] !== undefined) out[k] = e[k];
      return out;
    };
    await this.prisma.$transaction(
      [...byDate.values()].map((e) =>
        this.prisma.dailyHealthMetric.upsert({
          where: { userId_date_source: { userId, date: asDate(e.date), source: input.source } },
          create: { userId, date: asDate(e.date), source: input.source, ...pick(e) },
          update: pick(e),
        }),
      ),
    );
    return { upserted: byDate.size };
  }

  async saveGoal(userId: string, dailySteps: number): Promise<void> {
    await this.prisma.stepGoal.upsert({ where: { userId }, create: { userId, dailySteps }, update: { dailySteps } });
  }

  /** Leaderboard input for several users at once: 7-day average and goal streak, each against their own goal. */
  async stepStats(userIds: readonly string[]): Promise<Map<string, StepStats>> {
    const out = new Map<string, StepStats>();
    if (userIds.length === 0) return out;
    const [goals, rows] = await Promise.all([
      this.prisma.stepGoal.findMany({ where: { userId: { in: [...userIds] } } }),
      this.prisma.dailyHealthMetric.findMany({
        where: { userId: { in: [...userIds] }, date: { gte: new Date(Date.now() - STREAK_LOOKBACK_DAYS * DAY_MS) } },
      }),
    ]);
    const goalOf = new Map(goals.map((g) => [g.userId, g.dailySteps]));
    const now = today();
    for (const id of userIds) {
      const merged = mergeDays(rows.filter((r) => r.userId === id));
      out.set(id, { avg7Steps: stepAverage7(merged, now), streakDays: stepStreak(merged, goalOf.get(id) ?? HEALTH_LIMITS.defaultGoal, now) });
    }
    return out;
  }
}
