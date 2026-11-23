import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-soft disabled:bg-raised disabled:text-faint',
  secondary: 'border border-line-strong bg-transparent text-ink hover:border-faint hover:bg-raised disabled:text-faint',
  ghost: 'text-muted hover:bg-raised hover:text-ink disabled:text-faint',
  danger: 'border border-danger/50 text-danger hover:bg-danger-bg disabled:text-faint',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-ui',
  md: 'h-9 gap-2 px-3.5 text-ui',
  lg: 'h-11 gap-2 px-4 text-body',
};

export function buttonClass(variant: ButtonVariant = 'primary', className?: string, size: ButtonSize = 'md'): string {
  return clsx(
    'inline-flex items-center justify-center whitespace-nowrap rounded font-medium transition-colors disabled:cursor-not-allowed',
    SIZES[size],
    VARIANTS[variant],
    className,
  );
}

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className, size)} {...rest} />;
}
