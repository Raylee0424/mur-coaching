'use client';

import { useState, type ReactNode } from 'react';
import { WORKOUT_LOG_LIMITS } from '@coaching/shared';
import type { WeightUnit } from '@coaching/shared';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { formatStepValue, stepValue } from '@/components/logger/logger-model';
import { Stepper } from '@/components/logger/Stepper';
import { kgToDisplay, unitLabel } from '@/lib/units';

export interface EditorValues {
  /** In the display unit. */
  weight: number;
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
}

interface Props {
  title: string;
  description: string;
  unit: WeightUnit;
  initial: EditorValues;
  weightStep: number;
  /** Lowest RPE accepted (6 in the live logger, 1 when fixing old history). */
  rpeMin: number;
  /** History sets may have no RPE; the logger always has one. */
  allowClearRpe?: boolean;
  showWarmup?: boolean;
  repsMin?: number;
  pending?: boolean;
  error?: string | undefined;
  onSave: (values: EditorValues) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Replaces the editor (e.g. "delete the whole session?" confirmation). */
  override?: ReactNode;
}

/** Bottom sheet with the three steppers, Delete set and Save. Mounted only while open so it always starts from `initial`. */
export function SetEditorSheet(props: Props) {
  const { initial, rpeMin, pending, onSave, onDelete, onClose, override } = props;
  const [v, setV] = useState<EditorValues>(initial);
  const rpeBad = v.rpe !== null && (v.rpe < rpeMin || v.rpe > WORKOUT_LOG_LIMITS.rpeMax);
  return (
    <Sheet
      open
      onClose={onClose}
      variant="bottom"
      title={props.title}
      description={props.description}
      {...(override
        ? {}
        : {
            footer: (
              <>
                <Button variant="danger" size="lg" className="flex-1" onClick={onDelete} disabled={pending}>
                  Delete set
                </Button>
                <Button size="lg" className="flex-1" onClick={() => onSave(v)} disabled={pending || rpeBad}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </>
            ),
          })}
    >
      {override ?? <Editor {...props} v={v} setV={setV} rpeBad={rpeBad} />}
    </Sheet>
  );
}

function Editor({
  unit,
  weightStep,
  rpeMin,
  allowClearRpe,
  showWarmup,
  repsMin = 0,
  error,
  v,
  setV,
  rpeBad,
}: Props & { v: EditorValues; setV: (f: (x: EditorValues) => EditorValues) => void; rpeBad: boolean }) {
  const maxWeight = kgToDisplay(WORKOUT_LOG_LIMITS.maxWeightKg, unit);
  const rpeMax = WORKOUT_LOG_LIMITS.rpeMax;
  const row = 'border-b border-line pb-4 last:border-0';

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className={row}>
          <Stepper
            compact
            label="Weight"
            noun="weight"
            display={formatStepValue('weight', v.weight)}
            unit={unitLabel(unit)}
            stepLabel={formatStepValue('weight', weightStep)}
            canDecrease={v.weight > 0}
            canIncrease={v.weight < maxWeight}
            onStep={(d) => setV((x) => ({ ...x, weight: stepValue(x.weight, d * weightStep, 0, maxWeight) }))}
          />
        </div>
        <div className={row}>
          <Stepper
            compact
            label="Reps"
            noun="reps"
            display={String(v.reps)}
            stepLabel="1"
            canDecrease={v.reps > repsMin}
            canIncrease={v.reps < WORKOUT_LOG_LIMITS.maxReps}
            onStep={(d) => setV((x) => ({ ...x, reps: stepValue(x.reps, d, repsMin, WORKOUT_LOG_LIMITS.maxReps) }))}
          />
        </div>
        <div className={row}>
          <Stepper
            compact
            label={`RPE (${rpeMin.toFixed(1)}–${rpeMax.toFixed(1)})`}
            noun="RPE"
            display={v.rpe === null ? '—' : formatStepValue('rpe', v.rpe)}
            stepLabel="0.5"
            canDecrease={v.rpe === null || v.rpe > WORKOUT_LOG_LIMITS.rpeMin}
            canIncrease={v.rpe === null || v.rpe < rpeMax}
            onStep={(d) => setV((x) => ({ ...x, rpe: stepValue(x.rpe ?? 8, x.rpe === null ? 0 : d * 0.5, WORKOUT_LOG_LIMITS.rpeMin, rpeMax) }))}
            action={
              allowClearRpe && v.rpe !== null ? (
                <Button variant="ghost" size="sm" onClick={() => setV((x) => ({ ...x, rpe: null }))}>
                  Clear
                </Button>
              ) : null
            }
          />
        </div>
        {rpeBad ? (
          <p role="alert" className="text-ui font-medium text-danger">
            RPE must be between {rpeMin.toFixed(1)} and {rpeMax.toFixed(1)}.
          </p>
        ) : null}
      </div>
      {showWarmup ? (
        <label className="flex min-h-11 items-center gap-3 text-ui">
          <input type="checkbox" className="size-4" checked={v.isWarmup} onChange={(e) => setV((x) => ({ ...x, isWarmup: e.target.checked }))} />
          Warm-up set (ignored by the engine)
        </label>
      ) : null}
      <FormError>{error}</FormError>
    </div>
  );
}
