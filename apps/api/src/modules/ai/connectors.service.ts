import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConnectorGrant } from '@prisma/client';
import { CONNECTOR_LIMITS, CONNECTOR_SCOPE_PATHS, Feature } from '@coaching/shared';
import type { ConnectorGrantDto, ConnectorScope, CreateConnectorRequest, CreatedConnectorDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';

const DAY = 86_400_000;
const TOKEN_PREFIX = 'mur_ct_';

export const hashToken = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex');

const toDto = (g: ConnectorGrant): ConnectorGrantDto => ({
  id: g.id,
  name: g.name,
  tokenPrefix: g.tokenPrefix,
  scopes: g.scopes as ConnectorScope[],
  expiresAt: g.expiresAt.toISOString(),
  revokedAt: g.revokedAt?.toISOString() ?? null,
  lastUsedAt: g.lastUsedAt?.toISOString() ?? null,
  createdAt: g.createdAt.toISOString(),
});

const SCOPE_BY_PATH = new Map(Object.entries(CONNECTOR_SCOPE_PATHS).map(([scope, path]) => [path, scope as ConnectorScope]));
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const since = (days: number): Date => new Date(Date.now() - days * DAY);

/**
 * Read-only tokens for outside AI apps. Only the SHA-256 of a token is stored; the raw token is shown once.
 * Reads are scoped to the grant's owner and scopes, and every attempt with a known token is audited.
 * No scope reaches cycle data: CycleLog is never queried here.
 */
@Injectable()
export class ConnectorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(clientId: string): Promise<ConnectorGrantDto[]> {
    const rows = await this.prisma.connectorGrant.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toDto);
  }

  async create(clientId: string, req: CreateConnectorRequest): Promise<CreatedConnectorDto> {
    const active = await this.prisma.connectorGrant.count({ where: { clientId, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (active >= CONNECTOR_LIMITS.maxActive) throw new ConflictException(`You can have ${CONNECTOR_LIMITS.maxActive} active connectors. Revoke one first.`);
    const token = `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    const grant = await this.prisma.connectorGrant.create({
      data: {
        clientId,
        name: req.name,
        tokenHash: hashToken(token),
        tokenPrefix: token.slice(0, 12),
        scopes: [...new Set(req.scopes)],
        expiresAt: new Date(Date.now() + req.expiresInDays * DAY),
      },
    });
    return { grant: toDto(grant), token };
  }

  /** Idempotent. Revoking needs no plan, so access can always be cut off. */
  async revoke(clientId: string, id: string): Promise<void> {
    const grant = await this.prisma.connectorGrant.findFirst({ where: { id, clientId }, select: { revokedAt: true } });
    if (!grant) throw new NotFoundException('Connector not found');
    if (!grant.revokedAt) await this.prisma.connectorGrant.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async read(authorization: string | undefined, path: string): Promise<unknown> {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');
    if (!match || !match[1]!.startsWith(TOKEN_PREFIX)) throw new UnauthorizedException('Missing connector token');
    const grant = await this.prisma.connectorGrant.findUnique({ where: { tokenHash: hashToken(match[1]!) } });
    if (!grant) throw new UnauthorizedException('Unknown connector token');

    const scope = SCOPE_BY_PATH.get(path) ?? null;
    const deny = async (status: number, err: HttpException): Promise<never> => {
      await this.audit(grant.id, scope, path, status);
      throw err;
    };
    if (grant.revokedAt || grant.expiresAt <= new Date()) await deny(401, new UnauthorizedException('This connector token was revoked or has expired'));
    if (!scope) await deny(404, new NotFoundException('Unknown connector resource'));
    if (!grant.scopes.includes(scope!)) await deny(403, new ForbiddenException('This token is not granted that scope'));
    const access = await this.entitlements.resolve(grant.clientId);
    if (!access.features.includes(Feature.AI_COACH)) await deny(402, new HttpException('AI connectors are part of MUR Coaching Pro.', 402));

    const data = await this.load(grant.clientId, scope!);
    await Promise.all([
      this.prisma.connectorGrant.update({ where: { id: grant.id }, data: { lastUsedAt: new Date() } }),
      this.audit(grant.id, scope, path, 200),
    ]);
    return { scope, generatedAt: new Date().toISOString(), data };
  }

  private audit(grantId: string, scope: ConnectorScope | null, path: string, status: number) {
    return this.prisma.connectorAudit.create({ data: { grantId, scope, path: path.slice(0, 120), status } });
  }

  /** Owner-scoped, read-only. Decimals and dates as strings. */
  private async load(clientId: string, scope: ConnectorScope): Promise<unknown> {
    switch (scope) {
      case 'TRAINING': {
        const [logs, prs, calls] = await Promise.all([
          this.prisma.workoutLog.findMany({
            where: { clientId, performedAt: { gte: since(90) } },
            orderBy: { performedAt: 'desc' },
            take: 60,
            select: {
              id: true,
              performedAt: true,
              workout: { select: { name: true } },
              exerciseLogs: {
                orderBy: { order: 'asc' },
                select: { exercise: { select: { name: true } }, sets: { orderBy: { setNumber: 'asc' }, select: { reps: true, weightKg: true, rpe: true, isWarmup: true } } },
              },
            },
          }),
          this.prisma.personalRecord.findMany({
            where: { clientId },
            orderBy: { achievedAt: 'desc' },
            take: 50,
            select: { reps: true, weightKg: true, e1rmKg: true, achievedAt: true, exercise: { select: { name: true } } },
          }),
          this.prisma.progressionRecommendation.findMany({
            where: { clientId, status: { in: ['PENDING', 'ACCEPTED'] } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { action: true, recommendedWeightKg: true, recommendedRepsMin: true, recommendedRepsMax: true, reason: true, createdAt: true, exercise: { select: { name: true } } },
          }),
        ]);
        return {
          sessions: logs.map((l) => ({
            id: l.id,
            date: l.performedAt.toISOString(),
            name: l.workout?.name ?? null,
            exercises: l.exerciseLogs.map((e) => ({
              name: e.exercise.name,
              sets: e.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg.toString(), rpe: s.rpe?.toString() ?? null, warmup: s.isWarmup })),
            })),
          })),
          personalRecords: prs.map((p) => ({ exercise: p.exercise.name, reps: p.reps, weightKg: p.weightKg.toString(), e1rmKg: p.e1rmKg.toString(), date: p.achievedAt.toISOString() })),
          engineCalls: calls.map((c) => ({
            exercise: c.exercise.name,
            action: c.action,
            weightKg: c.recommendedWeightKg?.toString() ?? null,
            repsMin: c.recommendedRepsMin,
            repsMax: c.recommendedRepsMax,
            reason: c.reason,
            date: c.createdAt.toISOString(),
          })),
        };
      }
      case 'NUTRITION': {
        const [days, water, target] = await Promise.all([
          this.prisma.mealEntry.groupBy({
            by: ['date'],
            where: { clientId, date: { gte: since(30) } },
            _sum: { kcal: true, proteinG: true, carbsG: true, fatG: true, fiberG: true },
            orderBy: { date: 'desc' },
          }),
          this.prisma.waterLog.groupBy({ by: ['date'], where: { clientId, date: { gte: since(30) } }, _sum: { ml: true } }),
          this.prisma.nutritionTarget.findUnique({ where: { clientId }, select: { kcal: true, proteinG: true, carbsG: true, fatG: true, fiberG: true, waterMl: true } }),
        ]);
        const waterByDay = new Map(water.map((w) => [iso(w.date), w._sum.ml ?? 0]));
        return {
          target,
          days: days.map((d) => ({
            date: iso(d.date),
            kcal: d._sum.kcal?.toString() ?? '0',
            proteinG: d._sum.proteinG?.toString() ?? '0',
            carbsG: d._sum.carbsG?.toString() ?? '0',
            fatG: d._sum.fatG?.toString() ?? '0',
            fiberG: d._sum.fiberG?.toString() ?? null,
            waterMl: waterByDay.get(iso(d.date)) ?? 0,
          })),
        };
      }
      case 'BODYWEIGHT': {
        const rows = await this.prisma.bodyweightEntry.findMany({ where: { clientId, date: { gte: since(180) } }, orderBy: { date: 'desc' }, select: { date: true, weightKg: true } });
        return { entries: rows.map((r) => ({ date: iso(r.date), weightKg: r.weightKg.toString() })) };
      }
      case 'CHECK_INS': {
        const rows = await this.prisma.checkInResponse.findMany({
          where: { clientId },
          orderBy: { submittedAt: 'desc' },
          take: 20,
          select: { periodDate: true, answers: true, submittedAt: true, coachReply: true },
        });
        return { responses: rows.map((r) => ({ periodDate: iso(r.periodDate), submittedAt: r.submittedAt.toISOString(), answers: r.answers, coachReply: r.coachReply })) };
      }
      case 'READINESS': {
        // Readiness surveys only. Cycle context is owner-only and has no connector scope.
        const rows = await this.prisma.readinessSurvey.findMany({
          where: { clientId, date: { gte: since(60) } },
          orderBy: { date: 'desc' },
          select: { date: true, score: true, sleepQuality: true, sleepHours: true, soreness: true, stress: true, motivation: true },
        });
        return { surveys: rows.map((r) => ({ ...r, date: iso(r.date), sleepHours: r.sleepHours?.toString() ?? null })) };
      }
    }
  }
}
