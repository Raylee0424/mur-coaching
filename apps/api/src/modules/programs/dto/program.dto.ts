import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PERIODIZATION_LIMITS as PL, PROGRAM_LIMITS as L } from '@coaching/shared';
import type { CreateAssignmentRequest, MesocycleInput, MicrocycleInput, DuplicateProgramRequest, ListProgramsQuery as ListProgramsQueryShape, ProgramTreeInput, WorkoutExerciseInput, WorkoutInput } from '@coaching/shared';

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

export class MicrocycleInputDto implements MicrocycleInput {
  @IsOptional() @IsString()
  id?: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(PL.maxNameLength)
  label!: string;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  startWeek!: number;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  endWeek!: number;

  @IsBoolean()
  isDeload!: boolean;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(1) @Max(10)
  rpeMin?: number | null;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(1) @Max(10)
  rpeMax?: number | null;

  @IsOptional() @IsInt() @Min(-100) @Max(100)
  volumeDeltaPct?: number | null;
}

export class MesocycleInputDto implements MesocycleInput {
  @IsOptional() @IsString()
  id?: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(PL.maxNameLength)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(PL.maxFocusLength)
  focus?: string | null;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  startWeek!: number;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  endWeek!: number;

  @IsArray() @ArrayMaxSize(PL.maxMicrocyclesPerMesocycle) @ValidateNested({ each: true }) @Type(() => MicrocycleInputDto)
  microcycles!: MicrocycleInputDto[];
}

export class ProgramTreeDto implements ProgramTreeInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  description?: string | null;

  @IsInt() @Min(1) @Max(L.maxWeeks)
  durationWeeks!: number;

  @IsOptional() @IsBoolean()
  isTemplate?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(PL.maxMesocycles) @ValidateNested({ each: true }) @Type(() => MesocycleInputDto)
  mesocycles?: MesocycleInputDto[];

  @IsOptional() @IsArray() @ArrayMaxSize(PL.maxSports) @IsString({ each: true }) @MaxLength(80, { each: true })
  sportCategoryIds?: string[];

  @IsArray() @ArrayMaxSize(L.maxWorkouts) @ValidateNested({ each: true }) @Type(() => WorkoutInputDto)
  workouts!: WorkoutInputDto[];
}

export class CreateAssignmentDto implements CreateAssignmentRequest {
  @IsString()
  programId!: string;

  @IsDateString({ strict: true })
  startDate!: string;
}

const toBool = ({ value }: { value: unknown }): unknown => (value === 'true' ? true : value === 'false' ? false : value);

export class ListProgramsQuery implements ListProgramsQueryShape {
  @IsOptional() @Transform(toBool) @IsBoolean()
  template?: boolean;
}

export class ProgramConflictsQuery {
  /** Comma-separated client ids. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value))
  @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) @MaxLength(40, { each: true })
  clientIds?: string[];
}

export class DuplicateProgramDto implements DuplicateProgramRequest {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  name?: string;

  @IsOptional() @IsBoolean()
  asTemplate?: boolean;
}
