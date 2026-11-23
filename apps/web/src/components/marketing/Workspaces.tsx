import clsx from 'clsx';
import { RecommendationAction } from '@coaching/shared';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';
import { CONTAINER } from './Section';

const QUEUE = [
  { client: 'M. Vance', lift: 'Back squat', from: '155.0 kg × 5', to: '157.5 kg × 5', action: RecommendationAction.INCREASE_LOAD },
  { client: 'E. Rostova', lift: 'Bench press', from: '80.0 kg × 5', to: '80.0 kg × 6', action: RecommendationAction.INCREASE_REPS },
  { client: 'D. Brooks', lift: 'Deadlift', from: '200.0 kg × 3', to: '180.0 kg × 3', action: RecommendationAction.DELOAD },
] as const;

/** Static roster-queue preview. Illustration only. */
function RosterQueuePreview() {
  return (
    <figure aria-label="Example progression queue" className="overflow-hidden rounded-md border border-line bg-card">
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <span className="font-mono text-micro uppercase text-muted">Progression queue</span>
        <span className="font-mono text-micro text-signal">3 pending</span>
      </div>
      <div className="overflow-x-auto">
        <table className={clsx(TABLE, 'min-w-[36rem]')}>
          <caption className="sr-only">Pending engine calls</caption>
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={TH}>Client</th>
              <th scope="col" className={TH}>Lift</th>
              <th scope="col" className={TH_NUM}>Current → Proposed</th>
              <th scope="col" className={TH}>Call</th>
            </tr>
          </thead>
          <tbody>
            {QUEUE.map((r) => (
              <tr key={r.client} className={TR}>
                <td className={clsx(TD, 'whitespace-nowrap font-medium')}>{r.client}</td>
                <td className={clsx(TD, 'whitespace-nowrap text-muted')}>{r.lift}</td>
                <td className={TD_NUM}>
                  <span className="text-faint">{r.from}</span> <span aria-hidden="true" className="text-faint">→</span>
                  <span className="sr-only"> to </span> {r.to}
                </td>
                <td className={TD}>
                  <ActionBadge action={r.action} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const FIELDS = [
  { label: 'Load', value: '67.5', unit: 'kg' },
  { label: 'Reps', value: '6', unit: '' },
  { label: 'RPE', value: '7.5', unit: '' },
] as const;

/** Static set-logger preview at phone width. Illustration only. */
function SetLoggerPreview() {
  return (
    <figure aria-label="Example set logger" className="w-full max-w-[360px] rounded-md border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <p className="text-ui font-semibold">Overhead press</p>
        <p className="mt-0.5 font-mono text-meta text-muted">Target 67.5 kg × 6 @ RPE 8.0</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-line">
        {FIELDS.map((f) => (
          <div key={f.label} className="px-4 py-3">
            <p className="font-mono text-micro uppercase text-muted">{f.label}</p>
            <p className="mt-1 font-mono text-metric">
              {f.value}
              {f.unit ? <span className="ml-1 text-ui text-faint">{f.unit}</span> : null}
            </p>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="border-t border-line p-3">
        <span className="flex h-11 items-center justify-center rounded bg-primary text-body font-medium text-primary-ink">Log set</span>
      </div>
    </figure>
  );
}

const COACH_POINTS = [
  'Roster with adherence and needs-attention flags',
  'A queue of every pending call, bulk accept',
  'Per-client and per-exercise rule overrides',
] as const;

const ATHLETE_POINTS = [
  'Weight, reps and RPE in three taps per set',
  'Repeat last session as a starting point',
  'Every target shows the sessions behind it',
] as const;

function Points({ items }: { items: readonly string[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((p) => (
        <li key={p} className="py-3 text-ui text-muted">
          {p}
        </li>
      ))}
    </ul>
  );
}

export function Workspaces() {
  return (
    <>
      <section id="coaches" aria-labelledby="coaches-heading" className="scroll-mt-14 border-t border-line py-20 lg:py-28">
        <div className={clsx(CONTAINER, 'grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12')}>
          <div className="flex flex-col gap-6 lg:col-span-4">
            <h2 id="coaches-heading" className="font-display text-h1 font-semibold">
              For coaches
            </h2>
            <Points items={COACH_POINTS} />
          </div>
          <div className="min-w-0 lg:col-span-8">
            <RosterQueuePreview />
          </div>
        </div>
      </section>
      <section id="athletes" aria-labelledby="athletes-heading" className="scroll-mt-14 border-t border-line py-20 lg:py-28">
        <div className={clsx(CONTAINER, 'grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12')}>
          <div className="order-2 lg:order-1 lg:col-span-5">
            <SetLoggerPreview />
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2 lg:col-span-4 lg:col-start-9">
            <h2 id="athletes-heading" className="font-display text-h1 font-semibold">
              For athletes
            </h2>
            <Points items={ATHLETE_POINTS} />
          </div>
        </div>
      </section>
    </>
  );
}
