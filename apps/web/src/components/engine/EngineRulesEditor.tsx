'use client';

import clsx from 'clsx';
import { Pencil, RotateCcw } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { ENGINE_DEFAULTS, ENGINE_LIMITS } from '@coaching/shared';
import type { CoachEngineRulesDto, EngineRuleKey, UpdateCoachEngineRulesRequest, WeightUnit } from '@coaching/shared';
import { resetEngineRules, saveEngineRules } from '@/actions/engine-rules';
import { ACTION_META, ActionBadge } from '@/components/progression/ActionBadge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { FormError, Label, Select } from '@/components/ui/Field';
import { OverriddenTag, OverrideField, parseOverride } from '@/components/ui/OverrideField';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { TABLE, TD, TH, THEAD, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/Toast';
import { PreviewLine, type PreviewTarget } from './PreviewLine';
import { RULE_FIELD_META, RULE_GROUPS, type RuleGroup } from './rule-meta';

interface Props {
  initial: CoachEngineRulesDto;
  previewTargets: PreviewTarget[];
  unit: WeightUnit;
}

const keyOf = (t: PreviewTarget): string => `${t.clientId}:${t.exerciseId}`;

export function EngineRulesEditor({ initial, previewTargets, unit }: Props) {
  const toast = useToast();
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
        toast.show({ message: 'Engine rules saved', tone: 'ok' });
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
        toast.show({ message: 'Engine rules reset to defaults', tone: 'ok' });
      } else setError(result.error);
    });
  }

  const groupOf = (k: EngineRuleKey): RuleGroup | undefined => RULE_GROUPS.find((g) => g.keys.includes(k));
  const defaultKeys = Object.keys(RULE_FIELD_META) as EngineRuleKey[];

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-meta text-muted">Rules run top to bottom; the first match decides. Client and exercise overrides take precedence over these.</p>

      <section aria-label="Live rule simulation" className="space-y-3 border-b border-line pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-micro uppercase text-muted">Live rule simulation</p>
            <p className="text-meta text-muted">Pick a client lift to see what your current rules decide. Edits preview here before you save.</p>
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
          <p className="text-ui text-muted">Previews appear once a client has logged a prescribed lift twice.</p>
        )}
      </section>

      <Panel
        title="Rules"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)} disabled={!anyOverride || pending}>
            <Icon icon={RotateCcw} />
            Reset to defaults
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className={clsx(TABLE, 'min-w-[44rem]')}>
            <caption className="sr-only">Progression rules, in the order the engine checks them</caption>
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={TH}>Order</th>
                <th scope="col" className={TH}>Call</th>
                <th scope="col" className={TH}>Condition</th>
                <th scope="col" className={TH}>Values</th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {RULE_GROUPS.map((group, i) => {
                const overridden = group.keys.some((k) => saved.rules[k] !== null);
                return (
                  <tr key={group.action} className={clsx(TR, 'align-top')}>
                    <td className={clsx(TD, 'h-auto py-4 font-mono text-faint')}>{i + 1}</td>
                    <td className={clsx(TD, 'h-auto whitespace-nowrap py-4')}>
                      <div className="flex flex-col items-start gap-1.5">
                        <ActionBadge action={group.action} />
                        {overridden ? <OverriddenTag /> : null}
                      </div>
                    </td>
                    <td className={clsx(TD, 'h-auto py-4 text-meta')}>{group.condition(saved.effective)}</td>
                    <td className={clsx(TD, 'h-auto whitespace-nowrap py-4 font-mono')}>{group.threshold(saved.effective)}</td>
                    <td className={clsx(TD, 'h-auto py-4 text-right')}>
                      <Button variant="ghost" size="sm" aria-label={`Edit ${ACTION_META[group.action].label} rule`} onClick={() => setEditing(group)}>
                        <Icon icon={Pencil} />
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <FormError>{error}</FormError>
        </div>
      </Panel>

      <Panel title="Defaults" meta="Applied to every client">
        <dl className="divide-y divide-line">
          {defaultKeys.map((k) => {
            const meta = RULE_FIELD_META[k];
            const group = groupOf(k);
            return (
              <div key={k} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <dt className="flex items-center gap-2 text-ui">
                    {meta.label}
                    {saved.rules[k] !== null ? <OverriddenTag /> : null}
                  </dt>
                  <dd className="text-meta text-muted">{meta.help}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <dd className="font-mono text-ui">
                    {saved.effective[k]}
                    {meta.suffix ? <span className="ml-1 text-faint">{meta.suffix}</span> : null}
                  </dd>
                  {group ? (
                    <Button variant="ghost" size="sm" aria-label={`Edit ${meta.label}`} onClick={() => setEditing(group)}>
                      Edit
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </dl>
      </Panel>

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
        title="Reset engine rules?"
        description="All global thresholds return to MUR Coaching defaults. Per-client overrides stay intact."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reset} disabled={pending}>
              {pending ? 'Resetting…' : 'Reset to defaults'}
            </Button>
          </>
        }
      >
        <p className="text-ui text-muted">Your saved thresholds are cleared.</p>
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
    <Sheet
      open
      onClose={onClose}
      title="Edit rule"
      description="Leave a field empty to use the engine default."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => onSave(merged)} disabled={!valid || !changed || pending}>
            {pending ? 'Saving…' : 'Save rule'}
          </Button>
        </>
      }
    >
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
      </div>
    </Sheet>
  );
}
