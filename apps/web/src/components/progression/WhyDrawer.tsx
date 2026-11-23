'use client';

import clsx from 'clsx';
import { ArrowRight, ArrowUpRight, CircleCheck, CircleDashed, Minus, PenLine } from 'lucide-react';
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
import { Button, buttonClass } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';
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
export function WhyDrawer({
  recommendationId,
  unit,
  onClose,
  onResolve,
}: {
  recommendationId: string;
  unit: WeightUnit;
  onClose: () => void;
  /** From the queue: resolve through its undoable path instead of calling the action directly. */
  onResolve?: (status: 'ACCEPTED' | 'DISMISSED') => void;
}) {
  const toast = useToast();
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
    if (onResolve) {
      onResolve(intent);
      return;
    }
    setActionError(undefined);
    const fd = new FormData();
    fd.set('clientId', data.client.id);
    fd.set('recommendationId', data.recommendationId);
    fd.set('exerciseId', data.exercise.id);
    fd.set('intent', intent);
    startTransition(async () => {
      const r = await recommendationAction(null, fd);
      if (r.ok) {
        toast.show({ message: `${intent === 'ACCEPTED' ? 'Accepted' : 'Dismissed'} ${data.exercise.name}`, tone: 'ok' });
        onClose();
      } else setActionError(r.error);
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


  const callAt = data?.history.find((h) => h.type === 'CALL')?.at;
  const lastSession = data?.sessions[data.sessions.length - 1];

  return (
    <>
      <Sheet
        open
        variant="drawer"
        onClose={onClose}
        title={data ? data.exercise.name : 'Why this call'}
        {...(data
          ? {
              description: (
                <>
                  {data.client.name} · {callAt ? 'computed ' : 'based on '}
                  {callAt ? <span className="font-mono">{formatDate(callAt)}</span> : null}
                  {callAt ? ' from ' : ''}
                  <span className="font-mono">{formatSessions(data.sessions.length)}</span>
                </>
              ),
              headerExtra: (
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <ActionBadge action={data.action} />
                  <span className="flex items-center gap-2 font-mono text-ui text-muted">
                    {lastSession ? (
                      <>
                        {formatWeight(lastSession.topWeightKg, unit)}
                        <span className="text-faint">
                          <Icon icon={ArrowRight} />
                        </span>
                      </>
                    ) : null}
                    <span className={clsx('text-metric', ACTION_META[data.action].text)}>
                      {data.proposed.weightKg !== null ? formatWeight(data.proposed.weightKg, unit) : targetText(data.proposed, unit)}
                    </span>
                  </span>
                </div>
              ),
            }
          : {})}
        {...(canResolve || canEdit
          ? {
              footer: (
                <>
                  {canResolve ? (
                    <Button variant="ghost" onClick={() => resolve('DISMISSED')} disabled={pending}>
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
                </>
              ),
            }
          : {})}
      >
        {load.status === 'loading' ? (
          <div role="status" aria-busy="true" aria-label="Loading explanation" className="space-y-4">
            {[28, 40, 24].map((h) => (
              <div key={h} style={{ height: `${h * 4}px` }} className="animate-pulse rounded-md bg-raised" />
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
          <div className="space-y-8">
            {state === 'overridden' && data.override ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-l-ink bg-raised px-3 py-2 text-ui">
                <p className="flex items-center gap-2">
                  <Icon icon={PenLine} />
                  <span>
                    {data.override.byName ?? 'You'} overrode the engine
                    {data.override.at ? ' on ' : ''}
                    {data.override.at ? <span className="font-mono">{formatDate(data.override.at)}</span> : null} (
                    <span className="font-mono">{targetText(data.override, unit)}</span>).
                  </span>
                </p>
                <Button variant="ghost" size="sm" onClick={resetOverride} disabled={pending || data.proposed.weightKg === null}>
                  Reset to engine
                </Button>
              </div>
            ) : null}

            <Verdict data={data} unit={unit} />

            {state === 'insufficient' ? (
              <section className="rounded-md border border-dashed border-line-strong px-5 py-8">
                <p className="font-mono text-metric text-muted">{data.sessions.length}/3</p>
                <h3 className="mt-2 font-sans text-ui font-semibold" style={{ fontStretch: '100%', letterSpacing: 0 }}>
                  Not enough data yet
                </h3>
                <p className="mt-1 max-w-sm text-meta text-muted">
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

function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
      <h3 className="font-mono text-micro uppercase text-muted" style={{ fontStretch: '100%', letterSpacing: '0.06em' }}>
        {children}
      </h3>
      {action}
    </div>
  );
}

function Verdict({ data }: { data: ExplainDto; unit: WeightUnit }) {
  return (
    <section>
      <SectionTitle>Engine verdict</SectionTitle>
      <p className="text-ui">{data.reason}</p>
      {data.autoApproved ? <p className="mt-2 text-meta font-medium text-emerald">Auto-approved by your rules</p> : null}
    </section>
  );
}

function Inputs({ data, unit }: { data: ExplainDto; unit: WeightUnit }) {
  const target = data.prescription?.repsMax ?? null;
  const rpes = data.sessions.flatMap((s) => (s.avgRpe === null ? [] : [s.avgRpe]));
  const mean = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;
  return (
    <section>
      <SectionTitle>{`Inputs · last ${data.sessions.length} sessions`}</SectionTitle>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className={clsx(TABLE, 'min-w-[22rem]')}>
          <caption className="sr-only">Sessions the engine used, newest first</caption>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>Date</th>
              <th scope="col" className={TH_NUM}>Weight</th>
              <th scope="col" className={TH_NUM}>Reps{target !== null ? ' / target' : ''}</th>
              <th scope="col" className={TH_NUM}>RPE</th>
            </tr>
          </thead>
          <tbody>
            {[...data.sessions].reverse().map((s) => (
              <tr key={s.exerciseLogId} className={TR}>
                <td className={clsx(TD, 'font-mono')}>{formatDate(s.performedAt)}</td>
                <td className={TD_NUM}>{formatWeight(s.topWeightKg, unit)}</td>
                <td className={TD_NUM}>
                  {s.repsPerSet.length > 0 ? s.repsPerSet.join(', ') : s.topSetReps}
                  {target !== null ? <span className="text-faint"> / {target}</span> : null}
                </td>
                <td className={TD_NUM}>{s.avgRpe === null ? '—' : formatRpe(s.avgRpe).replace('RPE ', '')}</td>
              </tr>
            ))}
          </tbody>
          {mean !== null ? (
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={4} className="h-9 px-5 font-mono text-meta text-faint">
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

const RULE_ICON = { decided: CircleCheck, also: CircleDashed, not: Minus } as const;
const RULE_ICON_TONE = { decided: 'text-emerald', also: 'text-muted', not: 'text-faint' } as const;
const RULE_RESULT = { decided: 'Matched', also: 'Also true', not: 'No' } as const;

function RuleTrace({ data }: { data: ExplainDto }) {
  return (
    <section>
      <SectionTitle>Rule evaluation, in order</SectionTitle>
      {data.rules === null ? (
        <p className="text-ui text-muted">The sessions behind this call were edited or deleted, so the rule trace is no longer available.</p>
      ) : (
        <ol className="border-b border-line">
          {data.rules.map((step) => {
            const status = ruleStatus(step);
            return (
              <li
                key={step.action}
                className={clsx('grid grid-cols-[20px_1fr_auto] gap-3 border-t border-line py-2.5', status === 'decided' && 'bg-emerald-bg/40')}
              >
                <span className={clsx('pt-0.5', RULE_ICON_TONE[status])}>
                  <Icon icon={RULE_ICON[status]} />
                </span>
                <span className="min-w-0 break-words">
                  <span className="block text-ui font-medium">{ACTION_META[step.action].label}?</span>
                  <span className="block text-meta text-muted">{step.condition}</span>
                </span>
                <span className="text-right">
                  <span
                    className={clsx(
                      'block font-mono text-micro uppercase',
                      status === 'decided' ? 'text-emerald' : status === 'also' ? 'text-muted' : 'text-faint',
                    )}
                  >
                    {RULE_RESULT[status]}
                  </span>
                  <span className="block font-mono text-meta text-muted">{step.observed}</span>
                </span>
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
    <section>
      <SectionTitle
        action={
          <Link href="/coach/settings" className={buttonClass('ghost', undefined, 'sm')}>
            Edit rules
            <Icon icon={ArrowUpRight} />
          </Link>
        }
      >
        Settings used
      </SectionTitle>
      {settings ? (
        <dl className="divide-y divide-line border-b border-line">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 py-2">
              <dt className="text-meta text-muted">{r.label}</dt>
              <dd className="font-mono text-ui">{r.value}</dd>
              <dd className="w-28 text-right font-mono text-micro uppercase text-faint">{r.source}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-ui text-muted">Settings were not recorded for this older call.</p>
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
    tone = ACTION_META[a].text;
    result = `With cap ${cap.toFixed(1)}${inc !== baseInc ? ` and +${inc} kg` : ''} this would be ${a}`;
    if (a === 'INCREASE_LOAD' && last) result += ` (${formatWeight(simulatedLoad(last.topWeightKg, inc), unit)})`;
    else if (sim.data.recommendedWeightKg !== null) result += ` (${formatWeight(sim.data.recommendedWeightKg, unit)})`;
    result += '.';
  }

  return (
    <section>
      <SectionTitle
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCap(baseCap);
              setInc(baseInc);
            }}
            disabled={!changed}
          >
            Reset
          </Button>
        }
      >
        What-if · preview only
      </SectionTitle>
      <div className="space-y-4 rounded-md border border-line p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={capId} className="block text-ui">
            <span className="flex justify-between">
              <span>RPE cap</span>
              <span className="font-mono">{cap.toFixed(1)}</span>
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
              className="mt-2 w-full disabled:opacity-40"
            />
            {capLocked && settings ? (
              <span className="mt-1 block text-meta text-muted">Set by {SOURCE_LABEL[settings.rpeCap.source].toLowerCase()}; your rule would not change this call.</span>
            ) : null}
          </label>
          <label htmlFor={incId} className="block text-ui">
            <span className="flex justify-between">
              <span>Increment</span>
              <span className="font-mono">+{inc} kg</span>
            </span>
            <input
              id={incId}
              type="range"
              min={Math.min(ENGINE_LIMITS.loadIncrementKg.min, baseInc)}
              max={Math.max(10, baseInc)}
              step={ENGINE_LIMITS.loadIncrementKg.step}
              value={inc}
              onChange={(e) => setInc(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </div>
        <p role="status" aria-live="polite" className={clsx('min-h-5 font-mono text-ui', tone)}>
          {sim.status === 'error' ? sim.error : sim.status === 'ok' ? result : 'Running the engine…'}
        </p>
      </div>
    </section>
  );
}

function History({ events, unit }: { events: CallHistoryEvent[]; unit: WeightUnit }) {
  return (
    <section>
      <SectionTitle>History of this call</SectionTitle>
      {events.length === 0 ? (
        <p className="text-ui text-muted">No earlier calls for this lift.</p>
      ) : (
        <ol className="space-y-3 border-l border-line pl-4">
          {events.map((e, i) => (
            <li key={`${e.type}-${e.recommendationId}-${i}`} className="relative flex flex-wrap items-start justify-between gap-2">
              <span aria-hidden="true" className={clsx('absolute -left-[1.15rem] top-1.5 size-1.5 rounded-full', e.type === 'OVERRIDE' ? 'bg-ink' : 'bg-line-strong')} />
              {e.type === 'CALL' ? (
                <div>
                  <p className="text-ui">
                    Engine proposed {ACTION_META[e.action].label}
                    {e.weightKg !== null ? <span className="font-mono"> ({targetText({ weightKg: e.weightKg, repsMin: e.repsMin, repsMax: e.repsMax }, unit)})</span> : null}
                  </p>
                  <p className="text-meta text-muted">{e.autoApproved ? 'Auto-approved' : e.status.charAt(0) + e.status.slice(1).toLowerCase()}</p>
                </div>
              ) : (
                <div>
                  <p className="text-ui">
                    {e.byName ?? 'Coach'} edited target
                    {e.weightKg !== null ? <span className="font-mono"> to {targetText({ weightKg: e.weightKg, repsMin: e.repsMin, repsMax: e.repsMax }, unit)}</span> : null}
                    {e.rpe !== null ? <span className="font-mono"> @ {formatRpe(e.rpe)}</span> : null}
                  </p>
                  {e.note ? <p className="text-meta text-muted">{e.note}</p> : null}
                </div>
              )}
              <time dateTime={e.at} className="font-mono text-meta text-faint">
                {dateTime(e.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
