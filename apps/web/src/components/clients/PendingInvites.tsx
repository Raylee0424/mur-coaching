'use client';

import { useState, useTransition } from 'react';
import type { InviteDto } from '@coaching/shared';
import { revokeInvite } from '@/actions/clients';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TABLE, TD, TH, THEAD, TR } from '@/components/ui/table';
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
    <Panel title="Pending invites" meta={String(invites.length)}>
      <div className="relative overflow-x-auto">
        <table className={`${TABLE} min-w-[40rem]`}>
          <caption className="sr-only">Pending invites</caption>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>Client</th>
              <th scope="col" className={TH}>Program</th>
              <th scope="col" className={TH}>Expires</th>
              <th scope="col" className={TH}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => (
              <tr key={i.id} className={`${TR} ${i.expired ? 'text-faint' : ''}`}>
                <td className={TD}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={i.expired ? '' : 'font-medium text-ink'}>{i.name}</span>
                    {i.expired ? <Badge tone="slate">Expired</Badge> : null}
                  </span>
                  <span className="block text-meta text-faint">{i.email}</span>
                </td>
                <td className={TD}>{i.programName ?? <span className="text-faint">None</span>}</td>
                <td className={`${TD} whitespace-nowrap font-mono`}>{formatDate(i.expiresAt)}</td>
                <td className={`${TD} text-right`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Revoke invite for ${i.name}`}
                    onClick={() => {
                      setError(undefined);
                      setTarget(i);
                    }}
                  >
                    <Icon icon={X} />
                    Revoke
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {target ? (
        <Sheet
          open
          onClose={() => setTarget(null)}
          title="Revoke invite?"
          description={`${target.name} will no longer be able to join with this link.`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setTarget(null)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={revoke} disabled={pending}>
                {pending ? 'Revoking…' : 'Revoke invite'}
              </Button>
            </>
          }
        >
          <FormError>{error}</FormError>
        </Sheet>
      ) : null}
    </Panel>
  );
}
