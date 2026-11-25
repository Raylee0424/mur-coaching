import { Calculator, Dumbbell, ShieldCheck, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { IMPORT_SOURCES } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Term } from '@/components/ui/Term';

const IMPORT_LABEL = `Import from ${[IMPORT_SOURCES.STRONG, IMPORT_SOURCES.HEVY].map((x) => x.label).join(' or ')}`;

const RULES: { icon: LucideIcon; title: ReactNode; body: string }[] = [
  {
    icon: Dumbbell,
    title: 'Heaviest working set per lift',
    body: 'Every rep count keeps its own best, so your top single and your top set of 5 are both saved.',
  },
  {
    icon: ShieldCheck,
    title: 'Warm-ups never count',
    body: 'Sets marked as warm-ups are skipped, so light ramp-up sets never become records.',
  },
  {
    icon: Calculator,
    title: (
      <>
        <Term id="e1rm">Estimated 1-rep max</Term> explained
      </>
    ),
    body: 'The heaviest single rep your working sets predict, worked out with the Epley formula. No max-out test needed.',
  },
];

/** Full-width getting-started state for an athlete with no records yet. */
export function RecordsEmpty() {
  return (
    <section aria-labelledby="records-empty-title" className="rounded-md border border-line bg-card p-6 md:p-10">
      <p className="font-mono text-label-sm uppercase text-primary">GETTING STARTED</p>
      <h2 id="records-empty-title" className="mt-2 font-display text-headline-md text-ink">
        Your first record appears after you log a session
      </h2>
      <p className="mt-3 max-w-2xl text-body-md text-muted">
        As soon as you finish your first workout, MUR Coaching saves your top lifts here automatically.
      </p>
      <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {RULES.map((r, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-md border border-line bg-canvas-low p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary">
              <Icon icon={r.icon} size={20} />
            </span>
            <h3 className="font-display text-title-md text-ink">{r.title}</h3>
            <p className="text-label-md text-muted">{r.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/client/log" className={buttonClass('primary')}>
          Log a workout
        </Link>
        <Link href="/client/settings/data" className={buttonClass('secondary')}>
          {IMPORT_LABEL}
        </Link>
      </div>
    </section>
  );
}
