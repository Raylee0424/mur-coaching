import type { CoachClientStatus, Experience, WeightUnit } from './enums';
import type { ResolvedSetting } from './engine-settings';

export interface ClientProfileDto {
  goals: string[];
  goalNote: string | null;
  experience: Experience | null;
  daysPerWeek: number | null;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. */
  trainingDays: number[];
  sessionLengthMin: number | null;
  limitations: string[];
  limitationsNote: string | null;
}

/** Per-client engine overrides; null = inherit. */
export interface ClientEngineOverridesDto {
  loadIncrementKg: number | null;
  rpeCap: number | null;
  repsMin: number | null;
  repsMax: number | null;
  deloadPercent: number | null;
  sessionsAnalyzed: number | null;
}

/** What the client would get without overrides (coach rule or engine default). */
export interface ClientSettingDefaults {
  rpeCap: ResolvedSetting<number>;
  deloadPercent: ResolvedSetting<number>;
  sessionsAnalyzed: ResolvedSetting<number>;
}

export interface ClientSettingsDto {
  clientId: string;
  name: string;
  email: string;
  status: CoachClientStatus;
  weightUnit: WeightUnit;
  profile: ClientProfileDto;
  overrides: ClientEngineOverridesDto;
  autoApprove: boolean;
  autoApproveMaxKg: number | null;
  defaults: ClientSettingDefaults;
}

export interface UpdateClientSettingsRequest {
  name?: string;
  weightUnit?: WeightUnit;
  profile?: Partial<ClientProfileDto>;
  /** Only the keys sent change; null clears an override. */
  overrides?: Partial<ClientEngineOverridesDto>;
  autoApprove?: boolean;
  autoApproveMaxKg?: number | null;
}

export interface OverrideRecommendationRequest {
  weightKg: number;
  repsMin: number;
  repsMax: number;
  rpe?: number | null;
  note?: string;
}

/** Starting weight from onboarding (kg on the wire, like every weight). */
export interface BaselineDto {
  exerciseId: string;
  exerciseName: string;
  weightKg: number | null;
  reps: number | null;
  /** "I don't know yet": the first sessions calibrate it. */
  unknown: boolean;
}

export interface BaselineInput {
  exerciseId: string;
  weightKg: number | null;
  reps: number | null;
  unknown: boolean;
}

export interface MeProfileDto {
  profile: ClientProfileDto;
  baselines: BaselineDto[];
}
