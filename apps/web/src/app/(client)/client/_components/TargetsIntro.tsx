import { X } from 'lucide-react';
import { dismissTargetsIntro } from '@/actions/account';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Term } from '@/components/ui/Term';

const STEPS = [
  { full: 'You log your sets', short: 'Log sets' },
  { full: 'Engine checks your last 3 sessions', short: 'Engine checks' },
  { full: 'It suggests your next weight', short: 'Next target' },
] as const;

/** First-run explainer on Today. Dismissal is stored in a cookie by a server action. */
export function TargetsIntro() {
  return (
    <section aria-labelledby="targets-intro-heading" className="rounded-md border border-line bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-label-sm uppercase text-primary">New here?</span>
          <h2 id="targets-intro-heading" className="mt-0.5 font-display text-title-md text-ink">
            How your targets work
          </h2>
        </div>
        <form action={dismissTargetsIntro}>
          <SubmitButton variant="ghost" size="sm" aria-label="Dismiss how your targets work" className="w-9 px-0">
            <Icon icon={X} />
          </SubmitButton>
        </form>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
        {STEPS.map(({ full, short }, i) => (
          <li key={full} className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-canvas-low px-2 py-1.5 sm:gap-3 sm:rounded-sm sm:px-3.5 sm:py-3">
            <span className="inline-flex size-6 shrink-0 sm:size-7 items-center justify-center rounded-full bg-primary-container font-mono text-label-sm text-primary">
              {i + 1}
            </span>
            <span className="min-w-0 truncate text-label-sm text-ink sm:hidden">{short}</span>
            <span className="hidden text-label-md text-ink sm:inline">{full}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-label-md text-muted">
        Each target says how many reps to do and how hard the last rep should feel (<Term id="rpe" />). Your coach can review every change.
      </p>
    </section>
  );
}

const QUICK_TERMS = ['rpe', 'rir', 'oneRm', 'deload'] as const;

/** Pill row of the four terms athletes meet first. */
export function QuickTerms() {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick terms">
      <span className="font-mono text-label-sm uppercase text-muted">Quick terms</span>
      {QUICK_TERMS.map((id) => (
        <Term key={id} id={id} className="inline-flex h-8 items-center rounded-full border border-line bg-card px-3.5 font-sans text-label-md text-ink hover:border-line-strong" />
      ))}
    </div>
  );
}
