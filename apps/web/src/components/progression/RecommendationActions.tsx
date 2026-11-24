'use client';

import { Check, RefreshCw, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { recommendationAction } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';

interface Props {
  clientId: string;
  recommendationId: string;
  exerciseId: string;
  /** Coach view: may dismiss and re-evaluate. Clients may only accept. */
  canDismiss: boolean;
  /** Shown in the dismiss dialog and toasts. */
  exerciseName?: string;
  /** Stack the buttons (LiftCard side column). */
  stacked?: boolean;
}

const DONE = { ACCEPTED: 'Accepted', DISMISSED: 'Dismissed', REEVALUATE: 'Re-evaluated' } as const;

export function RecommendationActions({ clientId, recommendationId, exerciseId, canDismiss, exerciseName, stacked }: Props) {
  const toast = useToast();
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
      if (result.ok) toast.show({ message: `${DONE[intent]}${exerciseName ? ` ${exerciseName}` : ''}`, tone: 'ok' });
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className={stacked ? 'flex flex-wrap items-center gap-2' : 'flex flex-wrap gap-2'}>
        <Button variant="primary" size={canDismiss ? 'sm' : 'lg'} onClick={() => run('ACCEPTED')} disabled={pending}>
          <Icon icon={Check} />
          Accept
        </Button>
        {canDismiss ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={pending}>
              <Icon icon={X} />
              Dismiss
            </Button>
            <Button variant="ghost" size="sm" onClick={() => run('REEVALUATE')} disabled={pending}>
              <Icon icon={RefreshCw} />
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
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => run('DISMISSED')} disabled={pending}>
                {pending ? 'Dismissing…' : 'Dismiss call'}
              </Button>
            </>
          }
        >
          <p className="text-ui text-muted">This cannot be undone from here.</p>
        </Sheet>
      ) : null}
    </div>
  );
}
