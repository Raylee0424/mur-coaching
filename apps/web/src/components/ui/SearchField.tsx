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
      className="w-full sm:w-64"
    >
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint">
          <Icon icon={Search} />
        </span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="block h-9 w-full rounded border border-line-strong bg-canvas-low pl-8 pr-3 text-ui text-ink placeholder:text-faint hover:border-faint"
        />
      </label>
    </form>
  );
}
