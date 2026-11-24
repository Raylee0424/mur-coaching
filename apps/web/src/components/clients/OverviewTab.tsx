import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ClientOverviewDto, RecommendationDto, WeightUnit } from '@coaching/shared';
import { formatWeight } from '@/lib/units';
import { buttonClass } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { StatStrip, type StatItem } from '@/components/ui/StatStrip';
import { InteractiveCalendar } from './InteractiveCalendar';
import { attentionItems, deltaTone, formatDelta, tabHref, type Tone } from './overview-model';

const DELTA_TONE: Record<Tone, 'good' | 'warn' | 'neutral'> = { good: 'good', warn: 'warn', neutral: 'neutral' };

export function OverviewTab({
  clientId,
  overview,
  pending,
  exerciseNames,
  unit,
  hasProgram,
  today,
}: {
  clientId: string;
  overview: ClientOverviewDto;
  pending: RecommendationDto[];
  exerciseNames: ReadonlyMap<string, string>;
  unit: WeightUnit;
  hasProgram: boolean;
  /** `YYYY-MM-DD` (UTC), from the server so the calendar and the API agree on "today". */
  today: string;
}) {
  const { adherence, weeklyVolumeKg, avgRpe, streak, days } = overview;
  const empty = !hasProgram && days.every((d) => d.status === null);
  const attention = attentionItems(overview, days, pending, exerciseNames);

  if (empty) {
    return (
      <EmptyState
        title="Not enough data yet"
        action={
          <Link href="/coach/programs" className={buttonClass('primary', undefined, 'sm')}>
            Assign a program
          </Link>
        }
      >
        The engine needs 3 sessions per lift to make a recommendation. Assign a program so your client can start logging.
      </EmptyState>
    );
  }

  const adh = adherence.value;
  const volDelta = weeklyVolumeKg.delta;
  const rpeDelta = avgRpe.delta;
  const items: StatItem[] = [
    {
      label: 'Adherence · 28d',
      value: adh === null ? '—' : `${Math.round(adh)}%`,
      delta: adherence.delta === null ? null : { text: `${formatDelta(adherence.delta)}% vs prior`, tone: DELTA_TONE[deltaTone(adherence.delta, true)] },
    },
    {
      label: 'Weekly volume',
      value: weeklyVolumeKg.value === null ? '—' : formatWeight(weeklyVolumeKg.value, unit),
      delta:
        volDelta === null
          ? null
          : { text: `${volDelta > 0 ? '+' : volDelta < 0 ? '−' : ''}${formatWeight(Math.abs(volDelta), unit)}`, tone: DELTA_TONE[deltaTone(volDelta, true)] },
    },
    {
      label: 'Avg RPE · 7d',
      value: avgRpe.value === null ? '—' : avgRpe.value.toFixed(1),
      delta: rpeDelta === null ? null : { text: `${formatDelta(rpeDelta, 1)} vs prior`, tone: DELTA_TONE[deltaTone(rpeDelta, false)] },
      note: `cap ${avgRpe.cap}`,
    },
    { label: 'Streak', value: String(streak.current), unit: streak.current === 1 ? 'session' : 'sessions', note: `best ${streak.best}` },
  ];

  return (
    <div className="space-y-6">
      <StatStrip label="Key metrics" items={items} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <InteractiveCalendar clientId={clientId} month={overview.month} days={days} unit={unit} today={today} />
        <Panel title="Needs attention" meta={String(attention.length)} className="h-fit">
          {attention.length === 0 ? (
            <p className="p-4 text-ui text-muted">Nothing needs your attention. Training is on track.</p>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a) => (
                <li key={a.key} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-ui">{a.title}</p>
                    <p className="text-meta text-muted">{a.detail}</p>
                  </div>
                  {a.tab !== 'overview' ? (
                    <Link href={tabHref(clientId, a.tab)} className={buttonClass('ghost', 'shrink-0', 'sm')}>
                      Review
                      <Icon icon={ArrowRight} />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
