'use client';

import { useActionState } from 'react';
import { recommendationAction } from '@/actions/progression';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

interface Props {
  clientId: string;
  recommendationId: string;
  exerciseId: string;
  /** Coach view: may dismiss and re-evaluate. Clients may only accept. */
  canDismiss: boolean;
}

export function RecommendationActions({ clientId, recommendationId, exerciseId, canDismiss }: Props) {
  const [state, action] = useActionState<ActionResult<string> | null, FormData>(recommendationAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="ACCEPTED" pendingLabel="Saving…">
          Accept
        </SubmitButton>
        {canDismiss ? (
          <>
            <SubmitButton name="intent" value="DISMISSED" variant="secondary" pendingLabel="Saving…">
              Dismiss
            </SubmitButton>
            <SubmitButton name="intent" value="REEVALUATE" variant="secondary" pendingLabel="Re-evaluating…">
              Re-evaluate
            </SubmitButton>
          </>
        ) : null}
      </div>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </form>
  );
}
