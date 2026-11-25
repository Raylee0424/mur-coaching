import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { IMPORT_LIMITS, ImportSource, WeightUnit } from '@coaching/shared';
import type { ImportCommitRequest, ImportMapping, ImportPreviewRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class ImportPreviewDto implements ImportPreviewRequest {
  @IsIn(Object.values(ImportSource)) source!: ImportSource;
  /** Byte size is checked again in the service (MaxLength counts characters). */
  @IsString() @MaxLength(IMPORT_LIMITS.maxCsvBytes) csv!: string;
  @IsOptional() @IsIn(Object.values(WeightUnit)) weightUnit?: WeightUnit;
}

export class ImportMappingDto implements ImportMapping {
  @Transform(trim) @IsString() @MaxLength(120) sourceName!: string;
  @IsOptional() @IsString() @MaxLength(40) exerciseId!: string | null;
}

export class ImportCommitDto extends ImportPreviewDto implements ImportCommitRequest {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) fileName?: string | null;
  @IsArray() @ArrayMaxSize(IMPORT_LIMITS.maxMappings) @ValidateNested({ each: true }) @Type(() => ImportMappingDto) mappings!: ImportMappingDto[];
}
