'use client';

import clsx from 'clsx';
import { useState } from 'react';
import type { ExplainDto, WeightUnit } from '@coaching/shared';
import { explainCall } from '@/actions/client-sheets';
import { formatTargetLine } from '@/components/logger/logger-model';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { toNumber } from '@/lib/format';
import { miniSeries, setByLine, shortDate, sparkPoints, whyBullets, whyTitle, type BulletIcon } from './today-model';

/** What the page already knows about a coach override, so the sheet has content before the API answers. */
export interface OverrideInfo {
  weightKg: string | null;
  repsMin: number | null;
  repsMax: number | null;
  rpe: string | null;
  note: string | null;
  byName: string | null;
  at: string | null;
}

interface Props {
  recommendationId: string;
  exerciseName: string;
  unit: WeightUnit;
  coachName: string | null;
  /** Set when the target in force is a coach override: opens the "target changed" explainer. */
  override?: OverrideInfo | null;
  className?: string;
  label?: string;
}

type Load = { status: 'idle' | 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ExplainDto };

/** "Why?" link: bottom sheet explaining the engine call (or the coach override) in plain language. */
export function WhyButton({ recommendationId, exerciseName, unit, coachName, override = null, className, label = 'Why?' }: Props) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ status: 'idle' });

  function start(): void {
    setLoad({ status: 'loading' });
    void explainCall(recommendationId).then((r) => setLoad(r.ok ? { status: 'ready', data: r.data } : { status: 'error', message: r.error }));
  }

  function openSheet(): void {
    setOpen(true);
    if (load.status !== 'ready' && load.status !== 'loading') start();
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={`Why this target for ${exerciseName}?`}
        className={clsx(
          'inline-flex min-h-8 items-center text-xs font-semibold text-muted underline hover:text-primary',
          className,
        )}
      >
        {label}
      </button>
      {open ? (
        <Sheet
          open
          onClose={() => setOpen(false)}
          variant="bottom"
          title={sheetTitle(load, exerciseName, unit, override)}
        >
          <div className="space-y-5">
            {override ? (
              <OverrideBody load={load} override={override} unit={unit} onRetry={start} />
            ) : (
              <CallBody load={load} exerciseName={exerciseName} unit={unit} coachName={coachName} onRetry={start} />
            )}
            <Button className="min-h-12 w-full" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

function targetOf(t: { weightKg: string | null; repsMin: number | null; repsMax: number | null; rpe?: string | null }, unit: WeightUnit): string {
  return formatTargetLine(
    { weightKg: t.weightKg === null ? null : toNumber(t.weightKg), repsMin: t.repsMin, repsMax: t.repsMax, rpe: t.rpe == null ? null : toNumber(t.rpe) },
    unit,
  );
}

function sheetTitle(load: Load, exerciseName: string, unit: WeightUnit, override: OverrideInfo | null): string {
  if (override) {
    const line = targetOf({ ...override, rpe: null }, unit);
    return line ? `Why ${line}?` : `Why this ${exerciseName} target?`;
  }
  return load.status === 'ready' ? whyTitle(load.data.action, exerciseName) : `Why your ${exerciseName} target?`;
}

function Status({ load, onRetry }: { load: Load; onRetry: () => void }) {
  if (load.status === 'error') {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm font-medium text-danger">
          {load.message}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="text-sm text-muted">
      Loading the reasoning…
    </p>
  );
}

const ICONS: Record<BulletIcon, string> = {
  check: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5-5 1.4 1.4-6.4 6.4z',
  effort: 'M12 4a9 9 0 00-9 9h2a7 7 0 1114 0h2a9 9 0 00-9-9zm1 9.6V8h-2v6.4l-2.8 2.8 1.4 1.4L13 15.4z',
  trend: 'm3 17 6-6 4 4 8-8v5h2V4h-8v2h5l-7 7-4-4-7.4 7.4z',
};

function CallBody({ load, exerciseName, unit, coachName, onRetry }: { load: Load; exerciseName: string; unit: WeightUnit; coachName: string | null; onRetry: () => void }) {
  if (load.status !== 'ready') return <Status load={load} onRetry={onRetry} />;
  const e = load.data;
  const target = e.override ? targetOf(e.override, unit) : targetOf(e.proposed, unit);
  const bullets = whyBullets(e);
  const mini = miniSeries(e.sessions, unit);
  const pts = sparkPoints(mini.points.map((p) => p.weightKg));
  return (
    <>
      {target ? (
        <div>
          {e.status === 'PENDING' && !e.override ? <p className="text-xs font-semibold uppercase tracking-wider text-amber">Proposed, not approved yet</p> : null}
          <p className="font-display text-2xl font-bold text-primary tabular">{target}</p>
        </div>
      ) : null}
      <ul className="space-y-3">
        {bullets.map((b) => (
          <li key={b.text} className="flex items-start gap-3 rounded-md border border-line bg-canvas-low p-3.5">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-primary" fill="currentColor">
              <path d={ICONS[b.icon]} />
            </svg>
            <span className="text-sm">{b.text}</span>
          </li>
        ))}
      </ul>
      {mini.points.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-line bg-canvas-low p-4">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span>Last {mini.points.length === 1 ? 'session' : `${mini.points.length} sessions`}</span>
            <span className="tabular normal-case tracking-normal">{mini.weights}</span>
          </div>
          <svg viewBox="0 0 300 72" className="h-16 w-full" role="img" aria-label={`${exerciseName} top-set weight over the last ${mini.points.length} sessions: ${mini.weights}`}>
            <polyline fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 4} className="fill-primary" />
            ))}
          </svg>
          <ol className="flex items-start justify-between gap-2 text-[11px] text-muted tabular">
            {mini.labels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </section>
      ) : null}
      <p className="text-sm text-muted">{setByLine(e, coachName)}</p>
    </>
  );
}

function OverrideBody({ load, override, unit, onRetry }: { load: Load; override: OverrideInfo; unit: WeightUnit; onRetry: () => void }) {
  const data = load.status === 'ready' ? load.data : null;
  const o = data?.override ?? override;
  const byName = o.byName;
  const at = o.at;
  return (
    <>
      <section className="space-y-2 rounded-md border border-primary/40 bg-primary-container p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-ink">Overridden by coach</span>
          <span className="text-xs text-primary-soft tabular">{[at ? shortDate(at) : null, byName].filter(Boolean).join(' · ')}</span>
        </div>
        {o.note ? <p className="text-sm">&ldquo;{o.note}&rdquo;</p> : <p className="text-sm text-muted">Your coach adjusted this target without a note.</p>}
      </section>
      {data ? (
        <section className="space-y-1.5 rounded-md border border-emerald/40 bg-emerald-bg p-4">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald">
            <span>ENGINE ORIGINAL CALL</span>
            <span className="tabular">{targetOf(data.proposed, unit)}</span>
          </div>
          <ActionBadge action={data.action} />
          <p className="text-sm">{data.reason}</p>
        </section>
      ) : (
        <Status load={load} onRetry={onRetry} />
      )}
    </>
  );
}
