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

// ─────────────── Coach progression queue ───────────────

export interface QueueTarget {
  weightKg: DecimalString | null;
  repsMin: number | null;
  repsMax: number | null;
}

/** Which engine branch produced a call. Chosen by the API engine, never by the web. */
export const ProgressionReasonCase = {
  TOO_FEW_SESSIONS: 'TOO_FEW_SESSIONS',
  DELOAD_PLATEAU: 'DELOAD_PLATEAU',
  DELOAD_DECLINE: 'DELOAD_DECLINE',
  HOLD_SETS_MISSED: 'HOLD_SETS_MISSED',
  HOLD_RPE_MISSING: 'HOLD_RPE_MISSING',
  HOLD_RPE_HIGH: 'HOLD_RPE_HIGH',
  HOLD_REPS_LOW: 'HOLD_REPS_LOW',
  HOLD_LOAD_MARGIN: 'HOLD_LOAD_MARGIN',
  INCREASE_LOAD: 'INCREASE_LOAD',
  INCREASE_REPS: 'INCREASE_REPS',
} as const;
export type ProgressionReasonCase = (typeof ProgressionReasonCase)[keyof typeof ProgressionReasonCase];

/** The action each case always produces. */
export const REASON_CASE_ACTION = {
  TOO_FEW_SESSIONS: 'HOLD',
  DELOAD_PLATEAU: 'DELOAD',
  DELOAD_DECLINE: 'DELOAD',
  HOLD_SETS_MISSED: 'HOLD',
  HOLD_RPE_MISSING: 'HOLD',
  HOLD_RPE_HIGH: 'HOLD',
  HOLD_REPS_LOW: 'HOLD',
  HOLD_LOAD_MARGIN: 'HOLD',
  INCREASE_LOAD: 'INCREASE_LOAD',
  INCREASE_REPS: 'INCREASE_REPS',
} as const satisfies Record<ProgressionReasonCase, RecommendationAction>;

export interface QueueReasonBasis {
  /** Number of sessions the call used. */
  sessionsUsed: number;
  /** Newest analysed session. repsPerSet is null when the source log is gone or was edited. */
  latest: { weightKg: DecimalString; repsPerSet: number[] | null; workingSets: number; avgRpe: DecimalString | null } | null;
  /** Values the evaluation used. Every field is null for calls stored before settings existed. */
  rule: {
    sets: number | null;
    repsMin: number | null;
    repsMax: number | null;
    rpeCap: DecimalString | null;
    loadMarginRpe: DecimalString | null;
    highRpe: DecimalString | null;
    loadIncrementKg: DecimalString | null;
    deloadPercent: number | null;
  };
}

export interface RecommendationQueueItem {
  id: string;
  clientId: string;
  clientName: string;
  exerciseId: string;
  exerciseName: string;
  action: RecommendationAction;
  status: RecommendationStatus;
  reason: string;
  createdAt: IsoDateString;
  /** Last top set the call is based on. */
  current: { weightKg: number; reps: number; avgRpe: number | null } | null;
  /** The engine's proposal (never the coach override). */
  proposed: QueueTarget;
  /** Engine branch replayed from stored settings; null when it cannot be replayed (show `reason`). */
  reasonCase: ProgressionReasonCase | null;
  basis: QueueReasonBasis;
}

export interface RecommendationQueueQuery {
  /** Defaults to PENDING. */
  status?: RecommendationStatus;
  action?: RecommendationAction;
  /** Matches client or exercise name. */
  q?: string;
}

export interface RecommendationQueueResponse {
  items: RecommendationQueueItem[];
  /** Per-action counts for the status + q filter, ignoring `action`, so tabs keep their numbers. */
  counts: { total: number; byAction: Record<RecommendationAction, number> };
}

export interface BulkResolveRequest {
  ids: string[];
  status: ResolvableStatus;
}

export interface BulkResolveResult {
  id: string;
  /** SKIPPED = no longer PENDING (resolved or replaced since the list loaded). */
  outcome: 'UPDATED' | 'SKIPPED';
  status: RecommendationStatus;
}

export interface BulkResolveResponse {
  results: BulkResolveResult[];
  updated: number;
  skipped: number;
}

// ─────────────── "Why this call" ───────────────

/** One rule in evaluation order: DELOAD, HOLD, INCREASE_REPS, INCREASE_LOAD. */
export interface RuleTraceStep {
  action: RecommendationAction;
  condition: string;
  observed: string;
  /** The rule's own condition held for this history (independent of rule precedence). */
  matched: boolean;
  /** This rule produced the verdict (the engine's first match). */
  decided: boolean;
}

export interface ExplainSession {
  exerciseLogId: string;
  performedAt: IsoDateString;
  topWeightKg: number;
  topSetReps: number;
  /** Reps of each set done at the top weight; empty if the source log was later edited away. */
  repsPerSet: number[];
  workingSets: number;
  avgRpe: number | null;
}

export type CallHistoryEvent =
  | {
      type: 'CALL';
      at: IsoDateString;
      recommendationId: string;
      action: RecommendationAction;
      status: RecommendationStatus;
      autoApproved: boolean;
      weightKg: DecimalString | null;
      repsMin: number | null;
      repsMax: number | null;
    }
  | {
      type: 'OVERRIDE';
      at: IsoDateString;
      recommendationId: string;
      byName: string | null;
      weightKg: DecimalString | null;
      repsMin: number | null;
      repsMax: number | null;
      rpe: DecimalString | null;
      note: string | null;
    };

export interface ExplainDto {
  recommendationId: string;
  client: { id: string; name: string };
  exercise: { id: string; name: string };
  /** The engine's verdict. */
  action: RecommendationAction;
  status: RecommendationStatus;
  reason: string;
  autoApproved: boolean;
  proposed: QueueTarget;
  override: (QueueTarget & { rpe: DecimalString | null; note: string | null; byName: string | null; at: IsoDateString | null }) | null;
  /** Prescription the engine compared against (after overrides). */
  prescription: { sets: number | null; repsMin: number | null; repsMax: number | null; rpeCap: number | null } | null;
  /** Oldest to newest. */
  sessions: ExplainSession[];
  /** Null for old recommendations whose source sessions were deleted. */
  rules: RuleTraceStep[] | null;
  /** Null for recommendations created before settings were stored. */
  settings: ResolvedEngineSettings | null;
  /** Newest first: previous calls for this client + exercise and coach overrides. */
  history: CallHistoryEvent[];
}

// ─────────────── Session complete ───────────────

export interface NextTarget {
  exerciseId: string;
  exerciseName: string;
  /** Null when there is not enough history to make a call yet. */
  action: RecommendationAction | null;
  recommendationId: string | null;
  /** PENDING = waiting for the coach; ACCEPTED includes auto-approved and overridden. */
  status: RecommendationStatus | null;
  /** Coach override if present, else the engine's proposal. */
  target: QueueTarget | null;
  reason: string | null;
}

export interface NextTargetsDto {
  workoutLogId: string;
  targets: NextTarget[];
}
