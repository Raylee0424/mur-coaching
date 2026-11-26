'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';
import type { RecommendationDto, WeightUnit } from '@coaching/shared';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SheetButton } from '@/components/ui/Sheet';
import { formatTarget } from '@/lib/format';
import clsx from 'clsx';
import { ACTION_META, ActionBadge } from './ActionBadge';
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
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Icon icon={Info} />
          {label}
        </Button>
        {open ? <WhyDrawer recommendationId={rec.id} unit={unit} onClose={() => setOpen(false)} /> : null}
      </>
    );
  }

  const target = formatTarget(rec, unit);
  return (
    <SheetButton label={label} title={`Why this call: ${exerciseName}`} variant="drawer" buttonVariant="ghost" buttonClassName="h-11 px-4">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ActionBadge action={rec.action} showCode />
          {target ? <span className={clsx('font-mono text-metric', ACTION_META[rec.action].text)}>{target}</span> : null}
        </div>
        <section>
          <h3 className="mb-3 border-b border-line pb-2 font-mono text-micro uppercase text-muted">Reasoning</h3>
          <p className="text-ui">{rec.reason}</p>
        </section>
        <section>
          <h3 className="mb-3 border-b border-line pb-2 font-mono text-micro uppercase text-muted">
            Based on {rec.metrics.length} {rec.metrics.length === 1 ? 'session' : 'sessions'}
          </h3>
          <MetricsTable metrics={rec.metrics} unit={unit} />
        </section>
        <p className="border-l-2 border-l-line-strong px-3 text-meta text-muted">
          This target comes from your logged sets. Accept it to lock it in for your next session.
        </p>
      </div>
    </SheetButton>
  );
}
