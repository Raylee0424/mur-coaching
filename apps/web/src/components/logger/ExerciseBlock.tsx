import { MUSCLE_GROUP_LABELS, MuscleGroup } from '@coaching/shared';
import { SWAP_REASON_LABELS } from '@coaching/shared';
import type { ExerciseDto, SwapReason, WeightUnit } from '@coaching/shared';
import { SwapExerciseButton } from './SwapExerciseButton';
import { unitLabel } from '@/lib/units';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldError, Label, Select } from '@/components/ui/Field';
import type { DraftErrors, DraftExercise, DraftSet } from './logger-model';
import { SetRow } from './SetRow';

interface Props {
  exercise: DraftExercise;
  index: number;
  library: ExerciseDto[];
  errors: DraftErrors;
  canRemove: boolean;
  onExerciseChange: (exerciseId: string) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onPatchSet: (setKey: string, patch: Partial<Omit<DraftSet, 'key'>>) => void;
  onSwap: (toExerciseId: string, reason: SwapReason, note: string) => void;
  onUndoSwap: () => void;
  unit: WeightUnit;
}

export function ExerciseBlock({
  exercise,
  index,
  library,
  errors,
  canRemove,
  onExerciseChange,
  onRemove,
  onAddSet,
  onRemoveSet,
  onPatchSet,
  onSwap,
  onUndoSwap,
  unit,
}: Props) {
  const base = `exercises.${index}`;
  const selectId = `exercise-${exercise.key}`;
  const exerciseError = errors[`${base}.exerciseId`];
  const current = library.find((e) => e.id === exercise.exerciseId) ?? null;

  return (
    <Card className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor={selectId}>Exercise {index + 1}</Label>
          <Select
            id={selectId}
            value={exercise.exerciseId}
            aria-invalid={exerciseError ? true : undefined}
            aria-describedby={exerciseError ? `${selectId}-error` : undefined}
            onChange={(e) => onExerciseChange(e.target.value)}
          >
            <option value="" disabled>
              Choose an exercise…
            </option>
            {Object.values(MuscleGroup).map((group) => {
              const items = library.filter((e) => e.muscleGroup === group);
              return items.length === 0 ? null : (
                <optgroup key={group} label={MUSCLE_GROUP_LABELS[group]}>
                  {items.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </div>
        {current ? (
          <SwapExerciseButton
            current={current}
            originalId={exercise.swap?.fromExerciseId ?? current.id}
            library={library}
            onSwap={onSwap}
          />
        ) : null}
        {canRemove ? (
          <Button variant="secondary" onClick={onRemove} aria-label={`Remove exercise ${index + 1}`}>
            Remove
          </Button>
        ) : null}
      </div>
      {exercise.swap ? (
        <p className="flex flex-wrap items-center gap-2 rounded-md bg-amber-bg px-3 py-2 text-sm text-amber">
          <span>
            Swapped from {library.find((e) => e.id === exercise.swap?.fromExerciseId)?.name ?? 'the prescribed lift'} ·{' '}
            {SWAP_REASON_LABELS[exercise.swap.reason]}
            {exercise.swap.note ? `: ${exercise.swap.note}` : ''}
          </span>
          <button type="button" onClick={onUndoSwap} className="ml-auto font-semibold underline">
            Undo
          </button>
        </p>
      ) : null}
      <FieldError id={`${selectId}-error`}>{exerciseError}</FieldError>

      <div
        aria-hidden="true"
        className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.75rem] gap-2 text-xs font-semibold uppercase tracking-wide text-muted sm:grid-cols-[2rem_1fr_1fr_1fr_7rem_2.75rem]"
      >
        <span>Set</span>
        <span>{unitLabel(unit)}</span>
        <span>Reps</span>
        <span>RPE</span>
      </div>
      <ul className="space-y-2">
        {exercise.sets.map((set, j) => (
          <SetRow
            key={set.key}
            set={set}
            number={j + 1}
            errorPrefix={`${base}.sets.${j}`}
            errors={errors}
            onChange={(patch) => onPatchSet(set.key, patch)}
            onRemove={exercise.sets.length > 1 ? () => onRemoveSet(set.key) : null}
            unit={unit}
          />
        ))}
      </ul>
      <FieldError>{errors[`${base}.sets`]}</FieldError>
      <Button variant="secondary" onClick={onAddSet}>
        + Add set
      </Button>
    </Card>
  );
}
