import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ENGINE_LIMITS } from '@coaching/shared';
import type { CreateExerciseRequest, ExerciseMuscleDto, ListExercisesQuery as ListExercisesQueryShape } from '@coaching/shared';
import { Equipment, ExercisePosition, MovementPattern, MuscleGroup, MuscleRole, ResistanceProfile } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
/** Optional and nullable: absent = untouched, null = clear. */
const nullable = ValidateIf((_, v: unknown) => v !== undefined && v !== null);

export class ExerciseMuscleInput implements ExerciseMuscleDto {
  @IsEnum(MuscleGroup)
  muscle!: MuscleGroup;

  @IsEnum(MuscleRole)
  role!: MuscleRole;
}

export class CreateExerciseDto implements CreateExerciseRequest {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  /** Main primary muscle. */
  @IsEnum(MuscleGroup)
  muscleGroup!: MuscleGroup;

  /** Extra primary or secondary muscles. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(Object.keys(MuscleGroup).length)
  @ValidateNested({ each: true })
  @Type(() => ExerciseMuscleInput)
  muscles?: ExerciseMuscleInput[];

  @nullable
  @IsEnum(Equipment)
  equipment?: Equipment | null;

  @nullable
  @IsEnum(MovementPattern)
  pattern?: MovementPattern | null;

  @nullable
  @IsEnum(ResistanceProfile)
  profile?: ResistanceProfile | null;

  @nullable
  @IsEnum(ExercisePosition)
  position?: ExercisePosition | null;

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

export class UpdateExerciseDto implements Partial<CreateExerciseRequest> {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  /** Replaces the extra muscles; the main muscle stays PRIMARY. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(Object.keys(MuscleGroup).length)
  @ValidateNested({ each: true })
  @Type(() => ExerciseMuscleInput)
  muscles?: ExerciseMuscleInput[];

  @nullable
  @IsEnum(Equipment)
  equipment?: Equipment | null;

  @nullable
  @IsEnum(MovementPattern)
  pattern?: MovementPattern | null;

  @nullable
  @IsEnum(ResistanceProfile)
  profile?: ResistanceProfile | null;

  @nullable
  @IsEnum(ExercisePosition)
  position?: ExercisePosition | null;

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

export class ListExercisesQuery implements ListExercisesQueryShape {
  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @IsEnum(Equipment)
  equipment?: Equipment;

  @IsOptional()
  @IsEnum(ResistanceProfile)
  profile?: ResistanceProfile;

  @IsOptional()
  @Type(() => String)
  @IsString()
  @MaxLength(80)
  q?: string;
}
