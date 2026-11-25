import clsx from 'clsx';
import { CircleCheck } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Term } from '@/components/ui/Term';
import { DemoForms } from './DemoForms';
import { CONTAINER } from './Section';

const SETS = [
  { n: '01', kg: '155.0 kg', reps: 5, rpe: '7.5' },
  { n: '02', kg: '155.0 kg', reps: 5, rpe: '8.0' },
  { n: '03', kg: '155.0 kg', reps: 5, rpe: '8.0' },
] as const;

/** High-fidelity Workout Log + Progression Recommendation card matching Stitch hero. */
function WorkoutPreview() {
  return (
    <figure aria-label="Example workout log with an increase-load recommendation" className="flex flex-col gap-5 rounded-md border border-line bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-label-sm uppercase tracking-wider text-muted">ACTIVE WORKOUT LOG · SESSION #14</span>
          <h2 className="font-display text-headline-md text-ink">Barbell Back Squat</h2>
        </div>
        <span className="rounded-full border border-line bg-canvas-low px-3 py-1 font-sans text-label-sm uppercase tracking-wider text-muted tabular-nums">
          TARGET: 3 × 5 @ RPE ≤ 8.5
        </span>
      </div>

      <div className="relative overflow-x-auto rounded-md border border-line bg-canvas-low">
        <table className="w-full border-collapse text-left tabular-nums">
          <caption className="sr-only">Sets logged in the latest session</caption>
          <thead>
            <tr className="border-b border-line bg-card">
              <th scope="col" className="px-4 py-2.5 font-sans text-label-sm uppercase tracking-wider text-muted">Set</th>
              <th scope="col" className="px-4 py-2.5 font-sans text-label-sm uppercase tracking-wider text-muted">Weight</th>
              <th scope="col" className="px-4 py-2.5 font-sans text-label-sm uppercase tracking-wider text-muted">Reps</th>
              <th scope="col" className="px-4 py-2.5 font-sans text-label-sm uppercase tracking-wider text-muted">RPE</th>
              <th scope="col" className="px-4 py-2.5 text-right font-sans text-label-sm uppercase tracking-wider text-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {SETS.map((s) => (
              <tr key={s.n}>
                <td className="px-4 py-3 font-mono text-label-md text-muted">{s.n}</td>
                <td className="px-4 py-3 font-display text-title-md text-ink">{s.kg}</td>
                <td className="px-4 py-3 font-sans text-label-lg text-ink">{s.reps}</td>
                <td className="px-4 py-3 font-sans text-label-lg text-ink">{s.rpe}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1 font-sans text-label-sm text-emerald">
                    <Icon icon={CircleCheck} size={14} />
                    Logged
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
            <span className="size-2 rounded-full bg-emerald" aria-hidden="true" />
            <span className="font-sans text-label-sm uppercase tracking-wider text-emerald tabular-nums">INCREASE LOAD • +2.5 kg</span>
          </div>
          <p className="font-sans text-label-md font-normal text-ink">
            3-session average RPE 7.8 is below 8.5 cap. Next target: 157.5 kg.
          </p>
        </div>
        <div aria-hidden="true" className="flex shrink-0 items-center gap-2.5">
          <span className="rounded-full bg-emerald px-4 py-2 font-sans text-label-md text-primary-ink">Accept</span>
          <span className="rounded-full border border-line-strong bg-card px-4 py-2 font-sans text-label-md text-muted">Dismiss</span>
        </div>
      </div>
    </figure>
  );
}

export function Hero() {
  return (
    <section id="demo" aria-labelledby="hero-heading" className="scroll-mt-20 border-b border-line py-16 lg:py-24">
      <div className={clsx(CONTAINER, 'grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14')}>
        <div className="flex flex-col items-start gap-6 lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="font-sans text-label-sm uppercase tracking-wider">COACH-CLIENT STRENGTH PLATFORM</span>
          </span>

          <h1 id="hero-heading" className="text-balance font-display text-display-lg-mobile lg:text-display-lg text-ink">
            Log Your Sets. Let the Engine Call the Next Weight.
          </h1>

          <p className="max-w-prose text-pretty font-sans text-body-lg text-muted">
            Coaches manage entire rosters in one workspace while the deterministic progression engine analyzes the last 3 sessions—weight,
            reps, and <Term id="rpe" />—to recommend the exact next move.
          </p>
          <p className="-mt-3 font-mono text-label-md text-muted">RPE = how hard a set felt, 1-10</p>

          <DemoForms layout="inline" />
        </div>

        <div className="min-w-0 lg:col-span-6">
          <WorkoutPreview />
        </div>
      </div>
    </section>
  );
}
