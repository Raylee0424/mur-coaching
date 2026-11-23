import type { IsoDateString } from './common';

export interface TemplateFolderDto {
  id: string;
  name: string;
  templateCount: number;
  createdAt: IsoDateString;
}

export interface TemplateExerciseDto {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  repsMin: number | null;
  repsMax: number | null;
  restSeconds: number | null;
  tempo: string | null;
}

export interface WorkoutTemplateDto {
  id: string;
  folderId: string | null;
  name: string;
  notes: string | null;
  exercises: TemplateExerciseDto[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface TemplateExerciseInput {
  exerciseId: string;
  targetSets: number;
  repsMin?: number;
  repsMax?: number;
  restSeconds?: number;
  tempo?: string;
}

export interface CreateWorkoutTemplateRequest {
  name: string;
  folderId?: string | null;
  notes?: string;
  exercises: TemplateExerciseInput[];
}

/** `exercises`, when present, replaces the whole list. */
export interface UpdateWorkoutTemplateRequest {
  name?: string;
  folderId?: string | null;
  notes?: string | null;
  exercises?: TemplateExerciseInput[];
}

export interface TemplateFolderRequest {
  name: string;
}

export const TEMPLATE_LIMITS = { maxExercises: 30, maxSets: 50, maxNameLength: 80 } as const;
