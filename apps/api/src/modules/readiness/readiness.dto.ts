import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { CYCLE_LIMITS, CYCLE_SYMPTOMS, READINESS_LIMITS as R } from '@coaching/shared';
import type { CycleSymptom, SaveCycleEntryRequest, SaveReadinessRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Dates use YYYY-MM-DD.';

export class SaveReadinessDto implements SaveReadinessRequest {
  @Matches(DATE, { message: DATE_MESSAGE }) date!: string;
  @IsInt() @Min(R.minScale) @Max(R.maxScale) sleepQuality!: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 1 }) @Min(R.minSleepHours) @Max(R.maxSleepHours) sleepHours?: number | null;
  @IsInt() @Min(R.minScale) @Max(R.maxScale) soreness!: number;
  @IsInt() @Min(R.minScale) @Max(R.maxScale) stress!: number;
  @IsInt() @Min(R.minScale) @Max(R.maxScale) motivation!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(R.maxNote) note?: string | null;
}

export class SaveCycleEntryDto implements SaveCycleEntryRequest {
  @Matches(DATE, { message: DATE_MESSAGE }) date!: string;
  @IsBoolean() periodStart!: boolean;
  @IsOptional() @IsInt() @Min(CYCLE_LIMITS.minLength) @Max(CYCLE_LIMITS.maxLength) cycleLengthDays?: number | null;
  @IsArray() @ArrayMaxSize(CYCLE_SYMPTOMS.length) @IsIn(CYCLE_SYMPTOMS, { each: true }) symptoms!: CycleSymptom[];
  @IsOptional() @Transform(trim) @IsString() @MaxLength(CYCLE_LIMITS.maxNote) note?: string | null;
}

export class CycleSharingDto {
  @IsBoolean() sharedWithCoach!: boolean;
}
