import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MEDIA_LIMITS as L, VideoSide } from '@coaching/shared';
import type { AnnotationShape, CreateAnnotationRequest, CreateReviewAudioRequest, CreateSetVideoRequest, SubmitFormReviewRequest } from '@coaching/shared';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateSetVideoDto implements CreateSetVideoRequest {
  @IsString()
  setLogId!: string;

  @IsIn(Object.values(VideoSide))
  side!: VideoSide;

  @IsIn([...L.videoTypes], { message: 'Upload an MP4, MOV or WebM video.' })
  contentType!: string;

  @IsInt() @Min(1) @Max(L.maxVideoBytes, { message: 'Videos must be 200 MB or smaller.' })
  sizeBytes!: number;
}

export class CreateReviewAudioDto implements CreateReviewAudioRequest {
  @IsIn([...L.audioTypes], { message: 'Unsupported audio format.' })
  contentType!: string;

  @IsInt() @Min(1) @Max(L.maxAudioBytes, { message: 'Narration must be 20 MB or smaller.' })
  sizeBytes!: number;
}

export class CreateAnnotationDto implements CreateAnnotationRequest {
  @IsInt() @Min(0) @Max(24 * 3_600_000)
  timestampMs!: number;

  /** Shape geometry is checked by the shared validateShapes in the service. */
  @IsArray()
  shapes!: AnnotationShape[];

  @IsOptional() @Transform(trim) @IsString() @MaxLength(L.maxNote)
  note?: string | null;
}

export class SubmitFormReviewDto implements SubmitFormReviewRequest {
  @Transform(trim) @IsString() @MaxLength(L.maxSummary)
  summary!: string;
}
