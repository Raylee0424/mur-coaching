'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { Icon } from './Icon';
import { Input } from './Field';

/** Password field with a show/hide toggle. Same props as <Input>. */
export function PasswordInput({ className, ...rest }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={shown ? 'text' : 'password'} className={`pr-10 ${className ?? ''}`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r text-muted hover:text-ink"
      >
        <Icon icon={shown ? EyeOff : Eye} />
      </button>
    </div>
  );
}
