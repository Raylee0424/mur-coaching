import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { CHECK_IN_LIMITS as L, CheckInCadence, CheckInQuestionKind } from '@coaching/shared';
import type { CheckInQuestionInput, CreateCheckInScheduleRequest, ReviewCheckInRequest, SaveCheckInTemplateRequest, SubmitCheckInRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Dates use YYYY-MM-DD.';

export class CheckInQuestionDto implements CheckInQuestionInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxPrompt)
  prompt!: string;

  @IsIn(Object.values(CheckInQuestionKind))
  kind!: CheckInQuestionKind;

  @IsBoolean()
  required!: boolean;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxUnit)
  unit?: string | null;
}

export class SaveCheckInTemplateDto implements SaveCheckInTemplateRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxTitle)
  title!: string;

  @IsArray() @ArrayMaxSize(L.maxQuestions) @ValidateNested({ each: true }) @Type(() => CheckInQuestionDto)
  questions!: CheckInQuestionDto[];
}

export class CreateCheckInScheduleDto implements CreateCheckInScheduleRequest {
  @IsString() @MaxLength(40)
  templateId!: string;

  @IsString() @MaxLength(40)
  clientId!: string;

  @IsIn(Object.values(CheckInCadence))
  cadence!: CheckInCadence;

  @IsOptional() @IsInt() @Min(0) @Max(6)
  weekday?: number;

  @IsOptional() @Matches(DATE, { message: DATE_MESSAGE })
  dueDate?: string;
}

export class CheckInAnswerDto {
  @IsString() @MaxLength(40)
  questionId!: string;

  @IsOptional() @IsString() @MaxLength(L.maxText)
  value!: string | null;
}

export class SubmitCheckInDto implements SubmitCheckInRequest {
  @Matches(DATE, { message: DATE_MESSAGE })
  periodDate!: string;

  @IsArray() @ArrayMaxSize(L.maxQuestions) @ValidateNested({ each: true }) @Type(() => CheckInAnswerDto)
  answers!: CheckInAnswerDto[];
}

export class ReviewCheckInDto implements ReviewCheckInRequest {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxReply)
  reply?: string;

  @IsBoolean()
  reviewed!: boolean;
}
