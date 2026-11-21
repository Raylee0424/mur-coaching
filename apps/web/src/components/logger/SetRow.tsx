import type { DraftErrors, DraftSet } from './logger-model';
import { Button } from '@/components/ui/Button';
import { FieldError, Input } from '@/components/ui/Field';

interface Props {
  set: DraftSet;
  number: number;
  errorPrefix: string;
  errors: DraftErrors;
  onChange: (patch: Partial<Omit<DraftSet, 'key'>>) => void;
  onRemove: (() => void) | null;
}

export function SetRow({ set, number, errorPrefix, errors, onChange, onRemove }: Props) {
  const fields = [
    { name: 'weightKg', label: 'weight (kg)', mode: 'decimal', value: set.weightKg },
    { name: 'reps', label: 'reps', mode: 'numeric', value: set.reps },
    { name: 'rpe', label: 'RPE', mode: 'decimal', value: set.rpe },
  ] as const;

  return (
    <li className="space-y-1">
      <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_2.75rem] items-center gap-2 sm:grid-cols-[2rem_1fr_1fr_1fr_7rem_2.75rem]">
        <span className="text-sm font-semibold text-muted">{number}</span>
        {fields.map((f) => {
          const errorId = `${errorPrefix}.${f.name}`;
          return (
            <Input
              key={f.name}
              aria-label={`Set ${number} ${f.label}`}
              placeholder={f.name === 'weightKg' ? 'kg' : f.name === 'reps' ? 'reps' : 'RPE'}
              inputMode={f.mode}
              value={f.value}
              aria-invalid={errors[errorId] ? true : undefined}
              aria-describedby={errors[errorId] ? `${errorId}-error` : undefined}
              onChange={(e) => onChange({ [f.name]: e.target.value })}
            />
          );
        })}
        <label className="col-span-3 col-start-2 flex min-h-11 items-center gap-2 text-sm sm:col-span-1 sm:col-start-auto">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={set.isWarmup}
            onChange={(e) => onChange({ isWarmup: e.target.checked })}
          />
          Warm-up
        </label>
        {onRemove ? (
          <Button variant="secondary" aria-label={`Remove set ${number}`} onClick={onRemove} className="w-11 px-0">
            ✕
          </Button>
        ) : (
          <span />
        )}
      </div>
      {fields.map((f) => {
        const errorId = `${errorPrefix}.${f.name}`;
        return (
          <FieldError key={f.name} id={`${errorId}-error`}>
            {errors[errorId] ? `Set ${number} ${f.label}: ${errors[errorId]}` : undefined}
          </FieldError>
        );
      })}
    </li>
  );
}
