import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AI_LIMITS, CONNECTOR_LIMITS, ConnectorScope, Equipment, MuscleGroup, WorkoutGoal } from '@coaching/shared';
import type { AskCoachRequest, CreateConnectorRequest, GenerateWorkoutRequest, VoiceParseRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class AskCoachDto implements AskCoachRequest {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(AI_LIMITS.maxQuestion) question!: string;
  @IsOptional() @IsString() @MaxLength(40) conversationId?: string;
}

export class GenerateWorkoutDto implements GenerateWorkoutRequest {
  @IsIn(Object.values(WorkoutGoal)) goal!: WorkoutGoal;
  @IsInt() @Min(AI_LIMITS.minDurationMin) @Max(AI_LIMITS.maxDurationMin) durationMin!: number;
  @IsArray() @ArrayMaxSize(6) @ArrayUnique() @IsIn(Object.values(MuscleGroup), { each: true }) targetMuscles!: MuscleGroup[];
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(Object.values(Equipment), { each: true }) equipment!: Equipment[];
}

export class VoiceParseDto implements VoiceParseRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(AI_LIMITS.maxTranscript) transcript!: string;
}

export class CreateConnectorDto implements CreateConnectorRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(CONNECTOR_LIMITS.maxName) name!: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(Object.values(ConnectorScope), { each: true }) scopes!: ConnectorScope[];
  @IsIn(CONNECTOR_LIMITS.expiryDays as number[]) expiresInDays!: number;
}
