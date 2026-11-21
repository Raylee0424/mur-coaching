import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CoachClientStatus } from '@prisma/client';

export class RosterQueryDto {
  @IsOptional()
  @IsIn(Object.values(CoachClientStatus))
  status?: CoachClientStatus;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  needsAttention?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class OverviewQueryDto {
  /** `YYYY-MM`; defaults to the current month. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' })
  month?: string;
}
