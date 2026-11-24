import { BadRequestException, Injectable } from '@nestjs/common';
import { MAX_ANALYTICS_DAYS, muscleAnalytics } from '@coaching/shared';
import type { MuscleAnalyticsDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_MS = 86_400_000;
const day = (d: Date): string => d.toISOString().slice(0, 10);
const asDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** Inclusive UTC date range; defaults to the 7 days ending today. */
export function resolveWindow(from: string | undefined, to: string | undefined, now = new Date()): { from: string; to: string; days: number } {
  const end = to ?? day(now);
  const start = from ?? day(new Date(asDate(end).getTime() - 6 * DAY_MS));
  for (const [label, iso] of [['from', start], ['to', end]] as const) {
    const d = asDate(iso);
    if (Number.isNaN(d.getTime()) || day(d) !== iso) throw new BadRequestException(`${label} is not a real date.`);
  }
  const days = Math.round((asDate(end).getTime() - asDate(start).getTime()) / DAY_MS) + 1;
  if (days < 1) throw new BadRequestException('from must be on or before to.');
  if (days > MAX_ANALYTICS_DAYS) throw new BadRequestException(`The window can be at most ${MAX_ANALYTICS_DAYS} days.`);
  return { from: start, to: end, days };
}

@Injectable()
export class MuscleAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Working sets only (warm-ups excluded), weighted by each exercise's muscle roles. Caller enforces access. */
  async forClient(clientId: string, from?: string, to?: string): Promise<MuscleAnalyticsDto> {
    const w = resolveWindow(from, to);
    const sets = await this.prisma.setLog.findMany({
      where: {
        isWarmup: false,
        reps: { gt: 0 },
        exerciseLog: { workoutLog: { clientId, performedAt: { gte: asDate(w.from), lt: new Date(asDate(w.to).getTime() + DAY_MS) } } },
      },
      select: {
        reps: true,
        weightKg: true,
        rir: true,
        rpe: true,
        exerciseLog: { select: { workoutLogId: true, exercise: { select: { muscles: { select: { muscle: true, role: true } } } } } },
      },
    });
    const result = muscleAnalytics(
      sets.map((s) => ({
        sessionId: s.exerciseLog.workoutLogId,
        weightKg: Number(s.weightKg),
        reps: s.reps,
        rir: s.rir,
        rpe: s.rpe === null ? null : Number(s.rpe),
        muscles: s.exerciseLog.exercise.muscles,
      })),
      w.days,
    );
    return { ...w, ...result };
  }
}
