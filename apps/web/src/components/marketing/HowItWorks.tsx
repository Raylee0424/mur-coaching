import { Section } from './Section';

const STEPS = [
  {
    title: 'Log the Session',
    body: 'Client records weight, reps, and RPE for every working set directly from the gym floor.',
  },
  {
    title: 'Engine Evaluates',
    body: 'Reads the last 3 logs per exercise against deterministic progression rules and RPE caps.',
  },
  {
    title: 'Coach & Client Align',
    body: "Accept or dismiss recommendations in one click to lock in the next session's exact targets.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how-it-works" eyebrow="Workflow" title="How It Works">
      <ol className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex h-full flex-col gap-4 rounded-md border border-line bg-card p-6">
            <span aria-hidden="true" className="tabular font-display text-[32px] font-extrabold leading-9 text-muted lg:text-[44px] lg:leading-[48px]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-pretty text-[15px] leading-6 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
