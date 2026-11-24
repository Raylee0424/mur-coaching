import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ROADMAP_LIMITS as L } from '@coaching/shared';
import type { RoadmapEventInput, RoadmapGoalInput, RoadmapInput, RoadmapPhaseInput } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Dates use YYYY-MM-DD.';

export class RoadmapPhaseDto implements RoadmapPhaseInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxName)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxFocus)
  focus?: string | null;

  @Matches(DATE, { message: DATE_MESSAGE })
  startDate!: string;

  @Matches(DATE, { message: DATE_MESSAGE })
  endDate!: string;

  @IsOptional() @IsString()
  programId?: string | null;
}

export class RoadmapGoalDto implements RoadmapGoalInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxName)
  label!: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxUnit)
  unit!: string;

  @Transform(trim) @IsString() @MaxLength(12)
  targetValue!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(12)
  currentValue?: string | null;

  @IsOptional() @Matches(DATE, { message: DATE_MESSAGE })
  dueDate?: string | null;
}

export class RoadmapEventDto implements RoadmapEventInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxEventName)
  name!: string;

  @Matches(DATE, { message: DATE_MESSAGE })
  date!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxLocation)
  location?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxEventNotes)
  notes?: string | null;
}

export class SaveRoadmapDto implements RoadmapInput {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxTitle)
  title!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxNotes)
  notes?: string | null;

  @Matches(DATE, { message: DATE_MESSAGE })
  startDate!: string;

  @Matches(DATE, { message: DATE_MESSAGE })
  endDate!: string;

  @IsArray() @ArrayMaxSize(L.maxPhases) @ValidateNested({ each: true }) @Type(() => RoadmapPhaseDto)
  phases!: RoadmapPhaseDto[];

  @IsArray() @ArrayMaxSize(L.maxGoals) @ValidateNested({ each: true }) @Type(() => RoadmapGoalDto)
  goals!: RoadmapGoalDto[];

  @IsArray() @ArrayMaxSize(L.maxEvents) @ValidateNested({ each: true }) @Type(() => RoadmapEventDto)
  events!: RoadmapEventDto[];
}
