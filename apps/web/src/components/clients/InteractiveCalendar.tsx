'use client';

import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Gauge, SkipForward, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import type { CalendarDay, CalendarDayStatus, WeightUnit } from '@coaching/shared';
import { moveScheduledWorkout, setScheduledStatus } from '@/actions/schedule';
import { Button, buttonClass } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { formatRpe } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { DAY_STATUS_LABEL, applyMove, applyStatus, buildMonthGrid, hasSession, isMovable, monthLabel, moveProblem, shiftMonth, stepDate } from './calendar-model';
import { shortDate, tabHref } from './overview-model';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CELL: Record<CalendarDayStatus, string> = {
  COMPLETED: 'border-emerald/40 bg-emerald-bg',
  MISSED: 'border-rose/40 bg-rose-bg',
  HIGH_RPE: 'border-amber/40 bg-amber-bg',
  SCHEDULED: 'border-line-strong bg-canvas-low',
  TODAY: 'border-primary bg-raised ring-1 ring-inset ring-primary',
  SKIPPED: 'border-line bg-canvas-low opacity-70',
};

const MARK: Record<CalendarDayStatus, { icon: LucideIcon | null; className: string }> = {
  COMPLETED: { icon: Check, className: 'text-emerald' },
  MISSED: { icon: X, className: 'text-rose' },
  HIGH_RPE: { icon: Gauge, className: 'text-amber' },
  SCHEDULED: { icon: null, className: 'text-muted' },
  TODAY: { icon: null, className: 'text-primary' },
  SKIPPED: { icon: SkipForward, className: 'text-muted' },
};

type Change = { type: 'move'; id: string; date: string } | { type: 'status'; id: string; status: 'PLANNED' | 'SKIPPED' };

function tooltip(day: CalendarDay, unit: WeightUnit): { heading: string; lines: string[] } {
  const status = day.status ? DAY_STATUS_LABEL[day.status].toUpperCase() : '';
  const lines: string[] = [];
  if (day.workoutName) lines.push(day.workoutName);
  if (day.topSet) {
    const t = day.topSet;
    lines.push(`Top set: ${t.exerciseName} ${formatWeight(t.weightKg, unit)} × ${t.reps}${t.rpe ? ` @ ${formatRpe(t.rpe)}` : ''}`);
  } else if (day.status === 'MISSED') lines.push('No session logged.');
  else if (day.status === 'SCHEDULED' || day.status === 'TODAY') lines.push('Not logged yet.');
  else if (day.status === 'SKIPPED') lines.push('Skipped: not counted in adherence.');
  if (day.notes) lines.push(`Note: ${day.notes}`);
  return { heading: `${shortDate(day.date).toUpperCase()} · ${status}`, lines };
}

/**
 * The client's month. Planned sessions can be dragged to another day; the same move works from the keyboard
 * (focus a session, press M, arrow to a day, Enter to drop, Escape to cancel) and from the panel under the grid.
 */
export function InteractiveCalendar({ clientId, month, days, unit, today }: { clientId: string; month: string; days: CalendarDay[]; unit: WeightUnit; today: string }) {
  const toast = useToast();
  const [shown, change] = useOptimistic(days, (cur, c: Change) => (c.type === 'move' ? applyMove(cur, c.id, c.date, today) : applyStatus(cur, c.id, c.status, today)));
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ id: string; from: string; target: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string>();
  const [announce, setAnnounce] = useState('');
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const weeks = buildMonthGrid(month, shown);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const navClass = buttonClass('ghost', 'w-8 px-0', 'sm');
  const sel = shown.find((d) => d.date === selected) ?? null;

  // A different month, or the day vanishing after a move, clears the selection.
  useEffect(() => {
    setSelected(null);
    setMoving(null);
  }, [month]);
  useEffect(() => {
    if (sel) setTarget(sel.date >= today ? sel.date : today);
  }, [sel?.date, today]); // eslint-disable-line react-hooks/exhaustive-deps

  function commitMove(from: CalendarDay, date: string): void {
    const problem = moveProblem(shown, from, date, today);
    if (problem) {
      setError(problem);
      setAnnounce(problem);
      return;
    }
    setError(undefined);
    startTransition(async () => {
      change({ type: 'move', id: from.scheduledWorkoutId!, date });
      const r = await moveScheduledWorkout(clientId, from.scheduledWorkoutId!, date);
      if (!r.ok) {
        setError(r.error);
        toast.show({ message: r.error, tone: 'error' });
        return;
      }
      setSelected(date);
      setAnnounce(`${from.workoutName} moved to ${shortDate(date)}.`);
      toast.show({ message: `${from.workoutName} moved to ${shortDate(date)}`, tone: 'ok' });
    });
  }

  function commitStatus(day: CalendarDay, status: 'PLANNED' | 'SKIPPED'): void {
    setError(undefined);
    startTransition(async () => {
      change({ type: 'status', id: day.scheduledWorkoutId!, status });
      const r = await setScheduledStatus(clientId, day.scheduledWorkoutId!, status);
      if (!r.ok) {
        setError(r.error);
        toast.show({ message: r.error, tone: 'error' });
        return;
      }
      toast.show({ message: status === 'SKIPPED' ? `${day.workoutName} skipped` : `${day.workoutName} restored`, tone: 'ok' });
    });
  }

  function onCellKey(e: React.KeyboardEvent, day: CalendarDay): void {
    if (moving && moving.from === day.date) {
      const step = stepDate(moving.target, e.key, shown);
      if (step) {
        e.preventDefault();
        setMoving({ ...moving, target: step });
        const problem = moveProblem(shown, day, step, today);
        setAnnounce(`${shortDate(step)}. ${problem ?? 'Press Enter to drop here.'}`);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMoving(null);
        commitMove(day, moving.target);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMoving(null);
        setAnnounce('Move cancelled.');
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(day.date === selected ? null : day.date);
    } else if ((e.key === 'm' || e.key === 'M') && isMovable(day)) {
      e.preventDefault();
      setMoving({ id: day.scheduledWorkoutId!, from: day.date, target: day.date });
      setAnnounce(`Moving ${day.workoutName}. Use the arrow keys to choose a day, Enter to drop, Escape to cancel.`);
    }
  }

  const dropProps = (day: CalendarDay) => ({
    onDragOver: (e: React.DragEvent) => {
      const from = shown.find((d) => d.scheduledWorkoutId === dragId);
      if (from && !moveProblem(shown, from, day.date, today)) {
        e.preventDefault();
        if (over !== day.date) setOver(day.date);
      }
    },
    onDragLeave: () => setOver((o) => (o === day.date ? null : o)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = shown.find((d) => d.scheduledWorkoutId === dragId);
      setOver(null);
      setDragId(null);
      if (from) commitMove(from, day.date);
    },
  });

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
        <p className="mb-3 text-meta text-muted">Drag a planned session to another day, or select it and use Move. From the keyboard: focus a session, press M, use the arrow keys, then Enter.</p>
        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
        <div role="grid" aria-label={`${monthLabel(month)} training calendar`} aria-busy={pending} className="space-y-1">
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
                const isTarget = (moving && moving.target === day.date && moving.from !== day.date) || over === day.date;
                if (!hasSession(day)) {
                  return (
                    <div
                      key={di}
                      role="gridcell"
                      aria-label={`${shortDate(day.date)}, free`}
                      {...dropProps(day)}
                      className={clsx('h-14 rounded-sm border p-1.5 font-mono text-micro sm:h-16', isTarget ? 'border-signal bg-signal-bg text-ink' : 'border-line/60 text-faint')}
                    >
                      {dayNum}
                    </div>
                  );
                }
                const status = day.status!;
                const tip = tooltip(day, unit);
                const mark = MARK[status];
                const id = `cal-${day.date}`;
                const movable = isMovable(day);
                const align = di >= 5 ? 'right-0' : di <= 1 ? 'left-0' : 'left-1/2 -translate-x-1/2';
                return (
                  <div
                    key={di}
                    role="gridcell"
                    tabIndex={0}
                    aria-describedby={id}
                    aria-selected={selected === day.date}
                    aria-label={`${shortDate(day.date)}, ${DAY_STATUS_LABEL[status]}${day.workoutName ? `, ${day.workoutName}` : ''}${movable ? '. Press M to move' : ''}`}
                    draggable={movable && !pending}
                    onDragStart={(e) => {
                      setDragId(day.scheduledWorkoutId);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', day.scheduledWorkoutId ?? '');
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                    onClick={() => setSelected(selected === day.date ? null : day.date)}
                    onKeyDown={(e) => onCellKey(e, day)}
                    className={clsx(
                      'group relative flex h-14 flex-col justify-between rounded-sm border p-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ink sm:h-16',
                      CELL[status],
                      movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                      selected === day.date ? 'ring-1 ring-signal' : '',
                      moving?.from === day.date ? 'ring-2 ring-signal' : '',
                      dragId === day.scheduledWorkoutId && dragId ? 'opacity-50' : '',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className={clsx('font-mono text-micro', status === 'TODAY' ? 'text-ink' : 'text-muted')}>{dayNum}</span>
                      {mark.icon ? (
                        <span className={mark.className}>
                          <Icon icon={mark.icon} size={14} />
                        </span>
                      ) : null}
                    </span>
                    <span className={clsx('truncate text-meta text-muted', status === 'SKIPPED' ? 'line-through' : '')}>{status === 'MISSED' ? 'Missed' : day.workoutName}</span>
                    <div
                      id={id}
                      role="tooltip"
                      className={clsx(
                        'pointer-events-none absolute top-full z-20 mt-1 hidden w-56 space-y-0.5 rounded-md border border-line-strong bg-raised p-3 text-left group-hover:block group-focus-visible:block',
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

        <div ref={panelRef} aria-live="polite" className="mt-4">
          {sel && hasSession(sel) ? (
            <div className="space-y-3 rounded-md border border-line bg-canvas-low p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-ui font-semibold">
                  {sel.workoutName} <span className="font-mono text-micro font-normal text-muted">{shortDate(sel.date).toUpperCase()} · {DAY_STATUS_LABEL[sel.status!].toUpperCase()}</span>
                </p>
                {sel.workoutLogId ? (
                  <Link href={`/coach/clients/${clientId}/sessions/${sel.workoutLogId}`} className={buttonClass('secondary', undefined, 'sm')}>
                    <Icon icon={ClipboardCheck} />
                    Review session
                  </Link>
                ) : null}
              </div>
              {isMovable(sel) ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <Label htmlFor="move-date">Move to</Label>
                    <Input id="move-date" type="date" min={today} value={target} onChange={(e) => setTarget(e.target.value)} className="font-mono" />
                  </div>
                  <Button size="sm" onClick={() => commitMove(sel, target)} disabled={pending || !target || target === sel.date}>
                    Move
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => commitStatus(sel, 'SKIPPED')} disabled={pending}>
                    <Icon icon={SkipForward} />
                    Skip session
                  </Button>
                </div>
              ) : null}
              {sel.status === 'SKIPPED' && sel.scheduledWorkoutId ? (
                <div className="flex items-center gap-3">
                  <p className="text-meta text-muted">Skipped sessions stay out of adherence and streaks.</p>
                  <Button variant="secondary" size="sm" onClick={() => commitStatus(sel, 'PLANNED')} disabled={pending}>
                    Restore
                  </Button>
                </div>
              ) : null}
              <FormError>{error}</FormError>
            </div>
          ) : null}
        </div>

        <ul aria-label="Legend" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-meta text-muted">
          {(['COMPLETED', 'MISSED', 'HIGH_RPE', 'SCHEDULED', 'TODAY', 'SKIPPED'] as const).map((s) => (
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
