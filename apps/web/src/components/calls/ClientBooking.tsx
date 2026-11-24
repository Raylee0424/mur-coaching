'use client';

import { CALL_KIND_LABELS, CALL_LIMITS, CallKind } from '@coaching/shared';
import type { BookingDto, ClientCallsDto, SlotDto } from '@coaching/shared';
import clsx from 'clsx';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { bookCall, cancelCall, moveCall } from '@/actions/calls';
import { Button, buttonClass } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { dayLabel, groupByDay, timeLabel, zoneLabel } from './calls-model';

/** The viewer's own timezone, after mount. Renders `fallback` first so server and client HTML match. */
function useViewerZone(fallback: string): string {
  const [zone, setZone] = useState(fallback);
  useEffect(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone || fallback), [fallback]);
  return zone;
}

/** Slots show in the viewer's own zone; the coach's zone is named when it differs. */
export function ClientBooking({ data }: { data: ClientCallsDto & { timezone: string } }) {
  const toast = useToast();
  const zone = useViewerZone(data.timezone);
  const [kind, setKind] = useState<CallKind>(CallKind.CHECK_IN);
  const [picked, setPicked] = useState<SlotDto | null>(null);
  const [moving, setMoving] = useState<BookingDto | null>(null);
  const [agenda, setAgenda] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const activeKind = moving?.kind ?? kind;
  const days = groupByDay(data.slots[activeKind], zone);
  const at = (iso: string) => `${dayLabel(iso, zone)} · ${timeLabel(iso, zone)}`;

  const confirm = () => {
    if (!picked) return;
    setError(undefined);
    start(async () => {
      const res = moving ? await moveCall(moving.id, picked.startsAt) : await bookCall({ kind, startsAt: picked.startsAt, agenda: agenda.trim() || null });
      if (!res.ok) return setError(res.error);
      toast.show({ message: moving ? 'Call moved' : 'Call booked', tone: 'ok' });
      setPicked(null);
      setMoving(null);
      setAgenda('');
    });
  };
  const cancel = (b: BookingDto) => {
    if (!window.confirm(`Cancel your call on ${at(b.startsAt)}?`)) return;
    start(async () => {
      const res = await cancelCall(b.id);
      toast.show(res.ok ? { message: 'Call cancelled', tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  };

  return (
    <div className="space-y-6">
      {data.upcoming.length ? (
        <Panel title="Your upcoming calls">
          <ul className="divide-y divide-line">
            {data.upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-ui font-medium">{CALL_KIND_LABELS[b.kind]}</p>
                  <p className="font-mono text-meta text-muted">{at(b.startsAt)}</p>
                  {b.agenda ? <p className="truncate text-meta">{b.agenda}</p> : null}
                </div>
                {b.meetingUrl ? (
                  <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', undefined, 'sm')}>
                    <Icon icon={ExternalLink} />
                    Join
                  </a>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => (setMoving(b), setPicked(null))}>
                  Move
                </Button>
                <Button size="sm" variant="ghost" onClick={() => cancel(b)} disabled={pending}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title={moving ? `Move call on ${at(moving.startsAt)}` : 'Book a call'}
        meta={`times in ${zoneLabel(zone)}${zone !== data.timezone ? ` · coach in ${zoneLabel(data.timezone)}` : ''}`}
        actions={
          moving ? (
            <Button size="sm" variant="ghost" onClick={() => (setMoving(null), setPicked(null))}>
              Stop moving
            </Button>
          ) : null
        }
      >
        <div className="space-y-4 p-4">
          {!moving ? (
            <div role="radiogroup" aria-label="Call type" className="inline-flex gap-0.5 rounded border border-line bg-canvas-low p-0.5">
              {Object.values(CallKind).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => (setKind(k), setPicked(null))}
                  className={clsx('h-8 rounded-sm px-2.5 text-ui', kind === k ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
                >
                  {CALL_KIND_LABELS[k]}
                </button>
              ))}
            </div>
          ) : null}
          {days.length === 0 ? (
            <p className="text-ui text-muted">No open times in the next {CALL_LIMITS.horizonDays} days. Message your coach to find a time.</p>
          ) : (
            <div className="space-y-3">
              {days.map((d) => (
                <fieldset key={d.date}>
                  <legend className="mb-1 font-mono text-micro uppercase text-muted">{d.label}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {d.items.map((s) => (
                      <button
                        key={s.startsAt}
                        type="button"
                        aria-pressed={picked?.startsAt === s.startsAt}
                        onClick={() => setPicked(s)}
                        className={clsx('h-9 rounded border px-3 font-mono text-ui', picked?.startsAt === s.startsAt ? 'border-primary bg-primary text-primary-ink' : 'border-line-strong hover:border-faint')}
                      >
                        {timeLabel(s.startsAt, zone)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}
          {picked ? (
            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-ui">
                {moving ? 'Move to' : CALL_KIND_LABELS[kind]} on <strong>{at(picked.startsAt)}</strong>
              </p>
              {!moving ? (
                <div>
                  <Label htmlFor="cb-agenda">What do you want to cover? (optional)</Label>
                  <Input id="cb-agenda" value={agenda} maxLength={CALL_LIMITS.maxAgenda} onChange={(e) => setAgenda(e.target.value)} />
                </div>
              ) : null}
              <FormError>{error}</FormError>
              <Button onClick={confirm} disabled={pending} aria-busy={pending}>
                {moving ? 'Confirm move' : 'Confirm booking'}
              </Button>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
