'use client';

import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { NUTRITION_LIMITS } from '@coaching/shared';
import type { FoodDto, MealPlanDto } from '@coaching/shared';
import { deleteMealPlan, saveMealPlan } from '@/actions/nutrition';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { FoodPicker } from './FoodPicker';
import { ItemList, type DraftItem } from './LibraryControls';

interface DraftMeal {
  name: string;
  items: DraftItem[];
}

const fromPlan = (plan: MealPlanDto | null): DraftMeal[] =>
  plan ? plan.meals.map((m) => ({ name: m.name, items: m.items.map((i) => ({ food: { id: i.foodId, name: i.name }, grams: i.grams })) })) : [{ name: 'Meal 1', items: [] }];

/** Coach builds or replaces a one-day meal plan for a client. Saving replaces every meal and item. */
export function MealPlanEditor({ clientId, plan }: { clientId: string; plan: MealPlanDto | null }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [meals, setMeals] = useState<DraftMeal[]>([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function show(): void {
    setName(plan?.name ?? '');
    setNotes(plan?.notes ?? '');
    setMeals(fromPlan(plan));
    setActive(0);
    setError(undefined);
    setOpen(true);
  }

  function addFood(food: FoodDto): void {
    setMeals((ms) =>
      ms.map((m, i) =>
        i === active && m.items.length < NUTRITION_LIMITS.maxPlanItemsPerMeal ? { ...m, items: [...m.items, { food: { id: food.id, name: food.name }, grams: food.servingG }] } : m,
      ),
    );
  }

  function save(): void {
    if (!name.trim()) return setError('Name the plan.');
    if (meals.some((m) => !m.name.trim() || m.items.length === 0)) return setError('Every meal needs a name and at least one food.');
    setError(undefined);
    start(async () => {
      const res = await saveMealPlan(clientId, plan?.id ?? null, {
        name: name.trim(),
        notes: notes.trim() || null,
        meals: meals.map((m) => ({ name: m.name.trim(), items: m.items.map((i) => ({ foodId: i.food.id, grams: i.grams })) })),
      });
      if (!res.ok) return setError(res.error);
      toast.show({ message: plan ? 'Meal plan updated' : 'Meal plan assigned', tone: 'ok' });
      setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" variant={plan ? 'secondary' : 'primary'} onClick={show}>
        {plan ? 'Edit' : '+ New meal plan'}
      </Button>
      <Sheet
        open={open}
        onClose={pending ? () => undefined : () => setOpen(false)}
        title={plan ? `Edit ${plan.name}` : 'New meal plan'}
        description="One day of meals. The client sees it on their Meal Plans page with a weekly grocery list."
        variant="drawer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending} aria-busy={pending}>
              {pending ? 'Saving…' : plan ? 'Save plan' : 'Assign plan'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="mp-name">Plan name</Label>
            <Input id="mp-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="High-carb training day" />
          </div>
          <div>
            <Label htmlFor="mp-notes">Notes (optional)</Label>
            <Input id="mp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Use on training days" />
          </div>

          {meals.map((m, i) => (
            <fieldset key={i} className={clsx('space-y-3 rounded-sm border p-4', i === active ? 'border-primary/50' : 'border-line')}>
              <legend className="px-1 font-sans text-label-sm uppercase tracking-wider text-muted">Meal {i + 1}</legend>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`mp-meal-${i}`}>Name</Label>
                  <Input id={`mp-meal-${i}`} value={m.name} maxLength={80} onChange={(e) => setMeals((ms) => ms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                </div>
                {meals.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="md"
                    className="w-10 px-0"
                    aria-label={`Remove meal ${i + 1}`}
                    onClick={() => {
                      setMeals((ms) => ms.filter((_, j) => j !== i));
                      setActive(0);
                    }}
                  >
                    <Icon icon={Trash2} />
                  </Button>
                ) : null}
              </div>
              <ItemList items={m.items} label={`Meal ${i + 1} foods`} onChange={(items) => setMeals((ms) => ms.map((x, j) => (j === i ? { ...x, items } : x)))} />
              {i === active ? (
                <FoodPicker onPick={addFood} />
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setActive(i)}>
                  Add foods to this meal
                </Button>
              )}
            </fieldset>
          ))}

          {meals.length < NUTRITION_LIMITS.maxPlanMeals ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMeals((ms) => [...ms, { name: `Meal ${ms.length + 1}`, items: [] }]);
                setActive(meals.length);
              }}
            >
              <Icon icon={Plus} size={14} />
              Add meal
            </Button>
          ) : null}
          <FormError>{error}</FormError>
        </div>
      </Sheet>
    </>
  );
}

export function DeletePlanButton({ clientId, plan }: { clientId: string; plan: Pick<MealPlanDto, 'id' | 'name'> }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-9 px-0"
      aria-label={`Delete ${plan.name}`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${plan.name}? The client stops seeing it.`)) return;
        start(async () => {
          const res = await deleteMealPlan(clientId, plan.id);
          toast.show(res.ok ? { message: 'Meal plan deleted', tone: 'ok' } : { message: res.error, tone: 'error' });
        });
      }}
    >
      <Icon icon={Trash2} />
    </Button>
  );
}
