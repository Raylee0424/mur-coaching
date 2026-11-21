import clsx from 'clsx';
import { DemoForms } from './DemoForms';
import { CheckCircleIcon } from './Icons';
import { CONTAINER } from './Section';

const SETS = [
  { n: '01', kg: '155.0 kg', reps: 5, rpe: '7.5' },
  { n: '02', kg: '155.0 kg', reps: 5, rpe: '8.0' },
  { n: '03', kg: '155.0 kg', reps: 5, rpe: '8.0' },
] as const;

const TH = 'px-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted sm:px-4';
const TD = 'px-2.5 py-3 sm:px-4';

/** Static preview of a logged session and the engine's call. Illustration only. */
function WorkoutPreview() {
  return (
    <figure aria-label="Example workout log with an increase-load recommendation" className="flex flex-col gap-5 rounded-md border border-line bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Active workout log · Session #14</span>
          <p className="font-display text-2xl font-bold tracking-tight">Barbell Back Squat</p>
        </div>
        <span className="tabular rounded-full border border-line bg-canvas-low px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          Target: 3 × 5 @ RPE ≤ 8.5
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-canvas-low">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-card">
              <th className={TH}>Set</th>
              <th className={TH}>Weight</th>
              <th className={TH}>Reps</th>
              <th className={TH}>RPE</th>
              <th className={clsx(TH, 'text-right')}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {SETS.map((s) => (
              <tr key={s.n}>
                <td className={clsx(TD, 'text-xs font-semibold text-muted')}>{s.n}</td>
                <td className={clsx(TD, 'whitespace-nowrap font-display font-semibold')}>{s.kg}</td>
                <td className={clsx(TD, 'text-sm font-semibold')}>{s.reps}</td>
                <td className={clsx(TD, 'text-sm font-semibold')}>{s.rpe}</td>
                <td className={clsx(TD, 'text-right')}>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald">
                    <CheckCircleIcon className="size-4" />
                    <span className="sr-only sm:not-sr-only">Logged</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-md border border-emerald/40 bg-emerald-bg p-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald" />
            <span className="tabular text-[11px] font-semibold uppercase tracking-wider text-emerald">Increase load • +2.5 kg</span>
          </div>
          <p className="text-xs font-semibold">3-session average RPE 7.8 is below 8.5 cap. Next target: 157.5 kg.</p>
        </div>
        <div aria-hidden="true" className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-primary-ink">Accept</span>
          <span className="rounded-full border border-line-strong bg-card px-4 py-2 text-xs font-semibold text-muted">Dismiss</span>
        </div>
      </div>
    </figure>
  );
}

export function Hero() {
  return (
    <section id="demo" aria-labelledby="hero-heading" className="scroll-mt-20 border-b border-line py-12 sm:py-16 lg:py-24">
      <div className={clsx(CONTAINER, 'grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14')}>
        <div className="flex min-w-0 flex-col items-start gap-6 lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Coach-client strength platform</span>
          </span>
          <h1
            id="hero-heading"
            className="text-balance text-[32px] font-extrabold leading-[1.15] lg:text-[56px] lg:leading-[1.1]"
          >
            Log Your Sets. Let the Engine Call the Next Weight.
          </h1>
          <p className="max-w-prose text-pretty text-lg text-muted">
            Coaches manage entire rosters in one workspace while the deterministic progression engine analyzes the last 3
            sessions (weight, reps, and RPE) to recommend the exact next move.
          </p>
          <div className="pt-2">
            <DemoForms layout="inline" />
          </div>
        </div>
        <div className="min-w-0 lg:col-span-6">
          <WorkoutPreview />
        </div>
      </div>
    </section>
  );
}
