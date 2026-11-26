import clsx from 'clsx';

export interface StatItem {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; tone: 'good' | 'warn' | 'bad' | 'neutral' } | null;
  note?: string;
  /** Value highlighted in electric lime (e.g. pending > 0). */
  emphasis?: boolean;
}

const DELTA_TONE = { good: 'text-emerald', warn: 'text-amber', bad: 'text-rose', neutral: 'text-muted' } as const;

/** Stitch KPI card row: elevated dark-slate cards with uppercase eyebrow, bold display metric, and status delta. */
export function StatStrip({ items, label, dense = false }: { items: StatItem[]; label: string; dense?: boolean }) {
  const cols =
    dense && items.length === 4
      ? 'grid-cols-2 gap-3 lg:grid-cols-4'
      : items.length <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : items.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <dl aria-label={label} className={clsx('grid', dense && items.length === 4 ? null : 'gap-4', cols)}>
      {items.map((s) => (
        <div key={s.label} className={clsx('flex min-w-0 flex-col gap-2 rounded-md border border-line bg-card', dense && items.length === 4 ? 'p-4 sm:p-5' : 'p-5')}>
          <dt className="font-sans text-label-sm uppercase tracking-wider text-muted">{s.label}</dt>
          <dd className={clsx('font-display text-headline-lg-mobile lg:text-headline-lg tabular-nums', s.emphasis ? 'text-primary' : 'text-ink')}>
            {s.value}
            {s.unit ? <span className="ml-1 font-sans text-title-md text-muted">{s.unit}</span> : null}
          </dd>
          {s.delta ? <dd className={clsx('font-sans text-label-sm tabular-nums', DELTA_TONE[s.delta.tone])}>{s.delta.text}</dd> : null}
          {!s.delta && s.note ? <dd className="font-sans text-label-sm text-muted">{s.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
