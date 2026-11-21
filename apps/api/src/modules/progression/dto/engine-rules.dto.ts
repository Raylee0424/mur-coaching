import { Type } from 'class-transformer';
import { IsDefined, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ENGINE_LIMITS } from '@coaching/shared';
import type { EnginePreviewRequest, UpdateCoachEngineRulesRequest } from '@coaching/shared';

const L = ENGINE_LIMITS;

/** Full replacement of the coach's rules. null = use the engine default for that key. */
export class EngineRulesDto implements UpdateCoachEngineRulesRequest {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(L.rpeCap.min) @Max(L.rpeCap.max)
  rpeCap!: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(L.loadMarginRpe.min) @Max(L.loadMarginRpe.max)
  loadMarginRpe!: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(L.highRpe.min) @Max(L.highRpe.max)
  highRpe!: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(L.plateauTolerancePct.min) @Max(L.plateauTolerancePct.max)
  plateauTolerancePct!: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(L.declineThresholdPct.min) @Max(L.declineThresholdPct.max)
  declineThresholdPct!: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 0 }) @Min(L.deloadPercent.min) @Max(L.deloadPercent.max)
  deloadPercent!: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 0 }) @Min(L.sessionsAnalyzed.min) @Max(L.sessionsAnalyzed.max)
  sessionsAnalyzed!: number | null;
}

export class EnginePreviewDto implements EnginePreviewRequest {
  @IsString()
  clientId!: string;

  @IsString()
  exerciseId!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => EngineRulesDto)
  rules!: EngineRulesDto;
}
