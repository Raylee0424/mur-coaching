import { IsBoolean, IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { BODY_LIMITS, PhotoPose } from '@coaching/shared';
import type { CreateProgressPhotoRequest, LogBodyweightRequest, SaveBodyGoalRequest, UpdateProgressPhotoRequest } from '@coaching/shared';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Dates use YYYY-MM-DD.';
const KG = /^\d{1,3}(\.\d{1,2})?$/;
const KG_MESSAGE = 'Weight is a number in kg with up to 2 decimals.';

export class LogBodyweightDto implements LogBodyweightRequest {
  @Matches(DATE, { message: DATE_MESSAGE })
  date!: string;

  @Matches(KG, { message: KG_MESSAGE })
  weightKg!: string;
}

export class SaveBodyGoalDto implements SaveBodyGoalRequest {
  @Matches(KG, { message: KG_MESSAGE })
  targetKg!: string;

  @IsOptional() @Matches(DATE, { message: DATE_MESSAGE })
  targetDate?: string | null;
}

export class CreateProgressPhotoDto implements CreateProgressPhotoRequest {
  @IsIn(Object.values(PhotoPose))
  pose!: PhotoPose;

  @Matches(DATE, { message: DATE_MESSAGE })
  takenOn!: string;

  @IsInt() @Min(1) @Max(BODY_LIMITS.maxPhotoBytes)
  sizeBytes!: number;

  @IsBoolean()
  sharedWithCoach!: boolean;
}

export class UpdateProgressPhotoDto implements UpdateProgressPhotoRequest {
  @IsBoolean()
  sharedWithCoach!: boolean;
}
