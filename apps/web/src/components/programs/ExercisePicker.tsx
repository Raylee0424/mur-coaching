'use client';

import { useMemo, useState } from 'react';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { Card } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Field';

/** Search + muscle filter; clicking a row adds it to the selected day. */
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
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return library.filter((e) => (!group || e.muscleGroup === group) && (!needle || e.name.toLowerCase().includes(needle)));
  }, [library, q, group]);

  return (
    <Card className="space-y-3 lg:sticky lg:top-6">
      <div>
        <h2 className="font-display text-base font-bold">Exercise library</h2>
        <p className="text-xs text-muted">{targetLabel ? `Adding to ${targetLabel}` : 'Select a day to add exercises.'}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        <div>
          <Label htmlFor="picker-q">Search</Label>
          <Input id="picker-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bench, squat…" />
        </div>
        <div>
          <Label htmlFor="picker-group">Muscle group</Label>
          <Select id="picker-group" value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup | '')}>
            <option value="">All</option>
            {Object.values(MuscleGroup).map((g) => (
              <option key={g} value={g}>
                {MUSCLE_GROUP_LABELS[g]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto rounded-md border border-line">
        {results.length === 0 ? <li className="p-3 text-sm text-muted">No exercises match.</li> : null}
        {results.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              disabled={!targetLabel}
              onClick={() => onPick(e)}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold">{e.name}</span>
                <span className="block text-xs text-muted">{MUSCLE_GROUP_LABELS[e.muscleGroup]}</span>
              </span>
              <span aria-hidden="true" className="text-primary">
                +
              </span>
              <span className="sr-only">Add {e.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
