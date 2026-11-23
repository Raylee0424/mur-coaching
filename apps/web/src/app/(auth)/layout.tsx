import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { RecommendationAction } from '@coaching/shared';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { Wordmark } from '@/components/shell/Wordmark';
import { TABLE, TD, TD_NUM, TH, TH_NUM, THEAD, TR } from '@/components/ui/table';

const LOG = [
  { date: 'Nov 20', weight: '155.0', reps: '5 / 5', rpe: '8.0' },
  { date: 'Nov 16', weight: '152.5', reps: '5 / 5', rpe: '7.5' },
  { date: 'Nov 12', weight: '150.0', reps: '5 / 5', rpe: '8.0' },
] as const;

/** Illustration of one engine call. Static on purpose: auth pages have no data. */
function EnginePreview() {
  return (
    <figure aria-label="Example progression engine call" className="w-full max-w-md overflow-hidden rounded-md border border-line bg-card">
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <span className="font-mono text-micro uppercase text-muted">Back squat · last 3 sessions</span>
      </div>
      <table className={TABLE}>
        <caption className="sr-only">Last three sessions</caption>
        <thead className={THEAD}>
          <tr>
            <th scope="col" className={TH}>Date</th>
            <th scope="col" className={TH_NUM}>Load</th>
            <th scope="col" className={TH_NUM}>Reps</th>
            <th scope="col" className={TH_NUM}>RPE</th>
          </tr>
        </thead>
        <tbody>
          {LOG.map((r) => (
            <tr key={r.date} className={TR}>
              <td className={clsx(TD, 'font-mono text-muted')}>{r.date}</td>
              <td className={TD_NUM}>
                {r.weight}
                <span className="ml-1 text-faint">kg</span>
              </td>
              <td className={TD_NUM}>{r.reps}</td>
              <td className={TD_NUM}>{r.rpe}</td>
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
          Avg RPE <span className="font-mono">7.8</span> over <span className="font-mono">3</span> sessions, <span className="font-mono">0.7</span> under the{' '}
          <span className="font-mono">8.5</span> cap.
        </p>
      </div>
    </figure>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <main className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:py-8">
        <Link href="/" aria-label="MUR Coaching home" className="inline-flex w-fit">
          <Wordmark />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-10">{children}</div>
        <p className="font-mono text-micro text-faint">© 2026 MUR Coaching</p>
      </main>
      <aside className="hidden items-center justify-center border-l border-line bg-canvas-low p-10 lg:flex">
        <EnginePreview />
      </aside>
    </div>
  );
}
