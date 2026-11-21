'use client';

import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Field';
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
      className={clsx(
        'space-y-4 rounded-lg border bg-card p-4 transition-colors',
        p.active ? 'border-primary ring-1 ring-primary/40' : 'border-line',
      )}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-24">
          <Label htmlFor={`${day.key}-num`}>Day</Label>
          <Select
            id={`${day.key}-num`}
            value={day.dayNumber}
            onChange={(e) => p.onPatch({ dayNumber: Number(e.target.value) })}
          >
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
        <div className="flex gap-2">
          <Button variant="secondary" className="min-h-11 py-1" onClick={p.onDuplicate} disabled={!p.canDuplicate}>
            Duplicate
          </Button>
          <Button variant="secondary" className="min-h-11 py-1" aria-label={`Remove day ${day.dayNumber}`} onClick={p.onRemove}>
            Remove
          </Button>
        </div>
      </div>
      {nameError ? <p className="text-sm text-danger">{nameError}</p> : null}

      {day.exercises.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong p-4 text-center text-sm text-muted">
          {p.active ? 'Pick exercises from the library.' : 'Select this day, then pick exercises from the library.'}
        </p>
      ) : (
        <ol className="space-y-3">
          {day.exercises.map((rx, i) => (
            <li key={rx.key} className="rounded-md border border-line bg-canvas-low p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {i + 1}. {rx.exerciseName}
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="secondary"
                    className="size-11 px-0"
                    aria-label={`Move ${rx.exerciseName} up`}
                    disabled={i === 0}
                    onClick={() => p.onMoveRx(rx.key, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="secondary"
                    className="size-11 px-0"
                    aria-label={`Move ${rx.exerciseName} down`}
                    disabled={i === day.exercises.length - 1}
                    onClick={() => p.onMoveRx(rx.key, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="secondary"
                    className="size-11 px-0"
                    aria-label={`Remove ${rx.exerciseName}`}
                    onClick={() => p.onRemoveRx(rx.key)}
                  >
                    ✕
                  </Button>
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {RX_FIELDS.map(({ field, label, mode }) => {
                  const err = errors[`rx.${rx.key}.${field}`];
                  return (
                    <div key={field}>
                      <label htmlFor={`${rx.key}-${field}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {label}
                      </label>
                      <Input
                        id={`${rx.key}-${field}`}
                        inputMode={mode}
                        value={rx[field]}
                        className="px-2"
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? `${rx.key}-${field}-err` : undefined}
                        onChange={(e) => p.onPatchRx(rx.key, { [field]: e.target.value })}
                      />
                      {err ? (
                        <p id={`${rx.key}-${field}-err`} className="mt-0.5 text-[11px] text-danger">
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
    </section>
  );
}
