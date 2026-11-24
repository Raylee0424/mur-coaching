'use client';

import { CALL_KIND_LABELS, CALL_LIMITS, CallKind } from '@coaching/shared';
import type { BookingDto, CoachScheduleDto, SlotDto } from '@coaching/shared';
import clsx from 'clsx';
import { Copy, ExternalLink, Mic, MonitorUp, Plus, Video } from 'lucide-react';
import { useState, useTransition } from 'react';
import { coachBookCall, coachCancelBooking, coachUpdateBooking } from '@/actions/calls';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { dateKey, dayLabel, groupByDay, timeLabel, zonedInputToIso } from './calls-model';

type Editing = { mode: 'new'; slot: SlotDto | null } | { mode: 'edit'; booking: BookingDto };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'AT';
}

/** Week board (bookings and open slots in the coach's zone), embedded room card, and upcoming list. */
export function CoachSchedule({ schedule, timeZone }: { schedule: CoachScheduleDto; timeZone: string }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const days = groupByDay(
    [...schedule.upcoming.map((b) => ({ startsAt: b.startsAt, booking: b })), ...schedule.openSlots.map((s) => ({ startsAt: s.startsAt, slot: s }))],
    timeZone,
  ).slice(0, 7);
  days.forEach((d) => d.items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)));

  const nextCall = schedule.upcoming[0] ?? null;

  const close = () => {
    setEditing(null);
    setError(undefined);
  };

  function submit(form: FormData): void {
    setError(undefined);
    const startsAt = zonedInputToIso(String(form.get('date')), String(form.get('time')), timeZone);
    if (!startsAt) return setError('Pick a date and time.');
    const agenda = String(form.get('agenda') ?? '');
    start(async () => {
      const res =
        editing?.mode === 'edit'
          ? await coachUpdateBooking(editing.booking.id, {
              ...(startsAt !== editing.booking.startsAt ? { startsAt } : {}),
              agenda,
              meetingUrl: String(form.get('meetingUrl') ?? ''),
            })
          : await coachBookCall({ clientId: String(form.get('client')), kind: String(form.get('kind')) as CallKind, startsAt, agenda });
      if (!res.ok) return setError(res.error);
      toast.show({ message: editing?.mode === 'edit' ? 'Booking updated' : 'Call booked', tone: 'ok' });
      close();
    });
  }

  const cancel = (b: BookingDto) => {
    if (!window.confirm(`Cancel the call with ${b.clientName} on ${dayLabel(b.startsAt, timeZone)} at ${timeLabel(b.startsAt, timeZone)}?`)) return;
    start(async () => {
      const res = await coachCancelBooking(b.id);
      toast.show(res.ok ? { message: 'Call cancelled', tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  };

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ message: 'Room link copied', tone: 'ok' });
    } catch {
      toast.show({ message: 'Unable to copy link', tone: 'error' });
    }
  }

  const initial = editing?.mode === 'edit' ? editing.booking.startsAt : editing?.slot?.startsAt;

  return (
    <div className="space-y-6">
      {/* Embedded Web Video Call Room Preview */}
      {nextCall ? (
        <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-label-sm uppercase text-primary">Embedded Video Room · Next Session</span>
              <h2 className="mt-0.5 font-display text-title-md text-ink">
                {CALL_KIND_LABELS[nextCall.kind]} — {nextCall.clientName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="emerald">
                {dayLabel(nextCall.startsAt, timeZone)} · {timeLabel(nextCall.startsAt, timeZone)}
              </Badge>
              {nextCall.meetingUrl ? (
                <button
                  type="button"
                  onClick={() => copyLink(nextCall.meetingUrl!)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas-low px-3 py-1 font-mono text-label-sm text-ink hover:border-primary/40"
                >
                  <Icon icon={Copy} size={14} />
                  Copy Room Link
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative flex h-44 flex-col items-center justify-center gap-2 overflow-hidden rounded-sm border border-line bg-canvas-low">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-line bg-raised font-display text-title-lg text-ink">
                {initials(nextCall.clientName)}
              </span>
              <span className="font-mono text-label-sm text-muted">Waiting for athlete to join</span>
              <span className="absolute bottom-2.5 left-2.5 rounded-full border border-line bg-canvas/90 px-2.5 py-0.5 text-label-sm font-semibold text-ink">
                {nextCall.clientName} (Athlete)
              </span>
            </div>
            <div className="relative flex h-44 flex-col items-center justify-center gap-2 overflow-hidden rounded-sm border border-primary/40 bg-canvas-low">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-line bg-raised font-display text-title-lg text-primary">
                MC
              </span>
              <span className="font-mono text-label-sm text-muted">Coach Room Ready</span>
              <span className="absolute bottom-2.5 left-2.5 rounded-full border border-line bg-canvas/90 px-2.5 py-0.5 text-label-sm font-semibold text-primary">
                You (Coach)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="font-mono text-label-sm text-muted">
              Agenda: {nextCall.agenda || 'Check-in & progression review'}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-canvas-low text-muted" aria-hidden="true">
                <Icon icon={Mic} size={16} />
              </span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-canvas-low text-muted" aria-hidden="true">
                <Icon icon={Video} size={16} />
              </span>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-canvas-low text-muted" aria-hidden="true">
                <Icon icon={MonitorUp} size={16} />
              </span>
              {nextCall.meetingUrl ? (
                <a href={nextCall.meetingUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', undefined, 'sm')}>
                  <Icon icon={ExternalLink} />
                  Join Room
                </a>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setEditing({ mode: 'edit', booking: nextCall })}>
                  Set Room Link
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Built-In Client Booking Availability Calendar */}
      <section className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-title-md text-ink">Booking Availability · Next 7 Days</h2>
            <p className="text-label-md text-muted">Clients self-book 20-min check-in or 30-min onboarding slots.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-line bg-canvas-low px-3 py-1 font-mono text-label-sm text-primary">
              {schedule.openSlots.length} Open Slots
            </span>
            <Button size="sm" onClick={() => setEditing({ mode: 'new', slot: null })} disabled={schedule.clients.length === 0}>
              <Icon icon={Plus} />
              Book Call
            </Button>
          </div>
        </div>

        {days.length === 0 ? (
          <p className="py-4 text-ui text-muted">No bookings or open slots this week. Add availability windows to let clients book.</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-7">
            {days.map((d, dayIdx) => (
              <section key={d.date} aria-label={d.label} className="flex flex-col gap-2 rounded-sm border border-line bg-canvas-low p-3">
                <h3 className={clsx('font-mono text-label-sm uppercase', dayIdx === 0 ? 'text-primary' : 'text-ink')}>{d.label}</h3>
                <ul className="space-y-1.5">
                  {d.items.map((it, idx) =>
                    'booking' in it && it.booking ? (
                      <li key={it.booking.id}>
                        <button
                          type="button"
                          onClick={() => setEditing({ mode: 'edit', booking: it.booking })}
                          className={clsx(
                            'w-full truncate rounded-sm border px-2 py-1 text-left font-mono text-label-sm transition-colors',
                            idx % 2 === 0
                              ? 'border-emerald/40 bg-emerald-bg text-emerald hover:border-emerald'
                              : 'border-primary/40 bg-primary-container text-primary hover:border-primary',
                          )}
                        >
                          {timeLabel(it.startsAt, timeZone)} {it.booking.clientName.split(' ')[0]}
                        </button>
                      </li>
                    ) : 'slot' in it && it.slot ? (
                      <li key={it.startsAt}>
                        <button
                          type="button"
                          onClick={() => setEditing({ mode: 'new', slot: it.slot })}
                          disabled={schedule.clients.length === 0}
                          className="w-full rounded-sm border border-line px-2 py-1 text-left font-mono text-label-sm text-muted transition-colors hover:border-primary/40 hover:text-ink disabled:opacity-50"
                        >
                          {timeLabel(it.startsAt, timeZone)} Open
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming calls list */}
      <section className="overflow-hidden rounded-md border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display text-title-md text-ink">Upcoming Calls</h2>
          <span className="font-mono text-label-sm text-muted">{schedule.upcoming.length} scheduled</span>
        </div>
        {schedule.upcoming.length === 0 ? (
          <p className="p-5 text-ui text-muted">No calls booked.</p>
        ) : (
          <ul className="divide-y divide-line">
            {schedule.upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-raised/40">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-ui font-semibold text-ink">
                    {b.clientName} <span className="font-sans font-normal text-muted">· {CALL_KIND_LABELS[b.kind]}</span>
                  </p>
                  <p className="font-mono text-meta text-muted">
                    {dayLabel(b.startsAt, timeZone)} · {timeLabel(b.startsAt, timeZone)}–{timeLabel(b.endsAt, timeZone)}
                    {b.bookedByClient ? ' · self-booked' : ''}
                  </p>
                  {b.agenda ? <p className="mt-0.5 truncate text-meta text-muted">{b.agenda}</p> : null}
                </div>
                {b.meetingUrl ? (
                  <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', undefined, 'sm')}>
                    <Icon icon={ExternalLink} />
                    Join
                  </a>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => setEditing({ mode: 'edit', booking: b })}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => cancel(b)} disabled={pending}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet
        open={editing !== null}
        onClose={close}
        title={editing?.mode === 'edit' ? `Call with ${editing.booking.clientName}` : 'Book a call'}
        description={`Times are in ${timeZone}.`}
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={pending}>
              Close
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {editing?.mode === 'edit' ? 'Save' : 'Book'}
            </Button>
          </>
        }
      >
        {editing ? (
          <div key={editing.mode === 'edit' ? editing.booking.id : (editing.slot?.startsAt ?? 'new')} className="space-y-4">
            {editing.mode === 'new' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bk-client">Client</Label>
                  <Select id="bk-client" name="client" required>
                    {schedule.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bk-kind">Call</Label>
                  <Select id="bk-kind" name="kind" defaultValue={CallKind.CHECK_IN}>
                    {Object.values(CallKind).map((k) => (
                      <option key={k} value={k}>
                        {CALL_KIND_LABELS[k]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bk-date">Date</Label>
                <Input id="bk-date" name="date" type="date" required defaultValue={initial ? dateKey(initial, timeZone) : ''} />
              </div>
              <div>
                <Label htmlFor="bk-time">Start</Label>
                <Input id="bk-time" name="time" type="time" required defaultValue={initial ? timeLabel(initial, timeZone) : ''} />
              </div>
            </div>
            <div>
              <Label htmlFor="bk-agenda">Agenda (optional)</Label>
              <Input
                id="bk-agenda"
                name="agenda"
                maxLength={CALL_LIMITS.maxAgenda}
                defaultValue={editing.mode === 'edit' ? (editing.booking.agenda ?? '') : ''}
                placeholder="Block 3 review: squat progression and RPE cap"
              />
            </div>
            {editing.mode === 'edit' ? (
              <div>
                <Label htmlFor="bk-url">Video room link</Label>
                <Input id="bk-url" name="meetingUrl" type="url" maxLength={CALL_LIMITS.maxUrl} defaultValue={editing.booking.meetingUrl ?? ''} placeholder="https://" />
              </div>
            ) : null}
            <FormError>{error}</FormError>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
