'use client';

import { Check, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { PERIODIZATION_LIMITS } from '@coaching/shared';
import type { SportCategoryDto } from '@coaching/shared';
import { Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

/** Tag picker over the sport catalog: search, pick up to a few, selected ones show as removable chips. */
export function SportPicker({ sports, selected, onChange }: { sports: SportCategoryDto[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const full = selected.length >= PERIODIZATION_LIMITS.maxSports;
  const byId = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? sports.filter((s) => s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)) : sports;
  }, [sports, query]);
  const toggle = (sportId: string): void => onChange(selected.includes(sportId) ? selected.filter((x) => x !== sportId) : [...selected, sportId]);

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-q`}>
        Sports <span className="text-faint">({selected.length}/{PERIODIZATION_LIMITS.maxSports} · {sports.length} available)</span>
      </Label>
      {selected.length > 0 ? (
        <ul aria-label="Chosen sports" className="flex flex-wrap gap-1.5">
          {selected.map((sid) => (
            <li key={sid}>
              <button
                type="button"
                onClick={() => toggle(sid)}
                aria-label={`Remove ${byId.get(sid)?.name ?? sid}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary-container px-3 py-1 font-sans text-label-sm text-primary"
              >
                {byId.get(sid)?.name ?? sid}
                <Icon icon={X} size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input id={`${id}-q`} type="search" value={query} placeholder="Search sports, e.g. powerlifting" onChange={(e) => setQuery(e.target.value)} />
      <ul aria-label="Sport catalog" className="max-h-44 divide-y divide-line overflow-y-auto rounded-md border border-line">
        {matches.length === 0 ? <li className="px-3 py-2 text-meta text-muted">No sport matches “{query}”.</li> : null}
        {matches.map((s) => {
          const on = selected.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => toggle(s.id)}
                className="flex min-h-9 w-full items-center justify-between gap-2 px-3 text-left text-ui hover:bg-raised/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>{s.name}</span>
                <span className="flex items-center gap-2 font-mono text-micro text-faint">
                  {s.group}
                  {on ? <Icon icon={Check} size={14} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
