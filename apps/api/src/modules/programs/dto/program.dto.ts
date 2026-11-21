import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
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
import { PROGRAM_LIMITS as L } from '@coaching/shared';
import type { CreateAssignmentRequest, ProgramTreeInput, WorkoutExerciseInput, WorkoutInput } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class WorkoutExerciseInputDto implements WorkoutExerciseInput {
  @IsOptional() @IsString()
  id?: string;

  @IsString()
  exerciseId!: string;

  @IsInt() @Min(1) @Max(L.maxSets)
  targetSets!: number;

  @IsInt() @Min(1) @Max(L.maxReps)
  targetRepsMin!: number;

  @IsInt() @Min(1) @Max(L.maxReps)
  targetRepsMax!: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(1) @Max(10)
  targetRpe?: number | null;

  @IsOptional() @IsInt() @Min(0) @Max(L.maxRestSeconds)
  restSeconds?: number | null;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string | null;
}

export class WorkoutInputDto implements WorkoutInput {
  @IsOptional() @IsString()
  id?: string;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  weekNumber!: number;

  @IsInt() @Min(1) @Max(7)
  dayNumber!: number;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(60)
  name!: string;

  @IsArray() @ArrayMaxSize(L.maxExercisesPerWorkout) @ValidateNested({ each: true }) @Type(() => WorkoutExerciseInputDto)
  exercises!: WorkoutExerciseInputDto[];
}

export class ProgramTreeDto implements ProgramTreeInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  description?: string | null;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  durationWeeks!: number;

  @IsArray() @ArrayMaxSize(L.maxWorkouts) @ValidateNested({ each: true }) @Type(() => WorkoutInputDto)
  workouts!: WorkoutInputDto[];
}

export class CreateAssignmentDto implements CreateAssignmentRequest {
  @IsString()
  programId!: string;

  @IsDateString({ strict: true })
  startDate!: string;
}
