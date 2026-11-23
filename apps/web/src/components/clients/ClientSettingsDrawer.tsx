'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useState, useTransition } from 'react';
import clsx from 'clsx';
import { Settings } from 'lucide-react';
import { CoachClientStatus, ENGINE_LIMITS, GOAL_OPTIONS, LIMITATION_OPTIONS, WeightUnit } from '@coaching/shared';
import type { ClientSettingsDto, ResolvedSetting } from '@coaching/shared';
import { setClientStatus, updateClientSettings } from '@/actions/clients';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { FieldError, FormError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { OverrideField } from '@/components/ui/OverrideField';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { unitLabel } from '@/lib/units';
import { OVERRIDE_KEYS, buildRequest, toDraft, type OverrideKey, type SettingsDraft } from './client-settings-model';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fromLabel = (s: ResolvedSetting<number>): string =>
  `${s.value} (${s.source === 'COACH' ? 'your rule' : 'engine default'})`;

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line pt-6 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-micro uppercase text-muted" style={{ fontStretch: '100%', letterSpacing: '0.06em' }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Gear button + right drawer with every per-client setting. Coach only. */
export function ClientSettingsDrawer({ settings, coachUnit }: { settings: ClientSettingsDto; coachUnit: WeightUnit }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState(settings);
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(settings, coachUnit));
  const [confirm, setConfirm] = useState<'PAUSE' | 'ARCHIVE' | null>(null);
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const result = useMemo(() => buildRequest(draft, original, coachUnit), [draft, original, coachUnit]);
  const errors = result.ok ? {} : result.errors;
  const canSave = result.ok && result.changed && !pending;
  const paused = original.status === CoachClientStatus.PAUSED;

  const patch = (p: Partial<SettingsDraft>) => setDraft((d) => ({ ...d, ...p }));
  const toggle = (key: 'goals' | 'limitations', value: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value] }));
  const setOverride = (k: OverrideKey) => (v: string) => setDraft((d) => ({ ...d, overrides: { ...d.overrides, [k]: v } }));

  function openDrawer(): void {
    setDraft(toDraft(original, coachUnit));
    setFormError(undefined);
    setConfirm(null);
    setOpen(true);
  }

  function save(): void {
    if (!result.ok || !result.changed) return;
    setFormError(undefined);
    startTransition(async () => {
      const r = await updateClientSettings(original.clientId, result.request);
      if (r.ok) {
        setOriginal(r.data);
        setDraft(toDraft(r.data, coachUnit));
        setOpen(false);
        toast.show({ message: 'Client settings saved', tone: 'ok' });
      } else setFormError(r.error);
    });
  }

  function changeStatus(status: CoachClientStatus): void {
    startTransition(async () => {
      const r = await setClientStatus(original.clientId, status);
      if (!r.ok) {
        setFormError(r.error);
        return;
      }
      setConfirm(null);
      if (status === CoachClientStatus.ARCHIVED) {
        setOpen(false);
        router.push('/coach/clients');
      } else {
        setOriginal((o) => ({ ...o, status }));
      }
    });
  }

  const o = original.defaults;
  return (
    <>
      <Button variant="secondary" size="sm" aria-label="Client settings" onClick={openDrawer}>
        <Icon icon={Settings} />
        Settings
      </Button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        title={`${original.name.replace(' (Demo)', '')} settings`}
        description="Changes apply to this client only."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <Section title="Profile & limitations">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${id}-name`}>Name</Label>
                <Input
                  id={`${id}-name`}
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  aria-invalid={errors.name ? true : undefined}
                />
                <FieldError>{errors.name}</FieldError>
              </div>
              <fieldset>
                <legend className="mb-1.5 font-mono text-micro uppercase text-muted">Units</legend>
                <div className="flex gap-0.5 rounded border border-line bg-canvas-low p-0.5">
                  {[WeightUnit.KG, WeightUnit.LB].map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={draft.weightUnit === u}
                      onClick={() => patch({ weightUnit: u })}
                      className={clsx(
                        'h-8 flex-1 rounded-sm font-mono text-micro uppercase',
                        draft.weightUnit === u ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
                      )}
                    >
                      {u === WeightUnit.KG ? 'kg' : 'lb'}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <Chips label="Goals" options={GOAL_OPTIONS} selected={draft.goals} onToggle={(v) => toggle('goals', v)} />
            <Chips
              label="Injuries and limitations"
              options={LIMITATION_OPTIONS}
              selected={draft.limitations}
              onToggle={(v) => toggle('limitations', v)}
            />
            <div>
              <Label htmlFor={`${id}-lim`}>Limitation notes</Label>
              <textarea
                id={`${id}-lim`}
                rows={2}
                maxLength={1000}
                value={draft.limitationsNote}
                onChange={(e) => patch({ limitationsNote: e.target.value })}
                className="block w-full rounded border border-line-strong bg-canvas-low px-3 py-2 text-ui text-ink hover:border-faint"
              />
            </div>
          </Section>

          <Section title="Training schedule">
            <fieldset>
              <legend className="mb-2 font-mono text-micro uppercase text-muted">Training days</legend>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((label, i) => {
                  const day = i + 1;
                  const on = draft.trainingDays.includes(day);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        patch({ trainingDays: on ? draft.trainingDays.filter((d) => d !== day) : [...draft.trainingDays, day] })
                      }
                      className={clsx(
                        'h-9 rounded border font-mono text-micro uppercase',
                        on ? 'border-ink bg-raised text-ink' : 'border-line-strong text-muted hover:text-ink',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="sm:w-1/2">
              <Label htmlFor={`${id}-len`}>Session length (minutes)</Label>
              <Input
                id={`${id}-len`}
                type="number"
                inputMode="numeric"
                min={15}
                max={240}
                step={5}
                value={draft.sessionLengthMin}
                onChange={(e) => patch({ sessionLengthMin: e.target.value })}
                aria-invalid={errors.sessionLengthMin ? true : undefined}
              />
              <FieldError>{errors.sessionLengthMin}</FieldError>
            </div>
          </Section>

          <Section
            title="Engine overrides"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraft((d) => ({ ...d, overrides: { ...d.overrides, ...Object.fromEntries(OVERRIDE_KEYS.map((k) => [k, ''])) } }))}
                disabled={OVERRIDE_KEYS.every((k) => draft.overrides[k] === '')}
              >
                Reset all
              </Button>
            }
          >
            <p className="text-meta text-muted">Empty fields inherit your rules. Overrides beat both your rules and the prescription.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <OverrideField
                label="Load increment"
                suffix="kg"
                value={draft.overrides.loadIncrementKg}
                onChange={setOverride('loadIncrementKg')}
                defaultLabel="Default: each exercise's own increment."
                {...ENGINE_LIMITS.loadIncrementKg}
                {...(errors['overrides.loadIncrementKg'] ? { error: errors['overrides.loadIncrementKg'] } : {})}
              />
              <OverrideField
                label="RPE cap"
                value={draft.overrides.rpeCap}
                onChange={setOverride('rpeCap')}
                defaultLabel={`Default: the prescription's target, else ${fromLabel(o.rpeCap)}.`}
                {...ENGINE_LIMITS.rpeCap}
                {...(errors['overrides.rpeCap'] ? { error: errors['overrides.rpeCap'] } : {})}
              />
              <OverrideField
                label="Reps min"
                value={draft.overrides.repsMin}
                onChange={setOverride('repsMin')}
                defaultLabel="Default: from the prescription."
                {...ENGINE_LIMITS.reps}
                {...(errors['overrides.repsMin'] ? { error: errors['overrides.repsMin'] } : {})}
              />
              <OverrideField
                label="Reps max"
                value={draft.overrides.repsMax}
                onChange={setOverride('repsMax')}
                defaultLabel="Default: from the prescription."
                {...ENGINE_LIMITS.reps}
                {...(errors['overrides.repsMax'] ? { error: errors['overrides.repsMax'] } : {})}
              />
              <OverrideField
                label="Deload size"
                suffix="%"
                value={draft.overrides.deloadPercent}
                onChange={setOverride('deloadPercent')}
                defaultLabel={`Default: ${fromLabel(o.deloadPercent)}.`}
                {...ENGINE_LIMITS.deloadPercent}
                {...(errors['overrides.deloadPercent'] ? { error: errors['overrides.deloadPercent'] } : {})}
              />
              <OverrideField
                label="Sessions analysed"
                value={draft.overrides.sessionsAnalyzed}
                onChange={setOverride('sessionsAnalyzed')}
                defaultLabel={`Default: ${fromLabel(o.sessionsAnalyzed)}. Range 2–5.`}
                {...ENGINE_LIMITS.sessionsAnalyzed}
                {...(errors['overrides.sessionsAnalyzed'] ? { error: errors['overrides.sessionsAnalyzed'] } : {})}
              />
            </div>
          </Section>

          <Section title="Auto-approve">
            <label className="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={draft.autoApprove}
                onChange={(e) => patch({ autoApprove: e.target.checked })}
              />
              <span>
                <span className="block text-ui font-medium">Apply engine calls without my review</span>
                <span className="block text-meta text-muted">Only Increase load calls are applied automatically.</span>
              </span>
            </label>
            {draft.autoApprove ? (
              <div className="sm:w-1/2">
                <Label htmlFor={`${id}-max`}>Only when the jump is at most ({unitLabel(coachUnit)})</Label>
                <Input
                  id={`${id}-max`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={coachUnit === WeightUnit.LB ? 1 : 0.5}
                  placeholder="Any size"
                  value={draft.autoApproveMax}
                  onChange={(e) => patch({ autoApproveMax: e.target.value })}
                  aria-invalid={errors.autoApproveMax ? true : undefined}
                />
                <FieldError>{errors.autoApproveMax}</FieldError>
              </div>
            ) : null}
          </Section>

          <Section title="Status">
            <p className="text-meta text-muted">Pausing keeps the client on your roster but removes them from the progression queue. Archiving removes them from your roster.</p>
            {confirm ? (
              <div role="alertdialog" aria-label="Confirm" className="space-y-3 border-l-2 border-l-danger bg-danger-bg px-3 py-3">
                <p className="text-ui">
                  {confirm === 'ARCHIVE'
                    ? 'Archive this client? They leave your roster and you lose access until they are restored.'
                    : 'Pause this client? They stay on your roster but drop out of the progression queue.'}
                </p>
                <div className="flex justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirm(null)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() => changeStatus(confirm === 'ARCHIVE' ? CoachClientStatus.ARCHIVED : CoachClientStatus.PAUSED)}
                  >
                    {confirm === 'ARCHIVE' ? 'Archive client' : 'Pause client'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {paused ? (
                  <Button variant="secondary" size="sm" disabled={pending} onClick={() => changeStatus(CoachClientStatus.ACTIVE)}>
                    Resume client
                  </Button>
                ) : (
                  <Button variant="danger" size="sm" onClick={() => setConfirm('PAUSE')}>
                    Pause client
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => setConfirm('ARCHIVE')}>
                  Archive client
                </Button>
              </div>
            )}
          </Section>

          <FormError>{formError}</FormError>

        </div>
      </Sheet>
    </>
  );
}
