import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ImportJob } from '@prisma/client';
import { IMPORT_LIMITS, IMPORT_SOURCES } from '@coaching/shared';
import type {
  ExerciseMatchDto,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportJobDto,
  ImportMapping,
  ImportPreviewDto,
  ImportPreviewRequest,
  ImportSource,
  WeightUnit,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertExercisesVisible, clientExerciseScope } from '../exercises/exercise-visibility';
import { RecordsService } from '../records/records.service';
import { fileHash, ImportFormatError, parseNutrition, parseWorkouts, suggestExercise } from './parsers';
import type { ParsedMeal, ParsedSession, ParseResult } from './parsers';

type Parsed = { kind: 'WORKOUTS'; result: ParseResult<ParsedSession> } | { kind: 'NUTRITION'; result: ParseResult<ParsedMeal> };

const key = (name: string): string => name.trim().toLowerCase().slice(0, 120);

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly records: RecordsService,
  ) {}

  private toJob(j: ImportJob): ImportJobDto {
    return {
      id: j.id,
      source: j.source,
      status: j.status,
      fileName: j.fileName,
      rowCount: j.rowCount,
      createdCount: j.createdCount,
      duplicateCount: j.duplicateCount,
      skippedCount: j.skippedCount,
      createdAt: j.createdAt.toISOString(),
      rolledBackAt: j.rolledBackAt?.toISOString() ?? null,
    };
  }

  private async unitOf(userId: string, requested?: WeightUnit): Promise<WeightUnit> {
    if (requested) return requested;
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { weightUnit: true } });
    return u?.weightUnit ?? 'KG';
  }

  private parse(source: ImportSource, csv: string, unit: WeightUnit): Parsed {
    if (Buffer.byteLength(csv, 'utf8') > IMPORT_LIMITS.maxCsvBytes) throw new BadRequestException('The file is larger than 5 MB. Export a shorter date range.');
    try {
      const parsed: Parsed =
        source === 'STRONG' || source === 'HEVY'
          ? { kind: 'WORKOUTS', result: parseWorkouts(source, csv, unit) }
          : { kind: 'NUTRITION', result: parseNutrition(source, csv) };
      if (parsed.result.rowCount > IMPORT_LIMITS.maxRows) throw new BadRequestException(`The file has more than ${IMPORT_LIMITS.maxRows} rows.`);
      if (parsed.result.units.length === 0) throw new BadRequestException(`No usable ${IMPORT_SOURCES[source].kind === 'WORKOUTS' ? 'sets' : 'entries'} found in this ${IMPORT_SOURCES[source].label} file.`);
      return parsed;
    } catch (err) {
      if (err instanceof ImportFormatError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  /** Saved aliases first, then an exact library name (case-insensitive), within what this client may see. */
  private async matchExercises(userId: string, source: ImportSource, sessions: readonly ParsedSession[]): Promise<ExerciseMatchDto[]> {
    const counts = new Map<string, { name: string; sets: number }>();
    for (const s of sessions) for (const e of s.exercises) {
      const k = key(e.sourceName);
      counts.set(k, { name: counts.get(k)?.name ?? e.sourceName, sets: (counts.get(k)?.sets ?? 0) + e.sets.length });
    }
    const scope = await clientExerciseScope(this.prisma, userId);
    const [aliases, library] = await Promise.all([
      this.prisma.exerciseAlias.findMany({ where: { userId, source, sourceName: { in: [...counts.keys()] }, exercise: scope }, include: { exercise: { select: { id: true, name: true } } } }),
      this.prisma.exercise.findMany({ where: { ...scope, archivedAt: null }, select: { id: true, name: true } }),
    ]);
    const aliasOf = new Map(aliases.map((a) => [a.sourceName, a.exercise]));
    const byName = new Map(library.map((e) => [key(e.name), e]));
    return [...counts.entries()]
      .map(([k, { name, sets }]): ExerciseMatchDto => {
        const alias = aliasOf.get(k);
        const named = byName.get(k);
        const hit = alias ?? named ?? null;
        return {
          sourceName: name,
          sets,
          exerciseId: hit?.id ?? null,
          exerciseName: hit?.name ?? null,
          matchedBy: alias ? 'ALIAS' : named ? 'NAME' : null,
          suggestion: hit ? null : suggestExercise(name, library),
        };
      })
      .sort((a, b) => Number(a.exerciseId !== null) - Number(b.exerciseId !== null) || b.sets - a.sets);
  }

  private async existingHashes(userId: string, source: ImportSource, hashes: readonly string[]): Promise<Set<string>> {
    const rows = await this.prisma.importRecord.findMany({ where: { userId, source, hash: { in: [...hashes] } }, select: { hash: true } });
    return new Set(rows.map((r) => r.hash));
  }

  private completedJob(userId: string, source: ImportSource, hash: string): Promise<ImportJob | null> {
    return this.prisma.importJob.findFirst({ where: { userId, source, fileHash: hash, status: 'COMPLETED' }, orderBy: { createdAt: 'desc' } });
  }

  async preview(userId: string, input: ImportPreviewRequest): Promise<ImportPreviewDto> {
    const parsed = this.parse(input.source, input.csv, await this.unitOf(userId, input.weightUnit));
    const hash = fileHash(input.csv);
    const { result } = parsed;
    const [dupes, done] = await Promise.all([
      this.existingHashes(userId, input.source, result.units.map((u) => u.hash)),
      this.completedJob(userId, input.source, hash),
    ]);
    const sessions = parsed.kind === 'WORKOUTS' ? parsed.result.units : [];
    const meals = parsed.kind === 'NUTRITION' ? parsed.result.units : [];
    return {
      source: input.source,
      kind: parsed.kind,
      fileHash: hash,
      rowCount: result.rowCount,
      skippedRows: result.skippedRows,
      units: result.units.length,
      duplicateUnits: dupes.size,
      alreadyImported: done !== null,
      exercises: parsed.kind === 'WORKOUTS' ? await this.matchExercises(userId, input.source, sessions) : [],
      sessions: sessions.slice(0, IMPORT_LIMITS.previewSessions).map((s) => ({
        performedAt: s.performedAt.toISOString(),
        title: s.title,
        exercises: s.exercises.length,
        sets: s.exercises.reduce((n, e) => n + e.sets.length, 0),
      })),
      meals: meals.slice(0, IMPORT_LIMITS.previewSessions).map((m) => ({ date: m.date, name: m.name, kcal: m.kcal.toFixed(1) })),
      warnings: result.warnings,
    };
  }

  /** Final exercise per source name: the user's choices override saved aliases and name matches. */
  private async resolveMappings(userId: string, source: ImportSource, sessions: readonly ParsedSession[], mappings: readonly ImportMapping[]): Promise<Map<string, string | null>> {
    const chosen = new Map(mappings.map((m) => [key(m.sourceName), m.exerciseId]));
    await assertExercisesVisible(this.prisma, userId, [...chosen.values()].filter((v): v is string => v !== null));
    const matches = await this.matchExercises(userId, source, sessions);
    return new Map(matches.map((m) => [key(m.sourceName), chosen.has(key(m.sourceName)) ? chosen.get(key(m.sourceName))! : m.exerciseId]));
  }

  /**
   * Writes every new session or meal entry in one transaction. Idempotent twice over: the same file returns the earlier
   * job untouched, and units already imported from another file (hash match) are counted as duplicates, not rewritten.
   */
  async commit(userId: string, input: ImportCommitRequest): Promise<ImportCommitResponse> {
    const hash = fileHash(input.csv);
    const done = await this.completedJob(userId, input.source, hash);
    if (done) return { job: this.toJob(done), duplicate: true };

    const parsed = this.parse(input.source, input.csv, await this.unitOf(userId, input.weightUnit));
    const dupes = await this.existingHashes(userId, input.source, parsed.result.units.map((u) => u.hash));
    const mapping = parsed.kind === 'WORKOUTS' ? await this.resolveMappings(userId, input.source, parsed.result.units, input.mappings) : new Map<string, string | null>();
    const touched = new Set<string>();
    let skipped = parsed.result.skippedRows;

    try {
      const job = await this.prisma.$transaction(
        async (tx) => {
          for (const m of input.mappings) {
            if (!m.exerciseId) continue;
            const sourceName = key(m.sourceName);
            await tx.exerciseAlias.upsert({
              where: { userId_source_sourceName: { userId, source: input.source, sourceName } },
              create: { userId, source: input.source, sourceName, exerciseId: m.exerciseId },
              update: { exerciseId: m.exerciseId },
            });
          }
          const created: { id: string; hash: string }[] = [];
          if (parsed.kind === 'WORKOUTS') {
            for (const s of parsed.result.units) {
              if (dupes.has(s.hash)) continue;
              const exercises = s.exercises
                .map((e) => ({ e, exerciseId: mapping.get(key(e.sourceName)) ?? null }))
                .filter((x): x is { e: (typeof s.exercises)[number]; exerciseId: string } => x.exerciseId !== null);
              if (exercises.length === 0) {
                skipped += s.exercises.reduce((n, e) => n + e.sets.length, 0);
                continue;
              }
              const log = await tx.workoutLog.create({
                data: {
                  clientId: userId,
                  performedAt: s.performedAt,
                  notes: [`Imported from ${IMPORT_SOURCES[input.source].label}: ${s.title}`, s.notes].filter(Boolean).join('\n').slice(0, 2000),
                  exerciseLogs: {
                    create: exercises.map(({ e, exerciseId }, order) => ({
                      exerciseId,
                      order,
                      notes: e.notes,
                      sets: { create: e.sets.map((set, i) => ({ setNumber: i + 1, reps: set.reps, weightKg: set.weightKg, rpe: set.rpe, isWarmup: set.isWarmup })) },
                    })),
                  },
                },
                select: { id: true },
              });
              exercises.forEach((x) => touched.add(x.exerciseId));
              created.push({ id: log.id, hash: s.hash });
            }
          } else {
            for (const m of parsed.result.units) {
              if (dupes.has(m.hash)) continue;
              const { hash: unitHash, date, ...rest } = m;
              const row = await tx.mealEntry.create({ data: { clientId: userId, date: new Date(`${date}T00:00:00Z`), source: 'CUSTOM', ...rest }, select: { id: true } });
              created.push({ id: row.id, hash: unitHash });
            }
          }
          const j = await tx.importJob.create({
            data: {
              userId,
              source: input.source,
              fileName: input.fileName?.slice(0, 160) || null,
              fileHash: hash,
              rowCount: parsed.result.rowCount,
              createdCount: created.length,
              duplicateCount: dupes.size,
              skippedCount: skipped,
              createdIds: created.map((c) => c.id),
            },
          });
          await tx.importRecord.createMany({ data: created.map((c) => ({ jobId: j.id, userId, source: input.source, hash: c.hash, targetId: c.id })) });
          return j;
        },
        { timeout: 120_000, maxWait: 10_000 },
      );
      await this.rebuild(userId, touched);
      return { job: this.toJob(job), duplicate: false };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('This file is already being imported. Refresh and check your import history.');
      throw err;
    }
  }

  /** Deletes what the job wrote (edits made since included) and frees its dedupe keys so the file can be imported again. */
  async rollback(userId: string, jobId: string): Promise<ImportJobDto> {
    const job = await this.prisma.importJob.findFirst({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('Import not found');
    if (job.status !== 'COMPLETED') throw new ConflictException('This import was already rolled back.');
    const kind = IMPORT_SOURCES[job.source].kind;
    const touched = new Set<string>();
    const updated = await this.prisma.$transaction(async (tx) => {
      if (kind === 'WORKOUTS') {
        const logs = await tx.exerciseLog.findMany({ where: { workoutLogId: { in: job.createdIds }, workoutLog: { clientId: userId } }, select: { exerciseId: true } });
        logs.forEach((l) => touched.add(l.exerciseId));
        await tx.workoutLog.deleteMany({ where: { id: { in: job.createdIds }, clientId: userId } });
      } else {
        await tx.mealEntry.deleteMany({ where: { id: { in: job.createdIds }, clientId: userId } });
      }
      await tx.importRecord.deleteMany({ where: { jobId: job.id } });
      return tx.importJob.update({ where: { id: job.id }, data: { status: 'ROLLED_BACK', rolledBackAt: new Date() } });
    });
    await this.rebuild(userId, touched);
    return this.toJob(updated);
  }

  async jobs(userId: string): Promise<ImportJobDto[]> {
    const rows = await this.prisma.importJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map((j) => this.toJob(j));
  }

  /** Records follow the logs; a failed rebuild is logged and never undoes the import. */
  private async rebuild(userId: string, exerciseIds: ReadonlySet<string>): Promise<void> {
    for (const exerciseId of exerciseIds) {
      try {
        await this.records.rebuild(userId, exerciseId);
      } catch (err) {
        this.logger.error(`Record rebuild failed for client ${userId}, exercise ${exerciseId}`, err);
      }
    }
  }
}
