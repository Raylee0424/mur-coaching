import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CallHistoryEvent,
  ExplainDto,
  ExplainSession,
  NextTarget,
  NextTargetsDto,
  ResolvedEngineSettings,
  SessionMetrics,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_THRESHOLDS, thresholdsFromResolved, traceRules } from './engine';
import { repsAtTopWeight } from './engine/rules';
import type { Prescription, SessionInput } from './engine/types';
import { prescriptionFromSettings } from './stored-rx';

const HISTORY_LIMIT = 20;

const dec = (d: Prisma.Decimal | null): string | null => (d === null ? null : d.toString());

/** Read-side explanations of stored recommendations. Callers have already checked tenancy. */
@Injectable()
export class ExplainService {
  constructor(private readonly prisma: PrismaService) {}

  async explain(id: string): Promise<{ clientId: string; dto: ExplainDto }> {
    const rec = await this.prisma.progressionRecommendation.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true } }, exercise: true },
    });
    if (!rec) throw new NotFoundException('Recommendation not found');

    const logs = await this.prisma.exerciseLog.findMany({
      where: { id: { in: rec.sourceExerciseLogIds }, workoutLog: { clientId: rec.clientId } },
      include: { sets: true, workoutLog: { select: { performedAt: true } }, workoutExercise: true },
    });
    const inputs: SessionInput[] = logs.map((l) => ({
      exerciseLogId: l.id,
      performedAt: l.workoutLog.performedAt,
      sets: l.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg.toNumber(), rpe: s.rpe?.toNumber() ?? null, isWarmup: s.isWarmup })),
    }));

    const settings = rec.settings as unknown as ResolvedEngineSettings | null;
    const wx = [...logs].sort((a, b) => b.workoutLog.performedAt.getTime() - a.workoutLog.performedAt.getTime()).find((l) => l.workoutExercise)?.workoutExercise;
    const rx: Prescription | null = settings
      ? prescriptionFromSettings(settings, rec.recommendedSets ?? wx?.targetSets ?? null)
      : wx
        ? {
            targetSets: wx.targetSets,
            repsMin: wx.targetRepsMin,
            repsMax: wx.targetRepsMax,
            targetRpe: wx.targetRpe?.toNumber() ?? null,
            loadIncrementKg: rec.exercise.loadIncrementKg.toNumber(),
          }
        : null;
    const thresholds = settings ? thresholdsFromResolved(settings) : DEFAULT_THRESHOLDS;
    // Only replay when every source session still exists; an edited log would make the trace misleading.
    const complete = inputs.length > 0 && inputs.length === rec.sourceExerciseLogIds.length;
    const rules = complete && rx ? (traceRules(inputs, rx, thresholds)?.steps ?? null) : null;

    const inputById = new Map(inputs.map((i) => [i.exerciseLogId, i]));
    const metrics = (rec.metrics as unknown as SessionMetrics[] | null) ?? [];
    const sessions: ExplainSession[] = metrics.map((m) => {
      const input = inputById.get(m.exerciseLogId);
      return {
        exerciseLogId: m.exerciseLogId,
        performedAt: m.performedAt,
        topWeightKg: m.topWeightKg,
        topSetReps: m.topSetReps,
        repsPerSet: input ? repsAtTopWeight(input, m.topWeightKg) : [],
        workingSets: m.workingSets,
        avgRpe: m.avgRpe,
      };
    });

    const past = await this.prisma.progressionRecommendation.findMany({
      where: { clientId: rec.clientId, exerciseId: rec.exerciseId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    });
    const overriderIds = [...new Set([...past, rec].flatMap((r) => (r.overriddenById ? [r.overriddenById] : [])))];
    const names = new Map(
      (await this.prisma.user.findMany({ where: { id: { in: overriderIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
    );
    const nameOf = (id: string | null): string | null => (id ? (names.get(id) ?? null) : null);

    const history: CallHistoryEvent[] = past.flatMap((r) => {
      const events: CallHistoryEvent[] = [
        {
          type: 'CALL',
          at: r.createdAt.toISOString(),
          recommendationId: r.id,
          action: r.action,
          status: r.status,
          autoApproved: r.autoApproved,
          weightKg: dec(r.recommendedWeightKg),
          repsMin: r.recommendedRepsMin,
          repsMax: r.recommendedRepsMax,
        },
      ];
      if (r.overriddenAt) {
        events.push({
          type: 'OVERRIDE',
          at: r.overriddenAt.toISOString(),
          recommendationId: r.id,
          byName: nameOf(r.overriddenById),
          weightKg: dec(r.overrideWeightKg),
          repsMin: r.overrideRepsMin,
          repsMax: r.overrideRepsMax,
          rpe: dec(r.overrideRpe),
          note: r.overrideNote,
        });
      }
      return events;
    });
    history.sort((a, b) => b.at.localeCompare(a.at));

    return {
      clientId: rec.clientId,
      dto: {
        recommendationId: rec.id,
        client: rec.client,
        exercise: { id: rec.exercise.id, name: rec.exercise.name },
        action: rec.action,
        status: rec.status,
        reason: rec.reason,
        autoApproved: rec.autoApproved,
        proposed: { weightKg: dec(rec.recommendedWeightKg), repsMin: rec.recommendedRepsMin, repsMax: rec.recommendedRepsMax },
        override:
          rec.overrideWeightKg !== null
            ? {
                weightKg: dec(rec.overrideWeightKg),
                repsMin: rec.overrideRepsMin,
                repsMax: rec.overrideRepsMax,
                rpe: dec(rec.overrideRpe),
                note: rec.overrideNote,
                byName: nameOf(rec.overriddenById),
                at: rec.overriddenAt?.toISOString() ?? null,
              }
            : null,
        prescription: rx ? { sets: rx.targetSets, repsMin: rx.repsMin, repsMax: rx.repsMax, rpeCap: rx.targetRpe } : null,
        sessions,
        rules,
        settings,
        history,
      },
    };
  }

  /**
   * Targets for the next session after `workoutLogId`: for each exercise in the log, the newest
   * recommendation created at or after the log was written (workout-log writes already refresh the engine).
   */
  async nextTargets(workoutLogId: string): Promise<{ clientId: string; dto: NextTargetsDto }> {
    const log = await this.prisma.workoutLog.findUnique({
      where: { id: workoutLogId },
      select: { id: true, clientId: true, createdAt: true, exerciseLogs: { orderBy: { order: 'asc' }, select: { exercise: { select: { id: true, name: true } } } } },
    });
    if (!log) throw new NotFoundException('Workout log not found');

    const exerciseIds = [...new Set(log.exerciseLogs.map((e) => e.exercise.id))];
    const recs = await this.prisma.progressionRecommendation.findMany({
      where: { clientId: log.clientId, exerciseId: { in: exerciseIds }, status: { notIn: ['SUPERSEDED', 'DISMISSED'] } },
      orderBy: { createdAt: 'desc' },
    });
    const newest = new Map<string, (typeof recs)[number]>();
    for (const r of recs) if (!newest.has(r.exerciseId)) newest.set(r.exerciseId, r);

    const targets: NextTarget[] = exerciseIds.map((exerciseId) => {
      const name = log.exerciseLogs.find((e) => e.exercise.id === exerciseId)?.exercise.name ?? '';
      const r = newest.get(exerciseId);
      // A recommendation older than this log was made from earlier sessions; it does not describe the next one.
      if (!r || r.createdAt < log.createdAt) {
        return { exerciseId, exerciseName: name, action: null, recommendationId: null, status: null, target: null, reason: null };
      }
      const overridden = r.overrideWeightKg !== null;
      return {
        exerciseId,
        exerciseName: name,
        action: r.action,
        recommendationId: r.id,
        status: r.status,
        target: overridden
          ? { weightKg: dec(r.overrideWeightKg), repsMin: r.overrideRepsMin, repsMax: r.overrideRepsMax }
          : { weightKg: dec(r.recommendedWeightKg), repsMin: r.recommendedRepsMin, repsMax: r.recommendedRepsMax },
        reason: r.reason,
      };
    });
    return { clientId: log.clientId, dto: { workoutLogId: log.id, targets } };
  }
}
