import type { IsoDateString } from './common';
import type { Equipment, LimitationSeverity, MuscleGroup, RecommendationAction } from './enums';
import type { LimitationFlag } from './limitations';

// ─────────────── Usage caps ───────────────

/** Metered AI kinds. Mirrors the Prisma `AiUsageKind` enum. */
export const AiUsageKind = { COACH: 'COACH', WORKOUT: 'WORKOUT', VOICE: 'VOICE' } as const;
export type AiUsageKind = (typeof AiUsageKind)[keyof typeof AiUsageKind];

/** Requests per user per UTC day. Over the cap the API answers 429 until the next day. */
export const AI_DAILY_CAPS: Record<AiUsageKind, number> = { COACH: 40, WORKOUT: 20, VOICE: 400 };

/** Where an AI answer came from. `RULES` = the deterministic server fallback (no provider key, or the provider failed). */
export type AiSource = 'MODEL' | 'RULES';

export const AI_LIMITS = {
  maxQuestion: 1000,
  maxTitle: 80,
  conversationsListed: 30,
  /** Messages of history sent back to the model on each turn. */
  historyTurns: 12,
  maxTranscript: 300,
  minDurationMin: 15,
  maxDurationMin: 120,
  maxExercises: 8,
} as const;

// ─────────────── MUR AI Training Coach ───────────────

export type AiRole = 'USER' | 'ASSISTANT';

/** A session or PR the answer drew on. Ids point back at the athlete's own rows. */
export type AiCitation =
  | { kind: 'SESSION'; id: string; date: IsoDateString; label: string; detail: string }
  | { kind: 'PR'; id: string; date: IsoDateString; label: string; detail: string }
  | {
      kind: 'ENGINE';
      id: string;
      date: IsoDateString;
      label: string;
      detail: string;
      /** The engine's call. AI text never changes it. */
      action: RecommendationAction;
      exerciseId: string;
    };

export interface AiMessageDto {
  id: string;
  role: AiRole;
  content: string;
  citations: AiCitation[];
  source: AiSource | null;
  createdAt: IsoDateString;
}

export interface AiConversationSummaryDto {
  id: string;
  title: string;
  updatedAt: IsoDateString;
  messageCount: number;
}

export interface AiConversationDto extends AiConversationSummaryDto {
  messages: AiMessageDto[];
}

/** Read-only numbers for the context inspector rail. */
export interface AiContextStatsDto {
  sessionsIndexed: number;
  activeLimitations: number;
  /** Mean RPE of working sets in the last 7 days; null without RPE data. */
  avgRpe7d: string | null;
  /** Latest readiness score (0–100); null when none in the last 7 days. */
  readinessScore: number | null;
}

export interface AskCoachRequest {
  question: string;
  /** Omit to start a new conversation. */
  conversationId?: string;
}

export interface AskCoachResponse {
  conversation: AiConversationDto;
  stats: AiContextStatsDto;
  remainingToday: number;
}

export interface CoachOverviewDto {
  conversations: AiConversationSummaryDto[];
  stats: AiContextStatsDto;
  /** Whether a model provider is configured; false = deterministic answers. */
  modelEnabled: boolean;
}

// ─────────────── Injury-aware workout generator ───────────────

export const WorkoutGoal = { STRENGTH: 'STRENGTH', HYPERTROPHY: 'HYPERTROPHY', ENDURANCE: 'ENDURANCE' } as const;
export type WorkoutGoal = (typeof WorkoutGoal)[keyof typeof WorkoutGoal];

export const WORKOUT_GOAL_LABELS: Record<WorkoutGoal, string> = {
  STRENGTH: 'Strength',
  HYPERTROPHY: 'Hypertrophy',
  ENDURANCE: 'Muscular endurance',
};

/** Sets, rep range, rest and RIR per goal. Fixed rules, not model output. */
export const GOAL_PRESCRIPTION: Record<WorkoutGoal, { sets: number; repsMin: number; repsMax: number; restSeconds: number; rir: number }> = {
  STRENGTH: { sets: 4, repsMin: 4, repsMax: 6, restSeconds: 180, rir: 2 },
  HYPERTROPHY: { sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90, rir: 2 },
  ENDURANCE: { sets: 3, repsMin: 12, repsMax: 20, restSeconds: 60, rir: 1 },
};

export interface GenerateWorkoutRequest {
  goal: WorkoutGoal;
  durationMin: number;
  /** Empty = full body. */
  targetMuscles: MuscleGroup[];
  /** Equipment available (from the Gym Mode profile). */
  equipment: Equipment[];
}

export interface GeneratedExerciseDto {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  rir: number;
  /**
   * Engine target load (kg, decimal string) from the latest progression call, or null. Never raised by AI:
   * DELOAD and HOLD calls keep the engine number as is.
   */
  engineWeightKg: string | null;
  engineAction: RecommendationAction | null;
  /** CAUTION only; AVOID exercises are never returned. */
  limitation: LimitationFlag | null;
}

export interface GuardrailDto {
  limitationId: string;
  severity: LimitationSeverity;
  label: string;
}

export interface GeneratedWorkoutDto {
  title: string;
  rationale: string;
  exercises: GeneratedExerciseDto[];
  workingSets: number;
  estimatedMinutes: number;
  guardrails: GuardrailDto[];
  /** Exercises left out because an AVOID limitation covers them. */
  excludedCount: number;
  source: AiSource;
  remainingToday: number;
}

// ─────────────── Voice logging ───────────────

export type VoiceIntent =
  | { type: 'LOG_SET'; weight: number | null; reps: number | null; rpe: number | null; note: string | null; restSeconds: number | null }
  | { type: 'NOTE'; text: string }
  | { type: 'REST_TIMER'; seconds: number }
  | { type: 'SWAP'; exerciseQuery: string }
  | { type: 'UNKNOWN' };

export interface VoiceParseRequest {
  transcript: string;
}

export interface VoiceParseResponse {
  intent: VoiceIntent;
  source: AiSource;
  remainingToday: number;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90,
};

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  if (s in NUMBER_WORDS) return NUMBER_WORDS[s]!;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const N = '(\\d+(?:[.,]\\d+)?|[a-z]+)';

function restSecondsIn(t: string): number | null {
  const m = new RegExp(`${N}\\s*(?:minute|min)s?(?:\\s+(?:and\\s+)?${N}\\s*(?:second|sec)s?)?`).exec(t);
  if (m) {
    const mins = num(m[1]);
    if (mins !== null) return Math.round(mins * 60 + (num(m[2]) ?? 0));
  }
  const s = new RegExp(`${N}\\s*(?:second|sec)s?`).exec(t);
  return s ? num(s[1]) : null;
}

/**
 * Deterministic transcript parser: the fallback when no model is configured, and the shape every model answer is
 * checked against. Pure; units are whatever the athlete logs in (the logger's display unit).
 */
export function parseVoiceTranscript(transcript: string): VoiceIntent {
  const t = transcript.toLowerCase().replace(/[^\p{L}\p{N}.,\s:-]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return { type: 'UNKNOWN' };

  const swap = /\b(?:swap|switch|change)\s+(?:to|for|with)\s+(.+)$/.exec(t);
  if (swap) return { type: 'SWAP', exerciseQuery: swap[1]!.trim().slice(0, 80) };

  const weight = num(new RegExp(`${N}\\s*(?:kilos?|kgs?|kilograms?|pounds?|lbs?)\\b`).exec(t)?.[1]);
  const repsMatch = new RegExp(`(?:for\\s+)?${N}\\s*(?:reps?|repetitions?)\\b`).exec(t) ?? new RegExp(`\\bfor\\s+${N}\\b`).exec(t);
  const reps = num(repsMatch?.[1]);
  const rpe = num(new RegExp(`\\brpe\\s+${N}\\b`).exec(t)?.[1]) ?? num(/\bat\s+(\d+(?:[.,]\d+)?)\b/.exec(t)?.[1]);
  const noteMatch = /\bnote[:\s]+(.+?)(?:,|\bstart\b|\brest\b|$)/.exec(t);
  const note = noteMatch ? noteMatch[1]!.trim().slice(0, 200) : null;
  const restSeconds = /\b(?:rest|timer)\b/.test(t) ? restSecondsIn(t) : null;

  const validRpe = rpe !== null && rpe >= 1 && rpe <= 10 ? rpe : null;
  if (weight !== null || reps !== null) {
    return {
      type: 'LOG_SET',
      weight: weight !== null && weight >= 0 && weight <= 1000 ? weight : null,
      reps: reps !== null && Number.isInteger(reps) && reps >= 1 && reps <= 100 ? reps : null,
      rpe: validRpe,
      note,
      restSeconds: restSeconds !== null && restSeconds > 0 && restSeconds <= 3600 ? restSeconds : null,
    };
  }
  if (restSeconds !== null && restSeconds > 0 && restSeconds <= 3600) return { type: 'REST_TIMER', seconds: restSeconds };
  if (note) return { type: 'NOTE', text: note };
  return { type: 'UNKNOWN' };
}

// ─────────────── AI connectors ───────────────

/** Read-only data a connector token may read. Cycle data has no scope: no token can ever read it. */
export const ConnectorScope = {
  TRAINING: 'TRAINING',
  NUTRITION: 'NUTRITION',
  BODYWEIGHT: 'BODYWEIGHT',
  CHECK_INS: 'CHECK_INS',
  READINESS: 'READINESS',
} as const;
export type ConnectorScope = (typeof ConnectorScope)[keyof typeof ConnectorScope];

export const CONNECTOR_SCOPE_LABELS: Record<ConnectorScope, string> = {
  TRAINING: 'Training Logs & Progression History',
  NUTRITION: 'Nutrition & Micronutrients',
  BODYWEIGHT: 'Bodyweight Trend',
  CHECK_INS: 'Check-in Responses',
  READINESS: 'Sleep & Readiness Data',
};

/** REST path segment under `/connect/v1/` for each scope. */
export const CONNECTOR_SCOPE_PATHS: Record<ConnectorScope, string> = {
  TRAINING: 'training',
  NUTRITION: 'nutrition',
  BODYWEIGHT: 'bodyweight',
  CHECK_INS: 'check-ins',
  READINESS: 'readiness',
};

export const CONNECTOR_LIMITS = { maxName: 60, maxActive: 10, expiryDays: [30, 90, 365] as readonly number[] } as const;

export interface ConnectorGrantDto {
  id: string;
  name: string;
  /** First characters of the token, for recognition. The token itself is never stored. */
  tokenPrefix: string;
  scopes: ConnectorScope[];
  expiresAt: IsoDateString;
  revokedAt: IsoDateString | null;
  lastUsedAt: IsoDateString | null;
  createdAt: IsoDateString;
}

export interface CreateConnectorRequest {
  name: string;
  scopes: ConnectorScope[];
  expiresInDays: number;
}

/** The raw token appears here once and never again. */
export interface CreatedConnectorDto {
  grant: ConnectorGrantDto;
  token: string;
}
