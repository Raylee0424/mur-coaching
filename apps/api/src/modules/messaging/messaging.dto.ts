import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MESSAGE_LIMITS } from '@coaching/shared';
import type { SendMessageRequest, ThreadQuery } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class SendMessageDto implements SendMessageRequest {
  @Transform(trim) @IsString() @MinLength(1, { message: 'Write a message first.' }) @MaxLength(MESSAGE_LIMITS.maxBody)
  body!: string;
}

export class ThreadQueryDto implements ThreadQuery {
  @IsOptional() @IsString() @MaxLength(40)
  before?: string;

  @IsOptional() @IsString() @MaxLength(40)
  after?: string;
}
