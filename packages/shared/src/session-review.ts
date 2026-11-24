import type { DecimalString, IsoDateString } from './common';

export const SESSION_FEEDBACK_LIMITS = { maxBody: 1000 } as const;

/** Scope: `setLogId` set = one set; else `exerciseLogId` set = one lift; else the whole session. */
export interface SessionFeedbackDto {
  id: string;
  workoutLogId: string;
  exerciseLogId: string | null;
  setLogId: string | null;
  body: string;
  carryForward: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateSessionFeedbackRequest {
  exerciseLogId?: string;
  /** Requires `exerciseLogId`. */
  setLogId?: string;
  body: string;
  carryForward?: boolean;
}

export interface UpdateSessionFeedbackRequest {
  body?: string;
  carryForward?: boolean;
}

export interface ReviewSet {
  id: string;
  setNumber: number;
  reps: number;
  weightKg: DecimalString;
  rpe: DecimalString | null;
  isWarmup: boolean;
}

export interface ReviewExercise {
  id: string;
  exerciseId: string;
  name: string;
  order: number;
  notes: string | null;
  swappedFromName: string | null;
  sets: ReviewSet[];
}

/** Everything the coach's review page shows for one logged session. */
export interface SessionReviewDto {
  logId: string;
  clientId: string;
  clientName: string;
  workoutName: string | null;
  performedAt: IsoDateString;
  clientNotes: string | null;
  /** Working sets only. */
  volumeKg: number;
  avgRpe: number | null;
  workingSets: number;
  exercises: ReviewExercise[];
  feedback: SessionFeedbackDto[];
}

/** A coach cue surfaced on the client's next matching exercise (or next session) in `GET /me/today`. */
export interface CarryForwardCue {
  feedbackId: string;
  body: string;
  /** Set number the cue was about, when it was set-level. */
  setNumber: number | null;
  /** `YYYY-MM-DD` of the session it came from. */
  fromDate: string;
}
