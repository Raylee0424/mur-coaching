'use client';

import clsx from 'clsx';
import { Activity, Droplets, Dumbbell, Flame, PieChart, Ruler, Trophy, Zap, type LucideIcon } from 'lucide-react';
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
import { Input, Label, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Term } from '@/components/ui/Term';
import { unitLabel } from '@/lib/units';
import { DEFAULT_BAR, describePlates, fmt, parseNum, toKg } from './calculators-model';

function NumField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-meta text-muted">
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

function Result({ children, big }: { children: ReactNode; big?: boolean }) {
  return (
    <p role="status" className={big ? 'font-mono text-title-md font-semibold text-primary tabular-nums' : 'font-mono text-label-sm text-muted'}>
      {children}
    </p>
  );
}

const NEEDS_INPUT = 'Enter values to calculate.';

function plateStyle(plateWeight: number, unit: WeightUnit): { cls: string; height: string } {
  if (unit === WeightUnit.KG) {
    if (plateWeight >= 25) return { cls: 'bg-rose text-primary-ink', height: 'h-16 w-4' };
    if (plateWeight >= 20) return { cls: 'bg-sky text-primary-ink', height: 'h-16 w-4' };
    if (plateWeight >= 15) return { cls: 'bg-amber text-primary-ink', height: 'h-14 w-3.5' };
    if (plateWeight >= 10) return { cls: 'bg-emerald text-primary-ink', height: 'h-12 w-3.5' };
    if (plateWeight >= 5) return { cls: 'bg-ink text-primary-ink', height: 'h-10 w-3' };
    return { cls: 'bg-primary text-primary-ink', height: 'h-8 w-2.5' };
  }
  if (plateWeight >= 45) return { cls: 'bg-sky text-primary-ink', height: 'h-16 w-4' };
  if (plateWeight >= 35) return { cls: 'bg-amber text-primary-ink', height: 'h-14 w-3.5' };
  if (plateWeight >= 25) return { cls: 'bg-emerald text-primary-ink', height: 'h-12 w-3.5' };
  if (plateWeight >= 10) return { cls: 'bg-ink text-primary-ink', height: 'h-10 w-3' };
  return { cls: 'bg-primary text-primary-ink', height: 'h-8 w-2.5' };
}

function OneRepMaxTool({ unit }: { unit: WeightUnit }) {
  const [weight, setWeight] = useState('155');
  const [reps, setReps] = useState('5');
  const [formula, setFormula] = useState<OneRepMaxFormula>('EPLEY');
  const w = parseNum(weight);
  const r = parseNum(reps);
  const est = w !== null && r !== null ? oneRepMax(w, r, formula) : null;
  const id = useId();
  return (
    <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Icon icon={Activity} size={20} className="text-primary" />
          <h2 className="font-display text-title-md text-ink">
            <Term id="oneRm" /> Calculator
          </h2>
        </div>
        <span className="font-mono text-title-lg text-primary tabular-nums">
          {est === null ? '—' : `${fmt(est, 1)} ${unitLabel(unit)}`}
        </span>
      </div>

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
        <p className="mt-1.5 text-label-sm text-muted">
          <Term id="epley" />, <Term id="brzycki" /> and <Term id="lombardi" /> each estimate your best single rep a little differently.
        </p>
      </div>

      {est === null ? (
        <Result>{NEEDS_INPUT}</Result>
      ) : (
        <Result>
          {[90, 85, 80, 75].map((p) => `${p}%: ${fmt(percentOf(est, p) ?? 0, 1)} ${unitLabel(unit)}`).join(' · ')}
        </Result>
      )}
    </article>
  );
}

function PlateLoaderTool({ unit }: { unit: WeightUnit }) {
  const [target, setTarget] = useState(unit === WeightUnit.LB ? '315' : '157.5');
  const [bar, setBar] = useState(String(DEFAULT_BAR[unit]));
  const t = parseNum(target);
  const b = parseNum(bar);
  const load = t !== null && b !== null ? plateLoader(t, b, unit === WeightUnit.LB ? PLATES_LB : PLATES_KG) : null;
  const flatPlates = load ? load.perSide.slice(0, 8) : [];

  return (
    <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Icon icon={Dumbbell} size={20} className="text-primary" />
          <h2 className="font-display text-title-md text-ink">Barbell Plate Loader</h2>
        </div>
        <span className="font-mono text-title-md text-primary tabular-nums">
          {load ? `${fmt(load.loaded, 1)} ${unitLabel(unit)}` : '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumField label={`Target (${unitLabel(unit)})`} value={target} onChange={setTarget} />
        <NumField label={`Bar (${unitLabel(unit)})`} value={bar} onChange={setBar} />
      </div>

      {/* Visual Barbell Sleeve (`athlete_web_training_nutrition_calculators`) */}
      <div className="flex min-h-24 items-center justify-center gap-1 rounded-sm border border-line bg-canvas-low p-4" aria-hidden="true">
        <div className="h-2.5 w-8 rounded-l-sm bg-line-strong" />
        <div className="h-6 w-2 rounded-sm bg-muted" />
        {flatPlates.map((plate, idx) => {
          const st = plateStyle(plate, unit);
          return (
            <div key={`${plate}-${idx}`} className={clsx('flex items-center justify-center rounded-sm font-mono text-[10px] font-bold', st.height, st.cls)}>
              {plate >= 5 ? Math.floor(plate) : ''}
            </div>
          );
        })}
        <div className="h-2.5 w-5 rounded-r-sm bg-line-strong" />
      </div>

      {load === null ? (
        <Result>{t !== null && b !== null && t < b ? 'Target is below the bar.' : NEEDS_INPUT}</Result>
      ) : (
        <Result>
          Per side ({fmt(b ?? DEFAULT_BAR[unit])} {unitLabel(unit)} bar): {describePlates(load.perSide)}
          {load.shortfall > 0 ? ` · ${fmt(load.shortfall, 2)} ${unitLabel(unit)} short` : ''}
        </Result>
      )}
    </article>
  );
}

const SPLITS = {
  BALANCED: { label: 'Balanced 30/40/30', proteinPct: 30, carbsPct: 40, fatPct: 30 },
  HIGH_CARB: { label: 'High carb 25/55/20', proteinPct: 25, carbsPct: 55, fatPct: 20 },
  LOW_CARB: { label: 'Lower carb 35/30/35', proteinPct: 35, carbsPct: 30, fatPct: 35 },
} as const;

function MacroTool() {
  const [calories, setCalories] = useState('2840');
  const [split, setSplit] = useState<keyof typeof SPLITS>('BALANCED');
  const id = useId();
  const kcal = parseNum(calories);
  const m = kcal !== null ? macros(kcal, SPLITS[split]) : null;
  return (
    <article className="flex flex-col justify-between gap-4 rounded-md border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Icon icon={PieChart} size={20} className="text-emerald" />
          <h2 className="font-display text-title-md text-ink">Macro Calculator</h2>
        </div>
        <span className="font-mono text-title-md text-ink tabular-nums">{kcal ? `${fmt(kcal)} kcal` : '—'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumField label="Daily calories (kcal)" value={calories} onChange={setCalories} />
        <div>
          <Label htmlFor={id}>Macro split</Label>
          <Select id={id} value={split} onChange={(e) => setSplit(e.target.value as keyof typeof SPLITS)}>
            {Object.entries(SPLITS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {m === null ? (
        <Result>{NEEDS_INPUT}</Result>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 text-center font-mono" role="status">
          <div className="rounded-sm border border-line bg-canvas-low p-3">
            <span className="text-label-sm text-sky">Protein</span>
            <p className="mt-1 text-title-md text-ink">{fmt(m.proteinG)}g</p>
          </div>
          <div className="rounded-sm border border-line bg-canvas-low p-3">
            <span className="text-label-sm text-primary">Carbs</span>
            <p className="mt-1 text-title-md text-ink">{fmt(m.carbsG)}g</p>
          </div>
          <div className="rounded-sm border border-line bg-canvas-low p-3">
            <span className="text-label-sm text-amber">Fat</span>
            <p className="mt-1 text-title-md text-ink">{fmt(m.fatG)}g</p>
          </div>
        </div>
      )}
      <p className="font-mono text-label-sm text-muted">4 / 4 / 9 kcal per gram</p>
    </article>
  );
}

function ToolCardHeader({
  icon,
  tone,
  title,
  subtitle,
  readout,
}: {
  icon: LucideIcon;
  tone: 'sky' | 'emerald' | 'primary' | 'amber';
  title: ReactNode;
  subtitle: string;
  readout?: string;
}) {
  const box = {
    sky: 'border-sky/30 bg-sky-bg text-sky',
    emerald: 'border-emerald/30 bg-emerald-bg text-emerald',
    primary: 'border-primary/30 bg-primary-container text-primary',
    amber: 'border-amber/30 bg-amber-bg text-amber',
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
      <div className="flex items-center gap-3">
        <span className={clsx('inline-flex size-10 shrink-0 items-center justify-center rounded-sm border', box)}>
          <Icon icon={icon} size={20} />
        </span>
        <div>
          <h3 className="font-display text-title-md text-ink">{title}</h3>
          <p className="text-label-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {readout ? <span className="font-mono text-label-lg text-primary tabular-nums">{readout}</span> : null}
    </div>
  );
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentary (desk job, little exercise)',
  LIGHT: 'Light (1–3 sessions a week)',
  MODERATE: 'Moderate (3–5 sessions a week)',
  HIGH: 'High (6–7 sessions a week)',
  EXTREME: 'Extreme (physical job plus training)',
};

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
    <article className="space-y-4 rounded-md border border-line bg-card p-5">
      <ToolCardHeader
        icon={Flame}
        tone="sky"
        title="BMR & TDEE"
        subtitle="Mifflin–St Jeor Energy"
        readout={total ? `${fmt(total)} kcal` : undefined}
      />
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
        <Result big>
          TDEE {fmt(total)} kcal · BMR {fmt(base)} kcal
        </Result>
      )}
    </article>
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
    <article className="space-y-4 rounded-md border border-line bg-card p-5">
      <ToolCardHeader
        icon={Trophy}
        tone="primary"
        title={
          <>
            <Term id="wilks" /> / <Term id="dots" />
          </>
        }
        subtitle="Relative Strength Score"
        readout={dotsScore ? `${fmt(dotsScore, 1)} DOTS` : undefined}
      />
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
    </article>
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
    <article className="space-y-4 rounded-md border border-line bg-card p-5">
      <ToolCardHeader
        icon={Ruler}
        tone="amber"
        title="Body Fat %"
        subtitle="US Navy Circumference"
        readout={pct !== null ? `${fmt(pct, 1)}%` : undefined}
      />
      <div className="grid grid-cols-2 gap-3">
        <SexField value={sex} onChange={setSex} />
        <NumField label="Height (cm)" value={height} onChange={setHeight} />
        <NumField label="Neck (cm)" value={neck} onChange={setNeck} />
        <NumField label="Waist (cm)" value={waist} onChange={setWaist} hint="At the navel." />
        {sex === 'FEMALE' ? <NumField label="Hip (cm)" value={hip} onChange={setHip} hint="Widest point." /> : null}
      </div>
      {pct === null ? <Result>{NEEDS_INPUT}</Result> : <Result big>{fmt(pct, 1)} % body fat</Result>}
    </article>
  );
}

function WaterTool({ unit }: { unit: WeightUnit }) {
  const [weight, setWeight] = useState('');
  const [minutes, setMinutes] = useState('');
  const w = parseNum(weight);
  const m = parseNum(minutes) ?? 0;
  const litres = w !== null ? waterIntakeLitres(toKg(w, unit), m) : null;
  return (
    <article className="space-y-4 rounded-md border border-line bg-card p-5">
      <ToolCardHeader
        icon={Droplets}
        tone="sky"
        title="Water Intake"
        subtitle="Bodyweight + Sweat"
        readout={litres !== null ? `${fmt(litres, 1)} L / day` : undefined}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumField label={`Bodyweight (${unitLabel(unit)})`} value={weight} onChange={setWeight} />
        <NumField label="Training min / day" value={minutes} onChange={setMinutes} />
      </div>
      {litres === null ? <Result>{NEEDS_INPUT}</Result> : <Result big>{fmt(litres, 1)} L / day</Result>}
    </article>
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
    <article className="space-y-4 rounded-md border border-line bg-card p-5">
      <ToolCardHeader
        icon={Zap}
        tone="primary"
        title={<Term id="netStimulus" />}
        subtitle="Weekly Hard Sets"
        readout={result ? `${fmt(result.effectiveSets, 1)} sets` : undefined}
      />
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
      <p className="text-meta text-muted">0–4 RIR counts fully, 5 RIR half, 6+ RIR not at all.</p>
    </article>
  );
}

export function CalculatorsHub({ unit }: { unit: WeightUnit }) {
  return (
    <div className="space-y-6">
      {/* Built-in Primary Calculators (3 Columns) */}
      <section className="grid gap-6 lg:grid-cols-3">
        <OneRepMaxTool unit={unit} />
        <PlateLoaderTool unit={unit} />
        <MacroTool />
      </section>

      {/* Free Browser Calculators Grid */}
      <section className="space-y-3">
        <h2 className="font-mono text-label-sm uppercase text-muted">FREE BROWSER CALCULATORS</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <EnergyTool unit={unit} />
          <StrengthScoreTool unit={unit} />
          <BodyFatTool />
          <WaterTool unit={unit} />
          <NetStimulusTool />
        </div>
      </section>

      <p className="font-mono text-label-sm text-muted">Estimates only — nothing is saved on the server, and progression targets remain untouched.</p>
    </div>
  );
}
