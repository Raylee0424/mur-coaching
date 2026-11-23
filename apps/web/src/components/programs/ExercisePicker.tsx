'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Field';
import { equipmentOptions, filterExercises, groupCounts } from './picker-model';

/** Search + muscle-group chips + equipment filter; clicking a row adds it to the selected day. */
export function ExercisePicker({
  library,
  targetLabel,
  onPick,
}: {
  library: ExerciseDto[];
  /** e.g. "Week 1 · Upper A"; null when no day is selected. */
  targetLabel: string | null;
  onPick: (exercise: ExerciseDto) => void;
}) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState('');
  const results = useMemo(() => filterExercises(library, { q, group, equipment }), [library, q, group, equipment]);
  const groups = useMemo(() => groupCounts(library, Object.values(MuscleGroup)), [library]);
  const equipments = useMemo(() => equipmentOptions(library), [library]);

  const chip = (value: MuscleGroup | '', label: string) => {
    const on = group === value;
    return (
      <button
        key={value || 'all'}
        type="button"
        aria-pressed={on}
        onClick={() => setGroup(value)}
        className={clsx(
          'min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors',
          on ? 'bg-primary text-primary-ink ring-primary' : 'text-ink ring-line-strong hover:bg-raised',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <Card className="space-y-3 lg:sticky lg:top-6">
      <div>
        <h2 className="font-display text-base font-bold">Exercise picker</h2>
        <p className="text-xs text-muted">{targetLabel ? `Adding to ${targetLabel}` : 'Select a day to add exercises.'}</p>
      </div>
      <div>
        <Label htmlFor="picker-q">Search {library.length} exercises</Label>
        <Input id="picker-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bench, squat…" />
      </div>
      <div role="group" aria-label="Muscle group" className="flex flex-wrap gap-1.5">
        {chip('', 'All')}
        {groups.map((g) => chip(g.group, MUSCLE_GROUP_LABELS[g.group]))}
      </div>
      {equipments.length > 0 ? (
        <div>
          <Label htmlFor="picker-equipment">Equipment</Label>
          <Select id="picker-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">Any</option>
            {equipments.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto rounded-md border border-line">
        {results.length === 0 ? <li className="p-3 text-sm text-muted">No exercises match.</li> : null}
        {results.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              disabled={!targetLabel}
              onClick={() => onPick(e)}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-raised focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold">{e.name}</span>
                <span className="block text-xs text-muted">
                  {MUSCLE_GROUP_LABELS[e.muscleGroup]}
                  {e.equipment ? ` · ${e.equipment}` : ''}
                </span>
              </span>
              <span aria-hidden="true" className="rounded-full bg-primary-container px-2.5 py-0.5 text-xs font-semibold text-primary">
                Add
              </span>
              <span className="sr-only">Add {e.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
