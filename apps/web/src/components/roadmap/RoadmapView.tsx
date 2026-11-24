import clsx from 'clsx';
import { Flag } from 'lucide-react';
import type { RoadmapDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { countdownLabel, goalProgress, monthColumns, nextEvent, phaseState, phaseWeeks, spanOf, todayMarker, trimDecimal } from './roadmap-model';

const STATE_STYLE = {
  past: 'border-line bg-raised text-muted',
  active: 'border-signal/50 bg-signal-bg text-ink',
  upcoming: 'border-line-strong bg-card text-ink',
} as const;

const STATE_LABEL = { past: 'Done', active: 'Now', upcoming: 'Next' } as const;

/** Read-only roadmap: event countdown, goals, phase timeline. Used by the coach page and the client's page. */
export function RoadmapView({ roadmap, today }: { roadmap: RoadmapDto; today: string }) {
  const next = nextEvent(roadmap.events, today);
  const columns = monthColumns(roadmap.startDate, roadmap.endDate);
  const marker = todayMarker(today, roadmap.startDate, roadmap.endDate);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="Target event">
          <div className="p-4">
            {next ? (
              <>
                <p className="text-ui font-semibold">{next.event.name}</p>
                <p className="text-meta text-muted">
                  {formatDate(next.event.date)}
                  {next.event.location ? ` · ${next.event.location}` : ''}
                </p>
                <p className="mt-3 font-mono text-metric text-signal">{next.days}</p>
                <p className="font-mono text-micro uppercase text-muted">{next.days === 0 ? countdownLabel(0) : next.days === 1 ? 'Day to go' : 'Days to go'}</p>
                {next.event.notes ? <p className="mt-3 text-meta text-muted">{next.event.notes}</p> : null}
              </>
            ) : (
              <p className="text-ui text-muted">No upcoming event on this roadmap.</p>
            )}
          </div>
        </Panel>

        <Panel title="Goals" meta={`${roadmap.goals.length}`}>
          {roadmap.goals.length === 0 ? (
            <p className="p-4 text-ui text-muted">No goals set.</p>
          ) : (
            <ul className="divide-y divide-line">
              {roadmap.goals.map((g) => {
                const p = goalProgress(g);
                return (
                  <li key={g.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-ui font-medium">{g.label}</p>
                      <p className="text-meta text-muted">
                        Target <span className="font-mono text-ink">{trimDecimal(g.targetValue)} {g.unit}</span>
                        {g.currentValue !== null ? (
                          <>
                            {' · '}Now <span className="font-mono text-ink">{trimDecimal(g.currentValue)} {g.unit}</span>
                          </>
                        ) : null}
                        {g.dueDate ? ` · by ${formatDate(g.dueDate)}` : ''}
                      </p>
                      {p.pct !== null ? (
                        <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-raised" role="img" aria-label={`${p.pct}% of target`}>
                          <div className="h-full rounded-full bg-signal" style={{ width: `${p.pct}%` }} />
                        </div>
                      ) : null}
                    </div>
                    {p.remaining ? <Badge tone="neutral">{p.remaining} {g.unit} to go</Badge> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={roadmap.title} meta={`${formatDate(roadmap.startDate)} – ${formatDate(roadmap.endDate)}`}>
        <div className="p-4">
          {/* Decorative: the list below carries the same information for assistive tech. */}
          <div aria-hidden="true" className="relative">
            <div className="relative h-6 border-b border-line">
              {columns.map((c) => (
                <span key={c.key} className="absolute top-0 truncate border-l border-line pl-1.5 font-mono text-micro uppercase text-faint" style={{ left: `${c.leftPct}%`, width: `${c.widthPct}%` }}>
                  {c.label}
                </span>
              ))}
            </div>
            <div className="relative mt-2 h-14">
              {roadmap.phases.map((p) => {
                const span = spanOf(p.startDate, p.endDate, roadmap.startDate, roadmap.endDate);
                return (
                  <div
                    key={p.id}
                    title={`${p.name}: ${formatDate(p.startDate)} – ${formatDate(p.endDate)}`}
                    className={clsx('absolute top-0 flex h-14 min-w-1 flex-col justify-center overflow-hidden rounded border px-2', STATE_STYLE[phaseState(p, today)])}
                    style={{ left: `${span.leftPct}%`, width: `${span.widthPct}%` }}
                  >
                    <span className="truncate text-meta font-semibold">{p.name}</span>
                    {p.focus ? <span className="truncate text-micro text-muted">{p.focus}</span> : null}
                  </div>
                );
              })}
            </div>
            <div className="relative mt-2 h-6">
              {roadmap.events.map((e) => {
                const span = spanOf(e.date, e.date, roadmap.startDate, roadmap.endDate);
                if (e.date < roadmap.startDate || e.date > roadmap.endDate) return null;
                return (
                  <span key={e.id} className="absolute top-0 -translate-x-1/2 text-amber" style={{ left: `${span.leftPct + span.widthPct / 2}%` }} title={`${e.name}: ${formatDate(e.date)}`}>
                    <Icon icon={Flag} size={16} />
                  </span>
                );
              })}
            </div>
            {marker !== null ? (
              <div className="pointer-events-none absolute inset-y-0 w-px bg-signal" style={{ left: `${marker}%` }}>
                <span className="absolute -top-0.5 left-1 whitespace-nowrap font-mono text-micro text-signal">Today</span>
              </div>
            ) : null}
          </div>

          <ol className="mt-4 divide-y divide-line border-t border-line" aria-label="Phases">
            {roadmap.phases.map((p) => {
              const state = phaseState(p, today);
              return (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-ui font-medium">{p.name}</p>
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
                    <Badge tone={state === 'active' ? 'signal' : 'slate'}>{STATE_LABEL[state]}</Badge>
                  </div>
                </li>
              );
            })}
          </ol>
          {roadmap.notes ? <p className="mt-4 whitespace-pre-wrap text-ui text-muted">{roadmap.notes}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
