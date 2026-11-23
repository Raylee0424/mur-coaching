import type { IsoDateString } from './common';

/** A persistent note on one exercise, owned by the athlete. */
export interface ExerciseNoteDto {
  id: string;
  exerciseId: string;
  body: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateExerciseNoteRequest {
  exerciseId: string;
  body: string;
}

export interface UpdateExerciseNoteRequest {
  body: string;
}
