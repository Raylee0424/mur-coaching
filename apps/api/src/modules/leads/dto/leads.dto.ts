import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { INTAKE_LIMITS as L, IntakeQuestionType, LeadStage, SLUG_LIMITS, SLUG_RE } from '@coaching/shared';
import type {
  CreateLeadRequest, IntakeAnswerInput, IntakeQuestion, SaveIntakeFormRequest, SubmitIntakeRequest, UpdateLeadRequest,
} from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const email = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class IntakeAnswerDto implements IntakeAnswerInput {
  @IsString() @MaxLength(60)
  questionId!: string;

  @IsString() @MaxLength(L.maxAnswer + 200)
  answer!: string;
}

export class SubmitIntakeDto implements SubmitIntakeRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  name!: string;

  @Transform(email) @IsEmail() @MaxLength(200)
  email!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  goal?: string;

  @IsOptional() @IsInt() @Min(1) @Max(7)
  trainingDays?: number;

  @IsOptional() @IsInt() @Min(0) @Max(60)
  experienceYears?: number;

  @IsArray() @ArrayMaxSize(L.maxQuestions) @ValidateNested({ each: true }) @Type(() => IntakeAnswerDto)
  answers!: IntakeAnswerDto[];

  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}

export class CreateLeadDto implements CreateLeadRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100)
  name!: string;

  @Transform(email) @IsEmail() @MaxLength(200)
  email!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  phone?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  goal?: string;

  @IsOptional() @IsInt() @Min(0) @Max(L.maxMonthlyValueCents)
  monthlyValueCents?: number;
}

export class UpdateLeadDto implements UpdateLeadRequest {
  @IsOptional() @IsIn(Object.values(LeadStage))
  stage?: LeadStage;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxNotes)
  notes?: string | null;

  /** null clears the value. */
  @IsOptional() @IsInt() @Min(0) @Max(L.maxMonthlyValueCents)
  monthlyValueCents?: number | null;

  @IsOptional() @IsDateString()
  callAt?: string | null;
}

export class IntakeQuestionDto implements IntakeQuestion {
  @IsString() @MinLength(1) @MaxLength(60)
  id!: string;

  @Transform(trim) @IsString() @MaxLength(L.maxLabel)
  label!: string;

  @IsBoolean()
  required!: boolean;

  @IsIn(Object.values(IntakeQuestionType))
  type!: IntakeQuestion['type'];

  @IsOptional() @IsArray() @ArrayMaxSize(L.maxOptions) @IsString({ each: true }) @MaxLength(L.maxOption, { each: true })
  options?: string[];
}

export class SaveIntakeFormDto implements SaveIntakeFormRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString() @MinLength(SLUG_LIMITS.min) @MaxLength(SLUG_LIMITS.max)
  @Matches(SLUG_RE, { message: 'Use lowercase letters, digits and single hyphens in the link.' })
  slug!: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxHeadline)
  headline!: string;

  @Transform(trim) @IsString() @MaxLength(L.maxIntro)
  intro!: string;

  @IsBoolean()
  acceptingLeads!: boolean;

  @IsArray() @ArrayMaxSize(L.maxQuestions) @ValidateNested({ each: true }) @Type(() => IntakeQuestionDto)
  questions!: IntakeQuestionDto[];
}
