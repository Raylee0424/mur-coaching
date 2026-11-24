import type { ReviewSet, SessionFeedbackDto, WeightUnit } from '@coaching/shared';
import { formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';

export interface GroupedFeedback {
  /** Whole-session comments. */
  session: SessionFeedbackDto[];
  /** Lift-level comments by exercise log id. */
  exercise: Map<string, SessionFeedbackDto[]>;
  /** Set-level comments by set id. */
  set: Map<string, SessionFeedbackDto[]>;
}

/** Splits a session's feedback by scope: a set comment beats a lift comment beats a session comment. */
export function groupFeedback(items: readonly SessionFeedbackDto[]): GroupedFeedback {
  const out: GroupedFeedback = { session: [], exercise: new Map(), set: new Map() };
  const push = (m: Map<string, SessionFeedbackDto[]>, k: string, f: SessionFeedbackDto): void => void m.set(k, [...(m.get(k) ?? []), f]);
  for (const f of items) {
    if (f.setLogId) push(out.set, f.setLogId, f);
    else if (f.exerciseLogId) push(out.exercise, f.exerciseLogId, f);
    else out.session.push(f);
  }
  return out;
}

/** "157.5 kg × 5, 5, 5 @ RPE 7.5, 7.5, 8" for working sets; per-set weights when they differ. Null without working sets. */
export function liftSummary(sets: readonly ReviewSet[], unit: WeightUnit): string | null {
  const work = sets.filter((s) => !s.isWarmup);
  if (work.length === 0) return null;
  const sameLoad = work.every((s) => s.weightKg === work[0]!.weightKg);
  const load = sameLoad ? `${formatWeight(work[0]!.weightKg, unit)} × ${work.map((s) => s.reps).join(', ')}` : work.map((s) => `${formatWeight(s.weightKg, unit)} × ${s.reps}`).join(', ');
  const rpes = work.map((s) => (s.rpe === null ? null : formatRpe(s.rpe).replace('RPE ', '')));
  return rpes.every((r) => r === null) ? load : `${load} @ RPE ${rpes.map((r) => r ?? '–').join(', ')}`;
}
