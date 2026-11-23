'use client';

import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { equipmentOptions, filterExercises, groupCounts } from './picker-model';

/** Drawer with search, muscle-group and equipment filters; clicking a row adds it to the selected day. Stays open to add several. */
export function ExercisePicker({
  open,
  onClose,
  library,
  targetLabel,
  addedNames,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  library: ExerciseDto[];
  /** e.g. "Week 1 · Upper A"; null when no day is selected. */
  targetLabel: string | null;
  /** Names already on the selected day, shown with a check. */
  addedNames: ReadonlySet<string>;
  onPick: (exercise: ExerciseDto) => void;
}) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState('');
  const results = useMemo(() => filterExercises(library, { q, group, equipment }), [library, q, group, equipment]);
  const groups = useMemo(() => groupCounts(library, Object.values(MuscleGroup)), [library]);
  const equipments = useMemo(() => equipmentOptions(library), [library]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Add exercises"
      description={targetLabel ? `Adding to ${targetLabel}` : 'Select a day to add exercises.'}
      footer={
        <>
          <span className="font-mono text-micro text-faint">{results.length} shown</span>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem]">
          <div>
            <label htmlFor="picker-q" className="sr-only">
              Search {library.length} exercises
            </label>
            <Input id="picker-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${library.length} exercises`} />
          </div>
          <div>
            <label htmlFor="picker-group" className="sr-only">
              Muscle group
            </label>
            <Select id="picker-group" value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup | '')}>
              <option value="">All muscles</option>
              {groups.map((g) => (
                <option key={g.group} value={g.group}>
                  {MUSCLE_GROUP_LABELS[g.group]} ({g.count})
                </option>
              ))}
            </Select>
          </div>
          {equipments.length > 0 ? (
            <div>
              <label htmlFor="picker-equipment" className="sr-only">
                Equipment
              </label>
              <Select id="picker-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                <option value="">Any equipment</option>
                {equipments.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        <ul className="divide-y divide-line rounded-md border border-line">
          {results.length === 0 ? <li className="p-3 text-ui text-muted">No exercises match.</li> : null}
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                disabled={!targetLabel}
                onClick={() => onPick(e)}
                className="flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-ui hover:bg-raised focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{e.name}</span>
                  {addedNames.has(e.name) ? (
                    <span className="text-emerald">
                      <Icon icon={Check} size={14} label="Already on this day" />
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-micro uppercase text-faint">
                  {MUSCLE_GROUP_LABELS[e.muscleGroup]}
                  {e.equipment ? ` · ${e.equipment}` : ''}
                </span>
                <span className="sr-only">Add {e.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
