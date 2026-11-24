'use client';

import clsx from 'clsx';
import { FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EnginePreviewResponse, UpdateCoachEngineRulesRequest, WeightUnit } from '@coaching/shared';
import { previewEngineRules } from '@/actions/engine-rules';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { Icon } from '@/components/ui/Icon';
import { formatTarget } from '@/lib/format';

export interface PreviewTarget {
  clientId: string;
  clientName: string;
  exerciseId: string;
  exerciseName: string;
}

type State = { status: 'loading' } | { status: 'ok'; data: EnginePreviewResponse } | { status: 'error'; error: string };

/** Stitch Live Rule Simulation card (`8._engine_rules_editor_settings`). Debounced; persists nothing. */
export function PreviewLine({
  target,
  rules,
  unit,
}: {
  target: PreviewTarget;
  rules: UpdateCoachEngineRulesRequest;
  unit: WeightUnit;
}) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const rulesKey = JSON.stringify(rules);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    const timer = setTimeout(async () => {
      const result = await previewEngineRules({ clientId: target.clientId, exerciseId: target.exerciseId, rules: JSON.parse(rulesKey) });
      if (cancelled) return;
      setState(result.ok ? { status: 'ok', data: result.data } : { status: 'error', error: result.error });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [target.clientId, target.exerciseId, rulesKey]);

  const meta = state.status === 'ok' ? ACTION_META[state.data.action] : null;

  return (
    <div
      aria-live="polite"
      className={clsx(
        'rounded-md border p-5',
        meta ? meta.box : 'border-line bg-card',
      )}
    >
      {state.status === 'loading' ? (
        <p className="font-mono text-label-md text-muted">Running live rule simulation…</p>
      ) : state.status === 'error' ? (
        <p className="font-sans text-label-md text-danger">{state.error}</p>
      ) : meta ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={clsx('mt-0.5 shrink-0', meta.text)}>
              <Icon icon={FlaskConical} size={20} />
            </span>
            <div>
              <span className={clsx('font-sans text-label-sm uppercase tracking-wider', meta.text)}>LIVE RULE SIMULATION</span>
              <p className="mt-0.5 font-display text-title-md text-ink">
                With these rules, {target.clientName.replace(' (Demo)', '')}&rsquo;s {target.exerciseName} would be{' '}
                <span className={meta.text}>
                  {meta.code}
                  {state.data.recommendedWeightKg !== null
                    ? ` (${formatTarget({ ...state.data, recommendedWeightKg: String(state.data.recommendedWeightKg) }, unit)})`
                    : ''}
                </span>
                .
              </p>
              <p className="mt-1 font-sans text-label-sm font-normal text-ink/85">{state.data.reason}</p>
            </div>
          </div>
          <ActionBadge action={state.data.action} />
        </div>
      ) : null}
    </div>
  );
}
