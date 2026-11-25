import { describe, expect, it } from 'vitest';
import type { ExerciseMatchDto } from '@coaching/shared';
import { initialChoices, mappingsFrom, setsSkipped } from './import-model';

const m = (sourceName: string, exerciseId: string | null, suggestion: string | null, sets = 3): ExerciseMatchDto => ({
  sourceName,
  sets,
  exerciseId,
  exerciseName: exerciseId,
  matchedBy: exerciseId ? 'NAME' : null,
  suggestion: suggestion ? { id: suggestion, name: suggestion } : null,
});

describe('import model', () => {
  const matches = [m('Bench', 'e1', null), m('Squat (BB)', null, 'e2'), m('Zercher', null, null, 4)];

  it('starts from matches and suggestions, skipping the rest', () => {
    expect(initialChoices(matches)).toEqual({ Bench: 'e1', 'Squat (BB)': 'e2', Zercher: '' });
    expect(setsSkipped(matches, initialChoices(matches))).toBe(4);
  });

  it('sends only choices that differ from the server match', () => {
    expect(mappingsFrom(matches, { Bench: 'e1', 'Squat (BB)': 'e2', Zercher: '' })).toEqual([{ sourceName: 'Squat (BB)', exerciseId: 'e2' }]);
    expect(mappingsFrom(matches, { Bench: '', 'Squat (BB)': '', Zercher: 'e9' })).toEqual([
      { sourceName: 'Bench', exerciseId: null },
      { sourceName: 'Zercher', exerciseId: 'e9' },
    ]);
  });
});
