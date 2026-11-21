import clsx from 'clsx';
import { Section } from './Section';

const TONES = {
  emerald: { pill: 'border-emerald/40 bg-emerald-bg text-emerald', dot: 'bg-emerald', text: 'text-emerald' },
  sky: { pill: 'border-sky/40 bg-sky-bg text-sky', dot: 'bg-sky', text: 'text-sky' },
  amber: { pill: 'border-amber/40 bg-amber-bg text-amber', dot: 'bg-amber', text: 'text-amber' },
  rose: { pill: 'border-rose/40 bg-rose-bg text-rose', dot: 'bg-rose', text: 'text-rose' },
} as const;

const ACTIONS = [
  { code: 'INCREASE_LOAD', tone: 'emerald', body: 'Hit target reps below RPE cap: add weight next session.', delta: '+2.5 kg' },
  { code: 'INCREASE_REPS', tone: 'sky', body: 'Solid execution at current load: push reps before jumping weight.', delta: '+1–2 reps' },
  { code: 'HOLD', tone: 'amber', body: 'Near RPE ceiling: repeat load and consolidate form.', delta: '±0.0 kg' },
  { code: 'DELOAD', tone: 'rose', body: 'Fatigue or performance drop detected: reduce load to recover.', delta: '-10% load' },
] as const;

export function ProgressionEngine() {
  return (
    <Section
      id="progression-engine"
      eyebrow="Deterministic logic"
      title="The Progression Engine"
      intro="Every recommendation is computed from a lifter's last 3 logged sessions per movement. No black-box AI, just transparent strength rules."
    >
      <ul className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => {
          const tone = TONES[a.tone];
          return (
            <li key={a.code} className="flex h-full flex-col justify-between gap-6 rounded-md border border-line bg-card p-6">
              <div className="flex flex-col items-start gap-4">
                <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1', tone.pill)}>
                  <span className={clsx('size-1.5 rounded-full', tone.dot)} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{a.code}</span>
                </span>
                <p className="text-pretty text-[15px] leading-6">{a.body}</p>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Delta</span>
                <span className={clsx('tabular text-xs font-semibold', tone.text)}>{a.delta}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
