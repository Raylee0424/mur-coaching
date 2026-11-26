import type { ResolvedEngineSettings } from '@coaching/shared';
import type { Prescription } from './engine/types';

/** The prescription a stored recommendation was evaluated against, rebuilt from its stored settings. */
export function prescriptionFromSettings(settings: ResolvedEngineSettings, recommendedSets: number | null): Prescription {
  return {
    targetSets: recommendedSets ?? 3,
    repsMin: settings.repsMin.value,
    repsMax: settings.repsMax.value,
    targetRpe: settings.rpeCap.value,
    loadIncrementKg: settings.loadIncrementKg.value,
  };
}
