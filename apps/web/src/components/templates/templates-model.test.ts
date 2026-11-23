import { describe, expect, it } from 'vitest';
import type { TemplateFolderDto, WorkoutTemplateDto } from '@coaching/shared';
import {
  draftFromTemplate,
  emptyTemplateDraft,
  exerciseSummary,
  moveExercise,
  newExerciseDraft,
  toCreateRequest,
  toUpdateRequest,
  totalSets,
  visibleTemplates,
} from './templates-model';

const tpl: WorkoutTemplateDto = {
  id: 't1',
  folderId: 'f1',
  name: 'Upper A',
  notes: 'Heavy day',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  exercises: [
    { id: 'b', exerciseId: 'row', exerciseName: 'Row', order: 1, targetSets: 3, repsMin: 6, repsMax: 8, restSeconds: 120, tempo: '3-1-1-0' },
    { id: 'a', exerciseId: 'bench', exerciseName: 'Bench', order: 0, targetSets: 4, repsMin: null, repsMax: null, restSeconds: null, tempo: null },
  ],
};
const folders: TemplateFolderDto[] = [{ id: 'f1', name: 'Strength', templateCount: 1, createdAt: '2026-11-01T00:00:00.000Z' }];

describe('template drafts', () => {
  it('round-trips a template in order', () => {
    const draft = draftFromTemplate(tpl);
    expect(draft.exercises.map((e) => e.exerciseId)).toEqual(['bench', 'row']);
    const r = toUpdateRequest(draft);
    expect(r.ok && r.request).toEqual({
      name: 'Upper A',
      folderId: 'f1',
      notes: 'Heavy day',
      exercises: [
        { exerciseId: 'bench', targetSets: 4 },
        { exerciseId: 'row', targetSets: 3, repsMin: 6, repsMax: 8, restSeconds: 120, tempo: '3-1-1-0' },
      ],
    });
  });

  it('clears folder and notes with null on update, omits them on create', () => {
    const d = { ...draftFromTemplate(tpl), folderId: '', notes: '' };
    const u = toUpdateRequest(d);
    expect(u.ok && u.request).toMatchObject({ folderId: null, notes: null });
    const c = toCreateRequest(d);
    expect(c.ok && c.request).not.toHaveProperty('notes');
  });

  it('requires a name and an exercise', () => {
    const r = toCreateRequest(emptyTemplateDraft());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(['name', 'exercises']);
  });

  it('flags bad numbers, rep order and tempo per row', () => {
    const d = emptyTemplateDraft();
    d.name = 'X';
    d.exercises = [{ ...newExerciseDraft({ id: 'e', name: 'E' }), targetSets: '0', repsMin: '10', repsMax: '5', restSeconds: '9999', tempo: 'abc' }];
    const r = toCreateRequest(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['ex.0.repsMax', 'ex.0.rest', 'ex.0.sets', 'ex.0.tempo']);
  });

  it('uppercases tempo', () => {
    const d = emptyTemplateDraft();
    d.name = 'X';
    d.exercises = [{ ...newExerciseDraft({ id: 'e', name: 'E' }), tempo: '2-0-x-0' }];
    const r = toCreateRequest(d);
    expect(r.ok && r.request.exercises[0]?.tempo).toBe('2-0-X-0');
  });

  it('moves rows within bounds', () => {
    const d = draftFromTemplate(tpl);
    const first = d.exercises[0]!.key;
    expect(moveExercise(d, first, -1)).toBe(d);
    expect(moveExercise(d, first, 1).exercises.map((e) => e.exerciseId)).toEqual(['row', 'bench']);
  });
});

describe('listing helpers', () => {
  it('filters by folder and ignores an unknown folder', () => {
    expect(visibleTemplates([tpl], folders, 'f1').items).toHaveLength(1);
    expect(visibleTemplates([tpl], folders, 'gone')).toEqual({ folder: null, items: [tpl] });
    expect(visibleTemplates([{ ...tpl, folderId: null }], folders, 'f1').items).toHaveLength(0);
  });

  it('summarises exercises and sets', () => {
    expect(exerciseSummary(tpl)).toBe('Bench · Row');
    expect(exerciseSummary(tpl, 1)).toBe('Bench · +1 more');
    expect(totalSets(tpl)).toBe(7);
  });
});
