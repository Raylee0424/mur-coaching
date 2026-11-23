'use client';

import { useId, useState, type ReactNode } from 'react';
import {
  ACTIVITY_MULTIPLIER,
  PLATES_KG,
  PLATES_LB,
  WeightUnit,
  bmr,
  bodyFatNavy,
  dots,
  macros,
  oneRepMax,
  percentOf,
  plateLoader,
  tdee,
  waterIntakeLitres,
  weeklyNetStimulus,
  wilks,
  type ActivityLevel,
  type OneRepMaxFormula,
  type Sex,
  type StimulusBand,
} from '@coaching/shared';
import { Panel } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Field';
import { unitLabel } from '@/lib/units';
import { DEFAULT_BAR, describePlates, fmt, parseNum, toKg } from './calculators-model';

function NumField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-meta text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SexField({ value, onChange }: { value: Sex; onChange: (s: Sex) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>Sex</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as Sex)}>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
      </Select>
    </div>
  );
}

/** Live result line. `role=status` so a screen reader hears the answer change as the athlete types. */
function Result({ children, big }: { children: ReactNode; big?: boolean }) {
  return (
    <p role="status" className={big ? 'font-mono text-title font-semibold text-signal' : 'text-ui text-muted'}>
      {children}
    </p>
  );
}

const NEEDS_INPUT = 'Enter values to calculate.';

function OneRepMaxTool({ unit }: { unit: WeightUnit }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [formula, setFormula] = useState<OneRepMaxFormula>('EPLEY');
  const w = parseNum(weight);
  const r = parseNum(reps);
  const est = w !== null && r !== null ? oneRepMax(w, r, formula) : null;
  const id = useId();
  return (
    <Panel title="1RM calculator" meta="estimate">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label={`Weight (${unitLabel(unit)})`} value={weight} onChange={setWeight} />
          <NumField label="Reps (1–12)" value={reps} onChange={setReps} />
        </div>
        <div>
          <Label htmlFor={id}>Formula</Label>
          <Select id={id} value={formula} onChange={(e) => setFormula(e.target.value as OneRepMaxFormula)}>
            <option value="EPLEY">Epley (engine default)</option>
            <option value="BRZYCKI">Brzycki</option>
            <option value="LOMBARDI">Lombardi</option>
          </Select>
        </div>
        {est === null ? (
          <Result>{NEEDS_INPUT}</Result>
        ) : (
          <>
            <Result big>
              {fmt(est, 1)} {unitLabel(unit)}
            </Result>
            <Result>
              {[90, 85, 80, 75, 70].map((p) => `${p}%: ${fmt(percentOf(est, p) ?? 0, 1)}`).join(' · ')}
            </Result>
          </>
        )}
      </div>
    </Panel>
  );
}

function PlateLoaderTool({ unit }: { unit: WeightUnit }) {
  const [target, setTarget] = useState('');
  const [bar, setBar] = useState(String(DEFAULT_BAR[unit]));
  const t = parseNum(target);
  const b = parseNum(bar);
  const load = t !== null && b !== null ? plateLoader(t, b, unit === WeightUnit.LB ? PLATES_LB : PLATES_KG) : null;
  return (
    <Panel title="Plate loader" meta={`per side, ${unitLabel(unit)}`}>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label={`Target (${unitLabel(unit)})`} value={target} onChange={setTarget} />
          <NumField label={`Bar (${unitLabel(unit)})`} value={bar} onChange={setBar} />
        </div>
        {load === null ? (
          <Result>{t !== null && b !== null && t < b ? 'Target is below the bar.' : NEEDS_INPUT}</Result>
        ) : (
          <>
            <Result big>{describePlates(load.perSide)}</Result>
            <Result>
              Loads {fmt(load.loaded, 2)} {unitLabel(unit)}
              {load.shortfall > 0 ? `. ${fmt(load.shortfall, 2)} ${unitLabel(unit)} short: no plate fits.` : '.'}
            </Result>
          </>
        )}
      </div>
    </Panel>
  );
}

const SPLITS = {
  BALANCED: { label: 'Balanced 30/40/30', proteinPct: 30, carbsPct: 40, fatPct: 30 },
  HIGH_CARB: { label: 'High carb 25/55/20', proteinPct: 25, carbsPct: 55, fatPct: 20 },
  LOW_CARB: { label: 'Lower carb 35/30/35', proteinPct: 35, carbsPct: 30, fatPct: 35 },
} as const;

function MacroTool() {
  const [calories, setCalories] = useState('');
  const [split, setSplit] = useState<keyof typeof SPLITS>('BALANCED');
  const id = useId();
  const kcal = parseNum(calories);
  const m = kcal !== null ? macros(kcal, SPLITS[split]) : null;
  return (
    <Panel title="Macro calculator" meta="4 / 4 / 9 kcal per g">
      <div className="space-y-3 p-4">
        <NumField label="Daily calories (kcal)" value={calories} onChange={setCalories} />
        <div>
          <Label htmlFor={id}>Split (protein / carbs / fat)</Label>
          <Select id={id} value={split} onChange={(e) => setSplit(e.target.value as keyof typeof SPLITS)}>
            {Object.entries(SPLITS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        {m === null ? (
          <Result>{NEEDS_INPUT}</Result>
        ) : (
          <Result big>
            P {fmt(m.proteinG)} g · C {fmt(m.carbsG)} g · F {fmt(m.fatG)} g
          </Result>
        )}
      </div>
    </Panel>
  );
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentary (desk job, little exercise)',
  LIGHT: 'Light (1–3 sessions a week)',
  MODERATE: 'Moderate (3–5 sessions a week)',
  HIGH: 'High (6–7 sessions a week)',
  EXTREME: 'Extreme (physical job plus training)',
};

/** BMR and TDEE share inputs, so one tool shows both. */
function EnergyTool({ unit }: { unit: WeightUnit }) {
  const [sex, setSex] = useState<Sex>('MALE');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('MODERATE');
  const id = useId();
  const w = parseNum(weight);
  const h = parseNum(height);
  const a = parseNum(age);
  const base = w !== null && h !== null && a !== null ? bmr(sex, toKg(w, unit), h, a) : null;
  const total = base === null ? null : tdee(base, activity);
  return (
    <Panel title="BMR and TDEE" meta="Mifflin–St Jeor">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <SexField value={sex} onChange={setSex} />
          <NumField label="Age (years)" value={age} onChange={setAge} />
          <NumField label={`Weight (${unitLabel(unit)})`} value={weight} onChange={setWeight} />
          <NumField label="Height (cm)" value={height} onChange={setHeight} />
        </div>
        <div>
          <Label htmlFor={id}>Activity</Label>
          <Select id={id} value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_MULTIPLIER) as ActivityLevel[]).map((k) => (
              <option key={k} value={k}>
                {ACTIVITY_LABELS[k]}
              </option>
            ))}
          </Select>
        </div>
        {base === null || total === null ? (
          <Result>{NEEDS_INPUT}</Result>
        ) : (
          <>
            <Result big>TDEE {fmt(total)} kcal / day</Result>
            <Result>BMR {fmt(base)} kcal / day</Result>
          </>
        )}
      </div>
    </Panel>
  );
}

function StrengthScoreTool({ unit }: { unit: WeightUnit }) {
  const [sex, setSex] = useState<Sex>('MALE');
  const [bodyweight, setBodyweight] = useState('');
  const [total, setTotal] = useState('');
  const bw = parseNum(bodyweight);
  const tot = parseNum(total);
  const args = bw !== null && tot !== null ? ([sex, toKg(bw, unit), toKg(tot, unit)] as const) : null;
  const dotsScore = args ? dots(...args) : null;
  const wilksScore = args ? wilks(...args) : null;
  return (
    <Panel title="Wilks and DOTS" meta="squat + bench + deadlift">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <SexField value={sex} onChange={setSex} />
          <NumField label={`Bodyweight (${unitLabel(unit)})`} value={bodyweight} onChange={setBodyweight} />
        </div>
        <NumField label={`Total (${unitLabel(unit)})`} value={total} onChange={setTotal} />
        {dotsScore === null || wilksScore === null ? (
          <Result>{args ? 'Bodyweight must be 40–210 kg (men) or 40–150 kg (women).' : NEEDS_INPUT}</Result>
        ) : (
          <Result big>
            DOTS {fmt(dotsScore, 1)} · Wilks {fmt(wilksScore, 1)}
          </Result>
        )}
      </div>
    </Panel>
  );
}

function BodyFatTool() {
  const [sex, setSex] = useState<Sex>('MALE');
  const [height, setHeight] = useState('');
  const [neck, setNeck] = useState('');
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const h = parseNum(height);
  const n = parseNum(neck);
  const wa = parseNum(waist);
  const hp = parseNum(hip);
  const pct =
    h !== null && n !== null && wa !== null
      ? bodyFatNavy({ sex, heightCm: h, neckCm: n, waistCm: wa, ...(hp !== null ? { hipCm: hp } : {}) })
      : null;
  return (
    <Panel title="Body fat %" meta="US Navy method, cm">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <SexField value={sex} onChange={setSex} />
          <NumField label="Height (cm)" value={height} onChange={setHeight} />
          <NumField label="Neck (cm)" value={neck} onChange={setNeck} />
          <NumField label="Waist (cm)" value={waist} onChange={setWaist} hint="At the navel." />
          {sex === 'FEMALE' ? <NumField label="Hip (cm)" value={hip} onChange={setHip} hint="Widest point." /> : null}
        </div>
        {pct === null ? <Result>{NEEDS_INPUT}</Result> : <Result big>{fmt(pct, 1)} % body fat</Result>}
      </div>
    </Panel>
  );
}

function WaterTool({ unit }: { unit: WeightUnit }) {
  const [weight, setWeight] = useState('');
  const [minutes, setMinutes] = useState('');
  const w = parseNum(weight);
  const m = parseNum(minutes) ?? 0;
  const litres = w !== null ? waterIntakeLitres(toKg(w, unit), m) : null;
  return (
    <Panel title="Water intake" meta="daily guide">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label={`Bodyweight (${unitLabel(unit)})`} value={weight} onChange={setWeight} />
          <NumField label="Training minutes / day" value={minutes} onChange={setMinutes} />
        </div>
        {litres === null ? <Result>{NEEDS_INPUT}</Result> : <Result big>{fmt(litres, 1)} L / day</Result>}
      </div>
    </Panel>
  );
}

const BAND_COPY: Record<StimulusBand, string> = {
  BELOW: 'Below the growth threshold. Add hard sets.',
  MAINTAIN: 'Enough to maintain, slow growth.',
  PRODUCTIVE: 'In the productive range.',
  HIGH: 'High. Recovery may limit gains.',
};

function NetStimulusTool() {
  const [sets, setSets] = useState('');
  const [rir, setRir] = useState('2');
  const n = parseNum(sets);
  const r = parseNum(rir);
  const valid = n !== null && r !== null && Number.isInteger(n) && n >= 0 && n <= 100 && r >= 0 && r <= 10;
  const result = valid ? weeklyNetStimulus(Array.from({ length: n }, () => ({ rir: r }))) : null;
  return (
    <Panel title="Weekly net stimulus" meta="one muscle">
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Working sets / week" value={sets} onChange={setSets} />
          <NumField label="Average RIR" value={rir} onChange={setRir} hint="Reps in reserve, 0–10." />
        </div>
        {result === null ? (
          <Result>{NEEDS_INPUT}</Result>
        ) : (
          <>
            <Result big>{fmt(result.effectiveSets, 1)} effective sets / wk</Result>
            <Result>{BAND_COPY[result.band]}</Result>
          </>
        )}
        <p className="text-meta text-faint">0–4 RIR counts fully, 5 RIR half, 6+ RIR not at all. Productive range is 10–20 effective sets.</p>
      </div>
    </Panel>
  );
}

export function CalculatorsHub({ unit }: { unit: WeightUnit }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <OneRepMaxTool unit={unit} />
        <PlateLoaderTool unit={unit} />
        <MacroTool />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EnergyTool unit={unit} />
        <StrengthScoreTool unit={unit} />
        <BodyFatTool />
        <WaterTool unit={unit} />
        <NetStimulusTool />
      </div>
      <p className="text-meta text-faint">Estimates only, nothing is saved. They do not change your progression targets.</p>
    </div>
  );
}
