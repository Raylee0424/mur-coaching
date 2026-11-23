import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight, Gauge, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { CalendarDay, CalendarDayStatus, WeightUnit } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { DAY_STATUS_LABEL, buildMonthGrid, monthLabel, shiftMonth } from './calendar-model';
import { shortDate, tabHref } from './overview-model';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CELL: Record<CalendarDayStatus, string> = {
  COMPLETED: 'border-emerald/30 bg-emerald-bg',
  MISSED: 'border-rose/30 bg-rose-bg',
  HIGH_RPE: 'border-amber/40 bg-amber-bg',
  SCHEDULED: 'border-line-strong bg-canvas-low',
  TODAY: 'border-line-strong bg-canvas-low ring-1 ring-inset ring-ink',
};

const MARK: Record<CalendarDayStatus, { icon: LucideIcon | null; className: string }> = {
  COMPLETED: { icon: Check, className: 'text-emerald' },
  MISSED: { icon: X, className: 'text-rose' },
  HIGH_RPE: { icon: Gauge, className: 'text-amber' },
  SCHEDULED: { icon: null, className: 'text-muted' },
  TODAY: { icon: null, className: 'text-ink' },
};

function tooltip(day: CalendarDay, unit: WeightUnit): { heading: string; lines: string[] } {
  const status = day.status ? DAY_STATUS_LABEL[day.status].toUpperCase() : '';
  const lines: string[] = [];
  if (day.workoutName) lines.push(day.workoutName);
  if (day.topSet) {
    const t = day.topSet;
    lines.push(`Top set: ${t.exerciseName} ${formatWeight(t.weightKg, unit)} × ${t.reps}${t.rpe ? ` @ ${formatRpe(t.rpe)}` : ''}`);
  } else if (day.status === 'MISSED') lines.push('No session logged.');
  else if (day.status === 'SCHEDULED' || day.status === 'TODAY') lines.push('Not logged yet.');
  if (day.notes) lines.push(`Note: ${day.notes}`);
  return { heading: `${shortDate(day.date).toUpperCase()} · ${status}`, lines };
}

export function TrainingCalendar({
  clientId,
  month,
  days,
  unit,
}: {
  clientId: string;
  month: string;
  days: CalendarDay[];
  unit: WeightUnit;
}) {
  const weeks = buildMonthGrid(month, days);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const navClass = buttonClass('ghost', 'w-8 px-0', 'sm');

  return (
    <Panel
      title="Training calendar"
      meta={monthLabel(month, 'short')}
      actions={
        <>
          <Link href={tabHref(clientId, 'overview', { month: prev })} aria-label={`Previous month, ${monthLabel(prev)}`} className={navClass} scroll={false}>
            <Icon icon={ChevronLeft} />
          </Link>
          <Link href={tabHref(clientId, 'overview', { month: next })} aria-label={`Next month, ${monthLabel(next)}`} className={navClass} scroll={false}>
            <Icon icon={ChevronRight} />
          </Link>
        </>
      }
    >
      <div className="p-4">
      <div role="grid" aria-label={`${monthLabel(month)} training calendar`} className="space-y-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className="text-center font-mono text-micro uppercase text-muted">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) return <div key={di} role="gridcell" aria-hidden="true" className="h-14 rounded-sm border border-transparent sm:h-16" />;
              const dayNum = Number(day.date.slice(8));
              if (!day.status) {
                return (
                  <div key={di} role="gridcell" className="h-14 rounded-sm border border-line/60 p-1.5 font-mono text-micro text-faint sm:h-16">
                    {dayNum}
                  </div>
                );
              }
              const tip = tooltip(day, unit);
              const mark = MARK[day.status];
              const id = `cal-${day.date}`;
              // Right-most columns open their tooltip to the left so it stays on screen.
              const align = di >= 5 ? 'right-0' : di <= 1 ? 'left-0' : 'left-1/2 -translate-x-1/2';
              return (
                <div
                  key={di}
                  role="gridcell"
                  tabIndex={0}
                  aria-describedby={id}
                  aria-label={`${shortDate(day.date)}, ${DAY_STATUS_LABEL[day.status]}${day.workoutName ? `, ${day.workoutName}` : ''}`}
                  className={clsx(
                    'group relative flex h-14 flex-col justify-between rounded-sm border p-1.5 text-xs sm:h-16',
                    CELL[day.status],
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className={clsx('font-mono text-micro', day.status === 'TODAY' ? 'text-ink' : 'text-muted')}>{dayNum}</span>
                    {mark.icon ? (
                      <span className={mark.className}>
                        <Icon icon={mark.icon} size={14} />
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-meta text-muted">{day.status === 'MISSED' ? 'Missed' : day.workoutName}</span>
                  <div
                    id={id}
                    role="tooltip"
                    className={clsx(
                      'pointer-events-none absolute top-full z-20 mt-1 hidden w-56 space-y-0.5 rounded-md border border-line-strong bg-raised p-3 text-left group-hover:block group-focus-visible:block group-focus-within:block',
                      align,
                    )}
                  >
                    <p className="font-mono text-micro uppercase text-muted">{tip.heading}</p>
                    {tip.lines.map((l, i) => (
                      <p key={i} className={clsx('text-xs', i === 0 ? 'font-semibold text-ink' : 'text-muted')}>
                        {l}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ul aria-label="Legend" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-meta text-muted">
        {(['COMPLETED', 'MISSED', 'HIGH_RPE', 'SCHEDULED', 'TODAY'] as const).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={clsx('flex size-4 items-center justify-center rounded-sm border', CELL[s], MARK[s].className)}>
              {MARK[s].icon ? <Icon icon={MARK[s].icon!} size={14} /> : null}
            </span>
            {DAY_STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
      </div>
    </Panel>
  );
}
