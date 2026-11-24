import clsx from 'clsx';
import { ENGINE_DEFAULTS, RecommendationAction } from '@coaching/shared';
import { Section } from './Section';

const CARDS: readonly {
  action: RecommendationAction;
  pill: string;
  dot: string;
  deltaText: string;
  deltaCls: string;
  body: string;
}[] = [
  {
    action: RecommendationAction.INCREASE_LOAD,
    pill: 'border-emerald/40 bg-emerald-bg text-emerald',
    dot: 'bg-emerald',
    deltaText: '+2.5 kg',
    deltaCls: 'text-emerald',
    body: 'Hit target reps below RPE cap — add weight next session.',
  },
  {
    action: RecommendationAction.INCREASE_REPS,
    pill: 'border-sky/40 bg-sky-bg text-sky',
    dot: 'bg-sky',
    deltaText: '+1–2 reps',
    deltaCls: 'text-sky',
    body: 'Solid execution at current load — push reps before jumping weight.',
  },
  {
    action: RecommendationAction.HOLD,
    pill: 'border-amber/40 bg-amber-bg text-amber',
    dot: 'bg-amber',
    deltaText: '±0.0 kg',
    deltaCls: 'text-amber',
    body: 'Near RPE ceiling — repeat load and consolidate form.',
  },
  {
    action: RecommendationAction.DELOAD,
    pill: 'border-rose/40 bg-rose-bg text-rose',
    dot: 'bg-rose',
    deltaText: `−${ENGINE_DEFAULTS.deloadPercent}% load`,
    deltaCls: 'text-rose',
    body: 'Fatigue or performance drop detected — reduce load to recover.',
  },
];

export function EngineRules() {
  return (
    <Section
      id="progression-engine"
      eyebrow="DETERMINISTIC LOGIC"
      title="The Progression Engine"
      intro="Every recommendation is computed from a lifter's last 3 logged sessions per movement—no black-box AI, just transparent strength rules."
    >
      <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <article key={c.action} className="flex h-full flex-col justify-between gap-6 rounded-md border border-line bg-card p-6">
            <div className="flex flex-col items-start gap-4">
              <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1', c.pill)}>
                <span className={clsx('size-1.5 rounded-full', c.dot)} aria-hidden="true" />
                <span className="font-sans text-label-sm uppercase tracking-wider">{c.action}</span>
              </span>
              <p className="text-pretty font-sans text-body-md text-ink">{c.body}</p>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="font-sans text-label-sm uppercase tracking-wider text-muted">DELTA</span>
              <span className={clsx('font-mono text-label-md tabular-nums', c.deltaCls)}>{c.deltaText}</span>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
