import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { RecommendationStatus } from '@coaching/shared';

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
