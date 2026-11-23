// String-literal enums mirror the Prisma enums; kept free of Prisma so web can import them.
export const Role = { COACH: 'COACH', CLIENT: 'CLIENT' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const RecommendationAction = {
  INCREASE_LOAD: 'INCREASE_LOAD',
  INCREASE_REPS: 'INCREASE_REPS',
  HOLD: 'HOLD',
  DELOAD: 'DELOAD',
} as const;
export type RecommendationAction = (typeof RecommendationAction)[keyof typeof RecommendationAction];

export const RecommendationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DISMISSED: 'DISMISSED',
  SUPERSEDED: 'SUPERSEDED',
} as const;
export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];

export const MuscleGroup = {
  CHEST: 'CHEST',
  BACK: 'BACK',
  SHOULDERS: 'SHOULDERS',
  BICEPS: 'BICEPS',
  TRICEPS: 'TRICEPS',
  QUADS: 'QUADS',
  HAMSTRINGS: 'HAMSTRINGS',
  GLUTES: 'GLUTES',
  CALVES: 'CALVES',
  CORE: 'CORE',
  FULL_BODY: 'FULL_BODY',
} as const;
export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  CORE: 'Core',
  FULL_BODY: 'Full body',
};

export const CoachClientStatus = { ACTIVE: 'ACTIVE', PAUSED: 'PAUSED', ARCHIVED: 'ARCHIVED' } as const;
export type CoachClientStatus = (typeof CoachClientStatus)[keyof typeof CoachClientStatus];

export const AssignmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const WeightUnit = { KG: 'KG', LB: 'LB' } as const;
export type WeightUnit = (typeof WeightUnit)[keyof typeof WeightUnit];

export const Experience = { BEGINNER: 'BEGINNER', INTERMEDIATE: 'INTERMEDIATE', ADVANCED: 'ADVANCED' } as const;
export type Experience = (typeof Experience)[keyof typeof Experience];

export const SwapReason = { EQUIPMENT_BUSY: 'EQUIPMENT_BUSY', PAIN: 'PAIN', OTHER: 'OTHER' } as const;
export type SwapReason = (typeof SwapReason)[keyof typeof SwapReason];

export const SWAP_REASON_LABELS: Record<SwapReason, string> = {
  EQUIPMENT_BUSY: 'Equipment busy',
  PAIN: 'Pain',
  OTHER: 'Other',
};

/** Onboarding / settings chip options. Stored as the label strings. */
export const GOAL_OPTIONS = ['Strength', 'Muscle', 'Fat loss', 'Powerlifting', 'General fitness'] as const;
export const LIMITATION_OPTIONS = ['Lower back', 'Knees', 'Shoulders', 'Wrists', 'None'] as const;

/** Stored on the exercise log as readable text for the coach: "Pain: left knee". */
export function formatSwapReason(reason: SwapReason, note?: string | null): string {
  const n = note?.trim();
  return n ? `${SWAP_REASON_LABELS[reason]}: ${n}` : SWAP_REASON_LABELS[reason];
}

/** Inverse of formatSwapReason, so an edited session can re-send its swap unchanged. */
export function parseSwapReason(text: string): { reason: SwapReason; note: string } | null {
  for (const reason of Object.keys(SWAP_REASON_LABELS) as SwapReason[]) {
    const label = SWAP_REASON_LABELS[reason];
    if (text === label) return { reason, note: '' };
    if (text.startsWith(`${label}: `)) return { reason, note: text.slice(label.length + 2) };
  }
  return null;
}

export const Equipment = {
  BARBELL: 'BARBELL',
  DUMBBELL: 'DUMBBELL',
  CABLE: 'CABLE',
  MACHINE: 'MACHINE',
  SMITH_MACHINE: 'SMITH_MACHINE',
  BODYWEIGHT: 'BODYWEIGHT',
  KETTLEBELL: 'KETTLEBELL',
  BAND: 'BAND',
  SPECIALTY_BAR: 'SPECIALTY_BAR',
  OTHER: 'OTHER',
} as const;
export type Equipment = (typeof Equipment)[keyof typeof Equipment];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  BARBELL: 'Barbell',
  DUMBBELL: 'Dumbbell',
  CABLE: 'Cable',
  MACHINE: 'Machine / plate-loaded',
  SMITH_MACHINE: 'Smith machine',
  BODYWEIGHT: 'Bodyweight',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Band',
  SPECIALTY_BAR: 'Specialty bar',
  OTHER: 'Other',
};

export const MuscleRole = { PRIMARY: 'PRIMARY', SECONDARY: 'SECONDARY' } as const;
export type MuscleRole = (typeof MuscleRole)[keyof typeof MuscleRole];

export const ResistanceProfile = { LENGTHENED: 'LENGTHENED', MID_RANGE: 'MID_RANGE', SHORTENED: 'SHORTENED' } as const;
export type ResistanceProfile = (typeof ResistanceProfile)[keyof typeof ResistanceProfile];

export const RESISTANCE_PROFILE_LABELS: Record<ResistanceProfile, string> = {
  LENGTHENED: 'Lengthened',
  MID_RANGE: 'Mid-range',
  SHORTENED: 'Shortened',
};

export const ExercisePosition = { STANDING: 'STANDING', SEATED: 'SEATED', SUPPORTED: 'SUPPORTED', LYING: 'LYING' } as const;
export type ExercisePosition = (typeof ExercisePosition)[keyof typeof ExercisePosition];

export const EXERCISE_POSITION_LABELS: Record<ExercisePosition, string> = {
  STANDING: 'Standing',
  SEATED: 'Seated',
  SUPPORTED: 'Prone / supported',
  LYING: 'Lying (supine)',
};

export const MovementPattern = {
  SQUAT: 'SQUAT',
  HINGE: 'HINGE',
  LUNGE: 'LUNGE',
  HORIZONTAL_PUSH: 'HORIZONTAL_PUSH',
  VERTICAL_PUSH: 'VERTICAL_PUSH',
  HORIZONTAL_PULL: 'HORIZONTAL_PULL',
  VERTICAL_PULL: 'VERTICAL_PULL',
  CARRY: 'CARRY',
  CORE: 'CORE',
  ARM_ISOLATION: 'ARM_ISOLATION',
  LEG_ISOLATION: 'LEG_ISOLATION',
} as const;
export type MovementPattern = (typeof MovementPattern)[keyof typeof MovementPattern];

export const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  SQUAT: 'Squat',
  HINGE: 'Hinge',
  LUNGE: 'Lunge',
  HORIZONTAL_PUSH: 'Horizontal push',
  VERTICAL_PUSH: 'Vertical push',
  HORIZONTAL_PULL: 'Horizontal pull',
  VERTICAL_PULL: 'Vertical pull',
  CARRY: 'Carry',
  CORE: 'Core',
  ARM_ISOLATION: 'Arm isolation',
  LEG_ISOLATION: 'Leg isolation',
};

export const Joint = {
  NECK: 'NECK',
  SHOULDER: 'SHOULDER',
  ELBOW: 'ELBOW',
  WRIST: 'WRIST',
  LOWER_BACK: 'LOWER_BACK',
  HIP: 'HIP',
  KNEE: 'KNEE',
  ANKLE: 'ANKLE',
} as const;
export type Joint = (typeof Joint)[keyof typeof Joint];

export const JOINT_LABELS: Record<Joint, string> = {
  NECK: 'Neck',
  SHOULDER: 'Shoulder',
  ELBOW: 'Elbow',
  WRIST: 'Wrist',
  LOWER_BACK: 'Lower back',
  HIP: 'Hip',
  KNEE: 'Knee',
  ANKLE: 'Ankle',
};

/**
 * Fixed joint → movement patterns that load it. A JOINT limitation flags any exercise tagged with one of these
 * patterns. Deterministic and deliberately broad: flags are advisory and never block logging.
 */
export const JOINT_PATTERNS: Record<Joint, readonly MovementPattern[]> = {
  NECK: ['VERTICAL_PUSH', 'CARRY'],
  SHOULDER: ['HORIZONTAL_PUSH', 'VERTICAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PULL'],
  ELBOW: ['HORIZONTAL_PUSH', 'VERTICAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PULL', 'ARM_ISOLATION'],
  WRIST: ['HORIZONTAL_PUSH', 'VERTICAL_PUSH', 'CARRY', 'ARM_ISOLATION'],
  LOWER_BACK: ['HINGE', 'SQUAT', 'CARRY'],
  HIP: ['SQUAT', 'HINGE', 'LUNGE'],
  KNEE: ['SQUAT', 'LUNGE', 'LEG_ISOLATION'],
  ANKLE: ['SQUAT', 'LUNGE', 'CARRY', 'LEG_ISOLATION'],
};

export const LimitationTarget = { MUSCLE: 'MUSCLE', EXERCISE: 'EXERCISE', JOINT: 'JOINT', PATTERN: 'PATTERN' } as const;
export type LimitationTarget = (typeof LimitationTarget)[keyof typeof LimitationTarget];

export const LIMITATION_TARGET_LABELS: Record<LimitationTarget, string> = {
  MUSCLE: 'Muscle',
  EXERCISE: 'Exercise',
  JOINT: 'Joint / area',
  PATTERN: 'Movement pattern',
};

export const LimitationSeverity = { AVOID: 'AVOID', CAUTION: 'CAUTION' } as const;
export type LimitationSeverity = (typeof LimitationSeverity)[keyof typeof LimitationSeverity];

export const LIMITATION_SEVERITY_LABELS: Record<LimitationSeverity, string> = { AVOID: 'Avoid', CAUTION: 'Caution' };
