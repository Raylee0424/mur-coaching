import clsx from 'clsx';

export interface StatItem {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } | null;
  note?: string;
  /** Value in the signal colour. Only for "pending > 0". */
  emphasis?: boolean;
}

const DELTA_TONE = { good: 'text-emerald', warn: 'text-amber', bad: 'text-rose', neutral: 'text-muted' } as const;

/** Hairline-divided KPI strip. Replaces grids of identical stat cards. */
export function StatStrip({ items, label }: { items: StatItem[]; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 border-y border-line md:flex md:divide-x md:divide-line">
      {items.map((s) => (
        <div key={s.label} className="min-w-0 flex-1 px-4 py-3 first:pl-0">
          <dt className="font-mono text-micro uppercase text-muted">{s.label}</dt>
          <dd className={clsx('mt-1 font-mono text-metric', s.emphasis ? 'text-signal' : 'text-ink')}>
            {s.value}
            {s.unit ? <span className="ml-1 text-ui text-faint">{s.unit}</span> : null}
          </dd>
          {s.delta ? <dd className={clsx('mt-0.5 font-mono text-meta', DELTA_TONE[s.delta.tone])}>{s.delta.text}</dd> : null}
          {!s.delta && s.note ? <dd className="mt-0.5 text-meta text-faint">{s.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
