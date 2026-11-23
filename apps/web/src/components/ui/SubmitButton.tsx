'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from './Button';

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, 'type' | 'children'> {
  children: ReactNode;
  pendingLabel?: string;
}

/** Disables itself and shows a spinner while its parent <form> action is running. */
export function SubmitButton({ children, pendingLabel, disabled, ...rest }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...rest}>
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
          />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
