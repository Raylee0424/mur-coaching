import { X } from 'lucide-react';
import { dismissTargetsIntro } from '@/actions/account';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Term } from '@/components/ui/Term';

const STEPS = ['You log your sets', 'Engine checks your last 3 sessions', 'It suggests your next weight'] as const;

/** First-run explainer on Today. Dismissal is stored in a cookie by a server action. */
export function TargetsIntro() {
  return (
    <section aria-labelledby="targets-intro-heading" className="rounded-md border border-line bg-card p-5">
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
      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 rounded-sm border border-line bg-canvas-low px-3.5 py-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-container font-mono text-label-sm text-primary">
              {i + 1}
            </span>
            <span className="text-label-md text-ink">{step}</span>
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
