'use client';

import clsx from 'clsx';
import { AlertTriangle, ArrowDown, ArrowUp, Ban, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { AI_LIMITS, MUSCLE_GROUP_LABELS, MuscleGroup, WORKOUT_GOAL_LABELS, WorkoutGoal } from '@coaching/shared';
import type { ExerciseDto, GeneratedWorkoutDto, LimitationSeverity, WeightUnit } from '@coaching/shared';
import { generateWorkout, saveGeneratedTemplate } from '@/actions/ai';
import { GYM_PROFILE_STORAGE_KEY, GYM_PROFILES, type GymProfileId } from '@/components/onboarding/client-onboarding-model';
import { ExercisePicker } from '@/components/programs/ExercisePicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { engineLoadLabel, equipmentFor, moveRow, replaceRow, toRows, toTemplateRequest, updateRow, workingSets, type PreviewRow } from './generator-model';

interface Guardrail {
  id: string;
  severity: LimitationSeverity;
  label: string;
}

const MUSCLES = Object.values(MuscleGroup).filter((m) => m !== MuscleGroup.FULL_BODY);
const PILL = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-label-sm transition-colors';

function GuardrailCell({ row }: { row: PreviewRow }) {
  if (!row.checked) return <Badge tone="slate">Edited · not checked</Badge>;
  if (row.limitation) return <Badge tone="amber" icon={AlertTriangle}>Caution{row.limitation.note ? `: ${row.limitation.note}` : ''}</Badge>;
  return <Badge tone="emerald" icon={ShieldCheck}>Cleared</Badge>;
}

/** Form, auto-loaded guardrails, gym filters, editable preview. Nothing is saved until Save as Template or Start Session. */
export function WorkoutGenerator({ guardrails, catalog, unit }: { guardrails: Guardrail[]; catalog: ExerciseDto[]; unit: WeightUnit }) {
  const router = useRouter();
  const [goal, setGoal] = useState<WorkoutGoal>(WorkoutGoal.HYPERTROPHY);
  const [duration, setDuration] = useState(45);
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [gym, setGym] = useState<GymProfileId>('COMMERCIAL');
  const [result, setResult] = useState<GeneratedWorkoutDto | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [name, setName] = useState('');
  const [replacing, setReplacing] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Same equipment profile as Gym Mode on the Templates page.
  useEffect(() => {
    const raw = window.localStorage.getItem(GYM_PROFILE_STORAGE_KEY);
    if (raw === 'COMMERCIAL' || raw === 'HOME_RACK' || raw === 'HOTEL_DB') setGym(raw);
  }, []);

  function selectGym(id: GymProfileId) {
    setGym(id);
    window.localStorage.setItem(GYM_PROFILE_STORAGE_KEY, id);
  }

  function toggleMuscle(m: MuscleGroup) {
    setMuscles((list) => (list.includes(m) ? list.filter((x) => x !== m) : list.length >= 6 ? list : [...list, m]));
  }

  function generate() {
    setError(undefined);
    setSaved(undefined);
    startTransition(async () => {
      const res = await generateWorkout({ goal, durationMin: duration, targetMuscles: muscles, equipment: equipmentFor(gym) });
      if (!res.ok) return setError(res.error);
      setResult(res.data);
      setRows(toRows(res.data.exercises));
      setName(res.data.title);
    });
  }

  function save(thenStart: boolean) {
    if (!result || rows.length === 0) return;
    setError(undefined);
    startTransition(async () => {
      const res = await saveGeneratedTemplate(toTemplateRequest(rows, name, result.rationale));
      if (!res.ok) return setError(res.error);
      if (thenStart) router.push(`/client/log?template=${encodeURIComponent(res.data.id)}`);
      else setSaved(`Saved “${res.data.name}” to your templates.`);
    });
  }

  const activeGym = GYM_PROFILES.find((p) => p.id === gym) ?? GYM_PROFILES[0]!;
  const minutes = result ? Math.round((result.estimatedMinutes * rows.length) / Math.max(1, result.exercises.length)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 rounded-md border border-line bg-card p-5 lg:grid-cols-2">
        <div>
          <span className="font-mono text-label-sm uppercase text-primary">AUTO-LOADED INJURY / LIMITATION GUARDRAILS</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {guardrails.length ? (
              guardrails.map((g) => (
                <Badge key={g.id} tone={g.severity === 'AVOID' ? 'red' : 'amber'} icon={g.severity === 'AVOID' ? Ban : AlertTriangle}>
                  {g.label}: {g.severity === 'AVOID' ? 'Avoid' : 'Caution'}
                </Badge>
              ))
            ) : (
              <span className="text-meta text-muted">No active limitations. Add them on your profile and the generator respects them.</span>
            )}
          </div>
        </div>
        <div>
          <span className="font-mono text-label-sm uppercase text-primary">ACTIVE GYM EQUIPMENT FILTER</span>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Gym equipment profile">
            {GYM_PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={gym === p.id}
                onClick={() => selectGym(p.id)}
                className={clsx(PILL, gym === p.id ? 'border-primary bg-primary text-primary-ink' : 'border-line bg-canvas-low text-muted hover:text-ink')}
              >
                {p.title}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-meta text-muted">{activeGym.description}</p>
        </div>
      </section>

      <section aria-label="Session settings" className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gen-goal">Goal</Label>
            <Select id="gen-goal" value={goal} onChange={(e) => setGoal(e.target.value as WorkoutGoal)}>
              {Object.values(WorkoutGoal).map((g) => (
                <option key={g} value={g}>
                  {WORKOUT_GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="gen-duration">Duration (minutes)</Label>
            <Input
              id="gen-duration"
              type="number"
              inputMode="numeric"
              min={AI_LIMITS.minDurationMin}
              max={AI_LIMITS.maxDurationMin}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Math.min(AI_LIMITS.maxDurationMin, Math.max(AI_LIMITS.minDurationMin, Number(e.target.value) || AI_LIMITS.minDurationMin)))}
            />
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 font-sans text-label-md text-ink">Target muscles (none = full body, up to 6)</legend>
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={muscles.includes(m)}
                onClick={() => toggleMuscle(m)}
                className={clsx(PILL, muscles.includes(m) ? 'border-primary bg-primary-container text-primary' : 'border-line bg-canvas-low text-muted hover:text-ink')}
              >
                {MUSCLE_GROUP_LABELS[m]}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <Button onClick={generate} disabled={pending} aria-busy={pending}>
            <Icon icon={result ? RefreshCw : Sparkles} size={16} />
            {pending ? 'Generating…' : result ? 'Regenerate Session' : 'Generate Session'}
          </Button>
        </div>
        <FormError>{error}</FormError>
      </section>

      {result ? (
        <section aria-label="Generated workout" className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Label htmlFor="gen-name">Workout name</Label>
              <Input id="gen-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
              <p className="mt-1 font-mono text-label-sm uppercase text-muted">
                {rows.length} EXERCISES · {workingSets(rows)} WORKING SETS · EST {minutes} MIN · {result.source === 'MODEL' ? 'AI PICK' : 'RULES PICK'}
                {result.excludedCount ? ` · ${result.excludedCount} AVOIDED` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => save(false)} disabled={pending || rows.length === 0}>
                Save as Template
              </Button>
              <Button onClick={() => save(true)} disabled={pending || rows.length === 0}>
                Start Session
              </Button>
            </div>
          </div>
          <p className="text-body text-muted">{result.rationale}</p>

          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line font-mono text-label-sm uppercase text-muted">
                  <th className="py-2 pr-3 font-normal">Exercise (editable)</th>
                  <th className="py-2 pr-3 font-normal">Sets × Reps</th>
                  <th className="py-2 pr-3 font-normal">Engine load</th>
                  <th className="py-2 pr-3 font-normal">RIR</th>
                  <th className="py-2 pr-3 font-normal">Guardrail check</th>
                  <th className="py-2 font-normal">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="border-b border-line align-middle">
                    <td className="py-2.5 pr-3">
                      <button type="button" onClick={() => setReplacing(r.key)} className="text-left font-sans text-label-md font-semibold text-ink underline-offset-2 hover:text-primary hover:underline">
                        {r.name}
                        <span className="sr-only"> (replace)</span>
                      </button>
                      <p className="font-mono text-label-sm text-muted">{MUSCLE_GROUP_LABELS[r.muscleGroup]}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1 font-mono text-label-md">
                        <Input aria-label={`Sets for ${r.name}`} type="number" min={1} max={50} value={r.sets} onChange={(e) => setRows(updateRow(rows, r.key, { sets: Number(e.target.value) }))} className="w-16" />
                        ×
                        <Input aria-label={`Minimum reps for ${r.name}`} type="number" min={1} max={100} value={r.repsMin} onChange={(e) => setRows(updateRow(rows, r.key, { repsMin: Number(e.target.value) }))} className="w-16" />
                        –
                        <Input aria-label={`Maximum reps for ${r.name}`} type="number" min={1} max={100} value={r.repsMax} onChange={(e) => setRows(updateRow(rows, r.key, { repsMax: Number(e.target.value) }))} className="w-16" />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-label-md text-ink">{engineLoadLabel(r, unit)}</td>
                    <td className="py-2.5 pr-3 font-mono text-label-md text-ink">{r.rir}</td>
                    <td className="py-2.5 pr-3">
                      <GuardrailCell row={r} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => setRows(moveRow(rows, r.key, -1))}>
                          <Icon icon={ArrowUp} size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => setRows(moveRow(rows, r.key, 1))}>
                          <Icon icon={ArrowDown} size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" aria-label={`Remove ${r.name}`} onClick={() => setRows(rows.filter((x) => x.key !== r.key))}>
                          <Icon icon={Trash2} size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-mono text-label-sm text-muted">
            Loads come only from your progression engine; the generator never raises a deload or hold. Avoid-limited exercises are never suggested.
          </p>
          {saved ? (
            <p role="status" className="text-meta font-medium text-emerald">
              {saved}
            </p>
          ) : null}
        </section>
      ) : null}

      <ExercisePicker
        open={replacing !== null}
        onClose={() => setReplacing(null)}
        library={catalog}
        targetLabel="this workout"
        addedNames={new Set(rows.map((r) => r.name))}
        onPick={(picked) => {
          if (replacing) setRows(replaceRow(rows, replacing, picked));
          setReplacing(null);
        }}
      />
    </div>
  );
}
