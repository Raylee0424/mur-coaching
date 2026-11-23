import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { CreateExerciseNoteRequest, UpdateExerciseNoteRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateExerciseNoteDto implements CreateExerciseNoteRequest {
  @IsString() @MaxLength(40)
  exerciseId!: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(1000)
  body!: string;
}

export class UpdateExerciseNoteDto implements UpdateExerciseNoteRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(1000)
  body!: string;
}
