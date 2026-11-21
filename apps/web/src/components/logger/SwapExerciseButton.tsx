'use client';

import clsx from 'clsx';
import { useId, useState } from 'react';
import { SWAP_REASON_LABELS, SwapReason } from '@coaching/shared';
import type { ExerciseDto } from '@coaching/shared';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';

/** Bottom sheet: same-muscle alternatives + a required reason that your coach will see. */
export function SwapExerciseButton({
  current,
  originalId,
  library,
  onSwap,
}: {
  current: ExerciseDto;
  /** The prescribed exercise when already swapped (excluded from alternatives). */
  originalId: string;
  library: ExerciseDto[];
  onSwap: (toExerciseId: string, reason: SwapReason, note: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState<SwapReason | null>(null);
  const [note, setNote] = useState('');
  const alternatives = library.filter((e) => e.muscleGroup === current.muscleGroup && e.id !== current.id && e.id !== originalId);

  function openSheet(): void {
    setChoice(null);
    setReason(null);
    setNote('');
    setOpen(true);
  }

  return (
    <>
      <Button variant="secondary" onClick={openSheet} aria-label={`Swap ${current.name}`}>
        Swap
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} variant="bottom" title={`Swap ${current.name}`} description="Your coach sees the swap and the reason.">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Alternatives</legend>
            {alternatives.length === 0 ? (
              <p className="text-sm text-muted">No other exercises for this muscle group in your library.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {alternatives.map((e) => (
                  <label
                    key={e.id}
                    className={clsx(
                      'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3',
                      choice === e.id ? 'border-primary bg-primary-container/40' : 'border-line',
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-alt`}
                      className="size-5 accent-primary"
                      checked={choice === e.id}
                      onChange={() => setChoice(e.id)}
                    />
                    <span className="text-sm font-semibold">{e.name}</span>
                    {e.equipment ? <span className="ml-auto text-xs text-muted">{e.equipment}</span> : null}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Why are you swapping?</legend>
            <div className="flex flex-wrap gap-2">
              {Object.values(SwapReason).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => setReason(r)}
                  className={clsx(
                    'min-h-12 rounded-full px-4 text-sm font-semibold ring-1 ring-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                    reason === r ? 'bg-primary text-primary-ink ring-primary' : 'ring-line-strong hover:bg-raised',
                  )}
                >
                  {SWAP_REASON_LABELS[r]}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor={`${id}-note`}>Note for your coach (optional)</Label>
            <input
              id={`${id}-note`}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder={reason === SwapReason.PAIN ? 'Where does it hurt?' : 'Anything they should know'}
              className="block min-h-12 w-full rounded-md border border-line bg-canvas-low px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
          <footer className="flex justify-between gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="min-h-12"
              disabled={!choice || !reason}
              onClick={() => {
                if (!choice || !reason) return;
                onSwap(choice, reason, note);
                setOpen(false);
              }}
            >
              Swap exercise
            </Button>
          </footer>
        </div>
      </Sheet>
    </>
  );
}
