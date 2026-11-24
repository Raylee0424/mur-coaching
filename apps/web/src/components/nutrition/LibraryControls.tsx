'use client';

import { Trash2, X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { MEAL_SLOTS, MEAL_SLOT_LABELS, NUTRITION_LIMITS } from '@coaching/shared';
import type { FoodDto, GroceryItemDto, LogMealRequest, MealSlot } from '@coaching/shared';
import { createMealTemplate, deleteMealTemplate, logMeal } from '@/actions/nutrition';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { FoodPicker } from './FoodPicker';
import { fmt, slotForHour } from './nutrition-model';

type QuickSource = { kind: 'template'; templateId: string } | { kind: 'planMeal'; planMealId: string } | { kind: 'food'; foodId: string; grams: string };

/** One-tap log for a template, recipe, plan meal or favorite: pick the meal slot (and servings for recipes). */
export function QuickLogButton({ name, date, source, label = 'Log', variant = 'primary' }: { name: string; date: string; source: QuickSource; label?: string; variant?: ButtonVariant }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<MealSlot>('BREAKFAST');
  const [amount, setAmount] = useState('1');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function show(): void {
    setSlot(slotForHour(new Date().getHours()));
    setAmount(source.kind === 'food' ? source.grams : '1');
    setError(undefined);
    setOpen(true);
  }

  function submit(): void {
    const base = { date, slot };
    const req: LogMealRequest =
      source.kind === 'template'
        ? { ...base, templateId: source.templateId, servings: amount }
        : source.kind === 'planMeal'
          ? { ...base, planMealId: source.planMealId }
          : { ...base, foodId: source.foodId, grams: amount };
    start(async () => {
      const res = await logMeal(req);
      if (!res.ok) return setError(res.error);
      toast.show({ message: `${name} logged`, tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant={variant} onClick={show}>
        {label}
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title={`Log ${name}`}
        description="Logged to today. Nutrients are saved with each entry."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending} aria-busy={pending}>
              {pending ? 'Logging…' : 'Log'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className={source.kind === 'planMeal' ? 'col-span-2' : undefined}>
            <Label htmlFor="ql-slot">Meal</Label>
            <Select id="ql-slot" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
              {MEAL_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {MEAL_SLOT_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          {source.kind === 'template' ? (
            <div>
              <Label htmlFor="ql-servings">Servings eaten</Label>
              <Input id="ql-servings" type="number" inputMode="decimal" min="0.25" step="0.25" max={NUTRITION_LIMITS.maxTemplateServings} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          ) : null}
          {source.kind === 'food' ? (
            <div>
              <Label htmlFor="ql-grams">Amount (g)</Label>
              <Input id="ql-grams" type="number" inputMode="decimal" min="0.1" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          ) : null}
          <div className="col-span-2">
            <FormError>{error}</FormError>
          </div>
        </div>
      </Sheet>
    </>
  );
}

/** Checkable weekly grocery list. Ticks live in this browser only (localStorage, per plan). */
export function GroceryChecklist({ planId, items }: { planId: string; items: GroceryItemDto[] }) {
  const key = `mur.grocery.${planId}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (Array.isArray(saved)) setChecked(new Set(saved.filter((x): x is string => typeof x === 'string')));
    } catch {
      // Unreadable storage: start unticked.
    }
  }, [key]);

  function toggle(foodId: string): void {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) next.delete(foodId);
      else next.add(foodId);
      try {
        window.localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        // Storage full or blocked: the tick still shows for this visit.
      }
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((g) => {
        const grams = Number(g.weeklyGrams);
        return (
          <li key={g.foodId}>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-line bg-canvas-low p-3 text-body-md">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked.has(g.foodId)}
                  onChange={() => toggle(g.foodId)}
                  className="size-4 rounded border-line bg-card text-primary accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                />
                <span className={checked.has(g.foodId) ? 'text-muted line-through' : 'text-ink'}>{g.name}</span>
              </span>
              <span className="font-mono text-label-sm text-muted tabular-nums">{grams >= 1000 ? `${fmt(grams / 1000, 2)} kg` : `${fmt(grams)} g`}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

interface DraftItem {
  food: Pick<FoodDto, 'id' | 'name'>;
  grams: string;
}

/** Build a saved meal (1 serving) or a batch recipe (2+ servings) from catalog foods. */
export function TemplateBuilderButton({ recipe = false }: { recipe?: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [servings, setServings] = useState(recipe ? '4' : '1');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function show(): void {
    setName('');
    setServings(recipe ? '4' : '1');
    setItems([]);
    setError(undefined);
    setOpen(true);
  }

  function add(food: FoodDto): void {
    if (items.length >= NUTRITION_LIMITS.maxTemplateItems) return setError(`At most ${NUTRITION_LIMITS.maxTemplateItems} foods.`);
    setItems((list) => [...list, { food, grams: food.servingG }]);
  }

  function save(): void {
    const n = Math.round(Number(servings));
    if (!name.trim()) return setError('Give it a name.');
    if (!items.length) return setError('Add at least one food.');
    if (recipe && n < 2) return setError('A recipe makes at least 2 servings.');
    start(async () => {
      const res = await createMealTemplate({ name: name.trim(), servings: recipe ? n : 1, items: items.map((i) => ({ foodId: i.food.id, grams: i.grams })) });
      if (!res.ok) return setError(res.error);
      toast.show({ message: `${name.trim()} saved`, tone: 'ok' });
      setOpen(false);
    });
  }

  const noun = recipe ? 'recipe' : 'meal template';
  return (
    <>
      <Button size="sm" variant="secondary" onClick={show}>
        + New {noun}
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title={`New ${noun}`}
        description={recipe ? 'Enter the whole batch; logging divides it by servings.' : 'Saved meals log every food in one tap.'}
        variant="drawer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className={recipe ? 'col-span-2' : 'col-span-3'}>
              <Label htmlFor="tb-name">Name</Label>
              <Input id="tb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            {recipe ? (
              <div>
                <Label htmlFor="tb-servings">Servings</Label>
                <Input id="tb-servings" type="number" inputMode="numeric" min={2} max={NUTRITION_LIMITS.maxTemplateServings} value={servings} onChange={(e) => setServings(e.target.value)} />
              </div>
            ) : null}
          </div>
          <ItemList items={items} onChange={setItems} />
          <FoodPicker onPick={add} />
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}

/** Editable grams per picked food. Shared by the template builder and the coach plan editor. */
export function ItemList({ items, onChange, label = 'Foods' }: { items: DraftItem[]; onChange: (items: DraftItem[]) => void; label?: string }) {
  if (!items.length) return <p className="text-label-md text-muted">No foods yet. Search below to add.</p>;
  return (
    <ul aria-label={label} className="divide-y divide-line rounded-sm border border-line">
      {items.map((it, i) => (
        <li key={`${it.food.id}-${i}`} className="flex items-center gap-3 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-label-lg text-ink">{it.food.name}</span>
          <label className="sr-only" htmlFor={`item-${i}-${it.food.id}`}>
            Grams of {it.food.name}
          </label>
          <Input
            id={`item-${i}-${it.food.id}`}
            className="w-24"
            type="number"
            inputMode="decimal"
            min="0.1"
            step="0.1"
            value={it.grams}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, grams: e.target.value } : x)))}
          />
          <span className="font-mono text-label-sm text-muted">g</span>
          <Button variant="ghost" size="sm" className="w-9 px-0" aria-label={`Remove ${it.food.name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Icon icon={X} />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-9 px-0"
      aria-label={`Delete ${name}`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${name}?`)) return;
        start(async () => {
          const res = await deleteMealTemplate(id);
          toast.show(res.ok ? { message: `${name} deleted`, tone: 'ok' } : { message: res.error, tone: 'error' });
        });
      }}
    >
      <Icon icon={Trash2} />
    </Button>
  );
}

export type { DraftItem };
