import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ContentReport } from '@prisma/client';
import { MODERATION_PAGE_SIZE } from '@coaching/shared';
import type {
  ModerationPreviewDto,
  ModerationReportDto,
  ModerationReportPage,
  ModerationReportsQuery,
  ReportStatus,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_NAME, nameOf } from '../social/social.service';

export function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const at = raw.indexOf('|');
  if (at < 0) throw new BadRequestException('Invalid cursor');
  const createdAt = new Date(raw.slice(0, at));
  const id = raw.slice(at + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) throw new BadRequestException('Invalid cursor');
  return { createdAt, id };
}

/** Reads the `SharedWorkout.summary` JSON defensively: it is a stored snapshot, not a trusted shape. */
export function snapshotPreview(summary: unknown): { title: string; liftCount: number; topLifts: string[]; volumeKg: string | null } {
  const s = summary && typeof summary === 'object' ? (summary as Record<string, unknown>) : {};
  const lifts = Array.isArray(s.lifts) ? s.lifts : [];
  const topLifts = lifts
    .map((l) => (l && typeof l === 'object' ? (l as Record<string, unknown>).exercise : undefined))
    .filter((e): e is string => typeof e === 'string')
    .slice(0, 3);
  return {
    title: typeof s.title === 'string' && s.title ? s.title : 'Shared workout',
    liftCount: lifts.length,
    topLifts,
    volumeKg: typeof s.volumeKg === 'string' ? s.volumeKg : null,
  };
}

type ReportRow = ContentReport & { reporter: { id: string; name: string; displayName: string | null } };

/**
 * Review only: moderators read reports and flip OPEN and REVIEWED. Nothing here deletes content or touches users.
 */
@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ModerationReportsQuery): Promise<ModerationReportPage> {
    const status = query.status ?? 'OPEN';
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.prisma.contentReport.findMany({
      where: {
        status,
        ...(after ? { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MODERATION_PAGE_SIZE + 1,
      include: { reporter: USER_NAME },
    });
    const page = rows.slice(0, MODERATION_PAGE_SIZE);
    const nextCursor = rows.length > MODERATION_PAGE_SIZE ? encodeCursor(page[page.length - 1]!) : null;

    const [items, grouped] = await Promise.all([
      this.hydrate(page),
      this.prisma.contentReport.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const counts: Record<ReportStatus, number> = { OPEN: 0, REVIEWED: 0 };
    for (const g of grouped) counts[g.status] = g._count._all;
    return { items, nextCursor, counts };
  }

  async setStatus(id: string, status: ReportStatus): Promise<ModerationReportDto> {
    const exists = await this.prisma.contentReport.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Report not found');
    const row = await this.prisma.contentReport.update({ where: { id }, data: { status }, include: { reporter: USER_NAME } });
    return (await this.hydrate([row]))[0]!;
  }

  /** One query per target kind per page; a kind with no ids is skipped. */
  private async hydrate(rows: ReportRow[]): Promise<ModerationReportDto[]> {
    if (rows.length === 0) return [];
    const ids = (type: ReportRow['targetType']): string[] => [...new Set(rows.filter((r) => r.targetType === type).map((r) => r.targetId))];
    const userIds = ids('USER');
    const groupIds = ids('GROUP');
    const shareIds = ids('SHARED_WORKOUT');
    const allTargetIds = [...new Set(rows.map((r) => r.targetId))];

    const [users, groups, shares, repeats] = await Promise.all([
      userIds.length ? this.prisma.user.findMany({ where: { id: { in: userIds } }, ...USER_NAME }) : Promise.resolve([]),
      groupIds.length
        ? this.prisma.trainingGroup.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, name: true, _count: { select: { members: true } } },
          })
        : Promise.resolve([]),
      shareIds.length
        ? this.prisma.sharedWorkout.findMany({
            where: { id: { in: shareIds } },
            select: { id: true, kind: true, caption: true, summary: true, createdAt: true, user: USER_NAME, group: { select: { name: true } } },
          })
        : Promise.resolve([]),
      this.prisma.contentReport.groupBy({
        by: ['targetType', 'targetId'],
        where: { status: 'OPEN', targetId: { in: allTargetIds } },
        _count: { _all: true },
      }),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));
    const groupById = new Map(groups.map((g) => [g.id, g]));
    const shareById = new Map(shares.map((s) => [s.id, s]));
    const repeatByKey = new Map(repeats.map((g) => [`${g.targetType}:${g.targetId}`, g._count._all]));

    const previewOf = (r: ReportRow): ModerationPreviewDto | null => {
      if (r.targetType === 'USER') {
        const u = userById.get(r.targetId);
        return u ? { type: 'USER', name: nameOf(u) } : null;
      }
      if (r.targetType === 'GROUP') {
        const g = groupById.get(r.targetId);
        return g ? { type: 'GROUP', name: g.name, memberCount: g._count.members } : null;
      }
      const s = shareById.get(r.targetId);
      if (!s) return null;
      return {
        type: 'SHARED_WORKOUT',
        kind: s.kind,
        author: { userId: s.user.id, name: nameOf(s.user) },
        groupName: s.group.name,
        caption: s.caption,
        postedAt: s.createdAt.toISOString(),
        ...snapshotPreview(s.summary),
      };
    };

    return rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: { userId: r.reporter.id, name: nameOf(r.reporter) },
      preview: previewOf(r),
      openReportsOnTarget: repeatByKey.get(`${r.targetType}:${r.targetId}`) ?? 0,
    }));
  }
}
