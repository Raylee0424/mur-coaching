import { JOINT_LABELS, JOINT_PATTERNS, LimitationSeverity, LimitationTarget, MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from '@coaching/shared';
import type { CreateLimitationRequest, Joint, LimitationDto, MovementPattern, MuscleGroup } from '@coaching/shared';

export interface LimitationDraft {
  target: LimitationTarget;
  muscleGroup: MuscleGroup | '';
  exerciseId: string;
  joint: Joint | '';
  pattern: MovementPattern | '';
  severity: LimitationSeverity;
  note: string;
  startsOn: string;
  endsOn: string;
}

export type LimitationErrors = Partial<Record<keyof LimitationDraft, string>>;

export function emptyDraft(today: string): LimitationDraft {
  return { target: LimitationTarget.MUSCLE, muscleGroup: '', exerciseId: '', joint: '', pattern: '', severity: LimitationSeverity.CAUTION, note: '', startsOn: today, endsOn: '' };
}

export function draftFrom(l: LimitationDto): LimitationDraft {
  return {
    target: l.target,
    muscleGroup: l.muscleGroup ?? '',
    exerciseId: l.exerciseId ?? '',
    joint: l.joint ?? '',
    pattern: l.pattern ?? '',
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
  if (d.target === LimitationTarget.JOINT && !d.joint) errors.joint = 'Choose a joint or area.';
  if (d.target === LimitationTarget.PATTERN && !d.pattern) errors.pattern = 'Choose a movement pattern.';
  if (!d.startsOn) errors.startsOn = 'Choose a start date.';
  if (d.endsOn && d.startsOn && d.endsOn < d.startsOn) errors.endsOn = 'End date must be on or after the start date.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const note = d.note.trim();
  return {
    ok: true,
    request: {
      target: d.target,
      ...targetField(d),
      severity: d.severity,
      note: note || null,
      startsOn: d.startsOn,
      endsOn: d.endsOn || null,
    },
  };
}

function targetField(d: LimitationDraft): Pick<CreateLimitationRequest, 'muscleGroup' | 'exerciseId' | 'joint' | 'pattern'> {
  switch (d.target) {
    case LimitationTarget.MUSCLE:
      return { muscleGroup: d.muscleGroup as MuscleGroup };
    case LimitationTarget.JOINT:
      return { joint: d.joint as Joint };
    case LimitationTarget.PATTERN:
      return { pattern: d.pattern as MovementPattern };
    default:
      return { exerciseId: d.exerciseId };
  }
}

type TargetFields = Pick<LimitationDto, 'target' | 'muscleGroup' | 'exerciseName' | 'joint' | 'pattern'>;

export function targetLabel(l: TargetFields): string {
  if (l.target === LimitationTarget.MUSCLE && l.muscleGroup) return MUSCLE_GROUP_LABELS[l.muscleGroup];
  if (l.target === LimitationTarget.JOINT && l.joint) return `${JOINT_LABELS[l.joint]} (joint)`;
  if (l.target === LimitationTarget.PATTERN && l.pattern) return `${MOVEMENT_PATTERN_LABELS[l.pattern]} (pattern)`;
  return l.exerciseName ?? 'Exercise';
}

/** "Hinge, Squat, Carry" for a joint; null when the target is not pattern-based. */
export function patternImpact(l: Pick<TargetFields, 'target' | 'joint' | 'pattern'>): string | null {
  if (l.target === LimitationTarget.JOINT && l.joint) return JOINT_PATTERNS[l.joint].map((p) => MOVEMENT_PATTERN_LABELS[p]).join(', ');
  if (l.target === LimitationTarget.PATTERN && l.pattern) return MOVEMENT_PATTERN_LABELS[l.pattern];
  return null;
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
