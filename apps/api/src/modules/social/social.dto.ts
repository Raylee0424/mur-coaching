import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { REPORT_REASONS, ReportTarget, SOCIAL_LIMITS as S } from '@coaching/shared';
import type { CreateGroupRequest, CreateReportRequest, JoinGroupRequest, ReportReason, ShareWorkoutRequest, UpdateMembershipRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateGroupDto implements CreateGroupRequest {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(S.maxName) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(S.maxDescription) description?: string | null;
  @IsOptional() @IsBoolean() isPrivate?: boolean;
}

export class JoinGroupDto implements JoinGroupRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{6,12}$/, { message: 'Invite codes are 8 letters and numbers.' })
  inviteCode!: string;
}

export class UpdateMembershipDto implements UpdateMembershipRequest {
  @IsBoolean() shareStats!: boolean;
}

export class ShareWorkoutDto implements ShareWorkoutRequest {
  @IsOptional() @IsString() @MaxLength(40) workoutLogId?: string | null;
  @IsOptional() @IsString() @MaxLength(40) templateId?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(S.maxCaption) caption?: string | null;
}

export class FriendRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(40) userId!: string;
}

export class BlockDto {
  @IsString() @IsNotEmpty() @MaxLength(40) userId!: string;
}

export class CreateReportDto implements CreateReportRequest {
  @IsIn(Object.values(ReportTarget)) targetType!: ReportTarget;
  @IsString() @IsNotEmpty() @MaxLength(40) targetId!: string;
  @IsIn(REPORT_REASONS) reason!: ReportReason;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(S.maxReportDetails) details?: string | null;
}
