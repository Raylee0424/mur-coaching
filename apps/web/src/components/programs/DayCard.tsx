'use client';

import clsx from 'clsx';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import type { BuilderErrors, DraftDay, DraftRx } from './builder-model';

type RxField = 'sets' | 'repsMin' | 'repsMax' | 'rpe' | 'rest';
const RX_FIELDS: { field: RxField; label: string; mode: 'numeric' | 'decimal' }[] = [
  { field: 'sets', label: 'Sets', mode: 'numeric' },
  { field: 'repsMin', label: 'Reps min', mode: 'numeric' },
  { field: 'repsMax', label: 'Reps max', mode: 'numeric' },
  { field: 'rpe', label: 'RPE', mode: 'decimal' },
  { field: 'rest', label: 'Rest (s)', mode: 'numeric' },
];

interface Props {
  day: DraftDay;
  active: boolean;
  dayOptions: number[];
  errors: BuilderErrors;
  canDuplicate: boolean;
  onSelect: () => void;
  onPatch: (patch: { name?: string; dayNumber?: number }) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddExercise: () => void;
  onPatchRx: (rxKey: string, patch: Partial<Pick<DraftRx, RxField>>) => void;
  onMoveRx: (rxKey: string, delta: -1 | 1) => void;
  onRemoveRx: (rxKey: string) => void;
}

export function DayCard(p: Props) {
  const { day, errors } = p;
  const nameError = errors[`day.${day.key}.name`];
  return (
    <section
      aria-label={`Day ${day.dayNumber}: ${day.name || 'untitled'}`}
      onFocusCapture={p.onSelect}
      onClick={p.onSelect}
      className={clsx('rounded-md border bg-card transition-colors', p.active ? 'border-line-strong shadow-[inset_2px_0_0_theme(colors.ink)]' : 'border-line')}
    >
      <header className="flex flex-wrap items-end gap-2 border-b border-line p-4">
        <div className="w-24">
          <Label htmlFor={`${day.key}-num`}>Day</Label>
          <Select id={`${day.key}-num`} value={day.dayNumber} onChange={(e) => p.onPatch({ dayNumber: Number(e.target.value) })}>
            {p.dayOptions.map((n) => (
              <option key={n} value={n}>
                Day {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${day.key}-name`}>Name</Label>
          <Input
            id={`${day.key}-name`}
            value={day.name}
            maxLength={60}
            onChange={(e) => p.onPatch({ name: e.target.value })}
            aria-invalid={nameError ? true : undefined}
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            className="w-9 px-0"
            aria-label={`Duplicate day ${day.dayNumber}`}
            onClick={p.onDuplicate}
            disabled={!p.canDuplicate}
            title={p.canDuplicate ? 'Duplicate day' : 'No free day left this week'}
          >
            <Icon icon={Copy} />
          </Button>
          <Button variant="ghost" className="w-9 px-0" aria-label={`Remove day ${day.dayNumber}`} title="Remove day" onClick={p.onRemove}>
            <Icon icon={Trash2} />
          </Button>
        </div>
      </header>
      {nameError ? <p className="px-4 pt-2 text-meta text-danger">{nameError}</p> : null}

      {day.exercises.length === 0 ? (
        <p className="px-4 py-6 text-ui text-muted">No exercises yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {day.exercises.map((rx, i) => (
            <li key={rx.key} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-baseline gap-3 text-ui">
                  <span className="font-mono text-faint">{i + 1}</span>
                  <span className="font-medium">{rx.exerciseName}</span>
                </span>
                <span className="flex gap-0.5">
                  <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Move ${rx.exerciseName} up`} disabled={i === 0} onClick={() => p.onMoveRx(rx.key, -1)}>
                    <Icon icon={ArrowUp} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 px-0"
                    aria-label={`Move ${rx.exerciseName} down`}
                    disabled={i === day.exercises.length - 1}
                    onClick={() => p.onMoveRx(rx.key, 1)}
                  >
                    <Icon icon={ArrowDown} />
                  </Button>
                  <Button variant="ghost" size="sm" className="w-8 px-0" aria-label={`Remove ${rx.exerciseName}`} onClick={() => p.onRemoveRx(rx.key)}>
                    <Icon icon={X} />
                  </Button>
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {RX_FIELDS.map(({ field, label, mode }) => {
                  const err = errors[`rx.${rx.key}.${field}`];
                  return (
                    <div key={field}>
                      <label htmlFor={`${rx.key}-${field}`} className="mb-1 block font-mono text-micro uppercase text-muted">
                        {label}
                      </label>
                      <Input
                        id={`${rx.key}-${field}`}
                        inputMode={mode}
                        value={rx[field]}
                        className="h-8 px-2 font-mono"
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? `${rx.key}-${field}-err` : undefined}
                        onChange={(e) => p.onPatchRx(rx.key, { [field]: e.target.value })}
                      />
                      {err ? (
                        <p id={`${rx.key}-${field}-err`} className="mt-0.5 text-meta text-danger">
                          {err}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
      <footer className="border-t border-line px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={p.onAddExercise}>
          <Icon icon={Plus} />
          Add exercise
        </Button>
      </footer>
    </section>
  );
}
