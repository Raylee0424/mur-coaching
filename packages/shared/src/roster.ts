import type { CoachClientStatus, RecommendationAction } from './enums';
import type { IsoDateString } from './common';
import type { ActiveAssignmentSummary } from './clients';

export type AttentionReason = 'PENDING_DELOAD' | 'LOW_ADHERENCE' | 'NO_RECENT_SESSION';

/** Adherence below this (%) flags a client as needing attention. */
export const ADHERENCE_ATTENTION_PCT = 85;
/** No session for this many days flags a client as needing attention. */
export const NO_SESSION_ATTENTION_DAYS = 7;

export interface RosterClientDto {
  id: string;
  email: string;
  name: string;
  createdAt: IsoDateString;
  notes: string | null;
  status: CoachClientStatus;
  activeAssignment: ActiveAssignmentSummary | null;
  lastSessionAt: IsoDateString | null;
  /** Completed vs scheduled sessions over the last 28 days (0-100); null without an active assignment or scheduled sessions. */
  adherencePct: number | null;
  pendingCount: number;
  pendingByAction: Record<RecommendationAction, number>;
  /** Mean working-set RPE over the last 7 days and the 7 days before; null when nothing was logged. */
  avgRpe7d: number | null;
  avgRpePrev7d: number | null;
  /** 1-based program week (clamped to the program length); null without an assignment or before its start. */
  currentWeek: number | null;
  totalWeeks: number | null;
  needsAttention: boolean;
  attentionReasons: AttentionReason[];
}

export interface RosterKpis {
  activeClients: number;
  pendingRecommendations: number;
  /** Distinct ACTIVE clients with at least one pending recommendation. */
  pendingLifters: number;
  sessionsLogged7d: number;
  /** Pending DELOAD recommendations. */
  deloadsFlagged: number;
}

export interface RosterQuery {
  status?: CoachClientStatus;
  needsAttention?: boolean;
  q?: string;
}

export interface RosterSummaryDto {
  kpis: RosterKpis;
  /** Filter-chip counts, ignoring the active filter. */
  counts: { all: number; ACTIVE: number; PAUSED: number; ARCHIVED: number; needsAttention: number };
  items: RosterClientDto[];
}
