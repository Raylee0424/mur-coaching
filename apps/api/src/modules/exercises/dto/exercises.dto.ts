import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
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
