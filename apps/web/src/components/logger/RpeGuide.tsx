import { SheetButton } from '@/components/ui/Sheet';

const SCALE = [
  { rpe: '10', reps: '0', note: 'Maximum effort. No reps left in the tank.' },
  { rpe: '9.5', reps: '0–1', note: 'No more reps, but could add a little load.' },
  { rpe: '9', reps: '1', note: 'One clean rep left.' },
  { rpe: '8.5', reps: '1–2', note: 'One definite rep left, maybe two.' },
  { rpe: '8', reps: '2', note: 'Two reps left. Bar speed starts to slow.' },
  { rpe: '7', reps: '3', note: 'Three reps left. Fast, controlled bar speed.' },
  { rpe: '5–6', reps: '4+', note: 'Light effort. Warm-up weight territory.' },
] as const;

export function RpeGuide() {
  return (
    <SheetButton
      label="RPE guide"
      title="RPE guide"
      description="Rate of perceived exertion: how many clean reps you had left after the set."
      variant="bottom"
      buttonClassName="min-h-9 py-1"
    >
      <ul className="divide-y divide-line">
        {SCALE.map((row) => (
          <li key={row.rpe} className="grid grid-cols-[3.5rem_4.5rem_1fr] items-center gap-3 py-2.5 text-sm">
            <span className="font-display text-lg font-extrabold text-primary tabular">{row.rpe}</span>
            <span className="font-mono text-xs uppercase text-muted tabular">{row.reps} left</span>
            <span>{row.note}</span>
          </li>
        ))}
      </ul>
    </SheetButton>
  );
}
