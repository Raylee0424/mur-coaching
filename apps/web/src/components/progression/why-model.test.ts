import { describe, expect, it } from 'vitest';
import { capIsSimulatable, ruleStatus, simulatedLoad, whyState } from './why-model';

const session = { exerciseLogId: 'a', performedAt: '2026-11-20T00:00:00Z', topWeightKg: 155, topSetReps: 5, repsPerSet: [5], workingSets: 3, avgRpe: 8 };

describe('whyState', () => {
  it('needs two sessions', () => {
    expect(whyState({ sessions: [session], override: null })).toBe('insufficient');
  });
  it('flags overrides', () => {
    const override = { weightKg: '160', repsMin: 4, repsMax: 4, rpe: null, note: null, byName: 'Alex', at: null };
    expect(whyState({ sessions: [session, session], override })).toBe('overridden');
    expect(whyState({ sessions: [session, session], override: null })).toBe('default');
  });
});

describe('ruleStatus', () => {
  const base = { action: 'HOLD', condition: '', observed: '' } as const;
  it('separates the verdict from rules that also held', () => {
    expect(ruleStatus({ ...base, matched: true, decided: true })).toBe('decided');
    expect(ruleStatus({ ...base, matched: true, decided: false })).toBe('also');
    expect(ruleStatus({ ...base, matched: false, decided: false })).toBe('not');
  });
});

describe('simulation helpers', () => {
  it('adds the increment without float noise', () => {
    expect(simulatedLoad(155, 2.5)).toBe(157.5);
    expect(simulatedLoad(102.5, 1.25)).toBe(103.75);
  });
  it('only coach/default caps can be simulated', () => {
    expect(capIsSimulatable('COACH')).toBe(true);
    expect(capIsSimulatable('DEFAULT')).toBe(true);
    expect(capIsSimulatable('PRESCRIPTION')).toBe(false);
    expect(capIsSimulatable('CLIENT')).toBe(false);
    expect(capIsSimulatable('EXERCISE')).toBe(false);
  });
});
