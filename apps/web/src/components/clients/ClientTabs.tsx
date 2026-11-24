import clsx from 'clsx';
import Link from 'next/link';
import { CLIENT_TABS, tabHref, type ClientTab } from './overview-model';

/** Tabs are links so each one is a server-rendered URL (`?tab=`) that survives refresh and sharing. */
export function ClientTabs({ clientId, active, pending = 0 }: { clientId: string; active: ClientTab | 'roadmap'; pending?: number }) {
  return (
    <nav aria-label="Client sections" className="mb-6 flex h-10 gap-1 border-b border-line">
      {CLIENT_TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={tabHref(clientId, t.key)}
            aria-current={on ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 text-ui transition-colors focus-visible:-outline-offset-2',
              on ? 'text-ink shadow-[inset_0_-2px_0_theme(colors.ink)]' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.key === 'lifts' && pending > 0 ? <span className="font-mono text-micro text-faint">{pending}</span> : null}
          </Link>
        );
      })}
      <Link
        href={`/coach/clients/${clientId}/roadmap`}
        aria-current={active === 'roadmap' ? 'page' : undefined}
        className={clsx(
          'inline-flex items-center px-3 text-ui transition-colors focus-visible:-outline-offset-2',
          active === 'roadmap' ? 'text-ink shadow-[inset_0_-2px_0_theme(colors.ink)]' : 'text-muted hover:text-ink',
        )}
      >
        Roadmap
      </Link>
    </nav>
  );
}
