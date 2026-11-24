import { describe, expect, it } from 'vitest';
import { CheckInCadence, openPeriod, resolveCheckInAnswers, validateCheckInTemplate } from '@coaching/shared';
import type { CheckInQuestionDto } from '@coaching/shared';

// 2026-11-22 is a Sunday.
const weekly = (weekday: number, startDate = '2026-11-01') => ({ cadence: CheckInCadence.WEEKLY, weekday, dueDate: null, startDate });

describe('openPeriod', () => {
  it('opens a weekly check-in from 3 days before to 3 days after its due day', () => {
    expect(openPeriod(weekly(0), '2026-11-19')).toBe('2026-11-22'); // Thursday: upcoming Sunday
    expect(openPeriod(weekly(0), '2026-11-22')).toBe('2026-11-22');
    expect(openPeriod(weekly(0), '2026-11-25')).toBe('2026-11-22'); // Wednesday: still last Sunday
    expect(openPeriod(weekly(0), '2026-11-26')).toBe('2026-11-29');
  });

  it('never opens a period before the assignment started', () => {
    expect(openPeriod(weekly(0, '2026-11-25'), '2026-11-25')).toBeNull();
    expect(openPeriod(weekly(0, '2026-11-25'), '2026-11-26')).toBe('2026-11-29');
  });

  it('keeps a one-off check-in open on its due date', () => {
    expect(openPeriod({ cadence: CheckInCadence.ONCE, weekday: null, dueDate: '2026-12-05', startDate: '2026-11-20' }, '2026-11-24')).toBe('2026-12-05');
  });
});

const questions: CheckInQuestionDto[] = [
  { id: 'w', prompt: 'Weight', kind: 'NUMBER', required: true, unit: 'kg' },
  { id: 's', prompt: 'Sleep', kind: 'SCALE', required: true, unit: null },
  { id: 'n', prompt: 'Notes', kind: 'TEXT', required: false, unit: null },
];

describe('resolveCheckInAnswers', () => {
  it('snapshots prompts and treats blank optional answers as skipped', () => {
    const out = resolveCheckInAnswers(questions, [
      { questionId: 'w', value: ' 83.4 ' },
      { questionId: 's', value: '4' },
      { questionId: 'n', value: '  ' },
    ]);
    expect(out).toEqual({
      answers: [
        { questionId: 'w', prompt: 'Weight', kind: 'NUMBER', unit: 'kg', value: '83.4' },
        { questionId: 's', prompt: 'Sleep', kind: 'SCALE', unit: null, value: '4' },
        { questionId: 'n', prompt: 'Notes', kind: 'TEXT', unit: null, value: null },
      ],
    });
  });

  it('rejects missing required answers, bad numbers and out-of-range scores', () => {
    expect(resolveCheckInAnswers(questions, [{ questionId: 's', value: '3' }])).toEqual({ error: 'Answer “Weight”.' });
    expect(resolveCheckInAnswers(questions, [{ questionId: 'w', value: 'heavy' }, { questionId: 's', value: '3' }])).toHaveProperty('error');
    expect(resolveCheckInAnswers(questions, [{ questionId: 'w', value: '80' }, { questionId: 's', value: '6' }])).toHaveProperty('error');
  });

  it('ignores answers to questions that are not on the template', () => {
    const out = resolveCheckInAnswers(questions, [{ questionId: 'w', value: '80' }, { questionId: 's', value: '3' }, { questionId: 'x', value: 'injected' }]);
    expect('answers' in out && out.answers.map((a) => a.questionId)).toEqual(['w', 's', 'n']);
  });
});

describe('validateCheckInTemplate', () => {
  it('needs a title and at least one prompt', () => {
    expect(validateCheckInTemplate({ title: ' ', questions: [] })).toBe('Give the check-in a title.');
    expect(validateCheckInTemplate({ title: 'Weekly', questions: [] })).toBe('Add at least one question.');
    expect(validateCheckInTemplate({ title: 'Weekly', questions: [{ prompt: 'Sleep', kind: 'SCALE', required: true }] })).toBeNull();
  });
});
