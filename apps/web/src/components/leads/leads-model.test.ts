import { describe, expect, it } from 'vitest';
import type { LeadDto } from '@coaching/shared';
import { ageLabel, boardColumns, leadSummary, movableStages } from './leads-model';

const lead = (over: Partial<LeadDto>): LeadDto => ({
  id: 'l', name: 'A', email: 'a@x.co', phone: null, goal: null, trainingDays: null, experienceYears: null, source: 'WEB_FORM', stage: 'NEW',
  monthlyValueCents: null, callAt: null, notes: null, invitePending: false, convertedClientId: null, convertedAt: null,
  createdAt: '2026-11-20T10:00:00.000Z', answers: [], ...over,
});

describe('boardColumns', () => {
  it('groups by stage, newest first, and sets lost apart', () => {
    const { columns, lost } = boardColumns([
      lead({ id: '1', createdAt: '2026-11-01T00:00:00.000Z' }),
      lead({ id: '2', createdAt: '2026-11-05T00:00:00.000Z' }),
      lead({ id: '3', stage: 'LOST' }),
      lead({ id: '4', stage: 'ACTIVE' }),
    ]);
    expect(columns.map((c) => c.stage)).toEqual(['NEW', 'INTAKE_SENT', 'CALL_BOOKED', 'ACTIVE']);
    expect(columns[0]!.leads.map((l) => l.id)).toEqual(['2', '1']);
    expect(columns[3]!.leads.map((l) => l.id)).toEqual(['4']);
    expect(lost.map((l) => l.id)).toEqual(['3']);
  });
});

describe('ageLabel', () => {
  const now = Date.parse('2026-11-24T12:00:00.000Z');
  it('picks the largest whole unit', () => {
    expect(ageLabel('2026-11-24T11:59:40.000Z', now)).toBe('just now');
    expect(ageLabel('2026-11-24T11:30:00.000Z', now)).toBe('30m ago');
    expect(ageLabel('2026-11-24T06:00:00.000Z', now)).toBe('6h ago');
    expect(ageLabel('2026-11-21T12:00:00.000Z', now)).toBe('3d ago');
  });
});

describe('leadSummary and movableStages', () => {
  it('skips missing facts', () => {
    expect(leadSummary({ goal: 'Powerbuilding', experienceYears: 3, trainingDays: null })).toBe('Powerbuilding · 3y exp');
    expect(leadSummary({ goal: null, experienceYears: 0, trainingDays: 4 })).toBe('0y exp · 4d/wk');
  });
  it('never offers ACTIVE and locks converted leads', () => {
    expect(movableStages('NEW')).not.toContain('ACTIVE');
    expect(movableStages('ACTIVE')).toEqual([]);
  });
});
