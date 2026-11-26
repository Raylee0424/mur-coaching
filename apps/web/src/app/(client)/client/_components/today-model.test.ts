import { describe, expect, it } from 'vitest';
import type { ExplainDto, TodayBanner } from '@coaching/shared';
import {
  bannerLabel,
  bannerText,
  greetingFor,
  miniSeries,
  setByLine,
  shortDate,
  sparkPoints,
  targetSourceNote,
  todayPlainLine,
  todayTargetLine,
  whyBullets,
  whyTitle,
} from './today-model';

const session = (reps: number, rpe: number | null, weight = 155, at = '2026-11-12T10:00:00.000Z') => ({
  exerciseLogId: 'x',
  performedAt: at,
  topWeightKg: weight,
  topSetReps: reps,
  repsPerSet: [reps],
  workingSets: 3,
  avgRpe: rpe,
});

describe('today header helpers', () => {
  it('greets by hour', () => {
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(14)).toBe('Good afternoon');
    expect(greetingFor(20)).toBe('Good evening');
    expect(greetingFor(2)).toBe('Good evening');
  });
  it('formats target lines in the display unit', () => {
    expect(todayTargetLine({ weightKg: '157.50', repsMin: 5, repsMax: 5, rpe: '8.50' }, 'KG')).toBe('157.5 kg × 5 @ RPE 8.5');
    expect(todayTargetLine({ weightKg: '102.06', repsMin: 5, repsMax: 5, rpe: null }, 'LB')).toBe('225 lb × 5');
    expect(todayTargetLine({ weightKg: null, repsMin: null, repsMax: null, rpe: null }, 'KG')).toBe('');
  });
  it('writes the target in plain words', () => {
    expect(todayPlainLine({ repsMin: 6, repsMax: 8, rpe: '8.00' })).toBe('6-8 reps, leave about 2 reps in the tank');
    expect(todayPlainLine({ repsMin: 5, repsMax: 5, rpe: '9' })).toBe('5 reps, leave about 1 rep in the tank');
    expect(todayPlainLine({ repsMin: 3, repsMax: null, rpe: '8.5' })).toBe('3 reps, leave 1-2 reps in the tank');
    expect(todayPlainLine({ repsMin: 1, repsMax: 1, rpe: '10' })).toBe('1 rep, go to your limit, no reps left in the tank');
    expect(todayPlainLine({ repsMin: null, repsMax: null, rpe: '7' })).toBe('Leave about 3 reps in the tank');
    expect(todayPlainLine({ repsMin: null, repsMax: null, rpe: null })).toBe('');
  });
  it('explains inferred targets', () => {
    expect(targetSourceNote('LAST_SESSION')).toMatch(/last session/);
    expect(targetSourceNote('COACH_OVERRIDE')).toBeNull();
  });
  it('shortens dates in UTC', () => {
    expect(shortDate('2026-11-12T23:30:00.000Z')).toBe('Nov 12');
  });
});

describe('banner', () => {
  const base: TodayBanner = {
    recommendationId: 'r1',
    action: 'INCREASE_LOAD',
    exerciseId: 'sq',
    exerciseName: 'Back Squat',
    autoApproved: false,
    approvedByName: 'Coach Morgan',
    resolvedAt: '2026-11-20T10:00:00.000Z',
    fromWeightKg: 155,
    toWeightKg: '157.50',
  };
  it('names the approver and the jump', () => {
    expect(bannerLabel('INCREASE_LOAD')).toBe('Add weight approved');
    expect(bannerText(base, 'KG')).toBe("Coach Morgan accepted +2.5 kg on your Back Squat. Today's target is locked at 157.5 kg.");
  });
  it('handles auto-approval and other actions', () => {
    expect(bannerText({ ...base, autoApproved: true, approvedByName: null }, 'KG')).toMatch(/^The engine auto-approved \+2\.5 kg/);
    expect(bannerText({ ...base, action: 'HOLD', fromWeightKg: null }, 'KG')).toBe(
      "Coach Morgan accepted keeping your Back Squat where it is. Today's target is locked at 157.5 kg.",
    );
  });
});

describe('why this call', () => {
  const explain: Pick<ExplainDto, 'action' | 'reason' | 'sessions' | 'prescription' | 'settings'> = {
    action: 'INCREASE_LOAD',
    reason: 'engine reason',
    sessions: [session(5, 8, 150), session(5, 7.5, 152.5), session(5, 8, 155)],
    prescription: { sets: 3, repsMin: 5, repsMax: 5, rpeCap: 8.5 },
    settings: null,
  };
  it('titles by action', () => {
    expect(whyTitle('INCREASE_LOAD', 'squat')).toBe('Why your squat target went up.');
    expect(whyTitle('DELOAD', 'squat')).toBe('Why your squat target came down.');
  });
  it('writes plain-language bullets', () => {
    expect(whyBullets(explain).map((b) => b.text)).toEqual([
      'You hit all 5 reps in your last 3 sessions',
      'Your effort averaged 7.8 out of 10',
      "Your coach's limit is 8.5, so there's room to add weight",
    ]);
  });
  it('reports a miss instead of claiming all reps', () => {
    const miss = { ...explain, action: 'HOLD' as const, sessions: [session(4, 9), session(5, 9)] };
    const texts = whyBullets(miss).map((b) => b.text);
    expect(texts[0]).toBe('You did 4–5 reps in your last 2 sessions, against a goal of 5');
    expect(texts[2]).toMatch(/weight stays/);
  });
  it('falls back to the engine reason without sessions, and skips missing effort/cap', () => {
    expect(whyBullets({ ...explain, sessions: [], prescription: null })).toEqual([{ icon: 'check', text: 'engine reason' }]);
  });
  it('builds the mini chart data', () => {
    const m = miniSeries(explain.sessions, 'KG');
    expect(m.weights).toBe('150 → 152.5 → 155 kg');
    expect(m.labels[1]).toBe('Nov 12 · RPE 7.5');
    expect(miniSeries([session(5, null, 102.06)], 'LB').weights).toBe('225 lb');
  });
  it('spreads spark points left to right, higher weight higher up', () => {
    const p = sparkPoints([150, 152.5, 155]);
    expect(p).toHaveLength(3);
    expect(p[0]?.x).toBe(24);
    expect(p[2]?.x).toBe(276);
    expect((p[2]?.y ?? 0) < (p[0]?.y ?? 0)).toBe(true);
    expect(sparkPoints([5, 5])[0]?.y).toBe(36);
    expect(sparkPoints([])).toEqual([]);
  });
  it('describes who set the target', () => {
    const e = { status: 'ACCEPTED' as const, autoApproved: false, override: null };
    expect(setByLine(e, 'Coach Alex')).toBe('Set by: Engine, approved by Coach Alex');
    expect(setByLine({ ...e, autoApproved: true }, 'Coach Alex')).toBe('Set by: Engine, auto-approved');
    expect(setByLine({ ...e, status: 'PENDING' }, null)).toMatch(/waiting/);
    expect(
      setByLine({ ...e, override: { weightKg: '160', repsMin: 4, repsMax: 4, rpe: null, note: null, byName: 'Alex Morgan', at: null } }, null),
    ).toBe("Set by: Alex Morgan, who adjusted the engine's call");
  });
});
