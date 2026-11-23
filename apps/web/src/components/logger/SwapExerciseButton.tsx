'use client';

import clsx from 'clsx';
import { useEffect, useId, useState } from 'react';
import { SWAP_REASON_LABELS, SwapReason } from '@coaching/shared';
import type { ExerciseAlternativeDto, WeightUnit } from '@coaching/shared';
import { loadAlternatives } from '@/actions/client-sheets';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { toNumber } from '@/lib/format';
import { formatTargetLine } from './logger-model';

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: ExerciseAlternativeDto[] };

/** "Swap" button + bottom sheet: reason chips, same-muscle alternatives (with your last top set), Swap. */
export function SwapExerciseButton({
  current,
  unit,
  onSwap,
}: {
  current: { id: string; name: string };
  unit: WeightUnit;
  onSwap: (to: ExerciseAlternativeDto, reason: SwapReason, note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-label={`Swap ${current.name}`}>
        Swap
      </Button>
      {open ? (
        <SwapSheet
          current={current}
          unit={unit}
          onClose={() => setOpen(false)}
          onSwap={(alt, reason, note) => {
            onSwap(alt, reason, note);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function SwapSheet({
  current,
  unit,
  onClose,
  onSwap,
}: {
  current: { id: string; name: string };
  unit: WeightUnit;
  onClose: () => void;
  onSwap: (to: ExerciseAlternativeDto, reason: SwapReason, note: string) => void;
}) {
  const id = useId();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState<SwapReason | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    let live = true;
    setLoad({ status: 'loading' });
    void loadAlternatives(current.id).then((r) => {
      if (!live) return;
      setLoad(r.ok ? { status: 'ready', items: r.data.alternatives } : { status: 'error', message: r.error });
    });
    return () => {
      live = false;
    };
  }, [current.id, attempt]);

  const picked = load.status === 'ready' ? load.items.find((a) => a.id === choice) : undefined;

  return (
    <Sheet open onClose={onClose} variant="bottom" title="Swap exercise" description={`Alternatives for ${current.name}. Your coach sees the swap in your history.`}>
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Reason</legend>
          <div className="flex flex-wrap gap-2">
            {Object.values(SwapReason).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={clsx(
                  'min-h-12 rounded-full border px-4 text-sm font-semibold',
                  reason === r ? 'border-primary bg-primary-container text-primary-soft' : 'border-line bg-canvas-low text-muted hover:bg-raised',
                )}
              >
                {SWAP_REASON_LABELS[r]}
              </button>
            ))}
          </div>
        </fieldset>

        {reason === SwapReason.PAIN || reason === SwapReason.OTHER ? (
          <div>
            <Label htmlFor={`${id}-note`}>Note (optional)</Label>
            <input
              id={`${id}-note`}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder={reason === SwapReason.PAIN ? 'Where does it hurt?' : 'Anything your coach should know'}
              className="block min-h-12 w-full rounded-md border border-line bg-canvas-low px-3 text-base text-ink"
            />
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Alternatives</legend>
          {load.status === 'loading' ? (
            <p role="status" className="text-sm text-muted">
              Loading alternatives…
            </p>
          ) : load.status === 'error' ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm font-medium text-danger">
                {load.message}
              </p>
              <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            </div>
          ) : load.items.length === 0 ? (
            <p className="text-sm text-muted">No other exercises for this muscle group in your coach&apos;s library.</p>
          ) : (
            <div role="radiogroup" aria-label="Alternatives" className="max-h-72 space-y-2.5 overflow-y-auto tabular">
              {load.items.map((a) => {
                const selected = choice === a.id;
                const s = a.suggested;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setChoice(a.id)}
                    className={clsx(
                      'flex min-h-14 w-full items-center justify-between gap-3 rounded-md border p-3.5 text-left',
                      selected ? 'border-primary bg-raised' : 'border-line bg-canvas-low hover:bg-raised',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{a.name}</span>
                      <span className={clsx('block text-xs', selected ? 'text-primary' : 'text-muted')}>
                        {s
                          ? `Suggested: ${formatTargetLine({ weightKg: toNumber(s.weightKg), repsMin: s.reps, repsMax: s.reps, rpe: s.rpe === null ? null : toNumber(s.rpe) }, unit)}`
                          : `${a.equipment ?? 'No equipment listed'} · not logged yet`}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={clsx('flex size-6 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary text-primary-ink' : 'border-line-strong')}
                    >
                      {selected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <footer className="flex items-center gap-3">
          <Button variant="secondary" className="min-h-12 flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="min-h-12 flex-1"
            disabled={!picked || !reason}
            onClick={() => {
              if (picked && reason) onSwap(picked, reason, note);
            }}
          >
            Swap
          </Button>
        </footer>
      </div>
    </Sheet>
  );
}
