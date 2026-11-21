'use client';

import { useActionState } from 'react';
import { evaluateAll } from '@/actions/progression';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function EvaluateAllButton({ clientId }: { clientId: string }) {
  const [state, action] = useActionState<ActionResult<{ count: number }> | null, FormData>(evaluateAll, null);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <SubmitButton variant="secondary" pendingLabel="Evaluating…">
        Re-run progression engine
      </SubmitButton>
      {state?.ok ? (
        <p role="status" className="text-sm font-medium text-emerald">
          Evaluated {state.data.count} {state.data.count === 1 ? 'exercise' : 'exercises'}.
        </p>
      ) : null}
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </form>
  );
}
