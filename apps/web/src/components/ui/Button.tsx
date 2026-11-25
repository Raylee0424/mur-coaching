import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary-soft disabled:bg-raised disabled:text-faint',
  secondary: 'border border-line bg-card text-ink hover:border-line-strong hover:bg-raised disabled:text-faint',
  ghost: 'text-muted hover:bg-raised hover:text-ink disabled:text-faint',
  danger: 'border border-danger/50 bg-danger-bg/60 text-danger hover:bg-danger-bg disabled:text-faint',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 text-label-md',
  md: 'h-10 gap-2 text-label-lg',
  lg: 'h-11 gap-2 text-label-lg',
};

const PADDING: Record<ButtonSize, string> = { sm: 'px-3.5', md: 'px-4', lg: 'px-5' };

/** True when `className` sets its own horizontal padding (`px-0` on icon-only buttons, for example). */
const OWN_PADDING = /(^|\s)px-/;

export function buttonClass(variant: ButtonVariant = 'primary', className?: string, size: ButtonSize = 'md'): string {
  return clsx(
    'inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-colors disabled:cursor-not-allowed',
    SIZES[size],
    // clsx only concatenates and Tailwind orders `px-0` before `px-3.5`, so a caller's padding
    // would lose to the size default. Drop the default instead (it squeezed icon-only buttons to a dot).
    className && OWN_PADDING.test(className) ? undefined : PADDING[size],
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
