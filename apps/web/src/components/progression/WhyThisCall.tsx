'use client';

import { useState } from 'react';
import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { Button } from '@/components/ui/Button';
import { SheetButton } from '@/components/ui/Sheet';
import { formatTarget } from '@/lib/format';
import { ActionBadge } from './ActionBadge';
import { MetricsTable } from './MetricsTable';
import { WhyDrawer } from './WhyDrawer';

/** Coaches get the full rule trace drawer; clients get the short explanation. */
export function WhyThisCall({
  recommendation: rec,
  exerciseName,
  audience,
  unit,
  label = 'Why this call?',
}: {
  recommendation: RecommendationDto;
  exerciseName: string;
  audience: 'coach' | 'client';
  unit: WeightUnit;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (audience === 'coach') {
    return (
      <>
        <Button variant="secondary" className="min-h-9 py-1" onClick={() => setOpen(true)}>
          {label}
        </Button>
        {open ? <WhyDrawer recommendationId={rec.id} unit={unit} onClose={() => setOpen(false)} /> : null}
      </>
    );
  }

  const target = formatTarget(rec, unit);
  return (
    <SheetButton label={label} title={`Why this call: ${exerciseName}`} variant="drawer" buttonClassName="min-h-9 py-1">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <ActionBadge action={rec.action} />
          {target ? <span className="font-display text-2xl font-extrabold tabular">{target}</span> : null}
        </div>
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Reasoning</h3>
          <p className="text-sm">{rec.reason}</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Based on {rec.metrics.length} {rec.metrics.length === 1 ? 'session' : 'sessions'}
          </h3>
          <MetricsTable metrics={rec.metrics} unit={unit} />
        </section>
        <p className="rounded-md bg-raised p-3 text-sm text-muted">
          This target comes from your logged sets. Accept it to lock it in for your next session.
        </p>
      </div>
    </SheetButton>
  );
}
