import clsx from 'clsx';
import Link from 'next/link';
import type { WeightUnit, WorkoutLogDto } from '@coaching/shared';
import { formatDate } from '@/lib/format';
import { formatVolume, groupByWeek, sessionTitle, sessionVolumeKg, workingSetCount } from './history-model';

/** Left pane: sessions grouped by week. Each row links to its detail; the selected one carries a lime border. */
export function HistorySessionList({
  logs,
  unit,
  selectedId,
  hrefFor,
}: {
  logs: WorkoutLogDto[];
  unit: WeightUnit;
  selectedId: string | null;
  hrefFor: (logId: string) => string;
}) {
  return (
    <div className="space-y-6">
      {groupByWeek(logs).map((week) => (
        <section key={week.weekStart} aria-labelledby={`week-${week.weekStart}`}>
          <h2 id={`week-${week.weekStart}`} className="mb-2 font-mono text-label-sm tracking-wider text-muted">
            {week.label} · {week.logs.length} {week.logs.length === 1 ? 'session' : 'sessions'}
          </h2>
          <ul className="space-y-2">
            {week.logs.map((log) => {
              const selected = log.id === selectedId;
              const sets = workingSetCount(log);
              return (
                <li key={log.id}>
                  <Link
                    href={hrefFor(log.id)}
                    aria-current={selected ? 'true' : undefined}
                    scroll={false}
                    className={clsx(
                      'flex min-h-14 items-center gap-4 rounded-md border bg-card px-4 py-3 transition-colors hover:bg-raised/40',
                      selected ? 'border-primary' : 'border-line',
                    )}
                  >
                    <span className="w-24 shrink-0 font-mono text-label-md text-primary">{formatDate(log.performedAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-sans text-ui text-ink">{sessionTitle(log)}</span>
                      <span className="block font-mono text-label-sm text-muted tabular-nums">
                        {sets} {sets === 1 ? 'set' : 'sets'} · {formatVolume(sessionVolumeKg(log), unit)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
