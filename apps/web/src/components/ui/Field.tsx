import clsx from 'clsx';
import type { ComponentProps } from 'react';

const CONTROL =
  'block min-h-11 w-full rounded-md border border-line bg-canvas-low px-3 py-2 text-base text-ink ' +
  'placeholder:text-muted/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-primary aria-[invalid=true]:border-danger';

export function Label({ className, ...rest }: ComponentProps<'label'>) {
  return <label className={clsx('mb-1 block text-xs font-semibold uppercase tracking-wider text-muted', className)} {...rest} />;
}

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={clsx(CONTROL, className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<'select'>) {
  return <select className={clsx(CONTROL, className)} {...rest} />;
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

/** Form-level error banner. */
export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
      {children}
    </p>
  );
}
