import clsx from 'clsx';
import { RecommendationAction } from '@coaching/shared';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { DemoForms } from './DemoForms';
import { CONTAINER } from './Section';

const SETS = [
  { n: 1, kg: '155.0', reps: 5, rpe: '7.5' },
  { n: 2, kg: '155.0', reps: 5, rpe: '8.0' },
  { n: 3, kg: '155.0', reps: 5, rpe: '8.0' },
] as const;

/** Static instrument panel: one logged session and the engine's call. Illustration only. */
function WorkoutPreview() {
  return (
    <figure aria-label="Example workout log with an increase-load recommendation" className="overflow-hidden rounded-md border border-line bg-card">
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <span className="font-mono text-micro uppercase text-muted">Back squat · Session 3 of 3</span>
        <span className="font-mono text-micro text-faint">Nov 20</span>
      </div>
      <table className={TABLE}>
        <caption className="sr-only">Sets logged in the latest session</caption>
        <thead className={THEAD}>
          <tr>
            <th scope="col" className={TH}>Set</th>
            <th scope="col" className={TH_NUM}>Load</th>
            <th scope="col" className={TH_NUM}>Reps</th>
            <th scope="col" className={TH_NUM}>RPE</th>
          </tr>
        </thead>
        <tbody>
          {SETS.map((s) => (
            <tr key={s.n} className={TR}>
              <td className={clsx(TD, 'font-mono text-faint')}>{s.n}</td>
              <td className={TD_NUM}>
                {s.kg}
                <span className="ml-1 text-faint">kg</span>
              </td>
              <td className={TD_NUM}>{s.reps}</td>
              <td className={TD_NUM}>{s.rpe}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-l-2 border-line border-l-emerald px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ActionBadge action={RecommendationAction.INCREASE_LOAD} />
          <span className="font-mono text-metric">
            157.5<span className="ml-1 text-ui text-faint">kg</span> <span className="text-ui text-faint">×</span> 5
          </span>
        </div>
        <p className="mt-2 text-meta text-muted">
          Avg RPE <span className="font-mono">7.8</span> over <span className="font-mono">3</span> sessions, under the{' '}
          <span className="font-mono">8.5</span> cap.
        </p>
      </div>
    </figure>
  );
}

export function Hero() {
  return (
    <section id="demo" aria-labelledby="hero-heading" className="scroll-mt-14 py-16 lg:py-24">
      <div className={clsx(CONTAINER, 'grid grid-cols-1 items-end gap-12 lg:grid-cols-12 lg:gap-10')}>
        <div className="flex min-w-0 flex-col items-start gap-6 lg:col-span-7">
          <h1 id="hero-heading" className="text-balance font-display text-display font-bold">
            The next weight, decided by the last three sessions.
          </h1>
          <p className="max-w-[52ch] text-pretty text-body text-muted lg:text-[17px]">
            Clients log weight, reps and RPE. The engine checks them against your rules and proposes the next load. You accept, edit or
            dismiss.
          </p>
          <DemoForms layout="inline" />
          <p className="font-mono text-micro uppercase text-faint">3 sessions · 4 calls · per-client overrides</p>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <WorkoutPreview />
        </div>
      </div>
    </section>
  );
}
