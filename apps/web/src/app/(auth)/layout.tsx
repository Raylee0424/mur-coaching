import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { RecommendationAction } from '@coaching/shared';
import { ActionBadge } from '@/components/progression/ActionBadge';
import { Wordmark } from '@/components/shell/Wordmark';

const LOG = [
  { date: 'Nov 20', weight: '155.0 kg', reps: '5 / 5', rpe: '8.0', highlight: true },
  { date: 'Nov 16', weight: '152.5 kg', reps: '5 / 5', rpe: '7.5', highlight: false },
  { date: 'Nov 12', weight: '150.0 kg', reps: '5 / 5', rpe: '8.0', highlight: false },
] as const;

/** Right-column Live Engine Preview card matching `auth_sign_in_account_flows`. */
function EnginePreview() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <figure aria-label="Example progression engine call" className="flex flex-col gap-4 rounded-md border border-line bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-sans text-label-sm uppercase tracking-wider text-muted">LIVE ENGINE PREVIEW</span>
            <p className="mt-0.5 font-display text-title-lg text-ink">Barbell Back Squat</p>
          </div>
          <ActionBadge action={RecommendationAction.INCREASE_LOAD} />
        </div>

        <div className="overflow-hidden rounded-sm border border-line bg-canvas-low">
          <table className="w-full border-collapse text-left tabular-nums">
            <caption className="sr-only">Last three sessions</caption>
            <thead>
              <tr className="border-b border-line bg-card">
                <th scope="col" className="px-4 py-2.5 font-sans text-label-sm text-muted">Date</th>
                <th scope="col" className="px-4 py-2.5 font-sans text-label-sm text-muted">Weight</th>
                <th scope="col" className="px-4 py-2.5 font-sans text-label-sm text-muted">Reps</th>
                <th scope="col" className="px-4 py-2.5 font-sans text-label-sm text-muted">RPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {LOG.map((r) => (
                <tr key={r.date}>
                  <td className="px-4 py-2.5 font-sans text-label-sm text-muted">{r.date}</td>
                  <td className="px-4 py-2.5 font-sans text-label-md text-ink">{r.weight}</td>
                  <td className="px-4 py-2.5 font-sans text-label-md text-ink">{r.reps}</td>
                  <td className={clsx('px-4 py-2.5 font-sans text-label-md', r.highlight ? 'text-primary' : 'text-ink')}>{r.rpe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-sm border border-emerald/40 bg-emerald-bg p-4">
          <div>
            <p className="font-sans text-label-md text-emerald">Next Target: 157.5 kg × 5</p>
            <p className="mt-0.5 font-sans text-label-md font-normal text-ink">3-session avg RPE 7.8 is 0.7 below the 8.5 cap.</p>
          </div>
          <span className="shrink-0 font-mono text-label-md text-primary tabular-nums">+2.5 kg</span>
        </div>
      </figure>

      <p className="text-center font-display text-title-md text-muted">No black-box AI, just transparent strength rules.</p>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-2">
      <main className="flex min-h-dvh flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" aria-label="MUR Coaching home" className="inline-flex rounded-sm">
            <Wordmark />
          </Link>
        </div>
        <div className="mx-auto my-8 flex w-full max-w-md flex-col gap-5">{children}</div>
        <div className="mx-auto w-full max-w-md">
          <p className="font-sans text-label-sm text-muted tabular-nums">© 2026 MUR Coaching</p>
        </div>
      </main>
      <aside className="hidden items-center justify-center border-l border-line bg-canvas-low p-12 lg:flex">
        <EnginePreview />
      </aside>
    </div>
  );
}
