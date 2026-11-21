import { ENGINE_LIMITS } from '@coaching/shared';
import type {
  ClientEngineOverridesDto,
  ClientSettingsDto,
  UpdateClientSettingsRequest,
  WeightUnit,
} from '@coaching/shared';
import { parseOverride } from '@/components/ui/OverrideField';
import { displayToKg, kgToDisplay } from '@/lib/units';

export const OVERRIDE_KEYS = ['loadIncrementKg', 'rpeCap', 'repsMin', 'repsMax', 'deloadPercent', 'sessionsAnalyzed'] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

export interface SettingsDraft {
  name: string;
  weightUnit: WeightUnit;
  goals: string[];
  limitations: string[];
  limitationsNote: string;
  trainingDays: number[];
  sessionLengthMin: string;
  overrides: Record<OverrideKey, string>;
  autoApprove: boolean;
  /** In the coach's display unit. */
  autoApproveMax: string;
}

export type SettingsErrors = Partial<Record<string, string>>;

const str = (n: number | null): string => (n === null ? '' : String(n));
const sameSet = (a: readonly (string | number)[], b: readonly (string | number)[]): boolean =>
  a.length === b.length && a.every((x) => b.includes(x));

export function toDraft(s: ClientSettingsDto, coachUnit: WeightUnit): SettingsDraft {
  return {
    name: s.name,
    weightUnit: s.weightUnit,
    goals: [...s.profile.goals],
    limitations: [...s.profile.limitations],
    limitationsNote: s.profile.limitationsNote ?? '',
    trainingDays: [...s.profile.trainingDays].sort(),
    sessionLengthMin: str(s.profile.sessionLengthMin),
    overrides: Object.fromEntries(OVERRIDE_KEYS.map((k) => [k, str(s.overrides[k])])) as Record<OverrideKey, string>,
    autoApprove: s.autoApprove,
    autoApproveMax: s.autoApproveMaxKg === null ? '' : String(kgToDisplay(s.autoApproveMaxKg, coachUnit)),
  };
}

const LIMIT: Record<OverrideKey, { min: number; max: number; step: number }> = {
  loadIncrementKg: ENGINE_LIMITS.loadIncrementKg,
  rpeCap: ENGINE_LIMITS.rpeCap,
  repsMin: ENGINE_LIMITS.reps,
  repsMax: ENGINE_LIMITS.reps,
  deloadPercent: ENGINE_LIMITS.deloadPercent,
  sessionsAnalyzed: ENGINE_LIMITS.sessionsAnalyzed,
};

/** Validates the draft and returns only what changed, ready for PUT /clients/:id/settings. */
export function buildRequest(
  draft: SettingsDraft,
  original: ClientSettingsDto,
  coachUnit: WeightUnit,
): { ok: true; request: UpdateClientSettingsRequest; changed: boolean } | { ok: false; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const request: UpdateClientSettingsRequest = {};

  const name = draft.name.trim();
  if (!name) errors.name = 'Name is required.';
  else if (name !== original.name) request.name = name;
  if (draft.weightUnit !== original.weightUnit) request.weightUnit = draft.weightUnit;

  const profile: NonNullable<UpdateClientSettingsRequest['profile']> = {};
  if (!sameSet(draft.goals, original.profile.goals)) profile.goals = draft.goals;
  if (!sameSet(draft.limitations, original.profile.limitations)) profile.limitations = draft.limitations;
  const note = draft.limitationsNote.trim();
  if (note !== (original.profile.limitationsNote ?? '')) profile.limitationsNote = note || null;
  if (!sameSet(draft.trainingDays, original.profile.trainingDays)) profile.trainingDays = [...draft.trainingDays].sort();
  const length = parseOverride(draft.sessionLengthMin, { min: 15, max: 240, step: 5 });
  if (!length.ok) errors.sessionLengthMin = length.error;
  else if (length.value !== original.profile.sessionLengthMin) profile.sessionLengthMin = length.value;
  if (Object.keys(profile).length > 0) request.profile = profile;

  const overrides: Partial<ClientEngineOverridesDto> = {};
  const values: Partial<Record<OverrideKey, number | null>> = {};
  for (const k of OVERRIDE_KEYS) {
    const p = parseOverride(draft.overrides[k], LIMIT[k]);
    if (!p.ok) errors[`overrides.${k}`] = p.error;
    else {
      values[k] = p.value;
      if (p.value !== original.overrides[k]) overrides[k] = p.value;
    }
  }
  const min = values.repsMin ?? null;
  const max = values.repsMax ?? null;
  if (!errors['overrides.repsMin'] && !errors['overrides.repsMax']) {
    if ((min === null) !== (max === null)) errors['overrides.repsMax'] = 'Set both rep bounds, or neither.';
    else if (min !== null && max !== null && min > max) errors['overrides.repsMax'] = 'Must be at least the minimum.';
  }
  if (Object.keys(overrides).length > 0) request.overrides = overrides;

  if (draft.autoApprove !== original.autoApprove) request.autoApprove = draft.autoApprove;
  const maxText = draft.autoApproveMax.trim();
  if (maxText === '') {
    if (original.autoApproveMaxKg !== null) request.autoApproveMaxKg = null;
  } else {
    const n = Number(maxText);
    const kg = displayToKg(n, coachUnit);
    if (!Number.isFinite(n) || kg < ENGINE_LIMITS.autoApproveMaxKg.min || kg > ENGINE_LIMITS.autoApproveMaxKg.max) {
      errors.autoApproveMax = 'Enter a positive weight, or leave empty for any size.';
    } else if (kg !== original.autoApproveMaxKg) request.autoApproveMaxKg = kg;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, request, changed: Object.keys(request).length > 0 };
}
