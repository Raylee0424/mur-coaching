import { TEMPLATE_LIMITS, TEMPO_PATTERN } from '@coaching/shared';
import type {
  CreateWorkoutTemplateRequest,
  TemplateExerciseInput,
  TemplateFolderDto,
  UpdateWorkoutTemplateRequest,
  WorkoutTemplateDto,
} from '@coaching/shared';

/** Strings while editing, so half-typed numbers are never mangled. */
export interface TemplateExerciseDraft {
  key: string;
  exerciseId: string;
  name: string;
  targetSets: string;
  repsMin: string;
  repsMax: string;
  restSeconds: string;
  tempo: string;
}

export interface TemplateDraft {
  name: string;
  /** Empty = no folder. */
  folderId: string;
  notes: string;
  exercises: TemplateExerciseDraft[];
}

export type TemplateErrors = Record<string, string>;

let seq = 0;
const nextKey = (): string => `t${++seq}`;

export const emptyTemplateDraft = (folderId = ''): TemplateDraft => ({ name: '', folderId, notes: '', exercises: [] });

export function newExerciseDraft(source: { id: string; name: string }): TemplateExerciseDraft {
  return { key: nextKey(), exerciseId: source.id, name: source.name, targetSets: '3', repsMin: '', repsMax: '', restSeconds: '', tempo: '' };
}

export function draftFromTemplate(t: WorkoutTemplateDto): TemplateDraft {
  return {
    name: t.name,
    folderId: t.folderId ?? '',
    notes: t.notes ?? '',
    exercises: [...t.exercises]
      .sort((a, b) => a.order - b.order)
      .map((e) => ({
        key: nextKey(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        targetSets: String(e.targetSets),
        repsMin: e.repsMin === null ? '' : String(e.repsMin),
        repsMax: e.repsMax === null ? '' : String(e.repsMax),
        restSeconds: e.restSeconds === null ? '' : String(e.restSeconds),
        tempo: e.tempo ?? '',
      })),
  };
}

export function moveExercise(draft: TemplateDraft, key: string, delta: -1 | 1): TemplateDraft {
  const from = draft.exercises.findIndex((e) => e.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= draft.exercises.length) return draft;
  const exercises = [...draft.exercises];
  const [moved] = exercises.splice(from, 1);
  if (moved) exercises.splice(to, 0, moved);
  return { ...draft, exercises };
}

const WHOLE = /^\d+$/;

type Parsed = { ok: true; name: string; folderId: string | null; notes: string; exercises: TemplateExerciseInput[] } | { ok: false; errors: TemplateErrors };

/** Mirrors the API DTO (`TEMPLATE_LIMITS`, reps 1–1000, rest 0–3600, tempo pattern). */
export function parseTemplateDraft(draft: TemplateDraft): Parsed {
  const errors: TemplateErrors = {};
  const name = draft.name.trim();
  if (!name) errors['name'] = 'Name the template.';
  else if (name.length > TEMPLATE_LIMITS.maxNameLength) errors['name'] = `At most ${TEMPLATE_LIMITS.maxNameLength} characters.`;
  if (draft.notes.trim().length > 1000) errors['notes'] = 'At most 1000 characters.';
  if (draft.exercises.length < 1) errors['exercises'] = 'Add at least one exercise.';
  if (draft.exercises.length > TEMPLATE_LIMITS.maxExercises) errors['exercises'] = `At most ${TEMPLATE_LIMITS.maxExercises} exercises.`;

  const exercises: TemplateExerciseInput[] = [];
  draft.exercises.forEach((e, i) => {
    const base = `ex.${i}`;
    const sets = e.targetSets.trim();
    const min = e.repsMin.trim();
    const max = e.repsMax.trim();
    const rest = e.restSeconds.trim();
    const tempo = e.tempo.trim().toUpperCase();
    if (!WHOLE.test(sets) || Number(sets) < 1 || Number(sets) > TEMPLATE_LIMITS.maxSets) errors[`${base}.sets`] = `Sets: 1–${TEMPLATE_LIMITS.maxSets}.`;
    if (min !== '' && (!WHOLE.test(min) || Number(min) < 1 || Number(min) > 1000)) errors[`${base}.repsMin`] = 'Reps: 1–1000.';
    if (max !== '' && (!WHOLE.test(max) || Number(max) < 1 || Number(max) > 1000)) errors[`${base}.repsMax`] = 'Reps: 1–1000.';
    if (min !== '' && max !== '' && WHOLE.test(min) && WHOLE.test(max) && Number(min) > Number(max)) errors[`${base}.repsMax`] = 'Max reps must be at least min reps.';
    if (rest !== '' && (!WHOLE.test(rest) || Number(rest) > 3600)) errors[`${base}.rest`] = 'Rest: 0–3600 seconds.';
    if (tempo !== '' && !TEMPO_PATTERN.test(tempo)) errors[`${base}.tempo`] = 'Tempo looks like 3-1-1-0.';
    exercises.push({
      exerciseId: e.exerciseId,
      targetSets: Number(sets),
      ...(min !== '' ? { repsMin: Number(min) } : {}),
      ...(max !== '' ? { repsMax: Number(max) } : {}),
      ...(rest !== '' ? { restSeconds: Number(rest) } : {}),
      ...(tempo !== '' ? { tempo } : {}),
    });
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, name, folderId: draft.folderId || null, notes: draft.notes.trim(), exercises };
}

export type CreateResult = { ok: true; request: CreateWorkoutTemplateRequest } | { ok: false; errors: TemplateErrors };
export type UpdateResult = { ok: true; request: UpdateWorkoutTemplateRequest } | { ok: false; errors: TemplateErrors };

export function toCreateRequest(draft: TemplateDraft): CreateResult {
  const p = parseTemplateDraft(draft);
  if (!p.ok) return p;
  return { ok: true, request: { name: p.name, folderId: p.folderId, ...(p.notes ? { notes: p.notes } : {}), exercises: p.exercises } };
}

/** Replaces the whole template: a cleared folder or note is sent as `null`. */
export function toUpdateRequest(draft: TemplateDraft): UpdateResult {
  const p = parseTemplateDraft(draft);
  if (!p.ok) return p;
  return { ok: true, request: { name: p.name, folderId: p.folderId, notes: p.notes || null, exercises: p.exercises } };
}

/** `?folder=<id>`; an id that no longer exists shows everything. */
export function visibleTemplates(
  templates: readonly WorkoutTemplateDto[],
  folders: readonly TemplateFolderDto[],
  folderId: string | undefined,
): { folder: TemplateFolderDto | null; items: WorkoutTemplateDto[] } {
  const folder = folderId ? (folders.find((f) => f.id === folderId) ?? null) : null;
  return { folder, items: folder ? templates.filter((t) => t.folderId === folder.id) : [...templates] };
}

/** "Barbell Row · Bench Press · +2 more" */
export function exerciseSummary(t: WorkoutTemplateDto, max = 4): string {
  const names = [...t.exercises].sort((a, b) => a.order - b.order).map((e) => e.exerciseName);
  const shown = names.slice(0, max).join(' · ');
  return names.length > max ? `${shown} · +${names.length - max} more` : shown;
}

export function totalSets(t: WorkoutTemplateDto): number {
  return t.exercises.reduce((n, e) => n + e.targetSets, 0);
}
