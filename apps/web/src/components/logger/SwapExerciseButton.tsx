'use client';

import clsx from 'clsx';
import { ArrowLeftRight, Check } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { SWAP_REASON_LABELS, SwapReason } from '@coaching/shared';
import type { ExerciseAlternativeDto, WeightUnit } from '@coaching/shared';
import { loadAlternatives } from '@/actions/client-sheets';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Field';
import { LimitationBadge } from '@/components/limitations/LimitationBadge';
import { Icon } from '@/components/ui/Icon';
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
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)} aria-label={`Swap ${current.name}`}>
        <Icon icon={ArrowLeftRight} />
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
          <legend className="mb-2 font-mono text-micro uppercase text-muted">Reason</legend>
          <div className="flex flex-wrap gap-2">
            {Object.values(SwapReason).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={clsx(
                  'h-11 rounded border px-3 text-ui',
                  reason === r ? 'border-ink bg-raised text-ink' : 'border-line-strong text-muted hover:text-ink',
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
              className="block h-11 w-full rounded border border-line-strong bg-canvas-low px-3 text-body text-ink placeholder:text-faint hover:border-faint"
            />
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-2 font-mono text-micro uppercase text-muted">Alternatives</legend>
          {load.status === 'loading' ? (
            <p role="status" className="text-ui text-muted">
              Loading alternatives…
            </p>
          ) : load.status === 'error' ? (
            <div className="space-y-2">
              <p role="alert" className="text-ui font-medium text-danger">
                {load.message}
              </p>
              <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            </div>
          ) : load.items.length === 0 ? (
            <p className="text-ui text-muted">No other exercises for this muscle group in your coach&apos;s library.</p>
          ) : (
            <div role="radiogroup" aria-label="Alternatives" className="max-h-72 divide-y divide-line overflow-y-auto border-y border-line">
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
                      'flex h-12 min-h-12 w-full items-center justify-between gap-3 px-1 text-left hover:bg-raised/60',
                      selected && 'bg-raised',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-ui font-medium">
                        {a.name}
                        {a.limitation ? <LimitationBadge flag={a.limitation} /> : null}
                      </span>
                      <span className="block font-mono text-meta text-muted">
                        {s
                          ? `Suggested: ${formatTargetLine({ weightKg: toNumber(s.weightKg), repsMin: s.reps, repsMax: s.reps, rpe: s.rpe === null ? null : toNumber(s.rpe) }, unit)}`
                          : `${a.equipment ?? 'No equipment listed'} · not logged yet`}
                      </span>
                    </span>
                    <span className="w-5 shrink-0 text-ink">{selected ? <Icon icon={Check} size={20} /> : null}</span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <footer className="flex items-center gap-3 border-t border-line pt-4">
          <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1"
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
