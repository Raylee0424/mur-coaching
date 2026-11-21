import clsx from 'clsx';
import Link from 'next/link';
import type { ClientOverviewDto, RecommendationDto, WeightUnit } from '@coaching/shared';
import { formatWeight } from '@/lib/units';
import { buttonClass } from '@/components/ui/Button';
import { TrainingCalendar } from './TrainingCalendar';
import { attentionItems, deltaTone, formatDelta, tabHref, type Tone } from './overview-model';

const TONE: Record<Tone, string> = { good: 'text-emerald', warn: 'text-amber', neutral: 'text-muted' };

function Stat({
  label,
  value,
  unit,
  note,
  delta,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  delta?: string | null;
  tone?: Tone;
}) {
  return (
    <article className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</h2>
        {delta ? <span className={clsx('text-xs font-semibold tabular-nums', TONE[tone ?? 'neutral'])}>{delta}</span> : null}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-sm font-semibold text-muted">{unit}</span> : null}
      </p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </article>
  );
}

export function OverviewTab({
  clientId,
  overview,
  pending,
  exerciseNames,
  unit,
  hasProgram,
}: {
  clientId: string;
  overview: ClientOverviewDto;
  pending: RecommendationDto[];
  exerciseNames: ReadonlyMap<string, string>;
  unit: WeightUnit;
  hasProgram: boolean;
}) {
  const { adherence, weeklyVolumeKg, avgRpe, streak, days } = overview;
  const empty = !hasProgram && days.every((d) => d.status === null);
  const attention = attentionItems(overview, days, pending, exerciseNames);

  if (empty) {
    return (
      <section className="mx-auto max-w-xl rounded-lg border border-dashed border-line bg-card px-6 py-12 text-center">
        <h2 className="font-display text-xl font-bold">Not enough data yet</h2>
        <p className="mt-2 text-sm text-muted">
          The engine needs 3 sessions per lift to make a recommendation. Assign a program so your client can start logging.
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/coach/programs" className={buttonClass('primary')}>
            Assign starter program
          </Link>
        </div>
      </section>
    );
  }

  const adh = adherence.value;
  const volDelta = weeklyVolumeKg.delta;
  const rpeDelta = avgRpe.delta;
  return (
    <div className="space-y-6">
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Adherence"
          value={adh === null ? '—' : `${Math.round(adh)}%`}
          note="Last 28 days"
          delta={adherence.delta === null ? null : `${formatDelta(adherence.delta)}% vs prior`}
          tone={deltaTone(adherence.delta, true)}
        />
        <Stat
          label="Weekly volume"
          value={weeklyVolumeKg.value === null ? '—' : formatWeight(weeklyVolumeKg.value, unit)}
          note="Last 7 days"
          delta={volDelta === null ? null : `${volDelta > 0 ? '+' : volDelta < 0 ? '−' : ''}${formatWeight(Math.abs(volDelta), unit)}`}
          tone={deltaTone(volDelta, true)}
        />
        <Stat
          label="Avg RPE (7 days)"
          value={avgRpe.value === null ? '—' : avgRpe.value.toFixed(1)}
          note={`Cap: ${avgRpe.cap}`}
          delta={rpeDelta === null ? null : `${formatDelta(rpeDelta, 1)} vs prior`}
          tone={deltaTone(rpeDelta, false)}
        />
        <Stat label="Streak" value={String(streak.current)} unit={streak.current === 1 ? 'session' : 'sessions'} note={`Best: ${streak.best}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TrainingCalendar clientId={clientId} month={overview.month} days={days} unit={unit} />
        <section aria-labelledby="attention-heading" className="h-fit rounded-lg border border-line bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="attention-heading" className="font-display text-lg font-bold">
              Needs attention
            </h2>
            <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold tabular-nums">{attention.length}</span>
          </div>
          {attention.length === 0 ? (
            <p className="text-sm text-muted">Nothing needs your attention. Training is on track.</p>
          ) : (
            <ul className="space-y-3">
              {attention.map((a) => (
                <li key={a.key} className="space-y-2 rounded-md border border-line bg-canvas-low p-3">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted">{a.detail}</p>
                  {a.tab !== 'overview' ? (
                    <Link href={tabHref(clientId, a.tab)} className="inline-block text-xs font-semibold text-primary-soft underline-offset-2 hover:underline">
                      Review
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
