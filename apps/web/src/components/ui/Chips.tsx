'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import { Icon } from './Icon';

/** Toggleable chip group (multi-select). Each chip is a pressed/unpressed button. */
export function Chips({
  label,
  options,
  selected,
  onToggle,
  describedBy,
  size = 'md',
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  describedBy?: string;
  size?: 'md' | 'lg';
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-2 font-mono text-micro uppercase text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded border px-3 text-ui transition-colors',
                size === 'lg' ? 'min-h-12' : 'h-9',
                on ? 'border-ink bg-raised text-ink' : 'border-line-strong text-muted hover:text-ink',
              )}
            >
              {on ? <Icon icon={Check} size={14} /> : null}
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
