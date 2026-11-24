export const ScheduledStatus = { PLANNED: 'PLANNED', COMPLETED: 'COMPLETED', SKIPPED: 'SKIPPED' } as const;
export type ScheduledStatus = (typeof ScheduledStatus)[keyof typeof ScheduledStatus];

/** Coach edit of one calendar session. Send `date` to move it, `status` to skip or restore it. Completed sessions are history. */
export interface UpdateScheduledWorkoutRequest {
  /** `YYYY-MM-DD`; today or later. */
  date?: string;
  status?: typeof ScheduledStatus.PLANNED | typeof ScheduledStatus.SKIPPED;
}

export interface ScheduledWorkoutDto {
  id: string;
  workoutId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  status: ScheduledStatus;
}
