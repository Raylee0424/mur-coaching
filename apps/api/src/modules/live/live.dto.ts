import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { LIVE_LIMITS as L, LiveMode } from '@coaching/shared';
import type { LogLiveSetRequest, StartLiveSessionRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class StartLiveSessionDto implements StartLiveSessionRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxTitle)
  title!: string;

  @IsIn(Object.values(LiveMode))
  mode!: LiveMode;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(L.maxParticipants) @IsString({ each: true })
  clientIds!: string[];
}

export class LogLiveSetDto implements LogLiveSetRequest {
  @IsUUID()
  requestId!: string;

  @IsString()
  clientId!: string;

  @IsString()
  exerciseId!: string;

  @Matches(/^\d{1,3}(\.\d{1,2})?$/, { message: 'Weight is a number in kg with up to 2 decimals.' })
  weightKg!: string;

  @IsInt() @Min(1) @Max(L.maxReps)
  reps!: number;

  @IsOptional() @Matches(/^(10|[1-9])(\.5)?$/, { message: 'RPE is 1–10 in half steps.' })
  rpe?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxCue)
  cue?: string | null;
}
