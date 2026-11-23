'use client';

import { useActionState, useState } from 'react';
import type { CreateInviteResponse } from '@coaching/shared';
import { inviteFirstClient } from '@/actions/onboarding';
import type { ActionResult } from '@/lib/action-result';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

/** Creates an invite and shows the one-time link so the coach can share it. */
export function InviteStep({ onInvited }: { onInvited?: () => void }) {
  const [state, action] = useActionState<ActionResult<CreateInviteResponse> | null, FormData>(
    async (prev, fd) => {
      const r = await inviteFirstClient(prev, fd);
      if (r.ok) onInvited?.();
      return r;
    },
    null,
  );
  const [copied, setCopied] = useState(false);

  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (state?.ok) {
    const { invite, inviteUrl } = state.data;
    return (
      <div role="status" className="space-y-3 rounded-lg border border-emerald/40 bg-emerald-bg p-4">
        <p className="text-sm font-semibold text-emerald">Invite created for {invite.name}. Share this link:</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            aria-label="Invite link"
            value={inviteUrl}
            onFocus={(e) => e.target.select()}
            className="tabular min-h-11 min-w-0 flex-1 rounded-md border border-emerald/40 bg-canvas-low px-3 text-sm text-ink"
          />
          <Button variant="secondary" onClick={() => void copy(inviteUrl)}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
        <p className="text-sm text-emerald">It is shown once and expires in a few days. Track the invite from your roster.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="invite-client-name">Client name</Label>
          <Input id="invite-client-name" name="name" required maxLength={100} autoComplete="off" placeholder="Marcus Vance" />
        </div>
        <div>
          <Label htmlFor="invite-client-email">Client email</Label>
          <Input id="invite-client-email" name="email" type="email" required autoComplete="off" placeholder="marcus@example.com" />
        </div>
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
      <SubmitButton pendingLabel="Creating link…">Send invite</SubmitButton>
    </form>
  );
}
