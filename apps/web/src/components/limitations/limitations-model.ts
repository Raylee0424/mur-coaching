import { LimitationSeverity, LimitationTarget } from '@coaching/shared';
import type { CreateLimitationRequest, LimitationDto, MuscleGroup } from '@coaching/shared';
import { MUSCLE_GROUP_LABELS } from '@coaching/shared';

export interface LimitationDraft {
  target: LimitationTarget;
  muscleGroup: MuscleGroup | '';
  exerciseId: string;
  severity: LimitationSeverity;
  note: string;
  startsOn: string;
  endsOn: string;
}

export type LimitationErrors = Partial<Record<keyof LimitationDraft, string>>;

export function emptyDraft(today: string): LimitationDraft {
  return { target: LimitationTarget.MUSCLE, muscleGroup: '', exerciseId: '', severity: LimitationSeverity.CAUTION, note: '', startsOn: today, endsOn: '' };
}

export function draftFrom(l: LimitationDto): LimitationDraft {
  return {
    target: l.target,
    muscleGroup: l.muscleGroup ?? '',
    exerciseId: l.exerciseId ?? '',
    severity: l.severity,
    note: l.note ?? '',
    startsOn: l.startsOn,
    endsOn: l.endsOn ?? '',
  };
}

export function validateDraft(d: LimitationDraft): { ok: true; request: CreateLimitationRequest } | { ok: false; errors: LimitationErrors } {
  const errors: LimitationErrors = {};
  if (d.target === LimitationTarget.MUSCLE && !d.muscleGroup) errors.muscleGroup = 'Choose a muscle group.';
  if (d.target === LimitationTarget.EXERCISE && !d.exerciseId) errors.exerciseId = 'Choose an exercise.';
  if (!d.startsOn) errors.startsOn = 'Choose a start date.';
  if (d.endsOn && d.startsOn && d.endsOn < d.startsOn) errors.endsOn = 'End date must be on or after the start date.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const note = d.note.trim();
  return {
    ok: true,
    request: {
      target: d.target,
      ...(d.target === LimitationTarget.MUSCLE ? { muscleGroup: d.muscleGroup as MuscleGroup } : { exerciseId: d.exerciseId }),
      severity: d.severity,
      note: note || null,
      startsOn: d.startsOn,
      endsOn: d.endsOn || null,
    },
  };
}

export function targetLabel(l: Pick<LimitationDto, 'target' | 'muscleGroup' | 'exerciseName'>): string {
  return l.target === LimitationTarget.MUSCLE && l.muscleGroup ? MUSCLE_GROUP_LABELS[l.muscleGroup] : (l.exerciseName ?? 'Exercise');
}

/** Active limitations first (AVOID before CAUTION), then ended and future ones, newest start first. */
export function sortLimitations(list: readonly LimitationDto[], today: string): LimitationDto[] {
  const active = (l: LimitationDto): boolean => l.startsOn <= today && (l.endsOn === null || l.endsOn >= today);
  const rank = (l: LimitationDto): number => (active(l) ? (l.severity === LimitationSeverity.AVOID ? 0 : 1) : 2);
  return [...list].sort((a, b) => rank(a) - rank(b) || b.startsOn.localeCompare(a.startsOn));
}

export function statusOf(l: Pick<LimitationDto, 'startsOn' | 'endsOn'>, today: string): 'active' | 'upcoming' | 'ended' {
  if (l.startsOn > today) return 'upcoming';
  return l.endsOn !== null && l.endsOn < today ? 'ended' : 'active';
}
