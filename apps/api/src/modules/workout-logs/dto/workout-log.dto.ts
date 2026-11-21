import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SetLogDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  reps!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  weightKg!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsBoolean()
  isWarmup?: boolean;
}

export class ExerciseLogDto {
  @IsString()
  exerciseId!: string;

  /** Prescription this fulfils. Requires workoutId on the parent log. */
  @IsOptional()
  @IsString()
  workoutExerciseId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SetLogDto)
  sets!: SetLogDto[];
}

export class CreateWorkoutLogDto {
  /** Required when workoutId is given. */
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsString()
  workoutId?: string;

  @IsDateString()
  performedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ExerciseLogDto)
  exerciseLogs!: ExerciseLogDto[];
}

/** Correction: when `exerciseLogs` is present it replaces all exercise logs of the session. */
export class UpdateWorkoutLogDto {
  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ExerciseLogDto)
  exerciseLogs?: ExerciseLogDto[];
}

export class ListWorkoutLogsQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
