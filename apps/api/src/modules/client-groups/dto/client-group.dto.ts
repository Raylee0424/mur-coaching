import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsString, MaxLength, MinLength } from 'class-validator';
import { CLIENT_GROUP_LIMITS as L } from '@coaching/shared';
import type { GroupAssignRequest, SaveClientGroupRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class SaveClientGroupDto implements SaveClientGroupRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxName)
  name!: string;

  @IsArray() @ArrayMaxSize(L.maxMembers) @IsString({ each: true }) @MaxLength(40, { each: true })
  memberIds!: string[];
}

export class GroupAssignDto implements GroupAssignRequest {
  @IsString() @MaxLength(40)
  programId!: string;

  @IsDateString({ strict: true })
  startDate!: string;
}
