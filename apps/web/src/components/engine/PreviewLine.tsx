'use client';

import { useEffect, useState } from 'react';
import type { EnginePreviewResponse, UpdateCoachEngineRulesRequest, WeightUnit } from '@coaching/shared';
import { previewEngineRules } from '@/actions/engine-rules';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { formatTarget } from '@/lib/format';

export interface PreviewTarget {
  clientId: string;
  clientName: string;
  exerciseId: string;
  exerciseName: string;
}

type State = { status: 'loading' } | { status: 'ok'; data: EnginePreviewResponse } | { status: 'error'; error: string };

/** Live "with these rules, X would be …" line. Debounced; persists nothing. */
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

  return (
    <div aria-live="polite" className="rounded-md border border-line bg-canvas-low p-3 font-mono text-ui">
      {state.status === 'loading' ? (
        <p className="text-muted">Running the engine…</p>
      ) : state.status === 'error' ? (
        <p className="text-danger">{state.error}</p>
      ) : (
        <div className="space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-sans">
              With these rules, {target.clientName.replace(' (Demo)', '')}&rsquo;s {target.exerciseName} would be
            </span>
            <ActionBadge action={state.data.action} />
          </p>
          {state.data.recommendedWeightKg !== null ? (
            <p className={`text-metric ${ACTION_META[state.data.action].text}`}>
              {formatTarget({ ...state.data, recommendedWeightKg: String(state.data.recommendedWeightKg) }, unit)}
            </p>
          ) : null}
          <p className="font-sans text-meta text-muted">{state.data.reason}</p>
        </div>
      )}
    </div>
  );
}
