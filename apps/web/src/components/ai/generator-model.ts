import { TEMPLATE_LIMITS } from '@coaching/shared';
import type { CreateWorkoutTemplateRequest, Equipment, GeneratedExerciseDto, WeightUnit } from '@coaching/shared';
import { GYM_PROFILES, type GymProfileId } from '@/components/onboarding/client-onboarding-model';
import { kgToDisplay, unitLabel } from '@/lib/units';

/** One editable preview row. `checked` = still the generator's choice, so its guardrail flag applies. */
export interface PreviewRow extends GeneratedExerciseDto {
  key: string;
  checked: boolean;
}

export const toRows = (list: readonly GeneratedExerciseDto[]): PreviewRow[] =>
  list.map((e, i) => ({ ...e, key: `${e.exerciseId}-${i}`, checked: true }));

export function equipmentFor(profile: GymProfileId): Equipment[] {
  return [...(GYM_PROFILES.find((p) => p.id === profile)?.allowed ?? GYM_PROFILES[0]!.allowed)];
}

export function moveRow(rows: readonly PreviewRow[], key: string, delta: -1 | 1): PreviewRow[] {
  const i = rows.findIndex((r) => r.key === key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= rows.length) return [...rows];
  const next = [...rows];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export function updateRow(rows: readonly PreviewRow[], key: string, patch: Partial<Pick<PreviewRow, 'sets' | 'repsMin' | 'repsMax'>>): PreviewRow[] {
  return rows.map((r) => {
    if (r.key !== key) return r;
    const next = { ...r, ...patch };
    next.sets = Math.min(TEMPLATE_LIMITS.maxSets, Math.max(1, Math.round(next.sets)));
    next.repsMin = Math.min(100, Math.max(1, Math.round(next.repsMin)));
    next.repsMax = Math.min(100, Math.max(next.repsMin, Math.round(next.repsMax)));
    return next;
  });
}

/** Replacing an exercise drops the engine load and guardrail check: they belonged to the old one. */
export function replaceRow(rows: readonly PreviewRow[], key: string, picked: { id: string; name: string; muscleGroup: PreviewRow['muscleGroup']; equipment: Equipment | null }): PreviewRow[] {
  return rows.map((r) =>
    r.key === key
      ? { ...r, exerciseId: picked.id, name: picked.name, muscleGroup: picked.muscleGroup, equipment: picked.equipment, engineWeightKg: null, engineAction: null, limitation: null, checked: false }
      : r,
  );
}

export function workingSets(rows: readonly PreviewRow[]): number {
  return rows.reduce((n, r) => n + r.sets, 0);
}

/** "Engine 140 kg · Deload" or "No engine target". Never computes a load of its own. */
export function engineLoadLabel(r: Pick<PreviewRow, 'engineWeightKg' | 'engineAction'>, unit: WeightUnit): string {
  if (r.engineWeightKg === null) return 'No engine target';
  const action = r.engineAction ? ` · ${r.engineAction.replace('_', ' ').toLowerCase()}` : '';
  return `${kgToDisplay(Number(r.engineWeightKg), unit)} ${unitLabel(unit)}${action}`;
}

export function toTemplateRequest(rows: readonly PreviewRow[], name: string, notes: string): CreateWorkoutTemplateRequest {
  return {
    name: name.trim().slice(0, TEMPLATE_LIMITS.maxNameLength) || 'AI workout',
    notes: notes.slice(0, 1000),
    exercises: rows.map((r) => ({ exerciseId: r.exerciseId, targetSets: r.sets, repsMin: r.repsMin, repsMax: r.repsMax, restSeconds: r.restSeconds })),
  };
}
