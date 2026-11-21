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

export const CoachClientStatus = { ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' } as const;
export type CoachClientStatus = (typeof CoachClientStatus)[keyof typeof CoachClientStatus];

export const AssignmentStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];
