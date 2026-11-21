import type { RecommendationAction, RecommendationStatus } from './enums';
import type { DecimalString, IsoDateString } from './common';
import type { ResolvedEngineSettings } from './engine-settings';

export interface SessionMetrics {
  exerciseLogId: string;
  performedAt: IsoDateString;
  workingSets: number;
  volumeKg: number;
  topWeightKg: number;
  /** Reps of the best set at topWeightKg. */
  topSetReps: number;
  /** Epley estimate from the top set. */
  e1rmKg: number;
  avgRpe: number | null;
}

export interface RecommendationDto {
  id: string;
  clientId: string;
  exerciseId: string;
  action: RecommendationAction;
  status: RecommendationStatus;
  recommendedWeightKg: DecimalString | null;
  recommendedRepsMin: number | null;
  recommendedRepsMax: number | null;
  recommendedSets: number | null;
  reason: string;
  /** Oldest → newest, the sessions the decision used. */
  metrics: SessionMetrics[];
  sourceExerciseLogIds: string[];
  createdAt: IsoDateString;
  resolvedAt: IsoDateString | null;
  /** Coach override of the engine target; engine fields above are never changed. */
  overrideWeightKg: DecimalString | null;
  overrideRepsMin: number | null;
  overrideRepsMax: number | null;
  overrideRpe: DecimalString | null;
  overrideNote: string | null;
  overriddenById: string | null;
  overriddenAt: IsoDateString | null;
  autoApproved: boolean;
  /** Null for recommendations created before engine settings existed. */
  settings: ResolvedEngineSettings | null;
}

export interface ProgressionHistoryResponse {
  exercise: { id: string; name: string };
  recommendations: RecommendationDto[];
  series: SessionMetrics[];
}

export type ResolvableStatus = 'ACCEPTED' | 'DISMISSED';

export interface UpdateRecommendationRequest {
  status: ResolvableStatus;
}
