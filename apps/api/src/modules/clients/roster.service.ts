import { Injectable } from '@nestjs/common';
import { AssignmentStatus, CoachClientStatus, Prisma, RecommendationStatus } from '@prisma/client';
import type { RecommendationAction as ActionWire, RosterClientDto, RosterKpis, RosterSummaryDto } from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DAY_MS,
  adherenceWindows,
  assignmentSlots,
  attentionReasons,
  countedSlots,
  currentProgramWeek,
  dayKey,
  markCompleted,
  mean,
} from './analytics';
import type { RosterQueryDto } from './dto/roster.dto';

const rosterSelect = {
  status: true,
  notes: true,
  createdAt: true,
  client: {
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      assignments: {
        where: { status: AssignmentStatus.ACTIVE },
        take: 1,
        select: {
          id: true,
          programId: true,
          startDate: true,
          scheduled: { select: { id: true, date: true, status: true, workout: { select: { id: true, name: true, weekNumber: true } } } },
          program: {
            select: {
              name: true,
              durationWeeks: true,
              workouts: { select: { id: true, weekNumber: true, dayNumber: true, name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CoachClientSelect;

const emptyByAction = (): Record<ActionWire, number> => ({ INCREASE_LOAD: 0, INCREASE_REPS: 0, HOLD: 0, DELOAD: 0 });

/** Coach roster with per-client stats and KPIs. Everything is scoped to the coach's own links. */
@Injectable()
export class RosterService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(coachId: string, q: RosterQueryDto, now: Date = new Date()): Promise<RosterSummaryDto> {
    const links = await this.prisma.coachClient.findMany({ where: { coachId }, select: rosterSelect });
    const clientIds = links.map((l) => l.client.id);
    const assignmentIds = links.flatMap((l) => l.client.assignments.map((a) => a.id));
    const activeIds = links.filter((l) => l.status === CoachClientStatus.ACTIVE).map((l) => l.client.id);
    const today = dayKey(now);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

    const [slotLogs, lastSessions, pending, rpeSets, sessions7d] = await Promise.all([
      this.prisma.workoutLog.findMany({
        where: { assignmentId: { in: assignmentIds }, workoutId: { not: null } },
        select: { clientId: true, workoutId: true },
      }),
      this.prisma.workoutLog.groupBy({ by: ['clientId'], where: { clientId: { in: clientIds } }, _max: { performedAt: true } }),
      this.prisma.progressionRecommendation.groupBy({
        by: ['clientId', 'action'],
        where: { clientId: { in: clientIds }, status: RecommendationStatus.PENDING },
        _count: { _all: true },
      }),
      this.prisma.setLog.findMany({
        where: {
          isWarmup: false,
          rpe: { not: null },
          exerciseLog: { workoutLog: { clientId: { in: clientIds }, performedAt: { gt: twoWeeksAgo } } },
        },
        select: { rpe: true, exerciseLog: { select: { workoutLog: { select: { clientId: true, performedAt: true } } } } },
      }),
      this.prisma.workoutLog.count({ where: { clientId: { in: activeIds }, performedAt: { gt: weekAgo } } }),
    ]);

    const loggedByClient = new Map<string, Set<string>>();
    for (const l of slotLogs) {
      if (!l.workoutId) continue;
      (loggedByClient.get(l.clientId) ?? loggedByClient.set(l.clientId, new Set()).get(l.clientId)!).add(l.workoutId);
    }
    const lastByClient = new Map(lastSessions.map((g) => [g.clientId, g._max.performedAt]));
    const pendingByClient = new Map<string, Record<ActionWire, number>>();
    for (const g of pending) {
      const row = pendingByClient.get(g.clientId) ?? emptyByAction();
      row[g.action as ActionWire] = g._count._all;
      pendingByClient.set(g.clientId, row);
    }
    const rpeByClient = new Map<string, { cur: number[]; prev: number[] }>();
    for (const s of rpeSets) {
      const { clientId, performedAt } = s.exerciseLog.workoutLog;
      const bucket = rpeByClient.get(clientId) ?? { cur: [], prev: [] };
      (performedAt > weekAgo ? bucket.cur : bucket.prev).push((s.rpe as Prisma.Decimal).toNumber());
      rpeByClient.set(clientId, bucket);
    }

    const all: RosterClientDto[] = links.map((l) => {
      const a = l.client.assignments[0] ?? null;
      const byAction = pendingByClient.get(l.client.id) ?? emptyByAction();
      const lastSessionAt = lastByClient.get(l.client.id) ?? null;
      const started = a !== null && dayKey(a.startDate) <= today;

      let adherence: number | null = null;
      if (a) {
        const slots = markCompleted(countedSlots(assignmentSlots(a.startDate, a.program.workouts, a.scheduled)), loggedByClient.get(l.client.id) ?? new Set());
        adherence = adherenceWindows(slots, today).current;
      }
      const reasons = attentionReasons({
        status: l.status,
        hasStartedAssignment: started,
        adherencePct: adherence,
        pendingDeload: byAction.DELOAD > 0,
        lastSessionAt,
        now,
      });
      const rpe = rpeByClient.get(l.client.id);

      return {
        id: l.client.id,
        email: l.client.email,
        name: l.client.name,
        createdAt: l.client.createdAt.toISOString(),
        notes: l.notes,
        status: l.status,
        activeAssignment: a
          ? {
              id: a.id,
              programId: a.programId,
              startDate: a.startDate.toISOString(),
              program: { name: a.program.name, durationWeeks: a.program.durationWeeks },
            }
          : null,
        lastSessionAt: lastSessionAt?.toISOString() ?? null,
        adherencePct: adherence,
        pendingCount: Object.values(byAction).reduce((x, y) => x + y, 0),
        pendingByAction: byAction,
        avgRpe7d: mean(rpe?.cur ?? []),
        avgRpePrev7d: mean(rpe?.prev ?? []),
        currentWeek: a ? currentProgramWeek(a.startDate, a.program.durationWeeks, today) : null,
        totalWeeks: a?.program.durationWeeks ?? null,
        needsAttention: reasons.length > 0,
        attentionReasons: reasons,
      };
    });

    const active = all.filter((c) => c.status === CoachClientStatus.ACTIVE);
    const kpis: RosterKpis = {
      activeClients: active.length,
      pendingRecommendations: active.reduce((n, c) => n + c.pendingCount, 0),
      pendingLifters: active.filter((c) => c.pendingCount > 0).length,
      sessionsLogged7d: sessions7d,
      deloadsFlagged: active.reduce((n, c) => n + c.pendingByAction.DELOAD, 0),
    };
    const countOf = (s: CoachClientStatus): number => all.filter((c) => c.status === s).length;
    const counts = {
      all: countOf('ACTIVE') + countOf('PAUSED'),
      ACTIVE: countOf('ACTIVE'),
      PAUSED: countOf('PAUSED'),
      ARCHIVED: countOf('ARCHIVED'),
      needsAttention: all.filter((c) => c.needsAttention).length,
    };

    const needle = q.q?.trim().toLowerCase();
    const items = all
      .filter((c) => (q.status ? c.status === q.status : c.status !== CoachClientStatus.ARCHIVED))
      .filter((c) => !q.needsAttention || c.needsAttention)
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { kpis, counts, items };
  }
}
