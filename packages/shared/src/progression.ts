import type { RecommendationAction, RecommendationStatus } from './enums';
import type { DecimalString, IsoDateString } from './common';

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
