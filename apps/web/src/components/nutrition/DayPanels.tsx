import clsx from 'clsx';
import { Droplet } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NutrientTotals, NutritionTargetDto } from '@coaching/shared';
import { Badge } from '@/components/ui/Badge';
import { SheetButton } from '@/components/ui/Sheet';
import { Icon } from '@/components/ui/Icon';
import { barWidth, fmt, macroBars, microRows, type MacroTone, type MicroTone } from './nutrition-model';

const BAR: Record<MacroTone, { text: string; fill: string }> = {
  primary: { text: 'text-primary', fill: 'bg-primary' },
  sky: { text: 'text-sky', fill: 'bg-sky' },
  emerald: { text: 'text-emerald', fill: 'bg-emerald' },
  amber: { text: 'text-amber', fill: 'bg-amber' },
};

const MICRO_TEXT: Record<MicroTone, string> = { amber: 'text-amber', emerald: 'text-emerald', primary: 'text-primary', muted: 'text-muted' };

export function targetBadge(target: NutritionTargetDto | null): ReactNode {
  if (!target) return <Badge tone="slate">No targets set</Badge>;
  return target.setBy === 'COACH' ? <Badge tone="signal">Set by {target.setByName ?? 'your coach'}</Badge> : <Badge tone="neutral">Self-set targets</Badge>;
}

/** Stitch "Daily Targets": calories + three macro bars with a role-labelled progressbar each. */
export function DailyTargets({ totals, target, actions }: { totals: NutrientTotals; target: NutritionTargetDto | null; actions?: ReactNode }) {
  const bars = macroBars(totals, target);
  return (
    <section aria-labelledby="targets-heading" className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="targets-heading" className="font-display text-title-lg text-ink">
            Daily Targets
          </h2>
          {targetBadge(target)}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-title-md text-ink tabular-nums">
            {fmt(totals.kcal)}
            {target ? ` / ${fmt(target.kcal)}` : ''} kcal
          </span>
          {actions}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 font-mono sm:grid-cols-2 md:grid-cols-4">
        {bars.map((b) => (
          <div key={b.key} className="flex flex-col gap-2 rounded-sm border border-line bg-canvas-low p-4">
            <div className="flex justify-between text-label-sm">
              <span className={b.key === 'kcal' ? 'text-muted' : BAR[b.tone].text}>{b.label.toUpperCase()}</span>
              <span className={BAR[b.tone].text}>{b.pct === null ? '—' : `${b.pct}%`}</span>
            </div>
            <p className="text-title-md text-ink tabular-nums">
              {fmt(b.value)}
              {b.target !== null ? ` / ${fmt(b.target)}` : ''}
              {b.key === 'kcal' ? '' : b.unit}
            </p>
            <div
              role="progressbar"
              aria-label={`${b.label} ${b.pct === null ? 'no target' : `${b.pct}% of target`}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={barWidth(b.pct)}
              className="h-2 rounded-full bg-card"
            >
              <div className={clsx('h-2 rounded-full', BAR[b.tone].fill)} style={{ width: `${barWidth(b.pct)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Stitch "Micronutrient Highlights" card; the full list opens in a drawer. */
export function MicroHighlights({ totals, target }: { totals: NutrientTotals; target: NutritionTargetDto | null }) {
  const rows = microRows(totals, target);
  const highlights = rows.filter((r) => ['fiberG', 'vitaminDMcg', 'magnesiumMg', 'potassiumMg'].includes(r.key));
  const list = (items: typeof rows, dense: boolean) => (
    <div className={clsx('flex flex-col font-mono', dense ? 'gap-3 text-label-sm' : 'gap-0 text-label-md')}>
      {items.map((r) => (
        <div key={r.key} className={clsx('flex justify-between gap-3', !dense && 'border-b border-line py-2')}>
          <span className="text-ink">{r.label}</span>
          <span className={MICRO_TEXT[r.tone]}>
            {dense ? '' : `${fmt(r.value, 1)} ${r.unit} · `}
            {r.pct}% {r.ceiling ? 'of limit' : r.key === 'fiberG' && target?.fiberG ? 'of target' : 'DV'}
          </span>
        </div>
      ))}
    </div>
  );
  return (
    <article className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-title-md text-ink">Micronutrient Highlights</h2>
        <SheetButton
          label={`View all ${rows.length}`}
          buttonVariant="ghost"
          buttonClassName="h-8 px-2 text-label-sm text-primary"
          variant="drawer"
          title={`${rows.length} tracked micronutrients`}
          description="Totals from logged foods. Foods without a value count as zero, so treat these as a floor."
        >
          {list(rows, false)}
        </SheetButton>
      </div>
      {list(highlights, true)}
    </article>
  );
}

/** Read-only water card (coach view and Today); the interactive one is WaterTracker. */
export function WaterSummary({ ml, targetMl }: { ml: number; targetMl: number }) {
  const pct = Math.round((ml / targetMl) * 100);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-label-md text-muted">
        <Icon icon={Droplet} className="text-sky" />
        Water
      </span>
      <span className="font-mono text-label-md text-sky tabular-nums">
        {(ml / 1000).toFixed(1)} / {(targetMl / 1000).toFixed(1)} L · {pct}%
      </span>
    </div>
  );
}
