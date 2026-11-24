'use client';

import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { FieldError, Input, Label } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import {
  addMeso,
  addMicro,
  blockTone,
  patchMeso,
  patchMicro,
  removeMeso,
  removeMicro,
  weekBlock,
  type DraftMeso,
  type PeriodizationErrors,
} from './periodization-model';

interface Props {
  mesocycles: DraftMeso[];
  durationWeeks: number;
  week: number;
  errors: PeriodizationErrors;
  onSelectWeek: (week: number) => void;
  onChange: (next: DraftMeso[]) => void;
}

const weekInput = 'w-16 font-mono';

/** Block planning: a clickable week strip over the whole program, then mesocycles with their microcycles. */
export function PeriodizationPanel({ mesocycles, durationWeeks, week, errors, onSelectWeek, onChange }: Props) {
  const weeks = Array.from({ length: durationWeeks }, (_, i) => i + 1);
  const full = addMeso(mesocycles, durationWeeks).length === mesocycles.length;

  return (
    <Panel
      title="Periodization"
      meta={mesocycles.length === 0 ? 'No blocks yet' : `${mesocycles.length} ${mesocycles.length === 1 ? 'mesocycle' : 'mesocycles'} · ${durationWeeks} weeks`}
      actions={
        <Button variant="secondary" size="sm" disabled={full} title={full ? 'Every week is already in a block' : undefined} onClick={() => onChange(addMeso(mesocycles, durationWeeks))}>
          <Icon icon={Plus} />
          Add mesocycle
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <div role="group" aria-label="Weeks of the program by block" className="flex flex-wrap gap-1">
          {weeks.map((w) => {
            const b = weekBlock(mesocycles, w);
            const label = `Week ${w}${b ? `, ${b.mesoName}${b.microLabel ? `, ${b.microLabel}` : ''}${b.isDeload ? ', deload' : ''}` : ', not in a block'}`;
            return (
              <button
                key={w}
                type="button"
                aria-label={label}
                aria-pressed={w === week}
                title={label}
                onClick={() => onSelectWeek(w)}
                className={clsx(
                  'h-7 min-w-7 rounded-sm border px-1.5 font-mono text-micro transition-colors',
                  b ? blockTone(b.mesoIndex) : 'bg-canvas-low text-muted',
                  w === week ? 'border-primary ring-1 ring-primary' : 'border-transparent hover:border-line-strong',
                  b?.isDeload ? 'underline decoration-2 underline-offset-2' : '',
                )}
              >
                {w}
              </button>
            );
          })}
        </div>
        <FieldError>{errors['periodization']}</FieldError>

        {mesocycles.length === 0 ? (
          <p className="text-ui text-muted">
            Plan the year in blocks: a hypertrophy mesocycle, a strength block, a peak. Each block can hold microcycles with an RPE band and a deload.
          </p>
        ) : null}

        <ul className="space-y-3">
          {mesocycles.map((m, i) => (
            <li key={m.key} className="rounded-md border border-line bg-canvas-low">
              <div className="flex flex-wrap items-end gap-3 p-3">
                <span aria-hidden="true" className={clsx('mb-1.5 size-3 shrink-0 rounded-sm', blockTone(i).split(' ')[0])} />
                <div className="min-w-40 flex-1">
                  <Label htmlFor={`meso-${m.key}-name`}>Mesocycle name</Label>
                  <Input id={`meso-${m.key}-name`} value={m.name} maxLength={60} onChange={(e) => onChange(patchMeso(mesocycles, m.key, { name: e.target.value }))} aria-invalid={errors[`meso.${m.key}.name`] ? true : undefined} />
                  <FieldError>{errors[`meso.${m.key}.name`]}</FieldError>
                </div>
                <div className="min-w-40 flex-1">
                  <Label htmlFor={`meso-${m.key}-focus`}>Focus</Label>
                  <Input id={`meso-${m.key}-focus`} value={m.focus} maxLength={120} placeholder="e.g. Volume accumulation" onChange={(e) => onChange(patchMeso(mesocycles, m.key, { focus: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor={`meso-${m.key}-start`}>From week</Label>
                  <Input id={`meso-${m.key}-start`} inputMode="numeric" value={m.startWeek} className={weekInput} onChange={(e) => onChange(patchMeso(mesocycles, m.key, { startWeek: e.target.value }))} aria-invalid={errors[`meso.${m.key}.weeks`] ? true : undefined} />
                </div>
                <div>
                  <Label htmlFor={`meso-${m.key}-end`}>To week</Label>
                  <Input id={`meso-${m.key}-end`} inputMode="numeric" value={m.endWeek} className={weekInput} onChange={(e) => onChange(patchMeso(mesocycles, m.key, { endWeek: e.target.value }))} aria-invalid={errors[`meso.${m.key}.weeks`] ? true : undefined} />
                </div>
                <Button variant="ghost" size="sm" aria-label={`Remove ${m.name || 'mesocycle'}`} onClick={() => onChange(removeMeso(mesocycles, m.key))}>
                  <Icon icon={Trash2} />
                </Button>
                <div className="basis-full">
                  <FieldError>{errors[`meso.${m.key}.weeks`]}</FieldError>
                </div>
              </div>

              <div className="border-t border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-mono text-micro uppercase text-muted">Microcycles</h3>
                  <Button variant="ghost" size="sm" onClick={() => onChange(addMicro(mesocycles, m.key))}>
                    <Icon icon={Plus} />
                    Add microcycle
                  </Button>
                </div>
                {m.microcycles.length === 0 ? <p className="text-meta text-faint">Optional: split the block into runs of weeks with an RPE band, or mark a deload.</p> : null}
                <ul className="space-y-2">
                  {m.microcycles.map((c) => (
                    <li key={c.key} className="flex flex-wrap items-end gap-2">
                      <div className="min-w-32 flex-1">
                        <Label htmlFor={`micro-${c.key}-label`}>Label</Label>
                        <Input id={`micro-${c.key}-label`} value={c.label} maxLength={60} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { label: e.target.value }))} aria-invalid={errors[`micro.${c.key}.label`] ? true : undefined} />
                      </div>
                      <div>
                        <Label htmlFor={`micro-${c.key}-start`}>From</Label>
                        <Input id={`micro-${c.key}-start`} inputMode="numeric" value={c.startWeek} className={weekInput} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { startWeek: e.target.value }))} aria-invalid={errors[`micro.${c.key}.weeks`] ? true : undefined} />
                      </div>
                      <div>
                        <Label htmlFor={`micro-${c.key}-end`}>To</Label>
                        <Input id={`micro-${c.key}-end`} inputMode="numeric" value={c.endWeek} className={weekInput} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { endWeek: e.target.value }))} aria-invalid={errors[`micro.${c.key}.weeks`] ? true : undefined} />
                      </div>
                      <div>
                        <Label htmlFor={`micro-${c.key}-rpemin`}>RPE min</Label>
                        <Input id={`micro-${c.key}-rpemin`} inputMode="decimal" value={c.rpeMin} className={weekInput} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { rpeMin: e.target.value }))} aria-invalid={errors[`micro.${c.key}.rpe`] ? true : undefined} />
                      </div>
                      <div>
                        <Label htmlFor={`micro-${c.key}-rpemax`}>RPE max</Label>
                        <Input id={`micro-${c.key}-rpemax`} inputMode="decimal" value={c.rpeMax} className={weekInput} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { rpeMax: e.target.value }))} aria-invalid={errors[`micro.${c.key}.rpe`] ? true : undefined} />
                      </div>
                      <div>
                        <Label htmlFor={`micro-${c.key}-vol`}>Volume %</Label>
                        <Input id={`micro-${c.key}-vol`} inputMode="numeric" value={c.volumeDeltaPct} placeholder="-35" className={weekInput} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { volumeDeltaPct: e.target.value }))} aria-invalid={errors[`micro.${c.key}.volume`] ? true : undefined} />
                      </div>
                      <label className="flex h-9 items-center gap-2 text-ui">
                        <input type="checkbox" className="size-4 rounded-sm" checked={c.isDeload} onChange={(e) => onChange(patchMicro(mesocycles, m.key, c.key, { isDeload: e.target.checked }))} />
                        Deload
                      </label>
                      <Button variant="ghost" size="sm" aria-label={`Remove microcycle ${c.label || ''}`.trim()} onClick={() => onChange(removeMicro(mesocycles, m.key, c.key))}>
                        <Icon icon={Trash2} />
                      </Button>
                      <div className="basis-full">
                        <FieldError>{errors[`micro.${c.key}.label`] ?? errors[`micro.${c.key}.weeks`] ?? errors[`micro.${c.key}.rpe`] ?? errors[`micro.${c.key}.volume`]}</FieldError>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
