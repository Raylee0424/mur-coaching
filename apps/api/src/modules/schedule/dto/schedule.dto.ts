import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { ScheduledStatus } from '@coaching/shared';
import type { UpdateScheduledWorkoutRequest } from '@coaching/shared';

export class UpdateScheduledWorkoutDto implements UpdateScheduledWorkoutRequest {
  @IsOptional() @IsDateString({ strict: true })
  date?: string;

  @IsOptional() @IsIn([ScheduledStatus.PLANNED, ScheduledStatus.SKIPPED])
  status?: typeof ScheduledStatus.PLANNED | typeof ScheduledStatus.SKIPPED;
}
