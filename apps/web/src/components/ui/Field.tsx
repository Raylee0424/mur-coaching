import clsx from 'clsx';
import type { ComponentProps } from 'react';

const CONTROL =
  'block w-full rounded border border-line-strong bg-canvas-low px-3 text-ink placeholder:text-faint ' +
  'transition-colors hover:border-faint aria-[invalid=true]:border-danger';

type ControlSize = 'md' | 'lg';
const CONTROL_SIZE: Record<ControlSize, string> = { md: 'h-9 text-ui', lg: 'h-11 text-body' };

export function Label({ className, ...rest }: ComponentProps<'label'>) {
  return <label className={clsx('mb-1.5 block font-mono text-micro uppercase text-muted', className)} {...rest} />;
}

export function Input({ className, size, ...rest }: Omit<ComponentProps<'input'>, 'size'> & { size?: ControlSize }) {
  const numeric = rest.type === 'number' || rest.inputMode === 'decimal' || rest.inputMode === 'numeric';
  return <input className={clsx(CONTROL, CONTROL_SIZE[size ?? 'md'], numeric && 'font-mono', className)} {...rest} />;
}

export function Select({ className, size, ...rest }: Omit<ComponentProps<'select'>, 'size'> & { size?: ControlSize }) {
  return <select className={clsx(CONTROL, CONTROL_SIZE[size ?? 'md'], className)} {...rest} />;
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1 text-meta font-medium text-danger">
      {children}
    </p>
  );
}

/** Form-level error banner. */
export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded border-l-2 border-danger bg-danger-bg px-3 py-2 text-ui text-danger">
      {children}
    </p>
  );
}
