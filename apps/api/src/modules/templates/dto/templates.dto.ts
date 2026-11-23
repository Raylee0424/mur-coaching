import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { TEMPLATE_LIMITS, TEMPO_PATTERN } from '@coaching/shared';
import type { TemplateExerciseInput } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class TemplateFolderDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(TEMPLATE_LIMITS.maxNameLength)
  name!: string;
}

export class TemplateExerciseDto implements TemplateExerciseInput {
  @IsString() @MaxLength(40)
  exerciseId!: string;

  @IsInt() @Min(1) @Max(TEMPLATE_LIMITS.maxSets)
  targetSets!: number;

  @IsOptional() @IsInt() @Min(1) @Max(1000)
  repsMin?: number;

  @IsOptional() @IsInt() @Min(1) @Max(1000)
  repsMax?: number;

  @IsOptional() @IsInt() @Min(0) @Max(3600)
  restSeconds?: number;

  @IsOptional() @Matches(TEMPO_PATTERN, { message: 'tempo must look like 3-1-1-0' })
  tempo?: string;
}

export class CreateWorkoutTemplateDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(TEMPLATE_LIMITS.maxNameLength)
  name!: string;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(40)
  folderId?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  notes?: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(TEMPLATE_LIMITS.maxExercises) @ValidateNested({ each: true }) @Type(() => TemplateExerciseDto)
  exercises!: TemplateExerciseDto[];
}

export class UpdateWorkoutTemplateDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(TEMPLATE_LIMITS.maxNameLength)
  name?: string;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(40)
  folderId?: string | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @Transform(trim) @IsString() @MaxLength(1000)
  notes?: string | null;

  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(TEMPLATE_LIMITS.maxExercises) @ValidateNested({ each: true }) @Type(() => TemplateExerciseDto)
  exercises?: TemplateExerciseDto[];
}
