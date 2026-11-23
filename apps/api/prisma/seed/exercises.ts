import type { Equipment, ExercisePosition, MovementPattern, MuscleGroup, ResistanceProfile } from '@prisma/client';

export interface ExerciseSeed {
  name: string;
  muscleGroup: MuscleGroup;
  /** Extra muscles beyond `muscleGroup` (which is always PRIMARY). */
  primary?: MuscleGroup[];
  secondary?: MuscleGroup[];
  equipment: Equipment;
  pattern: MovementPattern;
  profile: ResistanceProfile;
  position: ExercisePosition;
  loadIncrementKg: number;
}

/** Global library (no coach, no owner). 2.5 kg jumps for upper body, 5 kg for lower. */
export const EXERCISES: readonly ExerciseSeed[] = [
  { name: 'Barbell Bench Press', muscleGroup: 'CHEST', secondary: ['TRICEPS', 'SHOULDERS'], equipment: 'BARBELL', pattern: 'HORIZONTAL_PUSH', profile: 'MID_RANGE', position: 'LYING', loadIncrementKg: 2.5 },
  { name: 'Incline Dumbbell Press', muscleGroup: 'CHEST', secondary: ['SHOULDERS', 'TRICEPS'], equipment: 'DUMBBELL', pattern: 'HORIZONTAL_PUSH', profile: 'LENGTHENED', position: 'LYING', loadIncrementKg: 2.5 },
  { name: 'Barbell Row', muscleGroup: 'BACK', secondary: ['BICEPS'], equipment: 'BARBELL', pattern: 'HORIZONTAL_PULL', profile: 'SHORTENED', position: 'STANDING', loadIncrementKg: 2.5 },
  { name: 'Lat Pulldown', muscleGroup: 'BACK', secondary: ['BICEPS'], equipment: 'CABLE', pattern: 'VERTICAL_PULL', profile: 'LENGTHENED', position: 'SEATED', loadIncrementKg: 2.5 },
  { name: 'Overhead Press', muscleGroup: 'SHOULDERS', secondary: ['TRICEPS'], equipment: 'BARBELL', pattern: 'VERTICAL_PUSH', profile: 'MID_RANGE', position: 'STANDING', loadIncrementKg: 2.5 },
  { name: 'Dumbbell Biceps Curl', muscleGroup: 'BICEPS', equipment: 'DUMBBELL', pattern: 'ARM_ISOLATION', profile: 'MID_RANGE', position: 'STANDING', loadIncrementKg: 2.5 },
  { name: 'Triceps Pushdown', muscleGroup: 'TRICEPS', equipment: 'CABLE', pattern: 'ARM_ISOLATION', profile: 'SHORTENED', position: 'STANDING', loadIncrementKg: 2.5 },
  { name: 'Back Squat', muscleGroup: 'QUADS', primary: ['GLUTES'], secondary: ['CORE'], equipment: 'BARBELL', pattern: 'SQUAT', profile: 'LENGTHENED', position: 'STANDING', loadIncrementKg: 5 },
  { name: 'Leg Press', muscleGroup: 'QUADS', secondary: ['GLUTES'], equipment: 'MACHINE', pattern: 'SQUAT', profile: 'MID_RANGE', position: 'SUPPORTED', loadIncrementKg: 5 },
  { name: 'Romanian Deadlift', muscleGroup: 'HAMSTRINGS', primary: ['GLUTES'], secondary: ['BACK'], equipment: 'BARBELL', pattern: 'HINGE', profile: 'LENGTHENED', position: 'STANDING', loadIncrementKg: 5 },
  { name: 'Hip Thrust', muscleGroup: 'GLUTES', secondary: ['HAMSTRINGS'], equipment: 'BARBELL', pattern: 'HINGE', profile: 'SHORTENED', position: 'SUPPORTED', loadIncrementKg: 5 },
  { name: 'Standing Calf Raise', muscleGroup: 'CALVES', equipment: 'MACHINE', pattern: 'LEG_ISOLATION', profile: 'LENGTHENED', position: 'STANDING', loadIncrementKg: 5 },
];

/** ExerciseMuscle rows for a seed: the main muscle and extra primaries as PRIMARY, the rest SECONDARY. */
export function seedMuscles(ex: Pick<ExerciseSeed, 'muscleGroup' | 'primary' | 'secondary'>): { muscle: MuscleGroup; role: 'PRIMARY' | 'SECONDARY' }[] {
  return [
    { muscle: ex.muscleGroup, role: 'PRIMARY' as const },
    ...(ex.primary ?? []).map((muscle) => ({ muscle, role: 'PRIMARY' as const })),
    ...(ex.secondary ?? []).map((muscle) => ({ muscle, role: 'SECONDARY' as const })),
  ];
}
