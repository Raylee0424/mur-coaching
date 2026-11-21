import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ProgressionRecommendation, RecommendationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeSessionMetrics, evaluate } from './engine';
import type { Prescription, RecommendationDraft, SessionInput, SessionMetrics } from './engine/types';
import type { ResolvableStatus } from './dto/update-recommendation.dto';

const HISTORY_WINDOW = 3;
const MIN_SESSIONS_FOR_BULK = 2;

/** Orchestration only: load history, call the pure engine, persist. Caller has already checked tenancy. */
@Injectable()
export class ProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Latest recommendation per exercise. */
  latestPerExercise(clientId: string): Promise<ProgressionRecommendation[]> {
    return this.prisma.progressionRecommendation.findMany({
      where: { clientId },
      distinct: ['exerciseId'],
      orderBy: [{ exerciseId: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Recommendation history (newest first) plus per-session metrics (oldest first) for charting. */
  async history(
    clientId: string,
    exerciseId: string,
    limit: number,
  ): Promise<{
    exercise: { id: string; name: string };
    recommendations: ProgressionRecommendation[];
    series: SessionMetrics[];
  }> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    const [recommendations, logs] = await Promise.all([
      this.prisma.progressionRecommendation.findMany({
        where: { clientId, exerciseId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exerciseLog.findMany({
        where: { exerciseId, workoutLog: { clientId } },
        orderBy: { workoutLog: { performedAt: 'desc' } },
        take: limit,
        include: { sets: true, workoutLog: true },
      }),
    ]);

    const series = logs
      .map((l) => computeSessionMetrics(this.toSession(l)))
      .filter((m): m is SessionMetrics => m !== null)
      .reverse();
    return { exercise, recommendations, series };
  }

  /** PENDING → ACCEPTED | DISMISSED. Conditional update so concurrent resolves cannot both win. */
  async resolve(id: string, status: ResolvableStatus): Promise<ProgressionRecommendation> {
    const { count } = await this.prisma.progressionRecommendation.updateMany({
      where: { id, status: RecommendationStatus.PENDING },
      data: { status, resolvedAt: new Date() },
    });
    if (count === 0) throw new ConflictException('Recommendation is no longer pending');
    return this.getById(id);
  }

  async getById(id: string): Promise<ProgressionRecommendation> {
    const rec = await this.prisma.progressionRecommendation.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Recommendation not found');
    return rec;
  }

  async evaluateExercise(clientId: string, exerciseId: string): Promise<ProgressionRecommendation> {
    const { history, prescription } = await this.loadInputs(clientId, exerciseId);
    const draft = evaluate(history, prescription);
    if (!draft) throw new UnprocessableEntityException('No logged working sets for this exercise');
    return this.persist(clientId, exerciseId, draft);
  }

  /**
   * Called after a workout log is written, edited or deleted. Persists a fresh recommendation when
   * there is enough history; otherwise just retires stale PENDING ones (their source logs may be gone).
   */
  async refreshExercise(clientId: string, exerciseId: string): Promise<ProgressionRecommendation | null> {
    let inputs: { history: SessionInput[]; prescription: Prescription };
    try {
      inputs = await this.loadInputs(clientId, exerciseId);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof UnprocessableEntityException) {
        await this.supersedePending(this.prisma, clientId, exerciseId);
        return null;
      }
      throw err;
    }

    const draft = evaluate(inputs.history, inputs.prescription);
    if (!draft || draft.metrics.length < MIN_SESSIONS_FOR_BULK) {
      await this.supersedePending(this.prisma, clientId, exerciseId);
      return null;
    }
    return this.persist(clientId, exerciseId, draft);
  }

  /** Evaluates every exercise the client has >= 2 sessions for. Exercises that cannot be evaluated are skipped. */
  async evaluateAll(clientId: string): Promise<ProgressionRecommendation[]> {
    const grouped = await this.prisma.exerciseLog.groupBy({
      by: ['exerciseId'],
      where: { workoutLog: { clientId } },
      having: { exerciseId: { _count: { gte: MIN_SESSIONS_FOR_BULK } } },
    });

    const results: ProgressionRecommendation[] = [];
    for (const { exerciseId } of grouped) {
      try {
        results.push(await this.evaluateExercise(clientId, exerciseId));
      } catch (err) {
        if (!(err instanceof UnprocessableEntityException)) throw err;
      }
    }
    return results;
  }

  private async loadInputs(
    clientId: string,
    exerciseId: string,
  ): Promise<{ history: SessionInput[]; prescription: Prescription }> {
    const logs = await this.prisma.exerciseLog.findMany({
      where: { exerciseId, workoutLog: { clientId } },
      orderBy: { workoutLog: { performedAt: 'desc' } },
      take: HISTORY_WINDOW,
      include: { sets: true, workoutLog: true, workoutExercise: true, exercise: true },
    });
    const latest = logs[0];
    if (!latest) throw new NotFoundException('No history for this exercise');

    const target = logs.find((l) => l.workoutExercise)?.workoutExercise;
    if (!target) {
      throw new UnprocessableEntityException('Exercise was only logged ad-hoc; no prescription to evaluate against');
    }

    return {
      history: logs.map((l) => this.toSession(l)),
      prescription: {
        targetSets: target.targetSets,
        repsMin: target.targetRepsMin,
        repsMax: target.targetRepsMax,
        targetRpe: target.targetRpe?.toNumber() ?? null,
        loadIncrementKg: latest.exercise.loadIncrementKg.toNumber(),
      },
    };
  }

  private persist(
    clientId: string,
    exerciseId: string,
    draft: RecommendationDraft,
  ): Promise<ProgressionRecommendation> {
    return this.prisma.$transaction(async (tx) => {
      await this.supersedePending(tx, clientId, exerciseId);
      return tx.progressionRecommendation.create({
        data: {
          clientId,
          exerciseId,
          action: draft.action,
          recommendedWeightKg: draft.recommendedWeightKg,
          recommendedRepsMin: draft.recommendedRepsMin,
          recommendedRepsMax: draft.recommendedRepsMax,
          recommendedSets: draft.recommendedSets,
          reason: draft.reason,
          metrics: draft.metrics as unknown as Prisma.InputJsonValue,
          sourceExerciseLogIds: draft.sourceExerciseLogIds,
        },
      });
    });
  }

  private supersedePending(
    db: Prisma.TransactionClient | PrismaService,
    clientId: string,
    exerciseId: string,
  ): Promise<Prisma.BatchPayload> {
    return db.progressionRecommendation.updateMany({
      where: { clientId, exerciseId, status: RecommendationStatus.PENDING },
      data: { status: RecommendationStatus.SUPERSEDED, resolvedAt: new Date() },
    });
  }

  private toSession(l: {
    id: string;
    workoutLog: { performedAt: Date };
    sets: { reps: number; weightKg: Prisma.Decimal; rpe: Prisma.Decimal | null; isWarmup: boolean }[];
  }): SessionInput {
    return {
      exerciseLogId: l.id,
      performedAt: l.workoutLog.performedAt,
      sets: l.sets.map((s) => ({
        reps: s.reps,
        weightKg: s.weightKg.toNumber(),
        rpe: s.rpe?.toNumber() ?? null,
        isWarmup: s.isWarmup,
      })),
    };
  }
}
