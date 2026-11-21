import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RecommendationAction, RecommendationStatus } from '@coaching/shared';
import type { BulkResolveRequest, RecommendationQueueQuery, ResolvableStatus } from '@coaching/shared';
import { RESOLVABLE_STATUSES } from './update-recommendation.dto';

export class QueueQuery implements RecommendationQueueQuery {
  @IsOptional()
  @IsIn(Object.values(RecommendationStatus))
  status?: RecommendationStatus;

  @IsOptional()
  @IsIn(Object.values(RecommendationAction))
  action?: RecommendationAction;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export const BULK_MAX = 100;

export class BulkResolveDto implements BulkResolveRequest {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_MAX)
  @ArrayUnique()
  @IsString({ each: true })
  ids!: string[];

  @IsIn(RESOLVABLE_STATUSES)
  status!: ResolvableStatus;
}
