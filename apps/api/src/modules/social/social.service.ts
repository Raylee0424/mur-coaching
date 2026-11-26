import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TrainingGroupMember } from '@prisma/client';
import { SOCIAL_LIMITS } from '@coaching/shared';
import type {
  BlockedUserDto,
  CreateGroupRequest,
  CreateReportRequest,
  DiscoverGroupDto,
  FriendDto,
  GroupDetailDto,
  GroupLeaderboardDto,
  GroupSummaryDto,
  SharedWorkoutDto,
  SharedWorkoutSummary,
  ShareWorkoutRequest,
  SocialOverviewDto,
} from '@coaching/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from '../health/health.service';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DAY_MS = 86_400_000;
export const nameOf = (u: { name: string; displayName: string | null }): string => u.displayName?.trim() || u.name;
export const USER_NAME = { select: { id: true, name: true, displayName: true } } as const;

export function inviteCode(): string {
  return Array.from({ length: SOCIAL_LIMITS.inviteCodeLength }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

/** Epley, for picking the best working set to show. */
const e1rm = (kg: number, reps: number): number => kg * (1 + reps / 30);

/**
 * Groups are private by default and members-only: a non-member gets 404 for every group route, never 403, so ids leak
 * nothing. Blocks filter people out of members, feed and leaderboards in both directions.
 */
@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthService,
  ) {}

  // ─── Guards and helpers ───

  private async member(userId: string, groupId: string): Promise<TrainingGroupMember> {
    const m = await this.prisma.trainingGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
    if (!m) throw new NotFoundException('Group not found');
    return m;
  }

  private async owner(userId: string, groupId: string): Promise<void> {
    const m = await this.member(userId, groupId);
    if (m.role !== 'OWNER') throw new NotFoundException('Group not found');
  }

  /** Everyone the user blocked or who blocked the user. */
  async blockedIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userBlock.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
  }

  private async sharesGroup(a: string, b: string): Promise<boolean> {
    const n = await this.prisma.trainingGroupMember.count({ where: { userId: b, group: { members: { some: { userId: a } } } } });
    return n > 0;
  }

  /** Someone the user can see: a group-mate, a friend or request, or someone they already blocked. Never a lookup by guessed id. */
  private async knows(userId: string, targetId: string): Promise<boolean> {
    const [friend, blocked] = await Promise.all([
      this.prisma.friendship.count({ where: { OR: [{ requesterId: userId, addresseeId: targetId }, { requesterId: targetId, addresseeId: userId }] } }),
      this.prisma.userBlock.count({ where: { blockerId: userId, blockedId: targetId } }),
    ]);
    return friend > 0 || blocked > 0 || this.sharesGroup(userId, targetId);
  }

  // ─── Overview, groups ───

  async overview(userId: string): Promise<SocialOverviewDto> {
    const [memberships, discover, friends, blocked] = await Promise.all([
      this.prisma.trainingGroupMember.findMany({ where: { userId }, include: { group: { include: { _count: { select: { members: true } } } } }, orderBy: { joinedAt: 'asc' } }),
      this.prisma.trainingGroup.findMany({
        where: { isPrivate: false, members: { none: { userId } } },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.friends(userId),
      this.prisma.userBlock.findMany({ where: { blockerId: userId }, include: { blocked: USER_NAME }, orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      groups: memberships.map(
        (m): GroupSummaryDto => ({
          id: m.group.id,
          name: m.group.name,
          description: m.group.description,
          isPrivate: m.group.isPrivate,
          memberCount: m.group._count.members,
          role: m.role,
          shareStats: m.shareStats,
          joinedAt: m.joinedAt.toISOString(),
        }),
      ),
      discover: discover
        .filter((g) => g._count.members < SOCIAL_LIMITS.maxMembers)
        .map((g): DiscoverGroupDto => ({ id: g.id, name: g.name, description: g.description, memberCount: g._count.members, inviteCode: g.inviteCode })),
      friends,
      blocked: blocked.map((b): BlockedUserDto => ({ userId: b.blocked.id, name: nameOf(b.blocked), createdAt: b.createdAt.toISOString() })),
    };
  }

  private async assertRoomForAnotherGroup(userId: string): Promise<void> {
    const n = await this.prisma.trainingGroupMember.count({ where: { userId } });
    if (n >= SOCIAL_LIMITS.maxGroupsPerUser) throw new BadRequestException(`You can be in at most ${SOCIAL_LIMITS.maxGroupsPerUser} groups.`);
  }

  async create(userId: string, input: CreateGroupRequest): Promise<GroupDetailDto> {
    await this.assertRoomForAnotherGroup(userId);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const g = await this.prisma.trainingGroup.create({
          data: {
            name: input.name,
            description: input.description || null,
            isPrivate: input.isPrivate ?? true,
            inviteCode: inviteCode(),
            members: { create: { userId, role: 'OWNER' } },
          },
        });
        return this.detail(userId, g.id);
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    throw new ConflictException('Could not create an invite code. Try again.');
  }

  async detail(userId: string, groupId: string): Promise<GroupDetailDto> {
    const me = await this.member(userId, groupId);
    const [group, blocked] = await Promise.all([
      this.prisma.trainingGroup.findUniqueOrThrow({ where: { id: groupId }, include: { members: { include: { user: USER_NAME }, orderBy: { joinedAt: 'asc' } } } }),
      this.blockedIds(userId),
    ]);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      isPrivate: group.isPrivate,
      memberCount: group.members.length,
      role: me.role,
      shareStats: me.shareStats,
      joinedAt: me.joinedAt.toISOString(),
      inviteCode: group.inviteCode,
      members: group.members
        .filter((m) => !blocked.has(m.userId))
        .map((m) => ({ userId: m.userId, name: nameOf(m.user), role: m.role, isYou: m.userId === userId, joinedAt: m.joinedAt.toISOString() })),
    };
  }

  async join(userId: string, code: string): Promise<GroupDetailDto> {
    const group = await this.prisma.trainingGroup.findUnique({ where: { inviteCode: code }, include: { _count: { select: { members: true } } } });
    if (!group) throw new NotFoundException('No group uses that invite code.');
    const existing = await this.prisma.trainingGroupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } });
    if (existing) return this.detail(userId, group.id);
    if (group._count.members >= SOCIAL_LIMITS.maxMembers) throw new BadRequestException('This group is full.');
    await this.assertRoomForAnotherGroup(userId);
    await this.prisma.trainingGroupMember.create({ data: { groupId: group.id, userId } });
    return this.detail(userId, group.id);
  }

  /** The owner leaving hands the group to the longest-standing member; the last member leaving deletes it. */
  async leave(userId: string, groupId: string): Promise<void> {
    const me = await this.member(userId, groupId);
    await this.prisma.$transaction(async (tx) => {
      await tx.trainingGroupMember.delete({ where: { groupId_userId: { groupId, userId } } });
      const next = await tx.trainingGroupMember.findFirst({ where: { groupId }, orderBy: { joinedAt: 'asc' } });
      if (!next) await tx.trainingGroup.delete({ where: { id: groupId } });
      else if (me.role === 'OWNER') await tx.trainingGroupMember.update({ where: { groupId_userId: { groupId, userId: next.userId } }, data: { role: 'OWNER' } });
    });
  }

  async setShareStats(userId: string, groupId: string, shareStats: boolean): Promise<void> {
    await this.member(userId, groupId);
    await this.prisma.trainingGroupMember.update({ where: { groupId_userId: { groupId, userId } }, data: { shareStats } });
  }

  async rotateCode(userId: string, groupId: string): Promise<GroupDetailDto> {
    await this.owner(userId, groupId);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await this.prisma.trainingGroup.update({ where: { id: groupId }, data: { inviteCode: inviteCode() } });
        return this.detail(userId, groupId);
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    throw new ConflictException('Could not create an invite code. Try again.');
  }

  async removeMember(userId: string, groupId: string, targetId: string): Promise<void> {
    await this.owner(userId, groupId);
    if (targetId === userId) throw new BadRequestException('Use Leave group to leave your own group.');
    const { count } = await this.prisma.trainingGroupMember.deleteMany({ where: { groupId, userId: targetId } });
    if (!count) throw new NotFoundException('Member not found');
  }

  // ─── Feed ───

  async feed(userId: string, groupId: string): Promise<SharedWorkoutDto[]> {
    const me = await this.member(userId, groupId);
    const blocked = await this.blockedIds(userId);
    const rows = await this.prisma.sharedWorkout.findMany({
      where: { groupId, userId: { notIn: [...blocked] } },
      include: { user: USER_NAME },
      orderBy: { createdAt: 'desc' },
      take: SOCIAL_LIMITS.feedPage,
    });
    return rows.map((s) => ({
      id: s.id,
      kind: s.kind,
      author: { userId: s.userId, name: nameOf(s.user), isYou: s.userId === userId },
      caption: s.caption,
      summary: s.summary as unknown as SharedWorkoutSummary,
      createdAt: s.createdAt.toISOString(),
      canDelete: s.userId === userId || me.role === 'OWNER',
    }));
  }

  /** Posts a snapshot of the author's own session or template. Opt-in per post; nothing is shared automatically. */
  async share(userId: string, groupId: string, input: ShareWorkoutRequest): Promise<SharedWorkoutDto> {
    await this.member(userId, groupId);
    if (Boolean(input.workoutLogId) === Boolean(input.templateId)) throw new BadRequestException('Share one session or one template.');
    const summary = input.workoutLogId ? await this.sessionSummary(userId, input.workoutLogId) : await this.templateSummary(userId, input.templateId!);
    const dupe = await this.prisma.sharedWorkout.findFirst({ where: { groupId, userId, ...(input.workoutLogId ? { workoutLogId: input.workoutLogId } : { templateId: input.templateId! }) } });
    if (dupe) throw new ConflictException('You already shared this to the group.');
    const row = await this.prisma.sharedWorkout.create({
      data: {
        groupId,
        userId,
        kind: input.workoutLogId ? 'SESSION' : 'TEMPLATE',
        workoutLogId: input.workoutLogId || null,
        templateId: input.templateId || null,
        caption: input.caption || null,
        summary: summary as unknown as Prisma.InputJsonValue,
      },
    });
    return (await this.feed(userId, groupId)).find((s) => s.id === row.id)!;
  }

  private async sessionSummary(userId: string, logId: string): Promise<SharedWorkoutSummary> {
    const log = await this.prisma.workoutLog.findFirst({
      where: { id: logId, clientId: userId },
      include: { workout: { select: { name: true } }, exerciseLogs: { orderBy: { order: 'asc' }, include: { exercise: { select: { name: true } }, sets: true } } },
    });
    if (!log) throw new NotFoundException('Session not found');
    const setIds = log.exerciseLogs.flatMap((e) => e.sets.map((s) => s.id));
    const prCount = await this.prisma.personalRecord.count({ where: { clientId: userId, setLogId: { in: setIds } } });
    let volume = 0;
    const lifts = log.exerciseLogs.flatMap((e) => {
      const working = e.sets.filter((s) => !s.isWarmup);
      if (working.length === 0) return [];
      volume += working.reduce((v, s) => v + Number(s.weightKg) * s.reps, 0);
      const best = working.reduce((a, b) => (e1rm(Number(b.weightKg), b.reps) > e1rm(Number(a.weightKg), a.reps) ? b : a));
      return [{ exercise: e.exercise.name, weightKg: best.weightKg.toString(), reps: best.reps, rpe: best.rpe?.toString() ?? null, sets: working.length }];
    });
    const imported = /^Imported from [^:]+: (.+)$/m.exec(log.notes ?? '')?.[1];
    return { title: log.workout?.name ?? imported ?? 'Training session', performedAt: log.performedAt.toISOString(), volumeKg: volume.toFixed(1), prCount, lifts };
  }

  private async templateSummary(userId: string, templateId: string): Promise<SharedWorkoutSummary> {
    const t = await this.prisma.workoutTemplate.findFirst({
      where: { id: templateId, clientId: userId },
      include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: { select: { name: true } } } } },
    });
    if (!t) throw new NotFoundException('Template not found');
    return {
      title: t.name,
      performedAt: null,
      volumeKg: null,
      prCount: 0,
      lifts: t.exercises.map((e) => ({ exercise: e.exercise.name, weightKg: '0', reps: e.repsMax ?? e.repsMin ?? 0, rpe: null, sets: e.targetSets })),
    };
  }

  async deleteShare(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.sharedWorkout.findUnique({ where: { id: shareId } });
    if (!share) throw new NotFoundException('Post not found');
    const me = await this.member(userId, share.groupId);
    if (share.userId !== userId && me.role !== 'OWNER') throw new NotFoundException('Post not found');
    await this.prisma.sharedWorkout.delete({ where: { id: shareId } });
  }

  // ─── Leaderboard ───

  /** Opted-in members only (the viewer too), blocked users removed both ways. Ranked by 7-day average steps, then PRs. */
  async leaderboard(userId: string, groupId: string): Promise<GroupLeaderboardDto> {
    const me = await this.member(userId, groupId);
    const blocked = await this.blockedIds(userId);
    const sharing = (
      await this.prisma.trainingGroupMember.findMany({ where: { groupId, shareStats: true }, include: { user: USER_NAME } })
    ).filter((m) => !blocked.has(m.userId));
    const ids = sharing.map((m) => m.userId);
    const since = new Date(Date.now() - SOCIAL_LIMITS.leaderboardDays * DAY_MS);
    const [steps, prs] = await Promise.all([
      this.health.stepStats(ids),
      ids.length ? this.prisma.personalRecord.groupBy({ by: ['clientId'], where: { clientId: { in: ids }, achievedAt: { gte: since } }, _count: { _all: true } }) : Promise.resolve([]),
    ]);
    const prOf = new Map(prs.map((p) => [p.clientId, p._count._all]));
    const rows = sharing
      .map((m) => ({
        userId: m.userId,
        name: nameOf(m.user),
        isYou: m.userId === userId,
        avg7Steps: steps.get(m.userId)?.avg7Steps ?? 0,
        streakDays: steps.get(m.userId)?.streakDays ?? 0,
        prs7d: prOf.get(m.userId) ?? 0,
      }))
      .sort((a, b) => b.avg7Steps - a.avg7Steps || b.prs7d - a.prs7d || a.name.localeCompare(b.name))
      .map((r, i) => ({ rank: i + 1, ...r }));
    return { groupId, rows, viewerSharing: me.shareStats };
  }

  // ─── Friends (only between people who share a group) ───

  async friends(userId: string): Promise<FriendDto[]> {
    const rows = await this.prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: USER_NAME, addressee: USER_NAME },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((f) => {
      const other = f.requesterId === userId ? f.addressee : f.requester;
      return { id: f.id, userId: other.id, name: nameOf(other), status: f.status, outgoing: f.requesterId === userId, createdAt: f.createdAt.toISOString() };
    });
  }

  /** A request to someone who already asked you accepts theirs. Blocked either way or no shared group: 404. */
  async requestFriend(userId: string, targetId: string): Promise<void> {
    if (targetId === userId) throw new BadRequestException('You cannot add yourself.');
    const blocked = await this.blockedIds(userId);
    if (blocked.has(targetId) || !(await this.sharesGroup(userId, targetId))) throw new NotFoundException('User not found');
    const reverse = await this.prisma.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: targetId, addresseeId: userId } } });
    if (reverse) {
      if (reverse.status === 'PENDING') await this.prisma.friendship.update({ where: { id: reverse.id }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
      return;
    }
    await this.prisma.friendship.upsert({
      where: { requesterId_addresseeId: { requesterId: userId, addresseeId: targetId } },
      create: { requesterId: userId, addresseeId: targetId },
      update: {},
    });
  }

  async acceptFriend(userId: string, friendshipId: string): Promise<void> {
    const { count } = await this.prisma.friendship.updateMany({ where: { id: friendshipId, addresseeId: userId, status: 'PENDING' }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
    if (!count) throw new NotFoundException('Request not found');
  }

  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    const { count } = await this.prisma.friendship.deleteMany({ where: { id: friendshipId, OR: [{ requesterId: userId }, { addresseeId: userId }] } });
    if (!count) throw new NotFoundException('Friend not found');
  }

  // ─── Blocks and reports ───

  /** Blocking also ends any friendship or pending request between the two. */
  async block(userId: string, targetId: string): Promise<void> {
    if (targetId === userId) throw new BadRequestException('You cannot block yourself.');
    if (!(await this.knows(userId, targetId))) throw new NotFoundException('User not found');
    await this.prisma.$transaction([
      this.prisma.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } }, create: { blockerId: userId, blockedId: targetId }, update: {} }),
      this.prisma.friendship.deleteMany({ where: { OR: [{ requesterId: userId, addresseeId: targetId }, { requesterId: targetId, addresseeId: userId }] } }),
    ]);
  }

  async unblock(userId: string, targetId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
  }

  /** Only something the reporter can see may be reported; anything else is 404. */
  async report(userId: string, input: CreateReportRequest): Promise<void> {
    if (input.targetType === 'GROUP') await this.member(userId, input.targetId);
    else if (input.targetType === 'SHARED_WORKOUT') {
      const share = await this.prisma.sharedWorkout.findUnique({ where: { id: input.targetId }, select: { groupId: true } });
      if (!share) throw new NotFoundException('Post not found');
      await this.member(userId, share.groupId);
    } else {
      if (input.targetId === userId || !(await this.knows(userId, input.targetId))) throw new NotFoundException('User not found');
    }
    await this.prisma.contentReport.create({ data: { reporterId: userId, targetType: input.targetType, targetId: input.targetId, reason: input.reason, details: input.details || null } });
  }
}
