import { ArrowRight } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { Section } from './Section';

const STEPS = [
  { title: 'Client logs', body: 'Weight, reps and RPE for every working set, from the gym floor.', artifact: '155 kg × 5 @ 8.0' },
  { title: 'Engine evaluates', body: 'Reads the last 3 sessions per lift against your rules.', artifact: 'avg RPE 7.8 < cap 8.5 → increase load' },
  { title: 'Coach decides', body: 'Accept, edit or dismiss. Accepted calls become the next targets.', artifact: 'accepted · 157.5 kg × 5 next' },
] as const;

export function Loop() {
  return (
    <Section id="loop" title="One loop per session.">
      <ol className="grid grid-cols-1 divide-y divide-line border-y border-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative px-0 py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <h3 className="font-sans text-ui font-semibold" style={{ fontStretch: '100%', letterSpacing: 0 }}>
              {s.title}
            </h3>
            <p className="mt-1 max-w-[40ch] text-meta text-muted">{s.body}</p>
            <p className="mt-4 font-mono text-ui text-ink">{s.artifact}</p>
            {i < STEPS.length - 1 ? (
              <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 bg-canvas text-faint lg:block">
                <Icon icon={ArrowRight} />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}
