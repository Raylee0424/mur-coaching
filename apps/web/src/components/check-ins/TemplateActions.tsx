'use client';

import { CheckInCadence, WEEKDAY_LABELS } from '@coaching/shared';
import type { CheckInScheduleDto } from '@coaching/shared';
import { X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { assignCheckIn, deleteCheckInTemplate, unassignCheckIn } from '@/actions/check-ins';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';

/** Assign sheet plus delete for one template. */
export function AssignCheckIn({ templateId, title, clients, today }: { templateId: string; title: string; clients: { id: string; name: string }[]; today: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [cadence, setCadence] = useState<CheckInCadence>(CheckInCadence.WEEKLY);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    setError(undefined);
    const clientId = String(form.get('clientId') ?? '');
    if (!clientId) return setError('Pick a client.');
    start(async () => {
      const res = await assignCheckIn(
        cadence === CheckInCadence.WEEKLY
          ? { templateId, clientId, cadence, weekday: Number(form.get('weekday')) }
          : { templateId, clientId, cadence, dueDate: String(form.get('dueDate') ?? '') },
      );
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Check-in assigned', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={clients.length === 0} title={clients.length === 0 ? 'No active clients yet.' : undefined}>
        Assign
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title={`Assign “${title}”`}
        description="Assigning to a client who already has it replaces the schedule."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Assigning…' : 'Assign'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="as-client">Client</Label>
            <Select id="as-client" name="clientId" required defaultValue="">
              <option value="" disabled>
                Choose a client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <fieldset>
            <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Repeat</legend>
            <div className="flex gap-4">
              {[
                [CheckInCadence.WEEKLY, 'Every week'],
                [CheckInCadence.ONCE, 'One-off'],
              ].map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-ui">
                  <input type="radio" name="cadence" value={value} checked={cadence === value} onChange={() => setCadence(value as CheckInCadence)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {cadence === CheckInCadence.WEEKLY ? (
            <div>
              <Label htmlFor="as-day">Due every</Label>
              <Select id="as-day" name="weekday" defaultValue="0">
                {WEEKDAY_LABELS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-meta text-faint">Opens 3 days before the due day and stays open 3 days after.</p>
            </div>
          ) : (
            <div>
              <Label htmlFor="as-due">Due date</Label>
              <Input id="as-due" name="dueDate" type="date" min={today} required />
            </div>
          )}
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}

export function UnassignButton({ schedule }: { schedule: CheckInScheduleDto }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Unassign from ${schedule.clientName}`}
      onClick={() =>
        start(async () => {
          const res = await unassignCheckIn(schedule.id);
          toast.show(res.ok ? { message: `Unassigned from ${schedule.clientName}`, tone: 'ok' } : { message: res.error, tone: 'error' });
        })
      }
    >
      <Icon icon={X} />
    </Button>
  );
}

export function DeleteTemplateButton({ id, title }: { id: string; title: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteCheckInTemplate(id);
          toast.show(res.ok ? { message: 'Check-in deleted', tone: 'ok' } : { message: res.error, tone: 'error' });
        });
      }}
    >
      Delete
    </Button>
  );
}
