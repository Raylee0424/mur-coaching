import { describe, expect, it } from 'vitest';
import type { AiMessageDto, GeneratedExerciseDto } from '@coaching/shared';
import { appendNote, canCommit, intentChips, voiceSetValues } from '@/components/logger/voice-model';
import { citationHref, latestCitations } from './coach-model';
import { connectorStatus, PRESETS } from './connectors-model';
import { engineLoadLabel, equipmentFor, moveRow, replaceRow, toRows, toTemplateRequest, updateRow, workingSets } from './generator-model';

const gen = (id: string, over: Partial<GeneratedExerciseDto> = {}): GeneratedExerciseDto => ({
  exerciseId: id,
  name: id,
  muscleGroup: 'QUADS',
  equipment: 'BARBELL',
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 90,
  rir: 2,
  engineWeightKg: null,
  engineAction: null,
  limitation: null,
  ...over,
});

describe('voice model', () => {
  const current = { weight: 100, reps: 5, rpe: 8 };
  const set = (over: object) => ({ type: 'LOG_SET' as const, weight: null, reps: null, rpe: null, note: null, restSeconds: null, ...over });

  it('fills only spoken values and snaps RPE to 0.5', () => {
    expect(voiceSetValues(current, set({ weight: 157.5, rpe: 8.3 }), 500)).toEqual({ ok: true, values: { weight: 157.5, reps: 5, rpe: 8.5 } });
  });

  it('refuses values the logger would not accept', () => {
    expect(voiceSetValues(current, set({ rpe: 4 }), 500)).toMatchObject({ ok: false });
    expect(voiceSetValues(current, set({ weight: 900 }), 500)).toMatchObject({ ok: false });
  });

  it('labels chips and never auto-commits swaps or unknown speech', () => {
    expect(intentChips(set({ weight: 157.5, reps: 5, rpe: 8, note: 'crisp depth', restSeconds: 180 }), 'kg')).toEqual([
      'Weight: 157.5 kg',
      'Reps: 5',
      'RPE: 8.0',
      'Note: "crisp depth"',
      'Rest Timer: 03:00',
    ]);
    expect(canCommit({ type: 'SWAP', exerciseQuery: 'trap bar' }, true)).toBe(false);
    expect(canCommit({ type: 'UNKNOWN' }, true)).toBe(false);
    expect(canCommit(set({ reps: 5 }), false)).toBe(false);
    expect(canCommit({ type: 'REST_TIMER', seconds: 90 }, false)).toBe(true);
  });

  it('appends notes', () => {
    expect(appendNote('', 'crisp')).toBe('crisp');
    expect(appendNote('belt notch 3', 'crisp')).toBe('belt notch 3 · crisp');
  });
});

describe('generator model', () => {
  it('maps Gym Mode profiles to equipment', () => {
    expect(equipmentFor('HOTEL_DB')).toEqual(['DUMBBELL', 'BODYWEIGHT', 'BAND', 'KETTLEBELL']);
    expect(equipmentFor('COMMERCIAL')).toContain('MACHINE');
  });

  it('edits, reorders and clamps rows', () => {
    const rows = toRows([gen('a'), gen('b')]);
    expect(moveRow(rows, rows[1]!.key, -1).map((r) => r.exerciseId)).toEqual(['b', 'a']);
    expect(moveRow(rows, rows[0]!.key, -1).map((r) => r.exerciseId)).toEqual(['a', 'b']);
    const edited = updateRow(rows, rows[0]!.key, { sets: 0, repsMin: 10, repsMax: 6 });
    expect(edited[0]).toMatchObject({ sets: 1, repsMin: 10, repsMax: 10 });
    expect(workingSets(edited)).toBe(4);
  });

  it('drops engine load and guardrail check when an exercise is replaced', () => {
    const rows = toRows([gen('squat', { engineWeightKg: '140.00', engineAction: 'DELOAD', limitation: { limitationId: 'l', severity: 'CAUTION', note: null } })]);
    const [r] = replaceRow(rows, rows[0]!.key, { id: 'legpress', name: 'Leg Press', muscleGroup: 'QUADS', equipment: 'MACHINE' });
    expect(r).toMatchObject({ exerciseId: 'legpress', engineWeightKg: null, engineAction: null, limitation: null, checked: false });
  });

  it('shows the engine load as is and builds a template request', () => {
    expect(engineLoadLabel({ engineWeightKg: '140.00', engineAction: 'DELOAD' }, 'KG')).toBe('140 kg · lighter week');
    expect(engineLoadLabel({ engineWeightKg: null, engineAction: null }, 'KG')).toBe('No engine target');
    expect(toTemplateRequest(toRows([gen('a')]), '  Legs  ', 'why')).toEqual({
      name: 'Legs',
      notes: 'why',
      exercises: [{ exerciseId: 'a', targetSets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }],
    });
  });
});

describe('coach and connector models', () => {
  it('opens engine calls in the logger and finds the newest answer', () => {
    const msg = (role: AiMessageDto['role'], id: string): AiMessageDto => ({
      id,
      role,
      content: '',
      source: null,
      createdAt: '',
      citations: role === 'ASSISTANT' ? [{ kind: 'SESSION', id: `s-${id}`, date: '2026-11-18', label: 'L', detail: 'D' }] : [],
    });
    expect(latestCitations([msg('ASSISTANT', '1'), msg('USER', '2'), msg('ASSISTANT', '3'), msg('USER', '4')])[0]?.id).toBe('s-3');
    expect(citationHref({ kind: 'ENGINE', id: 'r', date: '', label: '', detail: '', action: 'HOLD', exerciseId: 'e' })).toBe('/client/log');
  });

  it('derives connector status', () => {
    const now = Date.parse('2026-11-25T00:00:00Z');
    expect(connectorStatus({ revokedAt: null, expiresAt: '2026-12-01T00:00:00Z' }, now)).toBe('ACTIVE');
    expect(connectorStatus({ revokedAt: null, expiresAt: '2026-11-01T00:00:00Z' }, now)).toBe('EXPIRED');
    expect(connectorStatus({ revokedAt: '2026-11-20T00:00:00Z', expiresAt: '2026-12-01T00:00:00Z' }, now)).toBe('REVOKED');
    expect(PRESETS.every((p) => p.scopes.length > 0)).toBe(true);
  });
});
