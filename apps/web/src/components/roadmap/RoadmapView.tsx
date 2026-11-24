import clsx from 'clsx';
import { Flag } from 'lucide-react';
import type { RoadmapDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { countdownLabel, goalProgress, monthColumns, nextEvent, phaseState, phaseWeeks, spanOf, todayMarker, trimDecimal } from './roadmap-model';

const STATE_STYLE = {
  past: 'border-sky/40 bg-sky-bg text-ink',
  active: 'border-2 border-primary bg-emerald-bg text-ink',
  upcoming: 'border-primary/40 bg-primary-container text-ink',
} as const;

const STATE_LABEL = { past: 'Done', active: 'Active', upcoming: 'Upcoming' } as const;

/** Read-only roadmap: event countdown, goals, phase timeline. Used by the coach page and the client's page. */
export function RoadmapView({ roadmap, today }: { roadmap: RoadmapDto; today: string }) {
  const next = nextEvent(roadmap.events, today);
  const columns = monthColumns(roadmap.startDate, roadmap.endDate);
  const marker = todayMarker(today, roadmap.startDate, roadmap.endDate);
  const activePhase = roadmap.phases.find((p) => phaseState(p, today) === 'active');

  return (
    <div className="space-y-6">
      {/* Event Countdown Cards + Macro Goals */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="flex items-center justify-between gap-4 rounded-md border-2 border-primary bg-card p-6">
          {next ? (
            <>
              <div className="min-w-0">
                <span className="font-mono text-label-sm uppercase text-primary">Target Event</span>
                <h2 className="mt-1 truncate font-display text-title-lg text-ink">{next.event.name}</h2>
                <p className="mt-0.5 text-label-md text-muted">
                  {formatDate(next.event.date)}
                  {next.event.location ? ` · ${next.event.location}` : ''}
                </p>
                {next.event.notes ? <p className="mt-2 text-meta text-muted">{next.event.notes}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-headline-lg text-primary">{next.days}</p>
                <span className="whitespace-nowrap font-mono text-label-sm uppercase text-muted">
                  {next.days === 0 ? countdownLabel(0) : next.days === 1 ? 'Day to meet' : 'Days to meet'}
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="font-mono text-label-sm uppercase text-primary">Target Event</span>
              <p className="mt-1 text-ui text-muted">No upcoming event on this roadmap.</p>
            </div>
          )}
        </article>

        {roadmap.goals.length === 0 ? (
          <article className="flex items-center justify-between gap-4 rounded-md border border-line bg-card p-6 md:col-span-2">
            <div>
              <span className="font-mono text-label-sm uppercase text-muted">Macro Goals</span>
              <p className="mt-1 text-ui text-muted">No goals set on this roadmap yet.</p>
            </div>
          </article>
        ) : (
          roadmap.goals.slice(0, 2).map((g, idx) => {
            const p = goalProgress(g);
            return (
              <article key={g.id} className="flex items-center justify-between gap-4 rounded-md border border-line bg-card p-6">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-label-sm uppercase text-muted">Macro Goal · {g.label}</span>
                  <h2 className="mt-1 truncate font-display text-title-lg text-ink">
                    {trimDecimal(g.targetValue)} {g.unit} Target
                  </h2>
                  <p className="mt-0.5 text-label-md text-muted">
                    {g.currentValue !== null ? `Current: ${trimDecimal(g.currentValue)} ${g.unit}` : 'Current value not logged'}
                    {g.dueDate ? ` · by ${formatDate(g.dueDate)}` : ''}
                  </p>
                  {p.pct !== null ? (
                    <div className="mt-2.5 h-1.5 w-full max-w-xs rounded-full bg-raised" role="img" aria-label={`${p.pct}% of target`}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                    </div>
                  ) : null}
                </div>
                {p.remaining ? (
                  <Badge tone={idx === 0 ? 'emerald' : 'sky'}>{p.remaining} {g.unit}</Badge>
                ) : (
                  <Badge tone="sky">On Track</Badge>
                )}
              </article>
            );
          })
        )}
      </section>

      {roadmap.goals.length > 2 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {roadmap.goals.slice(2).map((g) => {
            const p = goalProgress(g);
            return (
              <div key={g.id} className="flex items-center justify-between gap-4 rounded-md border border-line bg-card px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-ui font-semibold text-ink">{g.label}</p>
                  <p className="text-meta text-muted">
                    Target <span className="font-mono text-ink">{trimDecimal(g.targetValue)} {g.unit}</span>
                    {g.currentValue !== null ? ` · Now ${trimDecimal(g.currentValue)} ${g.unit}` : ''}
                  </p>
                </div>
                {p.remaining ? <Badge tone="emerald">{p.remaining} {g.unit} to go</Badge> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Horizontal Multi-Month Coaching Timeline */}
      <section className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-title-lg text-ink">{roadmap.title || 'Multi-Month Phase Timeline'}</h2>
            <p className="text-label-md text-muted">
              {formatDate(roadmap.startDate)} – {formatDate(roadmap.endDate)}
            </p>
          </div>
          {activePhase ? (
            <span className="font-mono text-label-sm uppercase text-primary">
              NOW: {formatDate(today)} ({activePhase.name})
            </span>
          ) : null}
        </div>

        {/* Decorative timeline */}
        <div aria-hidden="true" className="relative">
          <div className="relative h-6 border-b border-line">
            {columns.map((c) => (
              <span
                key={c.key}
                className="absolute top-0 truncate border-l border-line pl-1.5 font-mono text-label-sm uppercase text-muted"
                style={{ left: `${c.leftPct}%`, width: `${c.widthPct}%` }}
              >
                {c.label}
              </span>
            ))}
          </div>
          <div className="relative mt-3 h-20">
            {roadmap.phases.map((p) => {
              const span = spanOf(p.startDate, p.endDate, roadmap.startDate, roadmap.endDate);
              const state = phaseState(p, today);
              return (
                <div
                  key={p.id}
                  title={`${p.name}: ${formatDate(p.startDate)} – ${formatDate(p.endDate)}`}
                  className={clsx(
                    'absolute top-0 flex h-20 min-w-1 flex-col justify-between overflow-hidden rounded-sm border p-3',
                    STATE_STYLE[state],
                  )}
                  style={{ left: `${span.leftPct}%`, width: `${span.widthPct}%` }}
                >
                  <span className={clsx('truncate font-mono text-label-sm uppercase', state === 'active' ? 'text-emerald' : state === 'past' ? 'text-sky' : 'text-primary')}>
                    {p.name} {state === 'active' ? '(ACTIVE)' : ''}
                  </span>
                  {p.focus ? <span className="truncate font-mono text-label-sm text-muted">{p.focus}</span> : null}
                </div>
              );
            })}
          </div>
          {roadmap.events.length > 0 ? (
            <div className="relative mt-2 h-6">
              {roadmap.events.map((e) => {
                const span = spanOf(e.date, e.date, roadmap.startDate, roadmap.endDate);
                if (e.date < roadmap.startDate || e.date > roadmap.endDate) return null;
                return (
                  <span
                    key={e.id}
                    className="absolute top-0 -translate-x-1/2 text-amber"
                    style={{ left: `${span.leftPct + span.widthPct / 2}%` }}
                    title={`${e.name}: ${formatDate(e.date)}`}
                  >
                    <Icon icon={Flag} size={16} />
                  </span>
                );
              })}
            </div>
          ) : null}
          {marker !== null ? (
            <div className="pointer-events-none absolute inset-y-0 w-px bg-primary" style={{ left: `${marker}%` }}>
              <span className="absolute -top-0.5 left-1 whitespace-nowrap font-mono text-label-sm text-primary">Today</span>
            </div>
          ) : null}
        </div>

        <ol className="divide-y divide-line border-t border-line pt-2" aria-label="Phases">
          {roadmap.phases.map((p) => {
            const state = phaseState(p, today);
            return (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="font-display text-ui font-semibold text-ink">{p.name}</p>
                  <p className="text-meta text-muted">
                    {p.focus ? `${p.focus} · ` : ''}
                    {phaseWeeks(p)} wk{phaseWeeks(p) === 1 ? '' : 's'}
                    {p.programName ? ` · ${p.programName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-meta text-muted">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </span>
                  <Badge tone={state === 'active' ? 'emerald' : state === 'upcoming' ? 'signal' : 'sky'}>{STATE_LABEL[state]}</Badge>
                </div>
              </li>
            );
          })}
        </ol>
        {roadmap.notes ? <p className="whitespace-pre-wrap text-ui text-muted">{roadmap.notes}</p> : null}
      </section>
    </div>
  );
}
