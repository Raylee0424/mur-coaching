import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  PR_BRACKETS,
  RECORDS_WINDOW_DAYS,
  type ExerciseRecordsDto,
  type ExerciseStatsDto,
  type RecordCellDto,
  type RecordsDto,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { clientExerciseScope } from '../exercises/exercise-visibility';
import { computeSessionMetrics } from '../progression/engine/metrics';
import {
  bestRecord,
  bracketCells,
  computeRecords,
  countRecent,
  netDelta,
  windowSummary,
  type BracketCell,
  type RecordRow,
  type SessionPoint,
} from './records';

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_SESSIONS = 12;

const sessionInclude = { sets: true, workoutLog: { select: { id: true, performedAt: true } } } satisfies Prisma.ExerciseLogInclude;
type SessionRow = Prisma.ExerciseLogGetPayload<{ include: typeof sessionInclude }>;

const fixed = (n: number): string => n.toFixed(2);

function cellDto(cell: BracketCell | null): RecordCellDto | null {
  if (!cell) return null;
  const { record } = cell;
  return {
    reps: cell.reps,
    weightKg: fixed(record.weightKg),
    setReps: record.reps,
    e1rmKg: fixed(record.e1rmKg),
    achievedAt: record.achievedAt.toISOString(),
  };
}

/** Authorization is the controller's job (athlete-only); this service trusts its clientId. */
@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recompute one client's records for one exercise from every logged working set. Safe to call any time:
   * the table is derived data, so a rebuild after a log create, edit or delete always converges.
   */
  async rebuild(clientId: string, exerciseId: string): Promise<void> {
    const sets = await this.prisma.setLog.findMany({
      where: { exerciseLog: { exerciseId, workoutLog: { clientId } } },
      select: {
        id: true,
        reps: true,
        weightKg: true,
        rpe: true,
        isWarmup: true,
        exerciseLog: { select: { workoutLog: { select: { performedAt: true } } } },
      },
    });
    const rows = computeRecords(
      sets.map((s) => ({
        setLogId: s.id,
        reps: s.reps,
        weightKg: s.weightKg.toNumber(),
        rpe: s.rpe?.toNumber() ?? null,
        isWarmup: s.isWarmup,
        performedAt: s.exerciseLog.workoutLog.performedAt,
      })),
    );
    await this.prisma.$transaction([
      this.prisma.personalRecord.deleteMany({ where: { clientId, exerciseId } }),
      this.prisma.personalRecord.createMany({
        data: rows.map((r) => ({
          clientId,
          exerciseId,
          reps: r.reps,
          weightKg: r.weightKg,
          e1rmKg: r.e1rmKg,
          setLogId: r.setLogId,
          achievedAt: r.achievedAt,
        })),
      }),
    ]);
  }

  async list(clientId: string, now: Date = new Date()): Promise<RecordsDto> {
    const [stored, recentLogs] = await Promise.all([
      this.prisma.personalRecord.findMany({
        where: { clientId },
        include: { exercise: { select: { name: true } } },
        orderBy: [{ exerciseId: 'asc' }, { reps: 'asc' }],
      }),
      this.prisma.exerciseLog.findMany({
        where: { workoutLog: { clientId, performedAt: { gte: new Date(now.getTime() - RECORDS_WINDOW_DAYS * DAY_MS) } } },
        include: sessionInclude,
      }),
    ]);

    const rowsByExercise = new Map<string, { name: string; rows: RecordRow[] }>();
    for (const r of stored) {
      const entry = rowsByExercise.get(r.exerciseId) ?? { name: r.exercise.name, rows: [] };
      entry.rows.push({ setLogId: r.setLogId, reps: r.reps, weightKg: r.weightKg.toNumber(), e1rmKg: r.e1rmKg.toNumber(), achievedAt: r.achievedAt });
      rowsByExercise.set(r.exerciseId, entry);
    }

    const sessionsByExercise = new Map<string, SessionRow[]>();
    for (const l of recentLogs) sessionsByExercise.set(l.exerciseId, [...(sessionsByExercise.get(l.exerciseId) ?? []), l]);

    const exercises: ExerciseRecordsDto[] = [...rowsByExercise.entries()]
      .map(([exerciseId, { name, rows }]) => {
        const best = bestRecord(rows);
        const points = this.points(sessionsByExercise.get(exerciseId) ?? []);
        return {
          exerciseId,
          exerciseName: name,
          cells: bracketCells(rows).map(cellDto),
          bestE1rmKg: fixed(best.e1rmKg),
          best: { reps: best.reps, weightKg: fixed(best.weightKg), setReps: best.reps, e1rmKg: fixed(best.e1rmKg), achievedAt: best.achievedAt.toISOString() },
          trendE1rmKg: points.map((p) => fixed(p.e1rmKg)),
          stats: windowSummary(points, now),
        };
      })
      .sort((a, b) => Number(b.bestE1rmKg) - Number(a.bestE1rmKg) || a.exerciseName.localeCompare(b.exerciseName));

    return {
      brackets: [...PR_BRACKETS],
      windowDays: RECORDS_WINDOW_DAYS,
      newRecords: countRecent([...rowsByExercise.values()].flatMap((e) => e.rows), now),
      exercises,
    };
  }

  /** 404 when the exercise is outside the client's visible library. An exercise never logged returns empty stats. */
  async stats(clientId: string, exerciseId: string, now: Date = new Date()): Promise<ExerciseStatsDto> {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: exerciseId, ...(await clientExerciseScope(this.prisma, clientId)) },
      select: { id: true, name: true },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');

    const [logs, stored] = await Promise.all([
      this.prisma.exerciseLog.findMany({
        where: { exerciseId, workoutLog: { clientId } },
        include: sessionInclude,
        orderBy: { workoutLog: { performedAt: 'desc' } },
        take: TREND_SESSIONS,
      }),
      this.prisma.personalRecord.findMany({ where: { clientId, exerciseId } }),
    ]);

    const sessions = this.points(logs);
    const trend = sessions.map(({ workingSets: _s, avgRpe: _r, ...point }) => point);
    const delta = netDelta(trend);
    const rows: RecordRow[] = stored.map((r) => ({
      setLogId: r.setLogId,
      reps: r.reps,
      weightKg: r.weightKg.toNumber(),
      e1rmKg: r.e1rmKg.toNumber(),
      achievedAt: r.achievedAt,
    }));

    return {
      exercise,
      trend,
      netDeltaKg: delta?.kg ?? null,
      netDeltaPct: delta?.pct ?? null,
      sessions: trend.length,
      summary: windowSummary(sessions, now),
      records: bracketCells(rows).map(cellDto),
    };
  }

  /** Sessions with working sets, oldest first. */
  private points(logs: readonly SessionRow[]): SessionPoint[] {
    return logs
      .map((l) => {
        const m = computeSessionMetrics({
          exerciseLogId: l.id,
          performedAt: l.workoutLog.performedAt,
          sets: l.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg.toNumber(), rpe: s.rpe?.toNumber() ?? null, isWarmup: s.isWarmup })),
        });
        return m
          ? { logId: l.workoutLog.id, performedAt: m.performedAt, e1rmKg: m.e1rmKg, topWeightKg: m.topWeightKg, topSetReps: m.topSetReps, workingSets: m.workingSets, avgRpe: m.avgRpe }
          : null;
      })
      .filter((p): p is SessionPoint => p !== null)
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  }
}
