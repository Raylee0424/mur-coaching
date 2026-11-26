import type { Prisma, PrismaClient } from '@prisma/client';
import type { SharedWorkoutSummary } from '@coaching/shared';

export const DEMO_GROUP_CODE = 'DEMACREW';
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const lift = (exercise: string) => ({ exercise, weightKg: '0', reps: 8, rpe: null, sets: 3 });

/**
 * Demo moderation queue: one private group with a shared template post, and five reports against it, a profile,
 * a deleted account and the group itself. Returns the number of reports created.
 */
export async function seedModeration(prisma: PrismaClient, now: Date): Promise<number> {
  // Groups have no FK to users, so the demo wipe leaves them behind. Members and shares cascade with the group.
  await prisma.trainingGroup.deleteMany({ where: { inviteCode: DEMO_GROUP_CODE } });

  const emails = ['alex', 'jordan', 'riley', 'taylor', 'casey'].map((n) => `demo.${n}@coaching.demo`);
  const found = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  const idOf = (name: string): string | undefined => found.find((u) => u.email === `demo.${name}@coaching.demo`)?.id;
  const [alex, jordan, riley, taylor, casey] = ['alex', 'jordan', 'riley', 'taylor', 'casey'].map(idOf);
  if (!alex || !jordan || !riley || !taylor || !casey) {
    console.warn('seedModeration: a demo user is missing, skipping demo reports.');
    return 0;
  }

  const group = await prisma.trainingGroup.create({
    data: {
      name: 'Demo Lifting Crew',
      inviteCode: DEMO_GROUP_CODE,
      isPrivate: true,
      members: {
        create: [
          { userId: alex, role: 'OWNER' },
          { userId: jordan },
          { userId: riley },
          { userId: taylor },
        ],
      },
    },
  });

  // SharedWorkout_source_check: a SESSION share must point at a real workout log.
  const log = await prisma.workoutLog.findFirst({ where: { clientId: jordan }, orderBy: { performedAt: 'desc' }, select: { id: true, performedAt: true } });
  if (!log) {
    console.warn('seedModeration: Jordan has no workout log, skipping demo reports.');
    return 0;
  }
  const summary: SharedWorkoutSummary = {
    title: 'Upper A',
    performedAt: log.performedAt.toISOString(),
    volumeKg: null,
    prCount: 0,
    lifts: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown'].map(lift),
  };
  const share = await prisma.sharedWorkout.create({
    data: {
      groupId: group.id,
      userId: jordan,
      kind: 'SESSION',
      workoutLogId: log.id,
      caption: 'Free 12-week plan, message me for the full PDF',
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });

  const ago = (ms: number): Date => new Date(now.getTime() - ms);
  const reports: Prisma.ContentReportUncheckedCreateInput[] = [
    { reporterId: alex, targetType: 'SHARED_WORKOUT', targetId: share.id, reason: 'SPAM', details: 'Same link posted in every group I am in.', status: 'OPEN', createdAt: ago(2 * HOUR_MS) },
    { reporterId: riley, targetType: 'SHARED_WORKOUT', targetId: share.id, reason: 'INAPPROPRIATE', status: 'OPEN', createdAt: ago(5 * HOUR_MS) },
    { reporterId: casey, targetType: 'USER', targetId: jordan, reason: 'IMPERSONATION', details: "Uses a well-known coach's photos.", status: 'OPEN', createdAt: ago(DAY_MS) },
    { reporterId: alex, targetType: 'USER', targetId: 'demo-deleted-account', reason: 'HARASSMENT', status: 'OPEN', createdAt: ago(3 * DAY_MS) },
    { reporterId: taylor, targetType: 'GROUP', targetId: group.id, reason: 'OTHER', details: 'Group name reads like an ad.', status: 'REVIEWED', createdAt: ago(6 * DAY_MS) },
  ];
  await prisma.contentReport.createMany({ data: reports });
  return reports.length;
}
