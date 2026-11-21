import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-soft disabled:bg-primary/30 disabled:text-primary-ink/60',
  secondary: 'bg-transparent text-ink ring-1 ring-inset ring-line-strong hover:bg-raised disabled:text-muted/50',
  danger: 'bg-danger text-primary-ink hover:bg-danger/80 disabled:bg-danger/30',
};

export function buttonClass(variant: ButtonVariant = 'primary', className?: string): string {
  return clsx(
    'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}
