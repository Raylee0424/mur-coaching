import type { RecommendationQueueItem, WeightUnit } from '@coaching/shared';
import { formatWeight } from '@/lib/units';

type ReasonItem = Pick<RecommendationQueueItem, 'reason' | 'reasonCase' | 'proposed' | 'basis'>;

const assertNever = (x: never): never => {
  throw new Error(`Unhandled reason case: ${String(x)}`);
};

/** "8" and "8.0" both read "8"; "8.5" stays. */
const clean = (value: string): string => String(Number(value));

/** "an 8/10", "a 9/10". */
function effort(rpe: string): string {
  const n = clean(rpe);
  const article = n.startsWith('8') || n === '11' || n === '18' ? 'an' : 'a';
  return `${article} ${n}/10`;
}

/** "12 reps" when every set matches, else "10-12 reps". */
function repsText(reps: readonly number[]): string {
  const lo = Math.min(...reps);
  const hi = Math.max(...reps);
  return lo === hi ? `${lo} reps` : `${lo}-${hi} reps`;
}

/**
 * One plain sentence for a queue row. Pure wording: the API engine chose the case, this only fills in
 * numbers. Falls back to the stored engine reason when the case or a needed number is missing.
 */
export function plainReason(item: ReasonItem, unit: WeightUnit): string {
  const { reasonCase, basis, proposed, reason } = item;
  if (reasonCase === null) return reason;
  const { latest, rule, sessionsUsed } = basis;
  const weight = latest ? formatWeight(latest.weightKg, unit) : null;
  const reps = latest?.repsPerSet && latest.repsPerSet.length > 0 ? latest.repsPerSet : null;
  const keep = rule.deloadPercent === null ? null : 100 - rule.deloadPercent;

  switch (reasonCase) {
    case 'INCREASE_REPS':
      if (!reps || !weight || !latest?.avgRpe || proposed.repsMin === null) return reason;
      return `All sets hit ${repsText(reps)} at ${weight} and felt like ${effort(latest.avgRpe)}. Aim for ${proposed.repsMin}+ next time.`;
    case 'INCREASE_LOAD':
      if (rule.repsMax === null || !weight || !latest?.avgRpe || proposed.weightKg === null) return reason;
      return `All sets hit ${rule.repsMax} reps at ${weight} and felt like ${effort(latest.avgRpe)}. Go up to ${formatWeight(proposed.weightKg, unit)} next time.`;
    case 'TOO_FEW_SESSIONS':
      return `Only ${sessionsUsed} session logged so far. Repeat it once more before anything changes.`;
    case 'HOLD_SETS_MISSED':
      if (!reps || rule.sets === null || !weight) return reason;
      return `Finished ${reps.length} of ${rule.sets} sets at ${weight}. Repeat this weight next time.`;
    case 'HOLD_RPE_MISSING':
      return 'Effort was not logged, so repeat this weight to confirm it.';
    case 'HOLD_RPE_HIGH':
      if (!latest?.avgRpe || rule.rpeCap === null) return reason;
      return `Felt like ${effort(latest.avgRpe)}, above the ${clean(rule.rpeCap)}/10 limit. Repeat this weight next time.`;
    case 'HOLD_REPS_LOW':
      if (!reps || rule.repsMin === null) return reason;
      return `Lowest set was ${Math.min(...reps)} reps, under the ${rule.repsMin}-rep target. Repeat this weight next time.`;
    case 'HOLD_LOAD_MARGIN':
      if (rule.repsMax === null || !latest?.avgRpe || rule.rpeCap === null) return reason;
      return `All sets hit ${rule.repsMax} reps, but it felt like ${effort(latest.avgRpe)}, too close to the ${clean(rule.rpeCap)}/10 limit to add weight. Repeat this weight next time.`;
    case 'DELOAD_PLATEAU':
      if (rule.highRpe === null || keep === null) return reason;
      return `Progress stalled over the last ${sessionsUsed} sessions and each felt like ${effort(rule.highRpe)} or harder. Take a lighter week at about ${keep}% of the weight.`;
    case 'DELOAD_DECLINE':
      if (keep === null) return reason;
      return `Your estimated best lift dropped over the last ${sessionsUsed} sessions. Take a lighter week at about ${keep}% of the weight.`;
    default:
      return assertNever(reasonCase);
  }
}
