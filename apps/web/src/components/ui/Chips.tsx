'use client';

import clsx from 'clsx';

/** Toggleable pill group (multi-select). Each chip is a pressed/unpressed button. */
export function Chips({
  label,
  options,
  selected,
  onToggle,
  describedBy,
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</legend>
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
                'min-h-12 rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                on ? 'bg-primary text-primary-ink ring-primary' : 'text-ink ring-line-strong hover:bg-raised',
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
