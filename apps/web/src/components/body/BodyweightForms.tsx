'use client';

import type { BodyGoalDto, WeightUnit } from '@coaching/shared';
import { useState, useTransition } from 'react';
import { clearBodyGoal, deleteBodyweight, logBodyweight, saveBodyGoal } from '@/actions/body';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { displayToKg, kgToDisplay, unitLabel } from '@/lib/units';

const toKgString = (raw: string, unit: WeightUnit): string | null => {
  const n = Number(raw);
  return raw.trim() && Number.isFinite(n) && n > 0 ? displayToKg(n, unit).toFixed(2) : null;
};

/** Header button: log today's (or another day's) weight in the user's unit. */
export function LogWeightButton({ today, unit }: { today: string; unit: WeightUnit }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    const kg = toKgString(String(form.get('weight') ?? ''), unit);
    if (!kg) return setError('Enter your weight.');
    setError(undefined);
    start(async () => {
      const res = await logBodyweight(String(form.get('date') ?? today), kg);
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Weight logged', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Log weight
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title="Log bodyweight"
        description="One entry per day. Logging the same day again replaces it."
        form={{ action: submit }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bw-weight">Weight ({unitLabel(unit)})</Label>
            <Input id="bw-weight" name="weight" type="number" inputMode="decimal" step="0.1" min="1" required size="lg" autoFocus />
          </div>
          <div>
            <Label htmlFor="bw-date">Date</Label>
            <Input id="bw-date" name="date" type="date" defaultValue={today} max={today} required size="lg" />
          </div>
          <div className="col-span-2">
            <FormError>{error}</FormError>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export function GoalForm({ goal, unit }: { goal: BodyGoalDto | null; unit: WeightUnit }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(form: FormData): void {
    const kg = toKgString(String(form.get('target') ?? ''), unit);
    if (!kg) return setError('Enter a target weight.');
    const date = String(form.get('targetDate') ?? '');
    setError(undefined);
    start(async () => {
      const res = await saveBodyGoal({ targetKg: kg, targetDate: date || null });
      if (!res.ok) return setError(res.error);
      toast.show({ message: 'Goal saved', tone: 'ok' });
    });
  }

  return (
    <form action={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="goal-kg">Target ({unitLabel(unit)})</Label>
          <Input id="goal-kg" name="target" type="number" inputMode="decimal" step="0.1" min="1" defaultValue={goal ? kgToDisplay(Number(goal.targetKg), unit) : undefined} />
        </div>
        <div>
          <Label htmlFor="goal-date">By (optional)</Label>
          <Input id="goal-date" name="targetDate" type="date" defaultValue={goal?.targetDate ?? undefined} />
        </div>
      </div>
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Save goal
        </Button>
        {goal ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await clearBodyGoal();
                toast.show(res.ok ? { message: 'Goal cleared', tone: 'ok' } : { message: res.error, tone: 'error' });
              })
            }
          >
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function DeleteEntryButton({ date, label }: { date: string; label: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Delete entry for ${label}`}
      onClick={() =>
        start(async () => {
          const res = await deleteBodyweight(date);
          toast.show(res.ok ? { message: 'Entry deleted', tone: 'ok' } : { message: res.error, tone: 'error' });
        })
      }
    >
      Delete
    </Button>
  );
}
