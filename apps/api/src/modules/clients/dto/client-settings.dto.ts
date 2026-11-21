import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ENGINE_LIMITS, Experience, WeightUnit } from '@coaching/shared';
import type { ClientEngineOverridesDto, ClientProfileDto, UpdateClientSettingsRequest } from '@coaching/shared';

const L = ENGINE_LIMITS;
const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class ClientProfileInputDto implements Partial<ClientProfileDto> {
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true })
  goals?: string[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  goalNote?: string | null;

  @IsOptional() @IsIn(Object.values(Experience))
  experience?: Experience | null;

  @IsOptional() @IsInt() @Min(1) @Max(7)
  daysPerWeek?: number | null;

  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  trainingDays?: number[];

  @IsOptional() @IsInt() @Min(15) @Max(240)
  sessionLengthMin?: number | null;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(40, { each: true })
  limitations?: string[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  limitationsNote?: string | null;
}

/** Omitted key = unchanged; null = clear the override. */
export class ClientOverridesInputDto implements Partial<ClientEngineOverridesDto> {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(L.loadIncrementKg.min) @Max(L.loadIncrementKg.max)
  loadIncrementKg?: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(L.rpeCap.min) @Max(L.rpeCap.max)
  rpeCap?: number | null;

  @IsOptional() @IsInt() @Min(L.reps.min) @Max(L.reps.max)
  repsMin?: number | null;

  @IsOptional() @IsInt() @Min(L.reps.min) @Max(L.reps.max)
  repsMax?: number | null;

  @IsOptional() @IsInt() @Min(L.deloadPercent.min) @Max(L.deloadPercent.max)
  deloadPercent?: number | null;

  @IsOptional() @IsInt() @Min(L.sessionsAnalyzed.min) @Max(L.sessionsAnalyzed.max)
  sessionsAnalyzed?: number | null;
}

export class UpdateClientSettingsDto implements UpdateClientSettingsRequest {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  name?: string;

  @IsOptional() @IsIn(Object.values(WeightUnit))
  weightUnit?: WeightUnit;

  @IsOptional() @ValidateNested() @Type(() => ClientProfileInputDto)
  profile?: ClientProfileInputDto;

  @IsOptional() @ValidateNested() @Type(() => ClientOverridesInputDto)
  overrides?: ClientOverridesInputDto;

  @IsOptional() @IsBoolean()
  autoApprove?: boolean;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(L.autoApproveMaxKg.min) @Max(L.autoApproveMaxKg.max)
  autoApproveMaxKg?: number | null;
}
