import { Injectable } from '@nestjs/common';
import { JOINT_LABELS, LIMITATION_SEVERITY_LABELS, MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS, WeightUnit } from '@coaching/shared';
import type { AiContextStatsDto, GuardrailDto, LimitationSeverity, RecommendationAction } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { LimitationRow } from '../limitations/conflict';
import { LimitationsService } from '../limitations/limitations.service';

const KG_PER_LB = 0.45359237;
const DAY = 86_400_000;

export interface ContextSession {
  id: string;
  date: string;
  name: string;
  /** "Back Squat 155 kg × 5 @ RPE 8" — top working set per exercise. */
  lines: string[];
}

export interface ContextPr {
  id: string;
  date: string;
  exerciseName: string;
  detail: string;
}

/** The engine's latest open call per exercise. AI text may explain it but never changes it. */
export interface ContextCall {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  action: RecommendationAction;
  /** Coach override wins over the engine number, as everywhere else. */
  targetWeightKg: number | null;
  repsMin: number | null;
  repsMax: number | null;
  reason: string;
}

export interface CoachContext {
  unit: WeightUnit;
  sessions: ContextSession[];
  prs: ContextPr[];
  calls: ContextCall[];
  limitations: GuardrailDto[];
  limitationRows: LimitationRow[];
  readiness: { date: string; score: number; sleepHours: string | null; soreness: number; stress: number } | null;
  stats: AiContextStatsDto;
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Display weight in the athlete's unit: "155 kg" / "341.7 lb". */
export function formatLoad(kg: number, unit: WeightUnit): string {
  const v = unit === WeightUnit.LB ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 100) / 100;
  return `${v} ${unit === WeightUnit.LB ? 'lb' : 'kg'}`;
}

/** "Lower back (joint): Caution" style label for a limitation row. */
export function limitationLabel(l: LimitationRow, exerciseName?: string): string {
  const what =
    l.target === 'MUSCLE' && l.muscleGroup
      ? MUSCLE_GROUP_LABELS[l.muscleGroup]
      : l.target === 'JOINT' && l.joint
        ? JOINT_LABELS[l.joint]
        : l.target === 'PATTERN' && l.pattern
          ? MOVEMENT_PATTERN_LABELS[l.pattern]
          : (exerciseName ?? 'Exercise');
  return `${what}: ${LIMITATION_SEVERITY_LABELS[l.severity as LimitationSeverity]}${l.note ? ` (${l.note})` : ''}`;
}

/**
 * Read-only, owner-scoped context for the AI tools. Every query filters on the caller's own id.
 * Privacy rule: this service never touches CycleLog (or any cycle data), and no AI tool reads it elsewhere.
 */
@Injectable()
export class AiContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitations: LimitationsService,
  ) {}

  async build(clientId: string): Promise<CoachContext> {
    const now = new Date();
    const day = iso(now);
    const [user, logs, prs, recs, limitationRows, readiness, sessionsIndexed] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { weightUnit: true } }),
      this.prisma.workoutLog.findMany({
        where: { clientId, performedAt: { gte: new Date(now.getTime() - 42 * DAY) } },
        orderBy: { performedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          performedAt: true,
          workout: { select: { name: true } },
          exerciseLogs: {
            orderBy: { order: 'asc' },
            select: {
              exercise: { select: { name: true } },
              sets: { where: { isWarmup: false }, select: { reps: true, weightKg: true, rpe: true } },
            },
          },
        },
      }),
      this.prisma.personalRecord.findMany({
        where: { clientId },
        orderBy: { achievedAt: 'desc' },
        take: 8,
        select: { id: true, reps: true, weightKg: true, e1rmKg: true, achievedAt: true, exercise: { select: { name: true } } },
      }),
      this.prisma.progressionRecommendation.findMany({
        where: { clientId, status: { in: ['PENDING', 'ACCEPTED'] }, createdAt: { gte: new Date(now.getTime() - 60 * DAY) } },
        orderBy: { createdAt: 'desc' },
        take: 40,
        select: {
          id: true,
          exerciseId: true,
          action: true,
          reason: true,
          createdAt: true,
          recommendedWeightKg: true,
          recommendedRepsMin: true,
          recommendedRepsMax: true,
          overrideWeightKg: true,
          overrideRepsMin: true,
          overrideRepsMax: true,
          exercise: { select: { name: true } },
        },
      }),
      this.limitations.activeRows(clientId, day),
      this.prisma.readinessSurvey.findFirst({
        where: { clientId, date: { gte: new Date(`${iso(new Date(now.getTime() - 7 * DAY))}T00:00:00.000Z`) } },
        orderBy: { date: 'desc' },
        select: { date: true, score: true, sleepHours: true, soreness: true, stress: true },
      }),
      this.prisma.workoutLog.count({ where: { clientId } }),
    ]);
    const unit = user.weightUnit as WeightUnit;

    const sessions: ContextSession[] = logs.map((l) => ({
      id: l.id,
      date: iso(l.performedAt),
      name: l.workout?.name ?? 'Freeform session',
      lines: l.exerciseLogs.flatMap((e) => {
        const top = [...e.sets].sort((a, b) => Number(b.weightKg) - Number(a.weightKg) || b.reps - a.reps)[0];
        if (!top) return [];
        return [`${e.exercise.name} ${formatLoad(Number(top.weightKg), unit)} × ${top.reps}${top.rpe ? ` @ RPE ${Number(top.rpe)}` : ''}`];
      }),
    }));

    const seen = new Set<string>();
    const calls: ContextCall[] = [];
    for (const r of recs) {
      if (seen.has(r.exerciseId)) continue;
      seen.add(r.exerciseId);
      const weight = r.overrideWeightKg ?? r.recommendedWeightKg;
      calls.push({
        id: r.id,
        date: iso(r.createdAt),
        exerciseId: r.exerciseId,
        exerciseName: r.exercise.name,
        action: r.action as RecommendationAction,
        targetWeightKg: weight === null ? null : Number(weight),
        repsMin: r.overrideRepsMin ?? r.recommendedRepsMin,
        repsMax: r.overrideRepsMax ?? r.recommendedRepsMax,
        reason: r.reason,
      });
    }

    const exerciseNames = await this.exerciseNames(limitationRows);
    const weekAgo = now.getTime() - 7 * DAY;
    const rpes = logs
      .filter((l) => l.performedAt.getTime() >= weekAgo)
      .flatMap((l) => l.exerciseLogs.flatMap((e) => e.sets.flatMap((s) => (s.rpe === null ? [] : [Number(s.rpe)]))));

    return {
      unit,
      sessions,
      prs: prs.map((p) => ({
        id: p.id,
        date: iso(p.achievedAt),
        exerciseName: p.exercise.name,
        detail: `${formatLoad(Number(p.weightKg), unit)} × ${p.reps} (e1RM ${formatLoad(Number(p.e1rmKg), unit)})`,
      })),
      calls,
      limitationRows,
      limitations: limitationRows.map((l) => ({
        limitationId: l.id,
        severity: l.severity,
        label: limitationLabel(l, l.exerciseId ? exerciseNames.get(l.exerciseId) : undefined),
      })),
      readiness: readiness
        ? {
            date: iso(readiness.date),
            score: readiness.score,
            sleepHours: readiness.sleepHours?.toString() ?? null,
            soreness: readiness.soreness,
            stress: readiness.stress,
          }
        : null,
      stats: {
        sessionsIndexed,
        activeLimitations: limitationRows.length,
        avgRpe7d: rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null,
        readinessScore: readiness?.score ?? null,
      },
    };
  }

  private async exerciseNames(rows: readonly LimitationRow[]): Promise<Map<string, string>> {
    const ids = rows.flatMap((l) => (l.exerciseId ? [l.exerciseId] : []));
    if (ids.length === 0) return new Map();
    const found = await this.prisma.exercise.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return new Map(found.map((e) => [e.id, e.name]));
  }
}
