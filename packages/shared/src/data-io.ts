import type { IsoDateString } from './common';
import type { WeightUnit } from './enums';

// ─── Data import (Strong, Hevy, MyFitnessPal, MacroFactor) and full export ───

export const ImportSource = { STRONG: 'STRONG', HEVY: 'HEVY', MYFITNESSPAL: 'MYFITNESSPAL', MACROFACTOR: 'MACROFACTOR' } as const;
export type ImportSource = (typeof ImportSource)[keyof typeof ImportSource];

export const ImportStatus = { COMPLETED: 'COMPLETED', ROLLED_BACK: 'ROLLED_BACK' } as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

export type ImportKind = 'WORKOUTS' | 'NUTRITION';

export const IMPORT_SOURCES: Record<ImportSource, { label: string; kind: ImportKind; blurb: string }> = {
  STRONG: { label: 'Strong', kind: 'WORKOUTS', blurb: 'Sets, reps, weight, RPE and workout notes from the Strong CSV export.' },
  HEVY: { label: 'Hevy', kind: 'WORKOUTS', blurb: 'Exercise history, set types and custom movement names from the Hevy CSV export.' },
  MYFITNESSPAL: { label: 'MyFitnessPal', kind: 'NUTRITION', blurb: 'Meal-by-meal calories and macros from the MyFitnessPal nutrition CSV.' },
  MACROFACTOR: { label: 'MacroFactor', kind: 'NUTRITION', blurb: 'Daily calories, macros and fiber from a MacroFactor CSV export.' },
};

export const IMPORT_LIMITS = { maxCsvBytes: 5_000_000, maxRows: 50_000, maxMappings: 500, previewSessions: 5 } as const;

export interface ImportPreviewRequest {
  source: ImportSource;
  csv: string;
  /** Unit of weight columns without one (Strong). Defaults to the user's unit. */
  weightUnit?: WeightUnit;
}

export interface ExerciseMatchDto {
  /** Name as written in the file. */
  sourceName: string;
  sets: number;
  /** Null = unmatched; the user maps it or it is skipped. */
  exerciseId: string | null;
  exerciseName: string | null;
  /** How it matched: a saved alias, the library name, or not at all. */
  matchedBy: 'ALIAS' | 'NAME' | null;
  /** Closest library name for an unmatched row. */
  suggestion: { id: string; name: string } | null;
}

export interface ImportSessionPreview {
  performedAt: IsoDateString;
  title: string;
  exercises: number;
  sets: number;
}

export interface ImportMealPreview {
  date: string;
  name: string;
  kcal: string;
}

export interface ImportPreviewDto {
  source: ImportSource;
  kind: ImportKind;
  fileHash: string;
  /** Rows read from the file (header excluded). */
  rowCount: number;
  /** Rows dropped as unusable (no reps, no date, cardio-only…). */
  skippedRows: number;
  /** Sessions or meal entries in the file, and how many of them an earlier import already holds. */
  units: number;
  duplicateUnits: number;
  /** A completed import of this exact file exists. */
  alreadyImported: boolean;
  exercises: ExerciseMatchDto[];
  sessions: ImportSessionPreview[];
  meals: ImportMealPreview[];
  warnings: string[];
}

export interface ImportMapping {
  sourceName: string;
  /** Null = skip this exercise's sets. */
  exerciseId: string | null;
}

export interface ImportCommitRequest extends ImportPreviewRequest {
  fileName?: string | null;
  mappings: ImportMapping[];
}

export interface ImportJobDto {
  id: string;
  source: ImportSource;
  status: ImportStatus;
  fileName: string | null;
  rowCount: number;
  createdCount: number;
  duplicateCount: number;
  skippedCount: number;
  createdAt: IsoDateString;
  rolledBackAt: IsoDateString | null;
}

export interface ImportCommitResponse {
  job: ImportJobDto;
  /** True when the same file was already imported: nothing new was written. */
  duplicate: boolean;
}

export const EXPORT_DATASETS = ['workouts', 'nutrition', 'health'] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];
export const EXPORT_SCHEMA_VERSION = 1;
