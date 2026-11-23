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

export const LimitationTarget = { MUSCLE: 'MUSCLE', EXERCISE: 'EXERCISE' } as const;
export type LimitationTarget = (typeof LimitationTarget)[keyof typeof LimitationTarget];

export const LimitationSeverity = { AVOID: 'AVOID', CAUTION: 'CAUTION' } as const;
export type LimitationSeverity = (typeof LimitationSeverity)[keyof typeof LimitationSeverity];

export const LIMITATION_SEVERITY_LABELS: Record<LimitationSeverity, string> = { AVOID: 'Avoid', CAUTION: 'Caution' };
