'use client';

import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useEffect, useId, useState, useTransition } from 'react';
import { FOOD_SOURCE_LABELS } from '@coaching/shared';
import type { FoodDto } from '@coaching/shared';
import { searchFoods, setFoodFavorite } from '@/actions/nutrition';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { fmt } from './nutrition-model';

export const SOURCE_TONE: Record<FoodDto['source'], BadgeTone> = { USDA: 'emerald', CNF: 'sky', CUSTOM: 'slate' };

/** Debounced catalog search through a server action (the browser never calls the API). */
export function FoodPicker({ onPick, selectedId, allowFavorite = false }: { onPick: (food: FoodDto) => void; selectedId?: string; allowFavorite?: boolean }) {
  const id = useId();
  const [q, setQ] = useState('');
  const [foods, setFoods] = useState<FoodDto[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      start(async () => {
        const res = await searchFoods(q);
        if (!res.ok) return setError(res.error);
        setError(undefined);
        setFoods(res.data);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function toggleFavorite(food: FoodDto): void {
    const on = !food.favorite;
    setFoods((list) => list.map((f) => (f.id === food.id ? { ...f, favorite: on } : f)));
    void setFoodFavorite(food.id, on).then((res) => {
      if (!res.ok) {
        setError(res.error);
        setFoods((list) => list.map((f) => (f.id === food.id ? { ...f, favorite: !on } : f)));
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-q`}>Search foods</Label>
      <Input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chicken, oats, rice…" autoComplete="off" />
      <FormError>{error}</FormError>
      <ul aria-label="Food results" aria-busy={pending} className="max-h-64 divide-y divide-line overflow-y-auto rounded-sm border border-line bg-canvas-low">
        {foods.length === 0 ? (
          <li className="px-3.5 py-3 text-label-md text-muted">{pending ? 'Searching…' : 'No foods match. Create a custom food below.'}</li>
        ) : (
          foods.map((f) => (
            <li key={f.id} className={clsx('flex items-center gap-2 px-2', selectedId === f.id && 'bg-raised')}>
              <button
                type="button"
                onClick={() => onPick(f)}
                aria-pressed={selectedId === f.id}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-sm px-1.5 py-2.5 text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate text-label-lg text-ink">{f.name}</span>
                  <span className="block font-mono text-label-sm text-muted">
                    {fmt(Number(f.per100g.kcal))} kcal · {fmt(Number(f.per100g.proteinG), 1)}P / {fmt(Number(f.per100g.carbsG), 1)}C / {fmt(Number(f.per100g.fatG), 1)}F per 100 g
                  </span>
                </span>
                <Badge tone={SOURCE_TONE[f.source]}>{FOOD_SOURCE_LABELS[f.source]}</Badge>
              </button>
              {allowFavorite ? (
                <button
                  type="button"
                  onClick={() => toggleFavorite(f)}
                  aria-pressed={f.favorite}
                  aria-label={f.favorite ? `Remove ${f.name} from favorites` : `Add ${f.name} to favorites`}
                  className={clsx('rounded-full p-2 hover:bg-raised', f.favorite ? 'text-primary' : 'text-muted')}
                >
                  <Icon icon={Star} fill={f.favorite ? 'currentColor' : 'none'} />
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
