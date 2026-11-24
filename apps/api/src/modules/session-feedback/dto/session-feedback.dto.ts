import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SESSION_FEEDBACK_LIMITS as L } from '@coaching/shared';
import type { CreateSessionFeedbackRequest, UpdateSessionFeedbackRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateSessionFeedbackDto implements CreateSessionFeedbackRequest {
  @IsOptional() @IsString() @MaxLength(40)
  exerciseLogId?: string;

  @IsOptional() @IsString() @MaxLength(40)
  setLogId?: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxBody)
  body!: string;

  @IsOptional() @IsBoolean()
  carryForward?: boolean;
}

export class UpdateSessionFeedbackDto implements UpdateSessionFeedbackRequest {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxBody)
  body?: string;

  @IsOptional() @IsBoolean()
  carryForward?: boolean;
}
