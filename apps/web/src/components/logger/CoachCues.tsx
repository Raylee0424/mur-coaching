import { MessageSquareQuote } from 'lucide-react';
import type { CarryForwardCue } from '@coaching/shared';
import { Icon } from '@/components/ui/Icon';

/** Coach comments pinned to carry forward into this session. Shown until the lift (or session) is logged again. */
export function CoachCues({ cues, coachName, label }: { cues: readonly CarryForwardCue[]; coachName: string | null; label: string }) {
  if (cues.length === 0) return null;
  return (
    <section aria-label={label} className="space-y-1.5 border-l-2 border-l-signal bg-signal-bg px-3 py-2">
      <p className="flex items-center gap-1.5 font-mono text-micro uppercase text-signal">
        <Icon icon={MessageSquareQuote} size={14} />
        {coachName ? `From ${coachName}` : 'From your coach'}
      </p>
      <ul className="space-y-1">
        {cues.map((c) => (
          <li key={c.feedbackId} className="text-ui">
            {c.body}
            <span className="ml-2 font-mono text-micro text-faint">
              {c.setNumber !== null ? `set ${c.setNumber} · ` : ''}
              {c.fromDate}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
