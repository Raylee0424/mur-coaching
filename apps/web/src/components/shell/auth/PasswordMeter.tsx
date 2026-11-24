import clsx from 'clsx';
import { Circle, CircleCheck } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { passwordChecks, passwordScore } from './auth-model';

function Rule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className={clsx('inline-flex items-center gap-1 font-sans text-label-sm', ok ? 'text-emerald' : 'text-muted')}>
      <Icon icon={ok ? CircleCheck : Circle} size={14} />
      {children}
      <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
    </li>
  );
}

/** Stitch 4-bar strength meter plus the two password rules. */
export function PasswordMeter({ password, checklist = true }: { password: string; checklist?: boolean }) {
  const score = passwordScore(password);
  const checks = passwordChecks(password);
  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={clsx(
              'h-1.5 rounded-full transition-colors',
              i < score ? (score >= 3 ? 'bg-emerald' : score === 2 ? 'bg-amber' : 'bg-rose') : 'bg-raised',
            )}
          />
        ))}
      </div>
      {checklist ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
          <Rule ok={checks.length}>8+ characters</Rule>
          <Rule ok={checks.number}>A number</Rule>
        </ul>
      ) : null}
    </div>
  );
}
