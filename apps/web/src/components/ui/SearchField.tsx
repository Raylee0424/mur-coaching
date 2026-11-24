'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/** Debounced `?q=` search: updates the URL 300 ms after typing stops, or on submit. */
export function SearchField({
  value,
  placeholder,
  label,
  hrefFor,
}: {
  value: string;
  placeholder: string;
  label: string;
  hrefFor: (text: string) => string;
}) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const first = useRef(true);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (text.trim() === value.trim()) return;
    const t = setTimeout(() => router.replace(hrefFor(text)), 300);
    return () => clearTimeout(t);
  }, [text, value, hrefFor, router]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.replace(hrefFor(text));
      }}
      className="w-full sm:w-72"
    >
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Icon icon={Search} />
        </span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="block h-10 w-full rounded-sm border border-line bg-canvas-low pl-9 pr-3 text-label-lg font-normal text-ink placeholder:text-muted transition-colors hover:border-line-strong focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
    </form>
  );
}
