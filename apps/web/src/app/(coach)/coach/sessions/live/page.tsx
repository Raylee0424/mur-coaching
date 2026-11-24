import { LIVE_MODE_LABELS, Role } from '@coaching/shared';
import { LiveConsole } from '@/components/live/LiveConsole';
import { StartLiveSession } from '@/components/live/StartLiveSession';
import { Panel } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { liveApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

const elapsed = (iso: string): string => {
  const m = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

export default async function LiveSessionPage() {
  const user = await requireUser(Role.COACH);
  const view = await liveApi.view();
  const active = view.active;

  return (
    <>
      <PageHeader
        title={active ? `${active.title} · ${active.participants.map((p) => p.clientName).join(', ')}` : 'Train Together and in person'}
        meta={active ? `started ${elapsed(active.startedAt)} ago` : undefined}
      />
      {active ? (
        <LiveConsole key={active.id} initial={active} exercises={view.exercises} unit={user.weightUnit} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Panel title="Start a session">
            <StartLiveSession clients={view.clients} />
          </Panel>
          <Panel title="Recent sessions">
            {view.recent.length === 0 ? (
              <p className="p-4 text-ui text-muted">No sessions yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {view.recent.map((s) => (
                  <li key={s.id} className="px-4 py-3">
                    <p className="text-ui font-medium">{s.title}</p>
                    <p className="font-mono text-meta text-muted">
                      {formatDate(s.startedAt)} · {LIVE_MODE_LABELS[s.mode]} · {s.participantCount} athlete{s.participantCount === 1 ? '' : 's'} · {s.setCount} sets
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
