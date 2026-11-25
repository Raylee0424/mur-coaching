import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EXPORT_SCHEMA_VERSION } from '@coaching/shared';
import type { ExportDataset } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ReadinessService } from '../readiness/readiness.service';
import { toCsv } from './csv';

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);
const OWNER_KEYS = new Set(['clientId', 'userId']);
const DATE_ONLY = new Set(['date', 'targetDate', 'takenOn', 'day']);

/** Wire form: Decimals and dates as strings, `@db.Date` columns as YYYY-MM-DD. Owner ids are dropped. */
function plain(value: unknown, dateOnly: ReadonlySet<string> = DATE_ONLY, field = ''): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Prisma.Decimal) return value.toString();
  if (value instanceof Date) return dateOnly.has(field) ? isoDay(value) : value.toISOString();
  if (Array.isArray(value)) return value.map((v) => plain(v, dateOnly, field));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !OWNER_KEYS.has(k))
        .map(([k, v]) => [k, plain(v, dateOnly, k)]),
    );
  }
  return value;
}

/**
 * Full owner export. Never includes password hashes, tokens, Stripe ids, storage keys or any ciphertext. Cycle entries
 * appear only when the owner passes `includeCycle`, decrypted through ReadinessService (the only cycle reader).
 */
@Injectable()
export class DataExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readiness: ReadinessService,
  ) {}

  private workouts(userId: string) {
    return this.prisma.workoutLog.findMany({
      where: { clientId: userId },
      orderBy: { performedAt: 'desc' },
      select: {
        id: true,
        performedAt: true,
        notes: true,
        exerciseLogs: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            notes: true,
            exercise: { select: { id: true, name: true } },
            sets: { orderBy: { setNumber: 'asc' }, select: { setNumber: true, reps: true, weightKg: true, rpe: true, rir: true, isWarmup: true, tempo: true, restSeconds: true } },
          },
        },
      },
    });
  }

  private meals(userId: string) {
    return this.prisma.mealEntry.findMany({ where: { clientId: userId }, orderBy: [{ date: 'desc' }, { createdAt: 'asc' }] });
  }

  private health(userId: string) {
    return this.prisma.dailyHealthMetric.findMany({ where: { userId }, orderBy: [{ date: 'desc' }, { source: 'asc' }] });
  }

  async json(userId: string, includeCycle: boolean): Promise<Record<string, unknown>> {
    const [profile, workouts, records, bodyweight, bodyGoal, photos, readiness, meals, water, target, health, stepGoal, aliases, imports, cycle] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, displayName: true, weightUnit: true, createdAt: true } }),
      this.workouts(userId),
      this.prisma.personalRecord.findMany({ where: { clientId: userId }, select: { reps: true, weightKg: true, e1rmKg: true, achievedAt: true, exercise: { select: { name: true } } } }),
      this.prisma.bodyweightEntry.findMany({ where: { clientId: userId }, orderBy: { date: 'desc' }, select: { date: true, weightKg: true } }),
      this.prisma.bodyGoal.findUnique({ where: { clientId: userId }, select: { targetKg: true, targetDate: true } }),
      this.prisma.progressPhoto.findMany({ where: { clientId: userId, uploadedAt: { not: null } }, select: { id: true, pose: true, takenOn: true, sharedWithCoach: true } }),
      this.prisma.readinessSurvey.findMany({ where: { clientId: userId }, orderBy: { date: 'desc' }, select: { date: true, sleepQuality: true, sleepHours: true, soreness: true, stress: true, motivation: true, score: true, note: true } }),
      this.meals(userId),
      this.prisma.waterLog.findMany({ where: { clientId: userId }, orderBy: { date: 'desc' }, select: { date: true, ml: true, createdAt: true } }),
      this.prisma.nutritionTarget.findUnique({ where: { clientId: userId }, select: { kcal: true, proteinG: true, carbsG: true, fatG: true, fiberG: true, waterMl: true } }),
      this.health(userId),
      this.prisma.stepGoal.findUnique({ where: { userId }, select: { dailySteps: true } }),
      this.prisma.exerciseAlias.findMany({ where: { userId }, select: { source: true, sourceName: true, exercise: { select: { id: true, name: true } } } }),
      this.prisma.importJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true, source: true, status: true, fileName: true, rowCount: true, createdCount: true, duplicateCount: true, skippedCount: true, createdAt: true, rolledBackAt: true } }),
      includeCycle ? this.readiness.exportCycle(userId) : Promise.resolve(null),
    ]);
    return {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      profile: plain(profile),
      workouts: plain(workouts),
      personalRecords: plain(records),
      body: { bodyweight: plain(bodyweight), goal: plain(bodyGoal), progressPhotos: plain(photos) },
      readiness: plain(readiness),
      nutrition: { meals: plain(meals.map(({ foodId: _f, ...m }) => m)), water: plain(water), target: plain(target) },
      health: { metrics: plain(health.map(({ id: _i, ...h }) => h)), stepGoal: plain(stepGoal) },
      exerciseAliases: plain(aliases),
      imports: plain(imports),
      ...(cycle ? { cycle } : {}),
    };
  }

  async csv(userId: string, dataset: ExportDataset): Promise<string> {
    if (dataset === 'nutrition') {
      const rows = await this.meals(userId);
      return toCsv(
        ['date', 'slot', 'name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sodium_mg'],
        rows.map((m) => [isoDay(m.date), m.slot, m.name, m.grams.toString(), m.kcal.toString(), m.proteinG.toString(), m.carbsG.toString(), m.fatG.toString(), m.fiberG?.toString(), m.sodiumMg?.toString()]),
      );
    }
    if (dataset === 'health') {
      const rows = await this.health(userId);
      return toCsv(['date', 'source', 'steps', 'sleep_minutes', 'hrv_ms', 'resting_hr'], rows.map((h) => [isoDay(h.date), h.source, h.steps, h.sleepMinutes, h.hrvMs, h.restingHr]));
    }
    const logs = await this.workouts(userId);
    return toCsv(
      ['performed_at', 'workout_id', 'exercise', 'set', 'weight_kg', 'reps', 'rpe', 'rir', 'warmup', 'exercise_notes', 'workout_notes'],
      logs.flatMap((w) =>
        w.exerciseLogs.flatMap((e) =>
          e.sets.map((s) => [w.performedAt.toISOString(), w.id, e.exercise.name, s.setNumber, s.weightKg.toString(), s.reps, s.rpe?.toString(), s.rir, s.isWarmup, e.notes, w.notes]),
        ),
      ),
    );
  }
}
