import clsx from 'clsx';
import type { ComponentProps } from 'react';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={clsx('rounded-lg border border-line bg-card p-5', className)} {...rest} />;
}
