'use client';

import { PenLine } from 'lucide-react';
import { useId } from 'react';
import { Badge } from './Badge';
import { FieldError, Input, Label } from './Field';

/** Tag shown wherever a value differs from what would otherwise apply. */
export function OverriddenTag() {
  return (
    <Badge tone="signal" icon={PenLine}>
      Overridden
    </Badge>
  );
}

interface Props {
  label: string;
  /** Draft text; '' means "inherit". */
  value: string;
  onChange: (value: string) => void;
  /** Shown as grey helper text, e.g. "Default: 8 (engine)". */
  defaultLabel: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  error?: string;
}

/** Number input for an optional override: empty inherits, a value overrides, "Reset" clears it. */
export function OverrideField({ label, value, onChange, defaultLabel, min, max, step, suffix, error }: Props) {
  const id = useId();
  const overridden = value.trim() !== '';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label htmlFor={id} className="mb-0">
          {label}
          {suffix ? ` (${suffix})` : ''}
        </Label>
        {overridden ? (
          <span className="flex items-center gap-2">
            <OverriddenTag />
            <button
              type="button"
              className="text-meta font-semibold text-muted underline hover:text-ink"
              onClick={() => onChange('')}
            >
              Reset
            </button>
          </span>
        ) : null}
      </div>
      <Input
        id={id}
        inputMode="decimal"
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder="Inherit"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-help`} className="mt-1 text-meta text-muted">
        {defaultLabel}
      </p>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

/** '' → null; otherwise a number checked against the range and step precision. */
export function parseOverride(
  value: string,
  limit: { min: number; max: number; step: number },
): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = value.trim();
  if (t === '') return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < limit.min || n > limit.max) {
    return { ok: false, error: `Between ${limit.min} and ${limit.max}.` };
  }
  const steps = n / limit.step;
  if (Math.abs(steps - Math.round(steps)) > 1e-6) return { ok: false, error: `Use steps of ${limit.step}.` };
  return { ok: true, value: n };
}
