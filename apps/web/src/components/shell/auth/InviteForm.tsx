'use client';

import { useActionState, useState } from 'react';
import type { InvitePreviewDto } from '@coaching/shared';
import { acceptInvite } from '@/actions/auth';
import type { ActionResult } from '@/lib/action-result';
import { FormError, Input, Label } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { PasswordMeter } from './PasswordMeter';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** `startLabel` is the pre-formatted program/start line, or null when the invite has no program. */
export function InviteForm({ token, preview, summary }: { token: string; preview: InvitePreviewDto; summary: string | null }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(acceptInvite, null);
  const [password, setPassword] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-md border border-line bg-canvas-low p-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-container font-display font-bold text-primary">
          {initials(preview.coachName)}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{preview.coachName} invited you to train</p>
          {summary ? <p className="text-sm text-muted">{summary}</p> : null}
        </div>
      </div>
      <form action={action} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="invite-name">Full name</Label>
          <Input id="invite-name" name="name" autoComplete="name" required maxLength={100} defaultValue={preview.name} />
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" value={preview.email} readOnly aria-readonly="true" className="text-muted" />
        </div>
        <div>
          <Label htmlFor="invite-password">Create password</Label>
          <PasswordInput id="invite-password" name="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          <PasswordMeter password={password} />
        </div>
        <FormError>{state?.ok === false ? state.error : undefined}</FormError>
        <SubmitButton className="w-full" pendingLabel="Creating account…">
          Accept and continue
        </SubmitButton>
      </form>
    </div>
  );
}
