'use client';

import { useState, useTransition } from 'react';
import type { InviteDto } from '@coaching/shared';
import { revokeInvite } from '@/actions/clients';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate } from '@/lib/format';

/** Pending (not yet accepted) invites. The link itself is shown only once at creation; revoke and re-invite to get a new one. */
export function PendingInvites({ invites }: { invites: InviteDto[] }) {
  const [target, setTarget] = useState<InviteDto | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  if (invites.length === 0) return null;

  function revoke(): void {
    if (!target) return;
    startTransition(async () => {
      const r = await revokeInvite(target.id);
      if (r.ok) setTarget(null);
      else setError(r.error);
    });
  }

  return (
    <section aria-labelledby="invites-heading" className="rounded-lg border border-line bg-card">
      <div className="border-b border-line px-5 py-4">
        <h2 id="invites-heading" className="font-display text-lg font-bold">
          Pending invites <span className="text-sm font-normal text-muted">({invites.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-line">
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {i.name}
                {i.expired ? <Badge tone="red">Expired</Badge> : <Badge tone="sky">Pending</Badge>}
              </p>
              <p className="text-xs text-muted">
                {i.email}
                {i.programName ? ` · ${i.programName}` : ''} · {i.expired ? 'expired' : 'expires'} {formatDate(i.expiresAt)}
              </p>
            </div>
            <Button
              variant="secondary"
              className="min-h-9 py-1"
              aria-label={`Revoke invite for ${i.name}`}
              onClick={() => {
                setError(undefined);
                setTarget(i);
              }}
            >
              Revoke
            </Button>
          </li>
        ))}
      </ul>
      {target ? (
        <Sheet
          open
          onClose={() => setTarget(null)}
          title="Revoke invite?"
          description={`${target.name} will no longer be able to join with this link.`}
        >
          <FormError>{error}</FormError>
          <footer className="mt-4 flex justify-between gap-2">
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={revoke} disabled={pending}>
              {pending ? 'Revoking…' : 'Revoke invite'}
            </Button>
          </footer>
        </Sheet>
      ) : null}
    </section>
  );
}
