import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ProgressionRecommendation, RecommendationStatus } from '@prisma/client';
import { ENGINE_DEFAULTS } from '@coaching/shared';
import type { EnginePreviewResponse, UpdateCoachEngineRulesRequest } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { computeSessionMetrics, evaluate, resolveEngineSettings, shouldAutoApprove } from './engine';
import type { ClientOverrides, CoachRules, EffectiveSettings } from './engine';
import type { RecommendationDraft, SessionInput, SessionMetrics } from './engine/types';
import type { OverrideRecommendationDto, ResolvableStatus } from './dto/update-recommendation.dto';

const MIN_SESSIONS_FOR_BULK = 2;

const num = (d: Prisma.Decimal | null | undefined): number | null => (d === null || d === undefined ? null : d.toNumber());

interface Layers {
  coach: CoachRules | null;
  client: ClientOverrides | null;
  link: { autoApprove: boolean; autoApproveMaxKg: number | null } | null;
}

interface Inputs {
  history: SessionInput[];
  settings: EffectiveSettings;
}

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
    const layers = await this.loadLayers(clientId);
    const { history, settings } = await this.loadInputs(clientId, exerciseId, layers);
    const draft = evaluate(history, settings.rx, settings.thresholds);
    if (!draft) throw new UnprocessableEntityException('No logged working sets for this exercise');
    return this.persist(clientId, exerciseId, draft, settings, layers);
  }

  /** Runs the engine with draft coach rules against one client lift. Persists nothing. */
  async preview(
    clientId: string,
    exerciseId: string,
    rules: UpdateCoachEngineRulesRequest,
  ): Promise<EnginePreviewResponse> {
    const layers = { ...(await this.loadLayers(clientId)), coach: rules };
    const { history, settings } = await this.loadInputs(clientId, exerciseId, layers);
    const draft = evaluate(history, settings.rx, settings.thresholds);
    if (!draft) throw new UnprocessableEntityException('No logged working sets for this exercise');
    const [client, exercise] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { name: true } }),
      this.prisma.exercise.findUniqueOrThrow({ where: { id: exerciseId }, select: { name: true } }),
    ]);
    return {
      clientName: client.name,
      exerciseName: exercise.name,
      action: draft.action,
      reason: draft.reason,
      recommendedWeightKg: draft.recommendedWeightKg,
      recommendedRepsMin: draft.recommendedRepsMin,
      recommendedRepsMax: draft.recommendedRepsMax,
      recommendedSets: draft.recommendedSets,
      settings: settings.resolved,
    };
  }

  /**
   * Coach sets their own target. Works on PENDING (accepts it) or ACCEPTED (re-edits it); the engine's
   * own fields are never touched so the original call stays visible. Conditional update guards races.
   */
  async override(id: string, coachId: string, dto: OverrideRecommendationDto): Promise<ProgressionRecommendation> {
    const now = new Date();
    const { count } = await this.prisma.progressionRecommendation.updateMany({
      where: { id, status: { in: [RecommendationStatus.PENDING, RecommendationStatus.ACCEPTED] } },
      data: {
        status: RecommendationStatus.ACCEPTED,
        overrideWeightKg: dto.weightKg,
        overrideRepsMin: dto.repsMin,
        overrideRepsMax: dto.repsMax,
        overrideRpe: dto.rpe ?? null,
        overrideNote: dto.note?.trim() || null,
        overriddenById: coachId,
        overriddenAt: now,
        autoApproved: false,
      },
    });
    if (count === 0) throw new ConflictException('Recommendation was dismissed or replaced; re-evaluate first');
    // Keep the first resolution time if it was already accepted.
    await this.prisma.progressionRecommendation.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: now } });
    return this.getById(id);
  }

  /**
   * Called after a workout log is written, edited or deleted. Persists a fresh recommendation when
   * there is enough history; otherwise just retires stale PENDING ones (their source logs may be gone).
   */
  async refreshExercise(clientId: string, exerciseId: string): Promise<ProgressionRecommendation | null> {
    const layers = await this.loadLayers(clientId);
    let inputs: Inputs;
    try {
      inputs = await this.loadInputs(clientId, exerciseId, layers);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof UnprocessableEntityException) {
        await this.supersedePending(this.prisma, clientId, exerciseId);
        return null;
      }
      throw err;
    }

    const draft = evaluate(inputs.history, inputs.settings.rx, inputs.settings.thresholds);
    if (!draft || draft.metrics.length < MIN_SESSIONS_FOR_BULK) {
      await this.supersedePending(this.prisma, clientId, exerciseId);
      return null;
    }
    return this.persist(clientId, exerciseId, draft, inputs.settings, layers);
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

  /** Coach rules and this client's overrides (from the coach-client link). */
  private async loadLayers(clientId: string): Promise<Layers> {
    const link = await this.prisma.coachClient.findUnique({
      where: { clientId },
      include: { coach: { select: { engineRules: true } } },
    });
    if (!link) return { coach: null, client: null, link: null };
    const r = link.coach.engineRules;
    return {
      coach: r
        ? {
            rpeCap: num(r.rpeCap),
            loadMarginRpe: num(r.loadMarginRpe),
            highRpe: num(r.highRpe),
            plateauTolerancePct: num(r.plateauTolerancePct),
            declineThresholdPct: num(r.declineThresholdPct),
            deloadPercent: r.deloadPercent,
            sessionsAnalyzed: r.sessionsAnalyzed,
          }
        : null,
      client: {
        rpeCap: num(link.rpeCap),
        repsMin: link.repsMin,
        repsMax: link.repsMax,
        loadIncrementKg: num(link.loadIncrementKg),
        deloadPercent: link.deloadPercent,
        sessionsAnalyzed: link.sessionsAnalyzed,
      },
      link: { autoApprove: link.autoApprove, autoApproveMaxKg: num(link.autoApproveMaxKg) },
    };
  }

  private async loadInputs(clientId: string, exerciseId: string, layers: Layers): Promise<Inputs> {
    const window =
      layers.client?.sessionsAnalyzed ?? layers.coach?.sessionsAnalyzed ?? ENGINE_DEFAULTS.sessionsAnalyzed;
    const logs = await this.prisma.exerciseLog.findMany({
      where: { exerciseId, workoutLog: { clientId } },
      orderBy: { workoutLog: { performedAt: 'desc' } },
      take: window,
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
      settings: resolveEngineSettings({
        coach: layers.coach,
        client: layers.client,
        prescription: {
          targetSets: target.targetSets,
          repsMin: target.targetRepsMin,
          repsMax: target.targetRepsMax,
          targetRpe: target.targetRpe?.toNumber() ?? null,
          loadIncrementKg: latest.exercise.loadIncrementKg.toNumber(),
        },
      }),
    };
  }

  private persist(
    clientId: string,
    exerciseId: string,
    draft: RecommendationDraft,
    settings: EffectiveSettings,
    layers: Layers,
  ): Promise<ProgressionRecommendation> {
    const auto = layers.link !== null && shouldAutoApprove(draft, layers.link);
    return this.prisma.$transaction(async (tx) => {
      await this.supersedePending(tx, clientId, exerciseId);
      return tx.progressionRecommendation.create({
        data: {
          ...(auto ? { status: RecommendationStatus.ACCEPTED, resolvedAt: new Date(), autoApproved: true } : {}),
          settings: settings.resolved as unknown as Prisma.InputJsonValue,
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
