import { RecommendationAction } from '@coaching/shared';
import type { EngineRuleKey, EngineRuleValues } from '@coaching/shared';

export const RULE_FIELD_META: Record<EngineRuleKey, { label: string; suffix?: string; help: string }> = {
  rpeCap: { label: 'RPE cap', suffix: 'RPE', help: 'Used when a prescription sets no target RPE.' },
  loadMarginRpe: { label: 'Load margin', suffix: 'RPE', help: 'Average RPE must sit this far under the cap to add load.' },
  highRpe: { label: 'Grinding RPE', suffix: 'RPE', help: 'Average RPE at or above this counts as a grind.' },
  plateauTolerancePct: { label: 'Plateau tolerance', suffix: '%', help: 'Volume and e1RM within this of the oldest session count as flat.' },
  declineThresholdPct: { label: 'Decline threshold', suffix: '%', help: 'Total e1RM drop across the window that forces a deload.' },
  deloadPercent: { label: 'Deload size', suffix: '%', help: 'How much load comes off on a deload.' },
  sessionsAnalyzed: { label: 'Sessions analysed', help: 'How many recent sessions each call looks at.' },
};

export interface RuleGroup {
  action: RecommendationAction;
  keys: EngineRuleKey[];
  condition: (v: EngineRuleValues) => string;
  /** The headline threshold for the "Default threshold" column, at the engine defaults. */
  threshold: (v: EngineRuleValues) => string;
}

/** The four calls, in the order the engine checks them (DELOAD first). */
export const RULE_GROUPS: RuleGroup[] = [
  {
    action: RecommendationAction.DELOAD,
    keys: ['highRpe', 'plateauTolerancePct', 'declineThresholdPct', 'deloadPercent', 'sessionsAnalyzed'],
    condition: (v) =>
      `Over the last ${v.sessionsAnalyzed} sessions, volume and e1RM stay within ${v.plateauTolerancePct}% with average RPE ≥ ${v.highRpe} every time, or e1RM falls ${v.declineThresholdPct}% or more. Load drops by ${v.deloadPercent}%.`,
    threshold: (v) => `−${v.deloadPercent}% load`,
  },
  {
    action: RecommendationAction.INCREASE_LOAD,
    keys: ['rpeCap', 'loadMarginRpe'],
    condition: (v) =>
      `Every prescribed set hits the top of the rep range and average RPE is at most cap − ${v.loadMarginRpe} (cap ${v.rpeCap} unless the prescription sets one). Adds one load increment.`,
    threshold: (v) => `Margin ≥ ${v.loadMarginRpe} RPE`,
  },
  {
    action: RecommendationAction.INCREASE_REPS,
    keys: ['rpeCap'],
    condition: () => 'All prescribed sets done at or under the RPE cap, but reps are not yet at the top of the range. Same load, one more rep.',
    threshold: () => '+1 rep / session',
  },
  {
    action: RecommendationAction.HOLD,
    keys: ['rpeCap'],
    condition: () =>
      'Missed sets, average RPE above the cap, a set below the rep floor, missing RPE, or fewer than 2 sessions. Repeat the load.',
    threshold: (v) => `RPE cap ${v.rpeCap}`,
  },
];
