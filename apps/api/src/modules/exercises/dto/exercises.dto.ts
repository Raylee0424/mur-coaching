import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ENGINE_LIMITS } from '@coaching/shared';
import { MuscleGroup } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateExerciseDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsEnum(MuscleGroup)
  muscleGroup!: MuscleGroup;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  equipment?: string;

  /** Smallest load jump for the progression engine. Defaults to 2.5. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(25)
  loadIncrementKg?: number;

  /** Exercise-level RPE cap for the engine; null clears it. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(ENGINE_LIMITS.rpeCap.min)
  @Max(ENGINE_LIMITS.rpeCap.max)
  rpeCap?: number | null;

  /** Rep range for the engine; both bounds together or both null. */
  @IsOptional()
  @IsInt()
  @Min(ENGINE_LIMITS.reps.min)
  @Max(ENGINE_LIMITS.reps.max)
  repsMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(ENGINE_LIMITS.reps.min)
  @Max(ENGINE_LIMITS.reps.max)
  repsMax?: number | null;
}

export class UpdateExerciseDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  equipment?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(25)
  loadIncrementKg?: number;

  /** Exercise-level RPE cap for the engine; null clears it. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(ENGINE_LIMITS.rpeCap.min)
  @Max(ENGINE_LIMITS.rpeCap.max)
  rpeCap?: number | null;

  /** Rep range for the engine; both bounds together or both null. */
  @IsOptional()
  @IsInt()
  @Min(ENGINE_LIMITS.reps.min)
  @Max(ENGINE_LIMITS.reps.max)
  repsMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(ENGINE_LIMITS.reps.min)
  @Max(ENGINE_LIMITS.reps.max)
  repsMax?: number | null;
}

export class ListExercisesQuery {
  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @Type(() => String)
  @IsString()
  @MaxLength(80)
  q?: string;
}
