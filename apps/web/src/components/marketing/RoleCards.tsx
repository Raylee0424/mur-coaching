import clsx from 'clsx';
import type { ReactNode } from 'react';
import { CheckCircleIcon, CheckIcon, DashboardIcon, PhoneIcon, ReplayIcon } from './Icons';
import { CONTAINER, Eyebrow } from './Section';

interface RoleCardProps {
  id: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  features: readonly string[];
  preview: ReactNode;
}

function RoleCard({ id, icon, eyebrow, title, body, features, preview }: RoleCardProps) {
  return (
    <article
      id={id}
      aria-labelledby={`${id}-heading`}
      className="flex h-full min-w-0 scroll-mt-24 flex-col justify-between gap-8 rounded-md border border-line bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2.5 text-primary">
          {icon}
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
        <h2 id={`${id}-heading`} className="text-2xl font-bold">
          {title}
        </h2>
        <p className="text-[15px] leading-6 text-muted">{body}</p>
        <ul className="flex flex-col gap-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[15px] leading-6">
              <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      {preview}
    </article>
  );
}

const QUEUE = [
  { name: 'M. Vance', lift: 'Back Squat', call: '+2.5 kg', tone: 'bg-emerald-bg text-emerald', cta: 'Accept' },
  { name: 'E. Rostova', lift: 'Bench Press', call: '+1 rep', tone: 'bg-sky-bg text-sky', cta: 'Accept' },
  { name: 'D. Brooks', lift: 'Deadlift', call: 'Deload', tone: 'bg-rose-bg text-rose', cta: 'Review' },
] as const;

const CELL = 'px-3 py-3 sm:px-4';

/** Static roster-queue preview. Illustration only. */
function RosterQueuePreview() {
  return (
    <figure aria-label="Example client roster queue" className="overflow-hidden rounded-md border border-line bg-canvas-low">
      <div className="flex items-center justify-between border-b border-line bg-card px-3 py-2.5 sm:px-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Client roster queue</span>
        <span className="tabular text-[11px] font-semibold text-primary">3 PENDING</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <tbody className="divide-y divide-line">
            {QUEUE.map((row) => (
              <tr key={row.name}>
                <td className={clsx(CELL, 'whitespace-nowrap text-xs font-semibold')}>{row.name}</td>
                <td className={clsx(CELL, 'hidden whitespace-nowrap text-xs text-muted sm:table-cell')}>{row.lift}</td>
                <td className={CELL}>
                  <span className={clsx('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold', row.tone)}>
                    {row.call}
                  </span>
                </td>
                <td className={clsx(CELL, 'text-right')}>
                  <span
                    className={clsx(
                      'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold',
                      row.cta === 'Accept' ? 'bg-primary text-primary-ink' : 'border border-line-strong bg-card text-muted',
                    )}
                  >
                    {row.cta}
                  </span>
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
  { label: 'Weight', value: '67.5 kg' },
  { label: 'Reps', value: '6' },
  { label: 'RPE', value: '7.5' },
] as const;

/** Static set-logger preview. Illustration only. */
function SetLoggerPreview() {
  return (
    <figure aria-label="Example set logger" className="flex flex-col gap-3 rounded-md border border-line bg-canvas-low p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="font-display font-semibold">Overhead Press</p>
          <p className="tabular text-[11px] font-semibold text-muted">Target: 67.5 kg × 6 @ RPE 8.0</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 py-1.5 text-[11px] font-semibold">
          <ReplayIcon className="size-3.5" />
          Repeat Last Session
        </span>
      </div>
      <div className="tabular grid grid-cols-3 items-stretch gap-2.5 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.label} className="flex min-w-0 flex-col rounded-[8px] border border-line bg-card px-3 py-2">
            <span className="text-[11px] font-semibold uppercase text-muted">{f.label}</span>
            <span className="whitespace-nowrap font-display font-semibold">{f.value}</span>
          </div>
        ))}
        <span className="col-span-3 flex items-center justify-center gap-1 rounded-[8px] bg-primary px-3 py-2 text-xs font-semibold text-primary-ink sm:col-span-1">
          <CheckIcon className="size-4" />
          Log Set
        </span>
      </div>
    </figure>
  );
}

export function RoleCards() {
  return (
    <section aria-label="Built for coaches and clients" className="border-b border-line py-16 lg:py-24">
      <div className={clsx(CONTAINER, 'grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2')}>
        <RoleCard
          id="for-coaches"
          icon={<DashboardIcon className="size-5" />}
          eyebrow="Coach workspace"
          title="For Coaches"
          body="Manage your entire athlete roster, drill into per-lift history, maintain your exercise library, and accept or dismiss engine calls in one click."
          features={[
            'Roster overview & client detail drill-down',
            'Custom exercise library & RPE rules',
            'One-click Accept / Dismiss on progression queue',
          ]}
          preview={<RosterQueuePreview />}
        />
        <RoleCard
          id="for-clients"
          icon={<PhoneIcon className="size-5" />}
          eyebrow="Athlete logger"
          title="For Clients"
          body={'Log sets between rests in seconds. Start faster with "Repeat Last Session", inspect full lift history, and see exactly why your next target moved.'}
          features={[
            'Fast set-by-set weight, reps, and RPE entry',
            '"Repeat Last Session" one-tap quick-start',
            'Full workout history & transparent progression targets',
          ]}
          preview={<SetLoggerPreview />}
        />
      </div>
    </section>
  );
}
