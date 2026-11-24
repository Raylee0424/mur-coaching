import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { CALL_LIMITS as L, CallKind } from '@coaching/shared';
import type { AvailabilityWindow, CreateBookingRequest, SaveAvailabilityRequest, UpdateBookingRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
/** Blank strings clear the field. */
const blankToNull = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() || null : value);

export class AvailabilityWindowDto implements AvailabilityWindow {
  @IsInt() @Min(0) @Max(6)
  weekday!: number;

  @IsInt() @Min(0) @Max(1440)
  startMinute!: number;

  @IsInt() @Min(0) @Max(1440)
  endMinute!: number;
}

export class SaveAvailabilityDto implements SaveAvailabilityRequest {
  @IsString() @MaxLength(64)
  timezone!: string;

  @IsArray() @ArrayMaxSize(L.maxWindows) @ValidateNested({ each: true }) @Type(() => AvailabilityWindowDto)
  windows!: AvailabilityWindowDto[];

  @IsOptional() @Transform(blankToNull) @IsString() @MaxLength(L.maxUrl)
  meetingUrl!: string | null;
}

export class CreateBookingDto implements CreateBookingRequest {
  @IsIn(Object.values(CallKind))
  kind!: CallKind;

  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxAgenda)
  agenda?: string | null;

  @IsOptional() @IsString()
  clientId?: string;
}

export class UpdateBookingDto implements UpdateBookingRequest {
  @IsOptional() @IsISO8601({ strict: true })
  startsAt?: string;

  @IsOptional() @Transform(blankToNull) @IsString() @MaxLength(L.maxAgenda)
  agenda?: string | null;

  @IsOptional() @Transform(blankToNull) @IsString() @MaxLength(L.maxUrl)
  meetingUrl?: string | null;
}
