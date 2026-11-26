import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportStatus } from '@coaching/shared';
import type { ModerationReportsQuery, UpdateReportStatusRequest } from '@coaching/shared';

export class ListReportsQueryDto implements ModerationReportsQuery {
  @IsOptional() @IsIn(Object.values(ReportStatus)) status?: ReportStatus;
  @IsOptional() @IsString() @MaxLength(200) cursor?: string;
}

export class UpdateReportStatusDto implements UpdateReportStatusRequest {
  @IsIn(Object.values(ReportStatus)) status!: ReportStatus;
}
