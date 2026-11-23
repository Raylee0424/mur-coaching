'use client';

import { useState, useTransition } from 'react';
import { CoachClientStatus } from '@coaching/shared';
import { setClientStatus } from '@/actions/clients';
import { Button } from '@/components/ui/Button';

/** Archived clients have no detail page; this brings them back to the active roster. */
export function RestoreClientButton({ clientId, name }: { clientId: string; name: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        size="sm"
        aria-label={`Restore ${name}`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await setClientStatus(clientId, CoachClientStatus.ACTIVE);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {pending ? 'Restoring…' : 'Restore'}
      </Button>
      {error ? <span className="text-meta text-danger">{error}</span> : null}
    </span>
  );
}
