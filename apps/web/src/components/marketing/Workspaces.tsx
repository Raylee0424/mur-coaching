import clsx from 'clsx';
import { Check, CircleCheck, LayoutDashboard, RotateCcw, Smartphone } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { CONTAINER } from './Section';

const COACH_POINTS = [
  'Roster overview & client detail drill-down',
  'Custom exercise library CRUD & RPE rules',
  'One-click Accept / Dismiss on progression queue',
] as const;

const ATHLETE_POINTS = [
  'Fast set-by-set weight, reps, and RPE entry',
  '"Repeat Last Session" one-tap quick-start',
  'Full workout history & transparent progression targets',
] as const;

const QUEUE_ROWS = [
  { client: 'M. Vance', lift: 'Back Squat', badge: '+2.5 kg', badgeCls: 'bg-emerald-bg text-emerald', cta: 'Accept', primaryCta: true },
  { client: 'E. Rostova', lift: 'Bench Press', badge: '+1 rep', badgeCls: 'bg-sky-bg text-sky', cta: 'Accept', primaryCta: true },
  { client: 'D. Brooks', lift: 'Deadlift', badge: 'Deload', badgeCls: 'bg-rose-bg text-rose', cta: 'Review', primaryCta: false },
] as const;

export function Workspaces() {
  return (
    <section className="border-b border-line py-20 lg:py-24">
      <div className={clsx(CONTAINER, 'grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2')}>
        {/* Left Card: For Coaches */}
        <article id="for-coaches" className="scroll-mt-24 flex h-full flex-col justify-between gap-8 rounded-md border border-line bg-card p-8">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5 text-primary">
              <Icon icon={LayoutDashboard} size={20} />
              <span className="font-sans text-label-sm uppercase tracking-wider">COACH WORKSPACE</span>
            </div>
            <h2 className="font-display text-headline-md text-ink">For Coaches</h2>
            <p className="font-sans text-body-md text-muted">
              Manage your entire athlete roster, drill into per-lift history, maintain your exercise library CRUD, and accept or dismiss
              engine calls in one click.
            </p>
            <ul className="flex flex-col gap-2.5">
              {COACH_POINTS.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <Icon icon={CircleCheck} className="shrink-0 text-primary" />
                  <span className="font-sans text-body-md text-ink">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div aria-label="Example client roster queue" className="overflow-hidden rounded-md border border-line bg-canvas-low">
            <div className="flex items-center justify-between border-b border-line bg-card px-4 py-2.5">
              <span className="font-sans text-label-sm uppercase tracking-wider text-muted">CLIENT ROSTER QUEUE</span>
              <span className="font-sans text-label-sm text-primary tabular-nums">3 PENDING</span>
            </div>
            <table className="w-full border-collapse text-left tabular-nums">
              <tbody className="divide-y divide-line">
                {QUEUE_ROWS.map((r) => (
                  <tr key={r.client}>
                    <td className="px-4 py-3 font-sans text-label-md text-ink">{r.client}</td>
                    <td className="px-4 py-3 font-sans text-label-md font-normal text-muted">{r.lift}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 font-sans text-label-sm', r.badgeCls)}>{r.badge}</span>
                    </td>
                    <td className="px-4 py-3 text-right" aria-hidden="true">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-3 py-1 font-sans text-label-sm',
                          r.primaryCta
                            ? 'bg-primary text-primary-ink'
                            : 'border border-line-strong bg-card text-muted',
                        )}
                      >
                        {r.cta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Right Card: For Clients */}
        <article id="for-clients" className="scroll-mt-24 flex h-full flex-col justify-between gap-8 rounded-md border border-line bg-card p-8">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5 text-primary">
              <Icon icon={Smartphone} size={20} />
              <span className="font-sans text-label-sm uppercase tracking-wider">ATHLETE LOGGER</span>
            </div>
            <h2 className="font-display text-headline-md text-ink">For Clients</h2>
            <p className="font-sans text-body-md text-muted">
              Log sets between rests in seconds. Start faster with &ldquo;Repeat Last Session&rdquo;, inspect full lift history, and see
              exactly why your next target moved.
            </p>
            <ul className="flex flex-col gap-2.5">
              {ATHLETE_POINTS.map((p) => (
                <li key={p} className="flex items-center gap-2.5">
                  <Icon icon={CircleCheck} className="shrink-0 text-primary" />
                  <span className="font-sans text-body-md text-ink">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div aria-label="Example mobile set logger" className="flex flex-col gap-3 rounded-md border border-line bg-canvas-low p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <p className="font-display text-title-md text-ink">Overhead Press</p>
                <p className="font-sans text-label-sm text-muted tabular-nums">Target: 67.5 kg × 6 @ RPE 8.0</p>
              </div>
              <span
                aria-hidden="true"
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 py-1.5 font-sans text-label-sm text-ink"
              >
                <Icon icon={RotateCcw} size={14} />
                Repeat Last Session
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 tabular-nums sm:grid-cols-4">
              <div className="flex flex-col rounded-sm border border-line bg-card px-3 py-2">
                <span className="font-sans text-label-sm text-muted">WEIGHT</span>
                <span className="font-display text-title-md text-ink">67.5 kg</span>
              </div>
              <div className="flex flex-col rounded-sm border border-line bg-card px-3 py-2">
                <span className="font-sans text-label-sm text-muted">REPS</span>
                <span className="font-display text-title-md text-ink">6</span>
              </div>
              <div className="flex flex-col rounded-sm border border-line bg-card px-3 py-2">
                <span className="font-sans text-label-sm text-muted">RPE</span>
                <span className="font-display text-title-md text-ink">7.5</span>
              </div>
              <span
                aria-hidden="true"
                className="flex items-center justify-center gap-1 rounded-sm bg-primary px-3 py-2 font-sans text-label-md text-primary-ink"
              >
                <Icon icon={Check} size={16} />
                Log Set
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
