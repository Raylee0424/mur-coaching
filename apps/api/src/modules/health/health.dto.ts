import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, Matches, Max, Min, ValidateNested } from 'class-validator';
import { HEALTH_LIMITS as H, HealthSource } from '@coaching/shared';
import type { HealthMetricInput, SaveStepGoalRequest, SyncHealthMetricsRequest } from '@coaching/shared';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class HealthMetricDto implements HealthMetricInput {
  @Matches(DATE, { message: 'Dates use YYYY-MM-DD.' }) date!: string;
  @IsOptional() @IsInt() @Min(0) @Max(H.maxSteps) steps?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(H.maxSleepMinutes) sleepMinutes?: number | null;
  @IsOptional() @IsInt() @Min(H.minHrvMs) @Max(H.maxHrvMs) hrvMs?: number | null;
  @IsOptional() @IsInt() @Min(H.minRestingHr) @Max(H.maxRestingHr) restingHr?: number | null;
}

export class SyncHealthMetricsDto implements SyncHealthMetricsRequest {
  @IsIn(Object.values(HealthSource)) source!: HealthSource;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(H.maxBatch) @ValidateNested({ each: true }) @Type(() => HealthMetricDto) entries!: HealthMetricDto[];
}

export class SaveStepGoalDto implements SaveStepGoalRequest {
  @IsInt() @Min(H.minGoal) @Max(H.maxGoal) dailySteps!: number;
}
