import { ADHERENCE_ATTENTION_PCT, PROGRESSION_ACTION_LABEL } from '@coaching/shared';
import type { CalendarDay, ClientOverviewDto, RecommendationDto } from '@coaching/shared';

export type ClientTab = 'overview' | 'lifts' | 'history' | 'notes';

export const CLIENT_TABS: readonly { key: ClientTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'lifts', label: 'Lifts (Engine)' },
  { key: 'history', label: 'History' },
  { key: 'notes', label: 'Notes (Private)' },
];

export function parseTab(value: string | undefined): ClientTab {
  return CLIENT_TABS.some((t) => t.key === value) ? (value as ClientTab) : 'overview';
}

export function tabHref(clientId: string, tab: ClientTab, extra?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (tab !== 'overview') params.set('tab', tab);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const s = params.toString();
  return `/coach/clients/${clientId}${s ? `?${s}` : ''}`;
}

/** "+4" / "−0.2" / "0"; null when either side is missing. Uses a real minus sign. */
export function formatDelta(delta: number | null, digits = 0): string | null {
  if (delta === null) return null;
  const abs = Math.abs(delta).toFixed(digits);
  if (Number(abs) === 0) return '0';
  return `${delta > 0 ? '+' : '−'}${abs}`;
}

export type Tone = 'good' | 'warn' | 'neutral';

/** Whether a delta is good news. `higherIsBetter` false for RPE, where rising means more fatigue. */
export function deltaTone(delta: number | null, higherIsBetter: boolean): Tone {
  if (delta === null || delta === 0) return 'neutral';
  return delta > 0 === higherIsBetter ? 'good' : 'warn';
}

export interface AttentionItem {
  key: string;
  title: string;
  detail: string;
  tab: ClientTab;
  /** Sorted most urgent first. */
  priority: number;
}

/**
 * Things worth a look for one client: pending deloads, other pending calls, low adherence,
 * misses and over-cap sessions in the month on screen. Most urgent first.
 */
export function attentionItems(
  overview: Pick<ClientOverviewDto, 'adherence' | 'avgRpe'>,
  days: readonly CalendarDay[],
  pending: readonly RecommendationDto[],
  exerciseNames: ReadonlyMap<string, string>,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const name = (id: string): string => exerciseNames.get(id) ?? 'Unknown exercise';

  for (const r of pending.filter((p) => p.action === 'DELOAD')) {
    items.push({ key: `deload-${r.id}`, title: `${PROGRESSION_ACTION_LABEL.DELOAD} pending · ${name(r.exerciseId)}`, detail: r.reason, tab: 'lifts', priority: 0 });
  }
  const others = pending.filter((p) => p.action !== 'DELOAD').length;
  if (others > 0) {
    items.push({
      key: 'pending',
      title: `${others} pending ${others === 1 ? 'call' : 'calls'} to review`,
      detail: 'The engine has new targets waiting for you.',
      tab: 'lifts',
      priority: 1,
    });
  }
  const adherence = overview.adherence.value;
  if (adherence !== null && adherence < ADHERENCE_ATTENTION_PCT) {
    items.push({
      key: 'adherence',
      title: `Adherence ${Math.round(adherence)}%`,
      detail: `Below the ${ADHERENCE_ATTENTION_PCT}% target over the last 28 days.`,
      tab: 'overview',
      priority: 2,
    });
  }
  const missed = days.filter((d) => d.status === 'MISSED');
  const lastMissed = missed[missed.length - 1];
  if (lastMissed) {
    items.push({
      key: 'missed',
      title: `Missed ${lastMissed.workoutName ?? 'session'} (${shortDate(lastMissed.date)})`,
      detail: `${missed.length} missed ${missed.length === 1 ? 'session' : 'sessions'} this month.`,
      tab: 'overview',
      priority: 3,
    });
  }
  const high = days.filter((d) => d.status === 'HIGH_RPE');
  const lastHigh = high[high.length - 1];
  if (lastHigh) {
    items.push({
      key: 'high-rpe',
      title: `High RPE · ${shortDate(lastHigh.date)}`,
      detail: `${lastHigh.workoutName ?? 'Session'} averaged above the RPE cap of ${overview.avgRpe.cap}.`,
      tab: 'history',
      priority: 4,
    });
  }
  return items.sort((a, b) => a.priority - b.priority);
}

export function shortDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
