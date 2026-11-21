import { MuscleGroup } from '@prisma/client';

export interface ExerciseSeed {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  loadIncrementKg: number;
}

/** Global library (coachId = null). 2.5 kg jumps for upper body, 5 kg for lower. */
export const EXERCISES: readonly ExerciseSeed[] = [
  { name: 'Barbell Bench Press', muscleGroup: 'CHEST', equipment: 'Barbell', loadIncrementKg: 2.5 },
  { name: 'Incline Dumbbell Press', muscleGroup: 'CHEST', equipment: 'Dumbbell', loadIncrementKg: 2.5 },
  { name: 'Barbell Row', muscleGroup: 'BACK', equipment: 'Barbell', loadIncrementKg: 2.5 },
  { name: 'Lat Pulldown', muscleGroup: 'BACK', equipment: 'Cable', loadIncrementKg: 2.5 },
  { name: 'Overhead Press', muscleGroup: 'SHOULDERS', equipment: 'Barbell', loadIncrementKg: 2.5 },
  { name: 'Dumbbell Biceps Curl', muscleGroup: 'BICEPS', equipment: 'Dumbbell', loadIncrementKg: 2.5 },
  { name: 'Triceps Pushdown', muscleGroup: 'TRICEPS', equipment: 'Cable', loadIncrementKg: 2.5 },
  { name: 'Back Squat', muscleGroup: 'QUADS', equipment: 'Barbell', loadIncrementKg: 5 },
  { name: 'Leg Press', muscleGroup: 'QUADS', equipment: 'Machine', loadIncrementKg: 5 },
  { name: 'Romanian Deadlift', muscleGroup: 'HAMSTRINGS', equipment: 'Barbell', loadIncrementKg: 5 },
  { name: 'Hip Thrust', muscleGroup: 'GLUTES', equipment: 'Barbell', loadIncrementKg: 5 },
  { name: 'Standing Calf Raise', muscleGroup: 'CALVES', equipment: 'Machine', loadIncrementKg: 5 },
];
