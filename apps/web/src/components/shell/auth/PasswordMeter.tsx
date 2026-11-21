import clsx from 'clsx';
import { passwordChecks, passwordScore } from './auth-model';

function Rule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', ok ? 'text-emerald' : 'text-muted')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
        {ok ? <path d="M20 6 9 17l-5-5" /> : <circle cx="12" cy="12" r="9" />}
      </svg>
      {children}
      <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
    </li>
  );
}

/** Strength bars plus the two real password rules. */
export function PasswordMeter({ password, checklist = true }: { password: string; checklist?: boolean }) {
  const score = passwordScore(password);
  const checks = passwordChecks(password);
  return (
    <div className="mt-2 space-y-2">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={clsx('h-1.5 rounded-full', i < score ? (score >= 3 ? 'bg-emerald' : 'bg-amber') : 'bg-raised')} />
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
