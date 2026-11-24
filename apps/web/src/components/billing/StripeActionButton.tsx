'use client';

import { useActionState } from 'react';
import type { ActionResult } from '@/lib/action-result';
import type { ButtonSize, ButtonVariant } from '@/components/ui/Button';
import { SubmitButton } from '@/components/ui/SubmitButton';

type RedirectAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * One-button form for a server action that redirects to a Stripe-hosted page (checkout, portal, Connect).
 * On failure it stays put and shows the API message under the button.
 */
export function StripeActionButton({
  action,
  label,
  fields,
  variant = 'primary',
  size = 'md',
  disabledReason,
  pendingLabel = 'Opening Stripe…',
  className,
}: {
  action: RedirectAction;
  label: string;
  fields?: Record<string, string>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and explains why (shown as text, not only a tooltip). */
  disabledReason?: string | null;
  /** Shown while the redirect is being prepared. */
  pendingLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel} disabled={Boolean(disabledReason)} className="w-full">
        {label}
      </SubmitButton>
      {disabledReason ? <p className="mt-1.5 text-meta text-muted">{disabledReason}</p> : null}
      {state && !state.ok ? (
        <p role="alert" className="mt-1.5 text-meta text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
