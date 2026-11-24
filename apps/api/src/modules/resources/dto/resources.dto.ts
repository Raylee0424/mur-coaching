import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { RESOURCE_LIMITS as L } from '@coaching/shared';
import type { CreateResourceRequest, ShareResourceRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateResourceDto implements CreateResourceRequest {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxTitle)
  title!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxDescription)
  description?: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(L.maxFileName)
  fileName!: string;

  @Transform(trim) @IsString() @MaxLength(100)
  contentType!: string;

  @IsInt() @Min(1) @Max(L.maxBytes)
  sizeBytes!: number;
}

export class ShareResourceDto implements ShareResourceRequest {
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true })
  clientIds!: string[];
}
