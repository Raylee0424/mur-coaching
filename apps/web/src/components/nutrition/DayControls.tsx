'use client';

import clsx from 'clsx';
import { Droplet, Trash2, Undo2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { FOOD_SOURCE_LABELS, MEAL_SLOT_LABELS, NUTRITION_LIMITS } from '@coaching/shared';
import type { MealEntryDto, NutritionTargetDto, SaveNutritionTargetRequest, WaterLogDto } from '@coaching/shared';
import { clearClientTarget, deleteMealEntry, deleteWater, logWater, saveClientTarget, saveOwnTarget } from '@/actions/nutrition';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { SOURCE_TONE } from './FoodPicker';
import { fmt, groupBySlot, litres, macroKcal, pcf, waterTotal } from './nutrition-model';

/** Stitch "Logged Foods" table, grouped by meal. `editable` adds a delete control per row. */
export function FoodLogTable({ entries, editable }: { entries: MealEntryDto[]; editable: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string>();

  function remove(e: MealEntryDto): void {
    setBusyId(e.id);
    start(async () => {
      const res = await deleteMealEntry(e.id);
      setBusyId(undefined);
      toast.show(res.ok ? { message: `${e.name} removed`, tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  }

  if (!entries.length) return <p className="px-6 py-8 text-body-md text-muted">Nothing logged for this day yet.</p>;

  return (
    <div className="relative overflow-x-auto">
      <table className={TABLE}>
        <thead className={THEAD}>
          <tr>
            <th scope="col" className={TH}>Food item</th>
            <th scope="col" className={TH}>Database</th>
            <th scope="col" className={TH_NUM}>Serving</th>
            <th scope="col" className={TH_NUM}>kcal</th>
            <th scope="col" className={TH_NUM}>P / C / F</th>
            {editable ? <th scope="col" className={TH}><span className="sr-only">Actions</span></th> : null}
          </tr>
        </thead>
        {groupBySlot(entries).map((g) => (
          <tbody key={g.slot}>
            <tr className="border-t border-line bg-canvas-low">
              <th scope="rowgroup" colSpan={editable ? 6 : 5} className="px-6 py-2 text-left font-mono text-label-sm uppercase text-primary">
                {MEAL_SLOT_LABELS[g.slot]} · {fmt(g.entries.reduce((s, e) => s + Number(e.nutrients.kcal), 0))} kcal
              </th>
            </tr>
            {g.entries.map((e) => (
              <tr key={e.id} className={TR}>
                <td className={clsx(TD, 'text-ink')}>{e.name}</td>
                <td className={TD}>
                  <Badge tone={SOURCE_TONE[e.source]}>{FOOD_SOURCE_LABELS[e.source]}</Badge>
                </td>
                <td className={clsx(TD_NUM, 'text-muted')}>{fmt(Number(e.grams), 1)} g</td>
                <td className={clsx(TD_NUM, 'text-ink')}>{fmt(Number(e.nutrients.kcal))}</td>
                <td className={clsx(TD_NUM, 'text-muted')}>{pcf(e.nutrients)}</td>
                {editable ? (
                  <td className={clsx(TD, 'w-12 text-right')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-9 px-0"
                      aria-label={`Remove ${e.name}`}
                      disabled={pending && busyId === e.id}
                      onClick={() => remove(e)}
                    >
                      <Icon icon={Trash2} />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Stitch water card: +250 / +500 ml quick adds, undo the last entry. */
export function WaterTracker({ date, water, targetMl }: { date: string; water: WaterLogDto[]; targetMl: number }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const total = waterTotal(water);
  const pct = Math.round((total / targetMl) * 100);
  const last = water.at(-1);

  function add(ml: number): void {
    start(async () => {
      const res = await logWater(date, ml);
      if (!res.ok) toast.show({ message: res.error, tone: 'error' });
    });
  }

  function undo(): void {
    if (!last) return;
    start(async () => {
      const res = await deleteWater(last.id);
      toast.show(res.ok ? { message: `Removed ${last.ml} ml`, tone: 'ok' } : { message: res.error, tone: 'error' });
    });
  }

  return (
    <article aria-labelledby="water-heading" className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon={Droplet} size={20} className="text-sky" />
          <h2 id="water-heading" className="font-display text-title-md text-ink">
            Water Intake
          </h2>
        </div>
        <span className="font-mono text-title-md text-sky tabular-nums" aria-live="polite">
          {litres(total)} / {litres(targetMl)} L
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Water ${pct}% of goal`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, pct)}
        className="h-3 overflow-hidden rounded-full border border-line bg-canvas-low"
      >
        <div className="h-full rounded-full bg-sky" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" className="font-mono" disabled={pending} onClick={() => add(250)}>
          +250 ml
        </Button>
        <Button className="font-mono" disabled={pending} onClick={() => add(500)}>
          +500 ml
        </Button>
      </div>
      {last ? (
        <Button variant="ghost" size="sm" className="self-start" disabled={pending} onClick={undo}>
          <Icon icon={Undo2} size={14} />
          Undo last ({last.ml} ml)
        </Button>
      ) : null}
    </article>
  );
}

type TargetFields = Record<keyof SaveNutritionTargetRequest, string>;

const FIELD_META: { key: keyof SaveNutritionTargetRequest; label: string; tone: string; optional?: boolean }[] = [
  { key: 'proteinG', label: 'Protein (g)', tone: 'text-sky' },
  { key: 'carbsG', label: 'Carbs (g)', tone: 'text-emerald' },
  { key: 'fatG', label: 'Fat (g)', tone: 'text-amber' },
];

function toFields(t: NutritionTargetDto | null): TargetFields {
  const s = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n));
  return { kcal: s(t?.kcal), proteinG: s(t?.proteinG), carbsG: s(t?.carbsG), fatG: s(t?.fatG), fiberG: s(t?.fiberG), waterMl: s(t?.waterMl) };
}

/** Calorie, macro, fiber and water targets. `clientId` set = coach editing that client; otherwise the client's own. */
export function TargetForm({ target, clientId, onDone, submitLabel = 'Save targets' }: { target: NutritionTargetDto | null; clientId?: string; onDone?: () => void; submitLabel?: string }) {
  const toast = useToast();
  const [f, setF] = useState<TargetFields>(() => toFields(target));
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const set = (k: keyof TargetFields) => (e: { target: { value: string } }) => setF((v) => ({ ...v, [k]: e.target.value }));
  const num = (s: string): number => Math.round(Number(s));
  const implied = macroKcal({ proteinG: num(f.proteinG) || 0, carbsG: num(f.carbsG) || 0, fatG: num(f.fatG) || 0 });
  const drift = f.kcal ? implied - num(f.kcal) : 0;

  function save(): void {
    if (!f.kcal || !f.proteinG || !f.carbsG || !f.fatG) return setError('Calories, protein, carbs and fat are required.');
    const input: SaveNutritionTargetRequest = {
      kcal: num(f.kcal),
      proteinG: num(f.proteinG),
      carbsG: num(f.carbsG),
      fatG: num(f.fatG),
      fiberG: f.fiberG ? num(f.fiberG) : null,
      waterMl: f.waterMl ? num(f.waterMl) : null,
    };
    setError(undefined);
    start(async () => {
      const res = clientId ? await saveClientTarget(clientId, input) : await saveOwnTarget(input);
      if (!res.ok) return setError(res.error);
      toast.show({ message: clientId ? 'Targets synced to the client’s log' : 'Targets saved', tone: 'ok' });
      onDone?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="t-kcal">Daily calories (kcal)</Label>
        <Input id="t-kcal" type="number" inputMode="numeric" min={NUTRITION_LIMITS.minKcal} max={NUTRITION_LIMITS.maxKcal} value={f.kcal} onChange={set('kcal')} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {FIELD_META.map((m) => (
          <div key={m.key}>
            <Label htmlFor={`t-${m.key}`} className={m.tone}>
              {m.label}
            </Label>
            <Input id={`t-${m.key}`} type="number" inputMode="numeric" min={0} value={f[m.key]} onChange={set(m.key)} />
          </div>
        ))}
      </div>
      <p className={clsx('font-mono text-label-sm', Math.abs(drift) > 150 ? 'text-amber' : 'text-muted')} aria-live="polite">
        Macros add up to {fmt(implied)} kcal{f.kcal ? ` (${drift >= 0 ? '+' : ''}${fmt(drift)} vs target)` : ''}.
      </p>
      <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
        <div>
          <Label htmlFor="t-fiber">Fiber (g)</Label>
          <Input id="t-fiber" type="number" inputMode="numeric" min={0} max={NUTRITION_LIMITS.maxFiberG} value={f.fiberG} onChange={set('fiberG')} placeholder="28 (DV)" />
        </div>
        <div>
          <Label htmlFor="t-water">Water (ml)</Label>
          <Input
            id="t-water"
            type="number"
            inputMode="numeric"
            min={NUTRITION_LIMITS.minWaterMl}
            max={NUTRITION_LIMITS.maxWaterMl}
            step={100}
            value={f.waterMl}
            onChange={set('waterMl')}
            placeholder={String(NUTRITION_LIMITS.defaultWaterMl)}
          />
        </div>
      </div>
      <FormError>{error}</FormError>
      <Button size="lg" className="w-full" onClick={save} disabled={pending} aria-busy={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </div>
  );
}

/** Client header control: edit own targets, or explain who manages them. */
export function EditTargetsButton({ target, canEdit }: { target: NutritionTargetDto | null; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {target ? 'Edit targets' : 'Set targets'}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Nutrition targets" description={`Calories cannot go below ${NUTRITION_LIMITS.minKcal} kcal.`}>
        <TargetForm target={target} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}

/** Coach: hand target control back to the client. */
export function ReleaseTargetButton({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm('Remove these targets? The client can then set their own.')) return;
        start(async () => {
          const res = await clearClientTarget(clientId);
          toast.show(res.ok ? { message: 'Targets removed', tone: 'ok' } : { message: res.error, tone: 'error' });
        });
      }}
    >
      Remove targets
    </Button>
  );
}
