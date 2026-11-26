import { Injectable, NotFoundException } from '@nestjs/common';
import { CoachClientStatus, Prisma, RecommendationStatus } from '@prisma/client';
import type {
  BulkResolveResponse,
  RecommendationAction,
  RecommendationQueueItem,
  RecommendationQueueResponse,
  ResolvedEngineSettings,
  SessionMetrics,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESSIBLE_LINK_STATUSES } from '../clients/link-status';
import type { SessionInput } from './engine/types';
import { queueReason } from './queue-basis';
import type { QueueQuery } from './dto/queue.dto';
import type { ResolvableStatus } from './dto/update-recommendation.dto';

const emptyCounts = (): Record<RecommendationAction, number> => ({ INCREASE_LOAD: 0, INCREASE_REPS: 0, HOLD: 0, DELOAD: 0 });

/** Coach-wide recommendation queue. Every query is pinned to the coach's own clients. */
@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  /** ACTIVE clients only: a paused client's calls do not clutter the queue. */
  async list(coachId: string, q: QueueQuery): Promise<RecommendationQueueResponse> {
    const status = q.status ?? RecommendationStatus.PENDING;
    const needle = q.q?.trim();
    const base: Prisma.ProgressionRecommendationWhereInput = {
      status,
      client: { coachLink: { is: { coachId, status: CoachClientStatus.ACTIVE } } },
      ...(needle
        ? {
            OR: [
              { client: { name: { contains: needle, mode: 'insensitive' } } },
              { exercise: { name: { contains: needle, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, grouped] = await Promise.all([
      this.prisma.progressionRecommendation.findMany({
        where: { ...base, ...(q.action ? { action: q.action } : {}) },
        include: { client: { select: { name: true } }, exercise: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.progressionRecommendation.groupBy({ by: ['action'], where: base, _count: { _all: true } }),
    ]);

    const byAction = emptyCounts();
    for (const g of grouped) byAction[g.action as RecommendationAction] = g._count._all;

    // Source sessions for replaying the engine. Only logs belonging to the row's own client are used.
    const logIds = [...new Set(rows.flatMap((r) => r.sourceExerciseLogIds))];
    const clientIds = [...new Set(rows.map((r) => r.clientId))];
    const logs = logIds.length
      ? await this.prisma.exerciseLog.findMany({
          where: { id: { in: logIds }, workoutLog: { clientId: { in: clientIds } } },
          select: {
            id: true,
            workoutLog: { select: { clientId: true, performedAt: true } },
            sets: { select: { reps: true, weightKg: true, rpe: true, isWarmup: true } },
          },
        })
      : [];
    const logById = new Map(logs.map((l) => [l.id, l]));

    const items: RecommendationQueueItem[] = rows.map((r) => {
      const metrics = r.metrics as unknown as SessionMetrics[] | null;
      const inputs: SessionInput[] = r.sourceExerciseLogIds.flatMap((id) => {
        const l = logById.get(id);
        if (!l || l.workoutLog.clientId !== r.clientId) return [];
        return [
          {
            exerciseLogId: l.id,
            performedAt: l.workoutLog.performedAt,
            sets: l.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg.toNumber(), rpe: s.rpe?.toNumber() ?? null, isWarmup: s.isWarmup })),
          },
        ];
      });
      const last = metrics?.[metrics.length - 1];
      return {
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.name,
        exerciseId: r.exerciseId,
        exerciseName: r.exercise.name,
        action: r.action,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        current: last ? { weightKg: last.topWeightKg, reps: last.topSetReps, avgRpe: last.avgRpe } : null,
        proposed: {
          weightKg: r.recommendedWeightKg?.toString() ?? null,
          repsMin: r.recommendedRepsMin,
          repsMax: r.recommendedRepsMax,
        },
        ...queueReason({
          action: r.action,
          metrics,
          settings: r.settings as unknown as ResolvedEngineSettings | null,
          recommendedSets: r.recommendedSets,
          sourceIds: r.sourceExerciseLogIds,
          inputs,
        }),
      };
    });
    return { items, counts: { total: Object.values(byAction).reduce((a, b) => a + b, 0), byAction } };
  }

  /**
   * All-or-nothing tenancy: if any id is missing or not the coach's (accessible) client, the whole request
   * is a 404 and nothing changes. Then each PENDING one is resolved with a conditional update; ones that are
   * no longer pending are reported as SKIPPED instead of failing the batch.
   */
  async bulkResolve(coachId: string, ids: readonly string[], status: ResolvableStatus): Promise<BulkResolveResponse> {
    const owned = await this.prisma.progressionRecommendation.findMany({
      where: {
        id: { in: [...ids] },
        client: { coachLink: { is: { coachId, status: { in: [...ACCESSIBLE_LINK_STATUSES] } } } },
      },
      select: { id: true },
    });
    if (owned.length !== new Set(ids).size) throw new NotFoundException('Recommendation not found');

    const now = new Date();
    const results: BulkResolveResponse['results'] = [];
    for (const id of ids) {
      const { count } = await this.prisma.progressionRecommendation.updateMany({
        where: { id, status: RecommendationStatus.PENDING },
        data: { status, resolvedAt: now },
      });
      if (count === 1) {
        results.push({ id, outcome: 'UPDATED', status });
      } else {
        const current = await this.prisma.progressionRecommendation.findUniqueOrThrow({ where: { id }, select: { status: true } });
        results.push({ id, outcome: 'SKIPPED', status: current.status });
      }
    }
    const updated = results.filter((r) => r.outcome === 'UPDATED').length;
    return { results, updated, skipped: results.length - updated };
  }
}
