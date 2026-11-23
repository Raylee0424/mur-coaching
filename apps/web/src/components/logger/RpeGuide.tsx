'use client';

import clsx from 'clsx';
import { ChevronRight, CircleCheck, CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { formatStepValue, rpeGuideRows, type RpeRow } from './logger-model';

const TONE: Record<RpeRow['tone'], string> = {
  rose: 'text-rose',
  amber: 'text-amber',
  primary: 'text-ink',
  emerald: 'text-emerald',
  ink: 'text-ink',
};

/** "RPE guide" link + bottom sheet. Tapping a row selects that RPE; the prescribed target is marked. */
export function RpeGuide({
  target,
  current,
  onSelect,
}: {
  target: number | null;
  current?: number | null;
  onSelect: (rpe: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = rpeGuideRows(target);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon icon={CircleHelp} />
        RPE guide
      </Button>
      {open ? (
        <Sheet open={open} onClose={() => setOpen(false)} variant="bottom" title="Tap to select RPE" description="How many clean reps you had left after the set.">
          <ul className="divide-y divide-line border-y border-line">
            {rows.map((row) => {
              const isTarget = target !== null && row.rpe === target;
              const selected = current === row.rpe;
              return (
                <li key={row.rpe}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onSelect(row.rpe);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex min-h-14 w-full items-center justify-between gap-3 px-1 py-3 text-left transition-colors hover:bg-raised/60',
                      isTarget && 'bg-raised',
                    )}
                  >
                    <span>
                      <span className={clsx('block font-mono text-[20px] leading-6', TONE[row.tone])}>
                        RPE {formatStepValue('rpe', row.rpe)}
                      </span>
                      <span className="block text-ui text-muted">
                        {row.note}
                        {isTarget ? ' (Target)' : ''}
                      </span>
                    </span>
                    {selected ? (
                      <span className="text-emerald">
                        <Icon icon={CircleCheck} size={20} />
                      </span>
                    ) : (
                      <span className="text-faint">
                        <Icon icon={ChevronRight} size={20} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      ) : null}
    </>
  );
}
