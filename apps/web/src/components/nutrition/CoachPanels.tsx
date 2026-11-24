import clsx from 'clsx';
import { NUTRITION_LIMITS } from '@coaching/shared';
import type { AdherenceSummary, DayVerdict, MealEntryDto, NutrientTotals, NutritionTargetDto } from '@coaching/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { barWidth, fmt, litres, pcf, shortDay } from './nutrition-model';

/** Target vs logged vs remaining for today. Remaining turns amber once a ceiling (calories, fat) is overshot. */
export function IntakeAudit({ totals, waterMl, target }: { totals: NutrientTotals; waterMl: number; target: NutritionTargetDto | null }) {
  const rows: { label: string; unit: string; logged: number; goal: number | null; tone: string }[] = [
    { label: 'Calories', unit: 'kcal', logged: totals.kcal, goal: target?.kcal ?? null, tone: 'text-primary' },
    { label: 'Protein', unit: 'g', logged: totals.proteinG, goal: target?.proteinG ?? null, tone: 'text-sky' },
    { label: 'Carbs', unit: 'g', logged: totals.carbsG, goal: target?.carbsG ?? null, tone: 'text-emerald' },
    { label: 'Fat', unit: 'g', logged: totals.fatG, goal: target?.fatG ?? null, tone: 'text-amber' },
    { label: 'Fiber', unit: 'g', logged: totals.fiberG, goal: target?.fiberG ?? null, tone: 'text-ink' },
    { label: 'Water', unit: 'L', logged: waterMl / 1000, goal: (target?.waterMl ?? NUTRITION_LIMITS.defaultWaterMl) / 1000, tone: 'text-sky' },
  ];
  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-canvas-low">
      <table className={TABLE}>
        <thead className={THEAD}>
          <tr>
            <th scope="col" className={TH}>Nutrient</th>
            <th scope="col" className={TH_NUM}>Target</th>
            <th scope="col" className={TH_NUM}>Logged</th>
            <th scope="col" className={TH_NUM}>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const digits = r.unit === 'L' ? 1 : 0;
            const left = r.goal === null ? null : r.goal - r.logged;
            return (
              <tr key={r.label} className={TR}>
                <th scope="row" className={clsx(TD, 'text-left font-normal text-ink')}>{r.label}</th>
                <td className={clsx(TD_NUM, 'text-muted')}>{r.goal === null ? '—' : `${fmt(r.goal, digits)} ${r.unit}`}</td>
                <td className={clsx(TD_NUM, r.tone)}>
                  {fmt(r.logged, digits)} {r.unit}
                </td>
                <td className={clsx(TD_NUM, left !== null && left < 0 ? 'text-amber' : r.tone)}>
                  {left === null ? '—' : left < 0 ? `${fmt(-left, digits)} ${r.unit} over` : `${fmt(left, digits)} ${r.unit}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LoggedEntries({ entries }: { entries: MealEntryDto[] }) {
  if (!entries.length) return <p className="text-body-md text-muted">No food logged today yet.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-canvas-low p-3.5 font-mono text-label-md">
          <span className="font-sans text-ink">
            {e.name} <span className="text-muted">({e.source === 'CUSTOM' ? 'custom' : e.source})</span>
          </span>
          <span className="text-muted">
            {fmt(Number(e.nutrients.kcal))} kcal · {pcf(e.nutrients)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const VERDICT: Record<DayVerdict, { label: string; tone: BadgeTone }> = {
  ON_TARGET: { label: 'On target', tone: 'emerald' },
  UNDER: { label: 'Under', tone: 'amber' },
  OVER: { label: 'Over', tone: 'red' },
  LOGGED: { label: 'Logged', tone: 'neutral' },
  NO_LOG: { label: 'No log', tone: 'slate' },
};

/** 7-day calorie and protein bars against target, plus hydration consistency. Every bar carries its number. */
export function AdherenceWeek({ summary, target }: { summary: AdherenceSummary; target: NutritionTargetDto | null }) {
  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <caption className="sr-only">Daily intake for the last {summary.days.length} days</caption>
        <thead className={THEAD}>
          <tr>
            <th scope="col" className={TH}>Day</th>
            <th scope="col" className={TH}>Calories{target ? ` (of ${fmt(target.kcal)})` : ''}</th>
            <th scope="col" className={TH}>Protein{target ? ` (of ${fmt(target.proteinG)} g)` : ''}</th>
            <th scope="col" className={TH}>Water (of {litres(summary.waterTargetMl)} L)</th>
            <th scope="col" className={TH}>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {[...summary.days].reverse().map((d) => (
            <tr key={d.date} className={TR}>
              <th scope="row" className={clsx(TD, 'whitespace-nowrap text-left font-mono font-normal text-muted')}>{shortDay(d.date)}</th>
              <td className={TD}>
                <MiniBar value={`${fmt(d.kcal)} kcal`} pct={d.kcalPct} fill="bg-primary" />
              </td>
              <td className={TD}>
                <MiniBar value={`${fmt(d.proteinG)} g`} pct={d.proteinPct} fill="bg-sky" />
              </td>
              <td className={TD}>
                <MiniBar value={`${litres(d.waterMl)} L`} pct={d.waterPct} fill={d.hydrated ? 'bg-sky' : 'bg-line-strong'} />
              </td>
              <td className={TD}>
                <Badge tone={VERDICT[d.verdict].tone}>{VERDICT[d.verdict].label}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBar({ value, pct, fill }: { value: string; pct: number | null; fill: string }) {
  return (
    <div className="flex min-w-36 items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-canvas-low" aria-hidden="true">
        <div className={clsx('h-2 rounded-full', fill)} style={{ width: `${barWidth(pct)}%` }} />
      </div>
      <span className="whitespace-nowrap font-mono text-label-sm text-ink tabular-nums">
        {value}
        {pct !== null ? <span className="text-muted"> · {pct}%</span> : null}
      </span>
    </div>
  );
}
