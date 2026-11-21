'use client';

import { useMemo, useState, useTransition } from 'react';
import { ENGINE_DEFAULTS, ENGINE_LIMITS } from '@coaching/shared';
import type { CoachEngineRulesDto, EngineRuleKey, UpdateCoachEngineRulesRequest, WeightUnit } from '@coaching/shared';
import { resetEngineRules, saveEngineRules } from '@/actions/engine-rules';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormError, Label, Select } from '@/components/ui/Field';
import { OverriddenTag, OverrideField, parseOverride } from '@/components/ui/OverrideField';
import { Sheet } from '@/components/ui/Sheet';
import { PreviewLine, type PreviewTarget } from './PreviewLine';
import { RULE_FIELD_META, RULE_GROUPS, type RuleGroup } from './rule-meta';

interface Props {
  initial: CoachEngineRulesDto;
  previewTargets: PreviewTarget[];
  unit: WeightUnit;
}

const keyOf = (t: PreviewTarget): string => `${t.clientId}:${t.exerciseId}`;

export function EngineRulesEditor({ initial, previewTargets, unit }: Props) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState<RuleGroup | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [targetKey, setTargetKey] = useState(previewTargets[0] ? keyOf(previewTargets[0]) : '');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const target = previewTargets.find((t) => keyOf(t) === targetKey) ?? null;
  const anyOverride = Object.values(saved.rules).some((v) => v !== null);

  function persist(rules: UpdateCoachEngineRulesRequest, after: () => void): void {
    setError(undefined);
    startTransition(async () => {
      const result = await saveEngineRules(rules);
      if (result.ok) {
        setSaved(result.data);
        after();
      } else setError(result.error);
    });
  }

  function reset(): void {
    startTransition(async () => {
      const result = await resetEngineRules();
      if (result.ok) {
        setSaved(result.data);
        setConfirmReset(false);
      } else setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Live preview</h2>
            <p className="text-sm text-muted">Pick a client lift to see what your current rules decide.</p>
          </div>
          {previewTargets.length > 0 ? (
            <div className="w-full sm:w-80">
              <Label htmlFor="preview-target">Client lift</Label>
              <Select id="preview-target" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
                {previewTargets.map((t) => (
                  <option key={keyOf(t)} value={keyOf(t)}>
                    {t.clientName.replace(' (Demo)', '')} · {t.exerciseName}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        {target ? (
          <PreviewLine target={target} rules={saved.rules} unit={unit} />
        ) : (
          <p className="text-sm text-muted">Previews appear once a client has logged a prescribed lift twice.</p>
        )}
      </Card>

      <Card className="space-y-4 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="font-display text-lg font-bold">Rules</h2>
            <p className="text-sm text-muted">Checked top to bottom; the first match wins. Client overrides beat these.</p>
          </div>
          <Button variant="secondary" onClick={() => setConfirmReset(true)} disabled={!anyOverride || pending}>
            Reset to defaults
          </Button>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {RULE_GROUPS.map((group) => {
            const overridden = group.keys.some((k) => saved.rules[k] !== null);
            return (
              <li key={group.action} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex w-40 shrink-0 items-center gap-2">
                  <ActionBadge action={group.action} />
                  {overridden ? <OverriddenTag /> : null}
                </div>
                <p className="flex-1 text-sm">{group.condition(saved.effective)}</p>
                <Button variant="secondary" className="min-h-9 self-start py-1 sm:self-center" onClick={() => setEditing(group)}>
                  Edit
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="px-5 pb-5">
          <FormError>{error}</FormError>
        </div>
      </Card>

      {editing ? (
        <RuleEditSheet
          group={editing}
          saved={saved}
          target={target}
          unit={unit}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(rules) => persist(rules, () => setEditing(null))}
        />
      ) : null}

      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all rules?"
        description="Every threshold returns to the engine default. Client overrides are not touched."
      >
        <footer className="flex justify-between gap-2">
          <Button variant="secondary" onClick={() => setConfirmReset(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={reset} disabled={pending}>
            {pending ? 'Resetting…' : 'Reset to defaults'}
          </Button>
        </footer>
      </Sheet>
    </div>
  );
}

function RuleEditSheet({
  group,
  saved,
  target,
  unit,
  pending,
  onClose,
  onSave,
}: {
  group: RuleGroup;
  saved: CoachEngineRulesDto;
  target: PreviewTarget | null;
  unit: WeightUnit;
  pending: boolean;
  onClose: () => void;
  onSave: (rules: UpdateCoachEngineRulesRequest) => void;
}) {
  const [draft, setDraft] = useState<Partial<Record<EngineRuleKey, string>>>(() =>
    Object.fromEntries(group.keys.map((k) => [k, saved.rules[k] === null ? '' : String(saved.rules[k])])),
  );
  const parsed = useMemo(
    () => Object.fromEntries(group.keys.map((k) => [k, parseOverride(draft[k] ?? '', ENGINE_LIMITS[k])])),
    [draft, group.keys],
  ) as Record<EngineRuleKey, ReturnType<typeof parseOverride>>;
  const valid = group.keys.every((k) => parsed[k].ok);
  const merged: UpdateCoachEngineRulesRequest = { ...saved.rules };
  for (const k of group.keys) {
    const p = parsed[k];
    if (p.ok) merged[k] = p.value;
  }
  const changed = group.keys.some((k) => merged[k] !== saved.rules[k]);

  return (
    <Sheet open onClose={onClose} title="Edit rule" description="Leave a field empty to use the engine default.">
      <div className="space-y-5">
        <ActionBadge action={group.action} />
        <div className="grid gap-4 sm:grid-cols-2">
          {group.keys.map((k) => {
            const meta = RULE_FIELD_META[k];
            const p = parsed[k];
            return (
              <OverrideField
                key={k}
                label={meta.label}
                {...(meta.suffix ? { suffix: meta.suffix } : {})}
                value={draft[k] ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
                defaultLabel={`${meta.help} Default: ${ENGINE_DEFAULTS[k]}.`}
                min={ENGINE_LIMITS[k].min}
                max={ENGINE_LIMITS[k].max}
                step={ENGINE_LIMITS[k].step}
                {...(p.ok ? {} : { error: p.error })}
              />
            );
          })}
        </div>
        {target && valid ? <PreviewLine target={target} rules={merged} unit={unit} /> : null}
        <footer className="flex justify-between gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => onSave(merged)} disabled={!valid || !changed || pending}>
            {pending ? 'Saving…' : 'Save rule'}
          </Button>
        </footer>
      </div>
    </Sheet>
  );
}
