'use client';

import { useState, useTransition } from 'react';
import { MEAL_SLOTS, MEAL_SLOT_LABELS, scaleNutrients } from '@coaching/shared';
import type { FoodDto, MealSlot } from '@coaching/shared';
import { createFood, logMeal } from '@/actions/nutrition';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { FoodPicker } from './FoodPicker';
import { fmt, pcf, slotForHour } from './nutrition-model';

/** Header CTA: search the catalog (or add a custom food), pick a slot and grams, log. */
export function LogFoodButton({ date, label = '+ Log Food' }: { date: string; label?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<MealSlot>('BREAKFAST');
  const [food, setFood] = useState<FoodDto | null>(null);
  const [grams, setGrams] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function openSheet(): void {
    setSlot(slotForHour(new Date().getHours()));
    setFood(null);
    setGrams('');
    setCreating(false);
    setError(undefined);
    setOpen(true);
  }

  function pick(f: FoodDto): void {
    setFood(f);
    setGrams(f.servingG);
    setCreating(false);
  }

  function submit(): void {
    if (!food) return setError('Pick a food first.');
    start(async () => {
      const res = await logMeal({ date, slot, foodId: food.id, grams });
      if (!res.ok) return setError(res.error);
      toast.show({ message: `${food.name} logged`, tone: 'ok' });
      setOpen(false);
    });
  }

  const preview = food && Number(grams) > 0 ? scaleNutrients(food.per100g, Number(grams)) : null;

  return (
    <>
      <Button size="sm" onClick={openSheet}>
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title="Log food"
        description="Search the catalog or add your own food. Nutrients are saved with the entry."
        variant="drawer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !food} aria-busy={pending}>
              {pending ? 'Logging…' : 'Log food'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="log-slot">Meal</Label>
            <Select id="log-slot" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
              {MEAL_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {MEAL_SLOT_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>

          <FoodPicker onPick={pick} selectedId={food?.id} allowFavorite />

          {food ? (
            <div className="space-y-3 rounded-sm border border-primary/40 bg-canvas-low p-4">
              <p className="text-label-lg text-ink">{food.name}</p>
              <div>
                <Label htmlFor="log-grams">Amount (g){food.servingLabel ? ` · 1 serving = ${food.servingLabel} (${food.servingG} g)` : ''}</Label>
                <Input id="log-grams" type="number" inputMode="decimal" min="0.1" step="0.1" value={grams} onChange={(e) => setGrams(e.target.value)} />
              </div>
              {preview ? (
                <p className="font-mono text-label-md text-muted" aria-live="polite">
                  {fmt(Number(preview.kcal))} kcal · {pcf(preview)} P / C / F
                </p>
              ) : null}
            </div>
          ) : null}

          {creating ? (
            <CustomFoodForm onCreated={pick} onCancel={() => setCreating(false)} />
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
              + Custom food
            </Button>
          )}
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}

const FIELDS = [
  ['kcal', 'Calories (kcal)'],
  ['proteinG', 'Protein (g)'],
  ['carbsG', 'Carbs (g)'],
  ['fatG', 'Fat (g)'],
  ['fiberG', 'Fiber (g, optional)'],
] as const;
type FieldKey = (typeof FIELDS)[number][0] | 'name' | 'servingG' | 'servingLabel';

/** Values per 100 g, the same basis as the USDA catalog. Not a <form>: it sits inside the sheet's own form. */
export function CustomFoodForm({ onCreated, onCancel }: { onCreated: (food: FoodDto) => void; onCancel: () => void }) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    name: '', servingG: '100', servingLabel: '', kcal: '', proteinG: '', carbsG: '', fatG: '', fiberG: '',
  });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const set = (k: FieldKey) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function save(): void {
    const v = Object.fromEntries(Object.entries(values).map(([k, x]) => [k, x.trim()])) as Record<FieldKey, string>;
    if (!v.name || !v.kcal || !v.proteinG || !v.carbsG || !v.fatG) return setError('Name, calories, protein, carbs and fat are required.');
    start(async () => {
      const res = await createFood({
        name: v.name,
        servingG: v.servingG || '100',
        servingLabel: v.servingLabel || null,
        per100g: { kcal: v.kcal, proteinG: v.proteinG, carbsG: v.carbsG, fatG: v.fatG, fiberG: v.fiberG || null },
      });
      if (!res.ok) return setError(res.error);
      onCreated(res.data);
    });
  }

  return (
    <fieldset className="space-y-3 rounded-sm border border-line bg-canvas-low p-4">
      <legend className="px-1 font-sans text-label-sm uppercase tracking-wider text-muted">Custom food · per 100 g</legend>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="cf-name">Name</Label>
          <Input id="cf-name" value={values.name} onChange={set('name')} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="cf-serving">Serving (g)</Label>
          <Input id="cf-serving" type="number" inputMode="decimal" min="0.1" step="0.1" value={values.servingG} onChange={set('servingG')} />
        </div>
        <div>
          <Label htmlFor="cf-label">Serving label</Label>
          <Input id="cf-label" value={values.servingLabel} onChange={set('servingLabel')} maxLength={40} placeholder="1 scoop" />
        </div>
        {FIELDS.map(([k, label]) => (
          <div key={k}>
            <Label htmlFor={`cf-${k}`}>{label}</Label>
            <Input id={`cf-${k}`} type="number" inputMode="decimal" min="0" step="0.1" value={values[k]} onChange={set(k)} />
          </div>
        ))}
      </div>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? 'Saving…' : 'Save food'}
        </Button>
      </div>
    </fieldset>
  );
}
