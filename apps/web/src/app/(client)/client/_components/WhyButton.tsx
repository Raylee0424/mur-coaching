'use client';

import clsx from 'clsx';
import { CircleCheck, Gauge, Info, TrendingUp, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ExplainDto, WeightUnit } from '@coaching/shared';
import { explainCall } from '@/actions/client-sheets';
import { formatTargetLine } from '@/components/logger/logger-model';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
        className={clsx(buttonClass('ghost', 'w-8 px-0 text-primary hover:text-primary', 'sm'), className)}
      >
        <Icon icon={Info} />
        <span className="sr-only">{label}</span>
      </button>
      {open ? (
        <Sheet
          open
          onClose={() => setOpen(false)}
          variant="bottom"
          title={sheetTitle(load, exerciseName, unit, override)}
        >
          <div className="space-y-6">
            {override ? (
              <OverrideBody load={load} override={override} unit={unit} onRetry={start} />
            ) : (
              <CallBody load={load} exerciseName={exerciseName} unit={unit} coachName={coachName} onRetry={start} />
            )}
            <Button size="lg" className="w-full" onClick={() => setOpen(false)}>
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
        <p role="alert" className="text-ui font-medium text-danger">
          {load.message}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="text-ui text-muted">
      Loading the reasoning…
    </p>
  );
}

const ICONS: Record<BulletIcon, LucideIcon> = { check: CircleCheck, effort: Gauge, trend: TrendingUp };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 border-b border-line pb-2 font-mono text-label-sm uppercase text-muted">{children}</h3>;
}

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
        <div className={clsx('rounded-sm border p-4', ACTION_META[e.action].box)}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-label-sm uppercase text-muted">Engine Verdict</span>
            <ActionBadge action={e.action} />
          </div>
          {e.status === 'PENDING' && !e.override ? <p className="font-mono text-label-sm uppercase text-amber">Proposed, awaiting coach approval</p> : null}
          <p className={clsx('font-mono text-metric', ACTION_META[e.action].text)}>{target}</p>
        </div>
      ) : null}
      <section>
        <SectionTitle>Reasoning</SectionTitle>
        <ul className="divide-y divide-line border-b border-line">
          {bullets.map((b) => (
            <li key={b.text} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 shrink-0 text-primary">
                <Icon icon={ICONS[b.icon]} />
              </span>
              <span className="text-ui text-ink">{b.text}</span>
            </li>
          ))}
        </ul>
      </section>
      {mini.points.length > 0 ? (
        <section>
          <SectionTitle>Last {mini.points.length === 1 ? 'session' : `${mini.points.length} sessions`}</SectionTitle>
          <div className="rounded-sm border border-line bg-canvas-low p-3">
            <p className="mb-2 font-mono text-label-md text-ink">{mini.weights}</p>
            <svg viewBox="0 0 300 72" className="h-16 w-full" role="img" aria-label={`${exerciseName} top-set weight over the last ${mini.points.length} sessions: ${mini.weights}`}>
              <polyline fill="none" stroke="#C6FF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={pts.map((p) => `${p.x},${p.y}`).join(' ')} />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2.5} fill="#C6FF00" />
              ))}
            </svg>
            <ol className="flex items-start justify-between gap-2 pt-1 font-mono text-label-sm text-muted">
              {mini.labels.map((l, idx) => (
                <li key={l} className={idx === mini.labels.length - 1 ? 'text-primary' : undefined}>
                  {l}
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}
      <p className="text-meta text-muted">{setByLine(e, coachName)}</p>
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
      <section className="rounded-sm border border-primary/40 bg-primary-container p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-label-sm uppercase text-primary">Overridden by coach</span>
          <span className="font-mono text-label-sm text-muted">{[at ? shortDate(at) : null, byName].filter(Boolean).join(' · ')}</span>
        </div>
        {o.note ? <p className="mt-1 text-ui text-ink">&ldquo;{o.note}&rdquo;</p> : <p className="mt-1 text-ui text-muted">Your coach adjusted this target without a note.</p>}
      </section>
      {data ? (
        <section>
          <SectionTitle>Engine original call</SectionTitle>
          <div className="mb-2 flex items-center justify-between gap-2">
            <ActionBadge action={data.action} />
            <span className="font-mono text-ui text-ink">{targetOf(data.proposed, unit)}</span>
          </div>
          <p className="text-ui text-muted">{data.reason}</p>
        </section>
      ) : (
        <Status load={load} onRetry={onRetry} />
      )}
    </>
  );
}
