import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { LimitationSeverity, LimitationTarget, MuscleGroup } from '@coaching/shared';
import type { CreateLimitationRequest, UpdateLimitationRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateLimitationDto implements CreateLimitationRequest {
  @IsIn(Object.values(LimitationTarget))
  target!: LimitationTarget;

  @ValidateIf((o: CreateLimitationDto) => o.target === LimitationTarget.MUSCLE) @IsIn(Object.values(MuscleGroup))
  muscleGroup?: MuscleGroup;

  @ValidateIf((o: CreateLimitationDto) => o.target === LimitationTarget.EXERCISE) @IsString() @MaxLength(40)
  exerciseId?: string;

  @IsIn(Object.values(LimitationSeverity))
  severity!: LimitationSeverity;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  note?: string | null;

  @IsOptional() @Matches(DATE)
  startsOn?: string;

  @IsOptional() @ValidateIf((_, v) => v !== null) @Matches(DATE)
  endsOn?: string | null;
}

export class UpdateLimitationDto implements UpdateLimitationRequest {
  @IsOptional() @IsIn(Object.values(LimitationSeverity))
  severity?: LimitationSeverity;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  note?: string | null;

  @IsOptional() @Matches(DATE)
  startsOn?: string;

  @IsOptional() @ValidateIf((_, v) => v !== null) @Matches(DATE)
  endsOn?: string | null;
}
