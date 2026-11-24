'use client';

import { CALL_LIMITS, formatMinute, validateAvailability, WEEKDAY_LABELS } from '@coaching/shared';
import type { AvailabilityDto, AvailabilityWindow } from '@coaching/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { saveAvailability } from '@/actions/calls';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { parseClock, timeZones } from './calls-model';

interface Row {
  key: number;
  weekday: number;
  start: string;
  end: string;
}

const toRows = (windows: AvailabilityWindow[]): Row[] => windows.map((w, i) => ({ key: i, weekday: w.weekday, start: formatMinute(w.startMinute), end: formatMinute(w.endMinute) }));

export function AvailabilityEditor({ availability }: { availability: AvailabilityDto | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(availability?.timezone ?? '');
  const [rows, setRows] = useState<Row[]>(toRows(availability?.windows ?? []));
  const [meetingUrl, setMeetingUrl] = useState(availability?.meetingUrl ?? '');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const zones = useMemo(() => (open ? timeZones() : []), [open]);

  const openSheet = () => {
    if (!timezone) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    setOpen(true);
  };
  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function save(): void {
    setError(undefined);
    const windows: AvailabilityWindow[] = [];
    for (const r of rows) {
      const startMinute = parseClock(r.start);
      const endMinute = parseClock(r.end);
      if (startMinute === null || endMinute === null) return setError('Fill in every start and end time.');
      windows.push({ weekday: r.weekday, startMinute, endMinute });
    }
    const input = { timezone, windows, meetingUrl: meetingUrl.trim() || null };
    const problem = validateAvailability(input);
    if (problem) return setError(problem);
    start(async () => {
      const res = await saveAvailability(input);
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Availability saved', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={openSheet}>
        Edit availability
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        title="Booking availability"
        description="Clients self-book 20-minute check-ins or 30-minute onboarding calls inside these weekly windows."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending} aria-busy={pending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="av-tz">Timezone</Label>
            <Select id="av-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {(zones.includes(timezone) ? zones : [timezone, ...zones]).map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1 font-mono text-micro uppercase text-muted">Weekly windows</legend>
            {rows.length === 0 ? <p className="text-meta text-muted">No windows: clients cannot book until you add one.</p> : null}
            {rows.map((r, i) => (
              <div key={r.key} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                <div>
                  <Label htmlFor={`av-day-${r.key}`} className="sr-only">
                    Window {i + 1} day
                  </Label>
                  <Select id={`av-day-${r.key}`} value={r.weekday} onChange={(e) => update(r.key, { weekday: Number(e.target.value) })}>
                    {WEEKDAY_LABELS.map((d, n) => (
                      <option key={d} value={n}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input type="time" step={1800} aria-label={`Window ${i + 1} start`} value={r.start} onChange={(e) => update(r.key, { start: e.target.value })} className="w-28" />
                <Input type="time" step={1800} aria-label={`Window ${i + 1} end`} value={r.end} onChange={(e) => update(r.key, { end: e.target.value })} className="w-28" />
                <Button variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Remove window ${i + 1}`}>
                  <Icon icon={Trash2} />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="secondary"
              disabled={rows.length >= CALL_LIMITS.maxWindows}
              onClick={() => setRows((rs) => [...rs, { key: Math.max(-1, ...rs.map((x) => x.key)) + 1, weekday: 1, start: '09:00', end: '12:00' }])}
            >
              <Icon icon={Plus} />
              Add window
            </Button>
          </fieldset>
          <div>
            <Label htmlFor="av-url">Default video room link (optional)</Label>
            <Input id="av-url" type="url" inputMode="url" placeholder="https://meet.example.com/your-room" value={meetingUrl} maxLength={CALL_LIMITS.maxUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
            <p className="mt-1 text-meta text-muted">Copied onto each new booking. Use any provider; the call opens in a new tab.</p>
          </div>
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}
