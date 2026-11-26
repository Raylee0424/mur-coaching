import type {
  ProgressionReasonCase,
  QueueReasonBasis,
  RecommendationAction,
  ResolvedEngineSettings,
  SessionMetrics,
} from '@coaching/shared';
import { reasonCaseOf, thresholdsFromResolved } from './engine';
import { repsAtTopWeight } from './engine/rules';
import type { SessionInput } from './engine/types';
import { prescriptionFromSettings } from './stored-rx';

export interface QueueReasonInput {
  action: RecommendationAction;
  metrics: SessionMetrics[] | null;
  settings: ResolvedEngineSettings | null;
  recommendedSets: number | null;
  sourceIds: string[];
  /** The source sessions that still exist, any order. */
  inputs: SessionInput[];
}

const str = (n: number | null | undefined): string | null => (n === null || n === undefined ? null : String(n));

/** Pure: replays the engine on stored inputs to get the reason case, and collects the numbers a sentence needs. */
export function queueReason(input: QueueReasonInput): { reasonCase: ProgressionReasonCase | null; basis: QueueReasonBasis } {
  const { action, metrics, settings, recommendedSets, sourceIds, inputs } = input;

  let reasonCase: ProgressionReasonCase | null = null;
  if (settings && inputs.length > 0 && inputs.length === sourceIds.length) {
    const replay = reasonCaseOf(inputs, prescriptionFromSettings(settings, recommendedSets), thresholdsFromResolved(settings));
    if (replay && replay.action === action) reasonCase = replay.reasonCase;
  }

  const last = metrics && metrics.length > 0 ? metrics[metrics.length - 1] : undefined;
  const lastInput = last ? inputs.find((i) => i.exerciseLogId === last.exerciseLogId) : undefined;
  const latest: QueueReasonBasis['latest'] = last
    ? {
        weightKg: String(last.topWeightKg),
        repsPerSet: lastInput ? repsAtTopWeight(lastInput, last.topWeightKg) : null,
        workingSets: last.workingSets,
        avgRpe: str(last.avgRpe),
      }
    : null;

  return {
    reasonCase,
    basis: {
      sessionsUsed: metrics?.length ?? 0,
      latest,
      rule: {
        sets: recommendedSets,
        repsMin: settings?.repsMin.value ?? null,
        repsMax: settings?.repsMax.value ?? null,
        rpeCap: str(settings?.rpeCap.value),
        loadMarginRpe: str(settings?.loadMarginRpe.value),
        highRpe: str(settings?.highRpe.value),
        loadIncrementKg: str(settings?.loadIncrementKg.value),
        deloadPercent: settings?.deloadPercent.value ?? null,
      },
    },
  };
}
