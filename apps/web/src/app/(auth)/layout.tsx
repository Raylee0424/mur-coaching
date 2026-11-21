import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/marketing/MarketingNav';

const LOG = [
  { date: 'Nov 20', weight: '155.0 kg', reps: '5 / 5', rpe: '8.0' },
  { date: 'Nov 16', weight: '152.5 kg', reps: '5 / 5', rpe: '7.5' },
  { date: 'Nov 12', weight: '150.0 kg', reps: '5 / 5', rpe: '8.0' },
] as const;

/** Illustration of one engine call. Static on purpose: auth pages have no data. */
function EnginePreview() {
  return (
    <figure aria-label="Example progression engine call" className="w-full max-w-md space-y-6">
      <div className="space-y-5 rounded-lg border border-line bg-raised p-6 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Engine log · Barbell back squat</p>
            <h2 className="mt-1 font-display text-xl font-bold">Last 3 sessions</h2>
          </div>
          <span className="tabular inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald/40 bg-emerald-bg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald">
            Increase load +2.5 kg
          </span>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-canvas-low">
          <table className="tabular w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-card text-[11px] uppercase tracking-wider text-muted">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Weight</th>
                <th className="px-3 py-2 font-semibold">Reps</th>
                <th className="px-3 py-2 font-semibold">RPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {LOG.map((r) => (
                <tr key={r.date}>
                  <td className="px-3 py-2 text-muted">{r.date}</td>
                  <td className="px-3 py-2 font-semibold">{r.weight}</td>
                  <td className="px-3 py-2">{r.reps}</td>
                  <td className="px-3 py-2">{r.rpe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border border-emerald/40 bg-emerald-bg p-4">
          <div>
            <p className="tabular text-sm font-semibold text-emerald">Next target: 157.5 kg × 5</p>
            <p className="mt-0.5 text-xs">3-session avg RPE 7.8 is 0.7 below the 8.5 cap.</p>
          </div>
          <span className="tabular font-display text-lg font-bold text-emerald">+2.5 kg</span>
        </div>
      </div>
      <figcaption className="text-center text-sm text-muted">No black-box AI, just transparent strength rules.</figcaption>
    </figure>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:py-8">
        <Link href="/" className="inline-flex w-fit items-center gap-2.5 rounded-[8px]">
          <Logo />
          <span className="font-display text-xl font-semibold tracking-tight">Ray Coaching</span>
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-10">{children}</div>
        <p className="text-center text-xs text-muted">Ray Coaching · Deterministic Strength Progression</p>
      </main>
      <aside className="hidden items-center justify-center border-l border-line bg-card p-10 lg:flex">
        <EnginePreview />
      </aside>
    </div>
  );
}
