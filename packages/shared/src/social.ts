import type { IsoDateString } from './common';

// ─── Training groups, friends, shared workouts, blocks and reports ───

export const GroupRole = { OWNER: 'OWNER', MEMBER: 'MEMBER' } as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

export const SharedWorkoutKind = { SESSION: 'SESSION', TEMPLATE: 'TEMPLATE' } as const;
export type SharedWorkoutKind = (typeof SharedWorkoutKind)[keyof typeof SharedWorkoutKind];

export const FriendshipStatus = { PENDING: 'PENDING', ACCEPTED: 'ACCEPTED' } as const;
export type FriendshipStatus = (typeof FriendshipStatus)[keyof typeof FriendshipStatus];

export const ReportTarget = { USER: 'USER', GROUP: 'GROUP', SHARED_WORKOUT: 'SHARED_WORKOUT' } as const;
export type ReportTarget = (typeof ReportTarget)[keyof typeof ReportTarget];

export const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'IMPERSONATION', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment or bullying',
  INAPPROPRIATE: 'Inappropriate content',
  IMPERSONATION: 'Impersonation',
  OTHER: 'Something else',
};

export const SOCIAL_LIMITS = {
  maxName: 60,
  maxDescription: 280,
  maxCaption: 280,
  maxReportDetails: 500,
  maxGroupsPerUser: 20,
  maxMembers: 100,
  inviteCodeLength: 8,
  feedPage: 30,
  leaderboardDays: 7,
} as const;

export interface GroupSummaryDto {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  role: GroupRole;
  /** The viewer's opt-in to step and PR leaderboards in this group. */
  shareStats: boolean;
  joinedAt: IsoDateString;
}

export interface DiscoverGroupDto {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  inviteCode: string;
}

export interface GroupMemberDto {
  userId: string;
  name: string;
  role: GroupRole;
  isYou: boolean;
  joinedAt: IsoDateString;
}

export interface GroupDetailDto extends GroupSummaryDto {
  /** Members only. */
  inviteCode: string;
  members: GroupMemberDto[];
}

export interface SharedSetSummary {
  exercise: string;
  /** Best working set, e.g. weight and reps. */
  weightKg: string;
  reps: number;
  rpe: string | null;
  sets: number;
}

export interface SharedWorkoutSummary {
  title: string;
  performedAt: IsoDateString | null;
  volumeKg: string | null;
  prCount: number;
  lifts: SharedSetSummary[];
}

export interface SharedWorkoutDto {
  id: string;
  kind: SharedWorkoutKind;
  author: { userId: string; name: string; isYou: boolean };
  caption: string | null;
  summary: SharedWorkoutSummary;
  createdAt: IsoDateString;
  canDelete: boolean;
}

export interface LeaderboardRowDto {
  rank: number;
  userId: string;
  name: string;
  isYou: boolean;
  avg7Steps: number;
  streakDays: number;
  prs7d: number;
}

export interface GroupLeaderboardDto {
  groupId: string;
  /** Opted-in members only, blocked users removed in both directions. Sorted by 7-day average steps. */
  rows: LeaderboardRowDto[];
  viewerSharing: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string | null;
  isPrivate?: boolean;
}

export interface JoinGroupRequest {
  inviteCode: string;
}

export interface UpdateMembershipRequest {
  shareStats: boolean;
}

export interface ShareWorkoutRequest {
  workoutLogId?: string | null;
  templateId?: string | null;
  caption?: string | null;
}

export interface FriendDto {
  id: string;
  userId: string;
  name: string;
  status: FriendshipStatus;
  /** PENDING only: true when the viewer sent the request. */
  outgoing: boolean;
  createdAt: IsoDateString;
}

export interface BlockedUserDto {
  userId: string;
  name: string;
  createdAt: IsoDateString;
}

export interface CreateReportRequest {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string | null;
}

export interface SocialOverviewDto {
  groups: GroupSummaryDto[];
  discover: DiscoverGroupDto[];
  friends: FriendDto[];
  blocked: BlockedUserDto[];
}

// ─── Moderation (platform staff from MODERATOR_EMAILS) ───

export const ReportStatus = { OPEN: 'OPEN', REVIEWED: 'REVIEWED' } as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const MODERATION_PAGE_SIZE = 30;

export interface ModerationPersonDto {
  userId: string;
  name: string;
}

/** What the report points at. `null` on the report when the target no longer exists. */
export type ModerationPreviewDto =
  | { type: 'USER'; name: string }
  | { type: 'GROUP'; name: string; memberCount: number }
  | {
      type: 'SHARED_WORKOUT';
      kind: SharedWorkoutKind;
      author: ModerationPersonDto;
      groupName: string;
      title: string;
      liftCount: number;
      /** First three exercise names of the snapshot. */
      topLifts: string[];
      volumeKg: string | null;
      caption: string | null;
      postedAt: IsoDateString;
    };

export interface ModerationReportDto {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  /** A `ReportReason` for every report made through the app; stored as text, so treat unknown values as "Something else". */
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: IsoDateString;
  reporter: ModerationPersonDto;
  preview: ModerationPreviewDto | null;
  /** OPEN reports on the same target (this one included when it is OPEN). */
  openReportsOnTarget: number;
}

export interface ModerationReportPage {
  items: ModerationReportDto[];
  /** Pass back as `cursor` for the next (older) page. Null on the last page. */
  nextCursor: string | null;
  counts: Record<ReportStatus, number>;
}

export interface ModerationReportsQuery {
  status?: ReportStatus;
  cursor?: string;
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
}
