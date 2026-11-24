import type { CarryForwardCue } from '@coaching/shared';

/** Pure: which pinned coach comments still apply to the client's next session. */

export interface PinnedFeedback {
  feedbackId: string;
  body: string;
  /** Null = a whole-session comment. */
  exerciseId: string | null;
  setNumber: number | null;
  /** When the commented session was performed. */
  performedAt: Date;
}

export interface LaterLog {
  performedAt: Date;
  exerciseIds: readonly string[];
}

export interface ActiveCues {
  session: CarryForwardCue[];
  byExercise: Map<string, CarryForwardCue[]>;
}

const day = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * A lift-level cue stays until the client logs that lift again in a later session; a session-level cue stays until
 * they log any later session. Newest cue first.
 */
export function activeCues(pinned: readonly PinnedFeedback[], logs: readonly LaterLog[]): ActiveCues {
  const out: ActiveCues = { session: [], byExercise: new Map() };
  const newestFirst = [...pinned].sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  for (const p of newestFirst) {
    const later = logs.filter((l) => l.performedAt.getTime() > p.performedAt.getTime());
    const cue: CarryForwardCue = { feedbackId: p.feedbackId, body: p.body, setNumber: p.setNumber, fromDate: day(p.performedAt) };
    if (p.exerciseId === null) {
      if (later.length === 0) out.session.push(cue);
    } else if (!later.some((l) => l.exerciseIds.includes(p.exerciseId!))) {
      out.byExercise.set(p.exerciseId, [...(out.byExercise.get(p.exerciseId) ?? []), cue]);
    }
  }
  return out;
}
