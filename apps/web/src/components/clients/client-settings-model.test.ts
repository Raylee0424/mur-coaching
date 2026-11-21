import { describe, expect, it } from 'vitest';
import type { ClientSettingsDto } from '@coaching/shared';
import { buildRequest, toDraft } from './client-settings-model';

const base: ClientSettingsDto = {
  clientId: 'c1',
  name: 'Jordan',
  email: 'j@x.io',
  status: 'ACTIVE',
  weightUnit: 'KG',
  profile: {
    goals: ['Strength'],
    goalNote: null,
    experience: 'ADVANCED',
    daysPerWeek: 4,
    trainingDays: [1, 2, 4, 5],
    sessionLengthMin: 90,
    limitations: ['Shoulders'],
    limitationsNote: 'Left shoulder',
  },
  overrides: { loadIncrementKg: null, rpeCap: null, repsMin: null, repsMax: null, deloadPercent: null, sessionsAnalyzed: null },
  autoApprove: false,
  autoApproveMaxKg: null,
  defaults: {
    rpeCap: { value: 8, source: 'DEFAULT' },
    deloadPercent: { value: 10, source: 'DEFAULT' },
    sessionsAnalyzed: { value: 3, source: 'DEFAULT' },
  },
};

describe('client settings model', () => {
  it('an untouched draft produces no changes', () => {
    const r = buildRequest(toDraft(base, 'KG'), base, 'KG');
    expect(r).toEqual({ ok: true, request: {}, changed: false });
  });

  it('sends only changed fields, with null for cleared overrides', () => {
    const withOverride = { ...base, overrides: { ...base.overrides, rpeCap: 9 } };
    const d = toDraft(withOverride, 'KG');
    d.overrides.rpeCap = '';
    d.overrides.sessionsAnalyzed = '2';
    d.trainingDays = [5, 1, 2];
    const r = buildRequest(d, withOverride, 'KG');
    expect(r).toEqual({
      ok: true,
      changed: true,
      request: { profile: { trainingDays: [1, 2, 5] }, overrides: { rpeCap: null, sessionsAnalyzed: 2 } },
    });
  });

  it('requires both rep bounds and a valid order', () => {
    const d = toDraft(base, 'KG');
    d.overrides.repsMin = '6';
    expect(buildRequest(d, base, 'KG')).toMatchObject({ ok: false, errors: { 'overrides.repsMax': expect.any(String) } });
    d.overrides.repsMax = '5';
    expect(buildRequest(d, base, 'KG')).toMatchObject({ ok: false });
  });

  it('converts the auto-approve limit from the coach unit', () => {
    const d = toDraft(base, 'LB');
    d.autoApprove = true;
    d.autoApproveMax = '10';
    const r = buildRequest(d, base, 'LB');
    expect(r).toMatchObject({ ok: true, request: { autoApprove: true, autoApproveMaxKg: 4.55 } });
  });
});
