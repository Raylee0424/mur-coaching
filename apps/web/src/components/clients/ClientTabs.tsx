import clsx from 'clsx';
import Link from 'next/link';
import { CLIENT_TABS, tabHref, type ClientTab } from './overview-model';

/** Stitch client section tabs with electric-lime active underline (`coach_client_detail`). */
export function ClientTabs({ clientId, active, pending = 0 }: { clientId: string; active: ClientTab | 'roadmap'; pending?: number }) {
  return (
    <nav aria-label="Client sections" className="mb-6 flex items-center gap-6 overflow-x-auto border-b border-line">
      {CLIENT_TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={tabHref(clientId, t.key)}
            aria-current={on ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 font-sans text-label-lg transition-colors',
              on ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.key === 'lifts' && pending > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-sans text-label-sm text-primary-ink tabular-nums">
                {pending}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link
        href={`/coach/clients/${clientId}/roadmap`}
        aria-current={active === 'roadmap' ? 'page' : undefined}
        className={clsx(
          'inline-flex items-center whitespace-nowrap border-b-2 pb-3 font-sans text-label-lg transition-colors',
          active === 'roadmap' ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink',
        )}
      >
        Roadmap
      </Link>
    </nav>
  );
}
