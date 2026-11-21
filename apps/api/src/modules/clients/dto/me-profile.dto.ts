import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { BaselineInput } from '@coaching/shared';

export class BaselineInputDto implements BaselineInput {
  @IsString()
  exerciseId!: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(WORKOUT_LOG_LIMITS.maxWeightKg)
  weightKg!: number | null;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  reps!: number | null;

  @IsBoolean()
  unknown!: boolean;
}

export class BaselinesDto {
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => BaselineInputDto)
  baselines!: BaselineInputDto[];
}
