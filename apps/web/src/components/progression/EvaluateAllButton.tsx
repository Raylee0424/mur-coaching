'use client';

import { RefreshCw } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { evaluateAll } from '@/actions/progression';
import type { ActionResult } from '@/lib/action-result';
import { FormError } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { useToast } from '@/components/ui/Toast';

export function EvaluateAllButton({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionResult<{ count: number }> | null, FormData>(evaluateAll, null);
  useEffect(() => {
    if (state?.ok) toast.show({ message: `Evaluated ${state.data.count} ${state.data.count === 1 ? 'exercise' : 'exercises'}`, tone: 'ok' });
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Evaluating…">
        <Icon icon={RefreshCw} />
        Re-run engine
      </SubmitButton>
      <FormError>{state?.ok === false ? state.error : undefined}</FormError>
    </form>
  );
}
