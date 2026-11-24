import { Section } from './Section';

const STEPS = [
  {
    n: '01',
    title: 'Log the Session',
    body: 'Client records weight, reps, and RPE for every working set directly from the gym floor.',
  },
  {
    n: '02',
    title: 'Engine Evaluates',
    body: 'Reads the last 3 logs per exercise against deterministic progression rules and RPE caps.',
  },
  {
    n: '03',
    title: 'Coach & Client Align',
    body: "Accept or dismiss recommendations in one click to lock in the next session's exact targets.",
  },
] as const;

export function Loop() {
  return (
    <Section id="how-it-works" eyebrow="WORKFLOW" title="How It Works">
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <article key={s.n} className="flex h-full flex-col gap-4 rounded-md border border-line bg-card p-6">
            <span className="font-display text-metric-xl-mobile lg:text-metric-xl text-muted tabular-nums">{s.n}</span>
            <h3 className="font-display text-title-lg text-ink">{s.title}</h3>
            <p className="text-pretty font-sans text-body-md text-muted">{s.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
