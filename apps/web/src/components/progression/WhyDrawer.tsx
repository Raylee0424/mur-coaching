'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useCallback, useEffect, useId, useState, useTransition } from 'react';
import { ENGINE_LIMITS, RecommendationStatus } from '@coaching/shared';
import type {
  CallHistoryEvent,
  CoachEngineRulesDto,
  EnginePreviewResponse,
  ExplainDto,
  QueueTarget,
  ResolvedEngineSettings,
  WeightUnit,
} from '@coaching/shared';
import { loadEngineRules, previewEngineRules } from '@/actions/engine-rules';
import { explainRecommendation, overrideRecommendation, recommendationAction } from '@/actions/progression';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { formatDate, formatRpe, formatTarget, toNumber } from '@/lib/format';
import { formatWeight } from '@/lib/units';
import { ACTION_META, ActionBadge } from './ActionBadge';
import { EditTargetDialog } from './EditTargetButton';
import { subjectFromExplain } from './edit-target-model';
import {
  SOURCE_LABEL,
  capIsSimulatable,
  formatSessions,
  ruleStatus,
  simulatedLoad,
  whyState,
} from './why-model';

type Load = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: ExplainDto };

function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

function targetText(t: QueueTarget, unit: WeightUnit): string {
  return formatTarget(
    { recommendedSets: null, recommendedRepsMin: t.repsMin, recommendedRepsMax: t.repsMax, recommendedWeightKg: t.weightKg },
    unit,
  );
}

/** 560px right drawer (bottom sheet on phones): verdict, inputs, rule trace, settings used, what-if, call history. */
export function WhyDrawer({ recommendationId, unit, onClose }: { recommendationId: string; unit: WeightUnit; onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const fetchIt = useCallback(() => {
    setLoad({ status: 'loading' });
    void explainRecommendation(recommendationId).then((r) => setLoad(r.ok ? { status: 'ready', data: r.data } : { status: 'error', error: r.error }));
  }, [recommendationId]);

  useEffect(() => {
    let cancelled = false;
    void explainRecommendation(recommendationId).then((r) => {
      if (!cancelled) setLoad(r.ok ? { status: 'ready', data: r.data } : { status: 'error', error: r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [recommendationId]);

  const data = load.status === 'ready' ? load.data : null;

  function resolve(intent: 'ACCEPTED' | 'DISMISSED'): void {
    if (!data) return;
    setActionError(undefined);
    const fd = new FormData();
    fd.set('clientId', data.client.id);
    fd.set('recommendationId', data.recommendationId);
    fd.set('exerciseId', data.exercise.id);
    fd.set('intent', intent);
    startTransition(async () => {
      const r = await recommendationAction(null, fd);
      if (r.ok) onClose();
      else setActionError(r.error);
    });
  }

  function resetOverride(): void {
    if (!data || data.proposed.weightKg === null || data.proposed.repsMin === null || data.proposed.repsMax === null) return;
    setActionError(undefined);
    const body = { weightKg: toNumber(data.proposed.weightKg), repsMin: data.proposed.repsMin, repsMax: data.proposed.repsMax };
    startTransition(async () => {
      const r = await overrideRecommendation(data.client.id, data.recommendationId, body);
      if (r.ok) fetchIt();
      else setActionError(r.error);
    });
  }

  const state = data ? whyState(data) : null;
  const canResolve = data?.status === RecommendationStatus.PENDING;
  const canEdit = data !== null && (data.status === RecommendationStatus.PENDING || data.status === RecommendationStatus.ACCEPTED);

  return (
    <>
      <Sheet
        open
        variant="drawer"
        onClose={onClose}
        title={data ? data.exercise.name : 'Why this call'}
        {...(data
          ? { description: `${data.client.name} · ${data.history.find((h) => h.type === 'CALL') ? `Computed ${formatDate(data.history.find((h) => h.type === 'CALL')!.at)} from ` : 'Based on '}${formatSessions(data.sessions.length)}.` }
          : {})}
      >
        {load.status === 'loading' ? (
          <div role="status" aria-busy="true" aria-label="Loading explanation" className="space-y-4">
            {[28, 40, 24].map((h) => (
              <div key={h} style={{ height: `${h * 4}px` }} className="animate-pulse rounded-lg bg-raised" />
            ))}
          </div>
        ) : load.status === 'error' ? (
          <div className="space-y-3">
            <FormError>{load.error}</FormError>
            <Button variant="secondary" onClick={fetchIt}>
              Try again
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            <ActionBadge action={data.action} />

            {state === 'overridden' && data.override ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary-container px-4 py-3">
                <p className="text-sm text-primary-soft">
                  {data.override.byName ?? 'You'} overrode the engine
                  {data.override.at ? ` on ${formatDate(data.override.at)}` : ''} ({targetText(data.override, unit)}).
                </p>
                <Button variant="secondary" className="min-h-9 py-1" onClick={resetOverride} disabled={pending || data.proposed.weightKg === null}>
                  Reset to engine
                </Button>
              </div>
            ) : null}

            <Verdict data={data} unit={unit} />

            {state === 'insufficient' ? (
              <section className="rounded-lg border border-dashed border-line px-5 py-8 text-center">
                <p className="font-display text-3xl font-extrabold tabular-nums text-muted">{data.sessions.length}/3</p>
                <h3 className="mt-2 font-display text-lg font-bold">Not enough data yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                  The progression engine needs at least 2 logged sessions of this movement before recommending a load change ({data.sessions.length} logged). This call holds the current load.
                </p>
              </section>
            ) : (
              <>
                <Inputs data={data} unit={unit} />
                <RuleTrace data={data} />
              </>
            )}

            <SettingsUsed settings={data.settings} />

            {state !== 'insufficient' ? <WhatIf data={data} unit={unit} /> : null}

            <History events={data.history} unit={unit} />

            <FormError>{actionError}</FormError>

            {canResolve || canEdit ? (
              <footer className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-card px-5 py-4 md:-mx-6 md:px-6">
                {canResolve ? (
                  <Button variant="secondary" onClick={() => resolve('DISMISSED')} disabled={pending}>
                    Dismiss
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  {canEdit ? (
                    <Button variant="secondary" onClick={() => setEditing(true)} disabled={pending}>
                      Edit target
                    </Button>
                  ) : null}
                  {canResolve ? (
                    <Button onClick={() => resolve('ACCEPTED')} disabled={pending}>
                      {pending ? 'Saving…' : 'Accept'}
                    </Button>
                  ) : null}
                </div>
              </footer>
            ) : null}
          </div>
        ) : null}
      </Sheet>
      {editing && data ? (
        <EditTargetDialog
          subject={subjectFromExplain(data)}
          unit={unit}
          onClose={() => {
            setEditing(false);
            fetchIt();
          }}
        />
      ) : null}
    </>
  );
}

function SectionTitle({ n, children }: { n: number; children: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
      {n}. {children}
    </h3>
  );
}

function Verdict({ data, unit }: { data: ExplainDto; unit: WeightUnit }) {
  const last = data.sessions[data.sessions.length - 1];
  const proposed = targetText(data.proposed, unit);
  return (
    <section className="space-y-2 rounded-lg border border-line bg-canvas-low p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle n={1}>Engine verdict</SectionTitle>
        <span className="font-display text-lg font-bold tabular-nums">
          {last ? <span className="text-muted">{formatWeight(last.topWeightKg, unit)} → </span> : null}
          <span className="text-primary">{data.proposed.weightKg !== null ? formatWeight(data.proposed.weightKg, unit) : proposed}</span>
        </span>
      </div>
      {proposed ? <p className="text-sm tabular-nums text-muted">{proposed}</p> : null}
      <p className="text-sm">{data.reason}</p>
      {data.autoApproved ? <p className="text-xs font-semibold text-emerald">Auto-approved by your rules</p> : null}
    </section>
  );
}

function Inputs({ data, unit }: { data: ExplainDto; unit: WeightUnit }) {
  const target = data.prescription?.repsMax ?? null;
  const rpes = data.sessions.flatMap((s) => (s.avgRpe === null ? [] : [s.avgRpe]));
  const mean = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;
  return (
    <section className="space-y-2">
      <SectionTitle n={2}>{`Inputs (last ${data.sessions.length} sessions)`}</SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[22rem] text-left text-sm">
          <caption className="sr-only">Sessions the engine used, oldest first</caption>
          <thead className="bg-raised text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Date</th>
              <th scope="col" className="px-3 py-2 font-semibold">Weight</th>
              <th scope="col" className="px-3 py-2 font-semibold">Reps{target !== null ? ' / target' : ''}</th>
              <th scope="col" className="px-3 py-2 font-semibold">RPE</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {[...data.sessions].reverse().map((s) => (
              <tr key={s.exerciseLogId} className="border-t border-line">
                <td className="px-3 py-2">{formatDate(s.performedAt)}</td>
                <td className="px-3 py-2">{formatWeight(s.topWeightKg, unit)}</td>
                <td className="px-3 py-2">
                  {s.repsPerSet.length > 0 ? s.repsPerSet.join(', ') : s.topSetReps}
                  {target !== null ? <span className="text-muted"> / {target}</span> : null}
                </td>
                <td className="px-3 py-2">{s.avgRpe === null ? '—' : formatRpe(s.avgRpe).replace('RPE ', '')}</td>
              </tr>
            ))}
          </tbody>
          {mean !== null ? (
            <tfoot>
              <tr className="border-t border-line bg-canvas-low text-xs text-muted">
                <td colSpan={4} className="px-3 py-2">
                  Computed: average RPE {mean.toFixed(1)} over {formatSessions(rpes.length)}.
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}

function RuleTrace({ data }: { data: ExplainDto }) {
  return (
    <section className="space-y-2">
      <SectionTitle n={3}>Rule evaluation (in order)</SectionTitle>
      {data.rules === null ? (
        <p className="rounded-md bg-raised p-3 text-sm text-muted">The sessions behind this call were edited or deleted, so the rule trace is no longer available.</p>
      ) : (
        <ol className="space-y-2">
          {data.rules.map((step) => {
            const status = ruleStatus(step);
            return (
              <li
                key={step.action}
                className={clsx(
                  'space-y-1 rounded-md border px-3 py-2 text-sm',
                  status === 'decided' ? 'border-emerald/40 bg-emerald-bg' : 'border-line bg-canvas-low',
                )}
              >
                <p className="flex items-start gap-2">
                  <span aria-hidden="true" className={clsx('w-4 shrink-0 text-center font-bold', status === 'decided' ? 'text-emerald' : 'text-muted')}>
                    {status === 'decided' ? '✓' : status === 'also' ? '≈' : '–'}
                  </span>
                  <span className="min-w-0 break-words">
                    <span className="font-semibold">{ACTION_META[step.action].label}?</span> <span className="text-muted">{step.condition}</span>
                  </span>
                </p>
                <p className={clsx('break-words pl-6 text-xs font-semibold tabular-nums', status === 'decided' ? 'text-emerald' : 'text-muted')}>
                  {status === 'decided' ? 'MATCHED' : status === 'also' ? 'Also true, lower precedence' : 'Not triggered'} · {step.observed}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function SettingsUsed({ settings }: { settings: ResolvedEngineSettings | null }) {
  const rows: { label: string; value: string; source: string }[] = settings
    ? [
        { label: 'Increment', value: `+${settings.loadIncrementKg.value} kg`, source: SOURCE_LABEL[settings.loadIncrementKg.source] },
        { label: 'RPE cap', value: String(settings.rpeCap.value), source: SOURCE_LABEL[settings.rpeCap.source] },
        { label: 'Sessions', value: String(settings.sessionsAnalyzed.value), source: SOURCE_LABEL[settings.sessionsAnalyzed.source] },
        { label: 'Rep range', value: `${settings.repsMin.value}–${settings.repsMax.value}`, source: SOURCE_LABEL[settings.repsMax.source] },
        { label: 'Deload', value: `−${settings.deloadPercent.value}%`, source: SOURCE_LABEL[settings.deloadPercent.source] },
        { label: 'Load margin', value: `${settings.loadMarginRpe.value} RPE`, source: SOURCE_LABEL[settings.loadMarginRpe.source] },
      ]
    : [];
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle n={4}>Settings used</SectionTitle>
        <Link href="/coach/settings" className="text-xs font-semibold text-primary-soft underline-offset-2 hover:underline">
          Edit rules
        </Link>
      </div>
      {settings ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="rounded-md border border-line bg-canvas-low p-3">
              <dt className="text-xs uppercase tracking-wider text-muted">{r.label}</dt>
              <dd className="font-display text-lg font-bold tabular-nums">{r.value}</dd>
              <dd className="text-xs text-muted">{r.source}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="rounded-md bg-raised p-3 text-sm text-muted">Settings were not recorded for this older call.</p>
      )}
    </section>
  );
}

type Sim = { status: 'idle' } | { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: EnginePreviewResponse };

function WhatIf({ data, unit }: { data: ExplainDto; unit: WeightUnit }) {
  const capId = useId();
  const incId = useId();
  const settings = data.settings;
  const baseCap = settings?.rpeCap.value ?? 8;
  const baseInc = settings?.loadIncrementKg.value ?? 2.5;
  const [cap, setCap] = useState(baseCap);
  const [inc, setInc] = useState(baseInc);
  const [rules, setRules] = useState<CoachEngineRulesDto | null>(null);
  const [sim, setSim] = useState<Sim>({ status: 'idle' });
  const capLocked = settings ? !capIsSimulatable(settings.rpeCap.source) : false;
  const last = data.sessions[data.sessions.length - 1];

  useEffect(() => {
    let cancelled = false;
    void loadEngineRules().then((r) => {
      if (!cancelled && r.ok) setRules(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rules) return;
    let cancelled = false;
    setSim({ status: 'loading' });
    const timer = setTimeout(async () => {
      const r = await previewEngineRules({
        clientId: data.client.id,
        exerciseId: data.exercise.id,
        rules: { ...rules.rules, ...(capLocked ? {} : { rpeCap: cap }) },
      });
      if (!cancelled) setSim(r.ok ? { status: 'ok', data: r.data } : { status: 'error', error: r.error });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rules, cap, capLocked, data.client.id, data.exercise.id]);

  const changed = cap !== baseCap || inc !== baseInc;
  let result = '';
  let tone = 'text-muted';
  if (sim.status === 'ok') {
    const a = sim.data.action;
    tone = a === 'INCREASE_LOAD' ? 'text-emerald' : a === 'DELOAD' ? 'text-amber' : 'text-ink';
    result = `With cap ${cap.toFixed(1)}${inc !== baseInc ? ` and +${inc} kg` : ''} this would be ${a}`;
    if (a === 'INCREASE_LOAD' && last) result += ` (${formatWeight(simulatedLoad(last.topWeightKg, inc), unit)})`;
    else if (sim.data.recommendedWeightKg !== null) result += ` (${formatWeight(sim.data.recommendedWeightKg, unit)})`;
    result += '.';
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle n={5}>What-if simulator (preview only)</SectionTitle>
        <button
          type="button"
          onClick={() => {
            setCap(baseCap);
            setInc(baseInc);
          }}
          disabled={!changed}
          className="text-xs font-semibold text-primary-soft underline-offset-2 hover:underline disabled:text-muted disabled:no-underline"
        >
          Reset
        </button>
      </div>
      <div className="grid gap-4 rounded-lg border border-line bg-canvas-low p-4 sm:grid-cols-2">
        <label htmlFor={capId} className="block text-sm">
          <span className="flex justify-between">
            <span>RPE cap</span>
            <strong className="tabular-nums">{cap.toFixed(1)}</strong>
          </span>
          <input
            id={capId}
            type="range"
            min={ENGINE_LIMITS.rpeCap.min}
            max={ENGINE_LIMITS.rpeCap.max}
            step={ENGINE_LIMITS.rpeCap.step}
            value={cap}
            disabled={capLocked}
            onChange={(e) => setCap(Number(e.target.value))}
            className="mt-2 w-full accent-primary disabled:opacity-40"
          />
          {capLocked && settings ? <span className="mt-1 block text-xs text-muted">Set by {SOURCE_LABEL[settings.rpeCap.source].toLowerCase()}; your rule would not change this call.</span> : null}
        </label>
        <label htmlFor={incId} className="block text-sm">
          <span className="flex justify-between">
            <span>Increment</span>
            <strong className="tabular-nums">+{inc} kg</strong>
          </span>
          <input
            id={incId}
            type="range"
            min={Math.min(ENGINE_LIMITS.loadIncrementKg.min, baseInc)}
            max={Math.max(10, baseInc)}
            step={ENGINE_LIMITS.loadIncrementKg.step}
            value={inc}
            onChange={(e) => setInc(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </label>
      </div>
      <p role="status" aria-live="polite" className={clsx('min-h-5 text-sm font-semibold tabular-nums', tone)}>
        {sim.status === 'error' ? sim.error : sim.status === 'ok' ? result : 'Running the engine…'}
      </p>
    </section>
  );
}

function History({ events, unit }: { events: CallHistoryEvent[]; unit: WeightUnit }) {
  return (
    <section className="space-y-2">
      <SectionTitle n={6}>History of this call</SectionTitle>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No earlier calls for this lift.</p>
      ) : (
        <ol className="space-y-3 border-l border-line pl-4">
          {events.map((e, i) => (
            <li key={`${e.type}-${e.recommendationId}-${i}`} className="relative flex flex-wrap items-start justify-between gap-2">
              <span aria-hidden="true" className={clsx('absolute -left-[1.3rem] top-1.5 size-2 rounded-full', e.type === 'OVERRIDE' ? 'bg-primary' : 'bg-line-strong')} />
              {e.type === 'CALL' ? (
                <div>
                  <p className="text-sm">
                    Engine proposed {ACTION_META[e.action].label}
                    {e.weightKg !== null ? ` (${targetText({ weightKg: e.weightKg, repsMin: e.repsMin, repsMax: e.repsMax }, unit)})` : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {e.autoApproved ? 'Auto-approved' : e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm">
                    {e.byName ?? 'Coach'} edited target{e.weightKg !== null ? ` to ${targetText({ weightKg: e.weightKg, repsMin: e.repsMin, repsMax: e.repsMax }, unit)}` : ''}
                    {e.rpe !== null ? ` @ ${formatRpe(e.rpe)}` : ''}
                  </p>
                  {e.note ? <p className="text-xs text-muted">{e.note}</p> : null}
                </div>
              )}
              <time dateTime={e.at} className="text-xs tabular-nums text-muted">
                {dateTime(e.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
