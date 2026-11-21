'use client';

import { useState, useTransition } from 'react';
import { recommendationAction } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';

interface Props {
  clientId: string;
  recommendationId: string;
  exerciseId: string;
  /** Coach view: may dismiss and re-evaluate. Clients may only accept. */
  canDismiss: boolean;
  /** Shown in the dismiss dialog. */
  exerciseName?: string;
}

export function RecommendationActions({ clientId, recommendationId, exerciseId, canDismiss, exerciseName }: Props) {
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(intent: 'ACCEPTED' | 'DISMISSED' | 'REEVALUATE'): void {
    setError(undefined);
    const fd = new FormData();
    fd.set('clientId', clientId);
    fd.set('recommendationId', recommendationId);
    fd.set('exerciseId', exerciseId);
    fd.set('intent', intent);
    startTransition(async () => {
      const result = await recommendationAction(null, fd);
      setConfirming(false);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run('ACCEPTED')} disabled={pending}>
          Accept
        </Button>
        {canDismiss ? (
          <>
            <Button variant="secondary" onClick={() => setConfirming(true)} disabled={pending}>
              Dismiss
            </Button>
            <Button variant="secondary" onClick={() => run('REEVALUATE')} disabled={pending}>
              Re-evaluate
            </Button>
          </>
        ) : null}
      </div>
      <FormError>{error}</FormError>
      {confirming ? (
        <Sheet
          open
          onClose={() => setConfirming(false)}
          title="Dismiss recommendation"
          description={`The engine's call${exerciseName ? ` for ${exerciseName}` : ''} will be dismissed. The client keeps the current prescription. Re-evaluate later to get a fresh call.`}
        >
          <footer className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={() => run('DISMISSED')} disabled={pending}>
              {pending ? 'Dismissing…' : 'Confirm'}
            </Button>
          </footer>
        </Sheet>
      ) : null}
    </div>
  );
}
