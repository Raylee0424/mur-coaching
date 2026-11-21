'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { CreateClientResponse } from '@coaching/shared';
import { createClient } from '@/actions/clients';
import type { ActionResult } from '@/lib/action-result';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function AddClientForm() {
  const [state, action] = useActionState<ActionResult<CreateClientResponse> | null, FormData>(createClient, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOpen(false);
      setCopied(false);
    }
  }, [state]);

  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>Invite client</Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Invite client"
        description="Creates the account and a temporary password for you to share."
      >
        <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" name="name" required maxLength={100} autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="client-email">Email</Label>
            <Input id="client-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="client-notes">Private notes (optional)</Label>
            <Input id="client-notes" name="notes" maxLength={2000} autoComplete="off" />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <FormError>{state?.ok === false ? state.error : undefined}</FormError>
            <SubmitButton pendingLabel="Inviting…">Create client</SubmitButton>
          </div>
        </form>
      </Sheet>

      {state?.ok ? (
        <div role="status" className="space-y-2 rounded-lg border border-emerald bg-emerald-bg p-4">
          <p className="text-sm font-semibold text-emerald">
            {state.data.client.name} was added. Temporary password:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded bg-card px-3 py-1.5 font-mono text-base ring-1 ring-emerald">
              {state.data.temporaryPassword}
            </code>
            <Button variant="secondary" onClick={() => void copy(state.data.temporaryPassword)}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-sm text-emerald">Share this with your client; it won&apos;t be shown again.</p>
        </div>
      ) : null}
    </div>
  );
}
