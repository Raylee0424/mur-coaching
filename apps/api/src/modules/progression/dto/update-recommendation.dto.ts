import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ENGINE_LIMITS, RecommendationStatus } from '@coaching/shared';
import type { OverrideRecommendationRequest } from '@coaching/shared';

export const RESOLVABLE_STATUSES = [RecommendationStatus.ACCEPTED, RecommendationStatus.DISMISSED] as const;
export type ResolvableStatus = (typeof RESOLVABLE_STATUSES)[number];

export class UpdateRecommendationDto {
  @IsIn(RESOLVABLE_STATUSES)
  status!: ResolvableStatus;
}

export class HistoryQuery {
  /** Max sessions in the metrics series (default 30). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class OverrideRecommendationDto implements OverrideRecommendationRequest {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  weightKg!: number;

  @IsInt()
  @Min(ENGINE_LIMITS.reps.min)
  @Max(ENGINE_LIMITS.reps.max)
  repsMin!: number;

  @IsInt()
  @Min(ENGINE_LIMITS.reps.min)
  @Max(ENGINE_LIMITS.reps.max)
  repsMax!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(10)
  rpe?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
