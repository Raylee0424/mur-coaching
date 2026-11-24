import type { DecimalString, IsoDateString } from './common';

export const LiveMode = { REMOTE: 'REMOTE', IN_PERSON: 'IN_PERSON' } as const;
export type LiveMode = (typeof LiveMode)[keyof typeof LiveMode];
export const LIVE_MODE_LABELS: Record<LiveMode, string> = { REMOTE: 'Train Together (remote)', IN_PERSON: 'In person' };

export const LIVE_LIMITS = { maxParticipants: 12, maxTitle: 80, maxCue: 1000, maxReps: 100, maxWeightKg: 999 } as const;

export interface LiveSetDto {
  setLogId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: DecimalString;
  reps: number;
  rpe: DecimalString | null;
  cue: string | null;
}

export interface LiveParticipantDto {
  clientId: string;
  clientName: string;
  workoutLogId: string | null;
  sets: LiveSetDto[];
}

export interface LiveSessionDto {
  id: string;
  title: string;
  mode: LiveMode;
  coachName: string;
  startedAt: IsoDateString;
  endedAt: IsoDateString | null;
  participants: LiveParticipantDto[];
}

export interface LiveSessionSummaryDto {
  id: string;
  title: string;
  mode: LiveMode;
  startedAt: IsoDateString;
  endedAt: IsoDateString | null;
  participantCount: number;
  setCount: number;
}

export interface CoachLiveDto {
  active: LiveSessionDto | null;
  recent: LiveSessionSummaryDto[];
  clients: { id: string; name: string }[];
  exercises: { id: string; name: string }[];
}

export interface StartLiveSessionRequest {
  title: string;
  mode: LiveMode;
  clientIds: string[];
}

export interface LogLiveSetRequest {
  /** Client-generated UUID: a retry with the same id returns the set already logged. */
  requestId: string;
  clientId: string;
  exerciseId: string;
  weightKg: DecimalString;
  reps: number;
  rpe?: DecimalString | null;
  cue?: string | null;
}
