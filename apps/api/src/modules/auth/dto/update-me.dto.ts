import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { WeightUnit } from '@coaching/shared';
import type { UpdateMeRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class UpdateMeDto implements UpdateMeRequest {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  /** Empty string clears it. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @IsOptional()
  @IsIn(Object.values(WeightUnit))
  weightUnit?: WeightUnit;
}
