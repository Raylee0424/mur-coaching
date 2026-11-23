import clsx from 'clsx';
import Link from 'next/link';
import { CLIENT_TABS, tabHref, type ClientTab } from './overview-model';

/** Tabs are links so each one is a server-rendered URL (`?tab=`) that survives refresh and sharing. */
export function ClientTabs({ clientId, active }: { clientId: string; active: ClientTab }) {
  return (
    <nav aria-label="Client sections" className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {CLIENT_TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={tabHref(clientId, t.key)}
            aria-current={on ? 'page' : undefined}
            className={clsx(
              '-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:-outline-offset-2',
              on ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
