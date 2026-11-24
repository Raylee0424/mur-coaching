'use client';

import type { LiveSessionDto, WeightUnit } from '@coaching/shared';
import { useEffect, useState } from 'react';
import { loadMyLiveSession } from '@/actions/live';
import { POLL_MS } from '@/components/messages/messages-model';
import { Panel } from '@/components/ui/Card';
import { LiveFeed } from './LiveFeed';

/** Read-only for the athlete: polls while the tab is visible (the browser never holds the session token). */
export function ClientLiveFeed({ initial, unit }: { initial: LiveSessionDto | null; unit: WeightUnit }) {
  const [session, setSession] = useState(initial);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== 'visible') return;
      const res = await loadMyLiveSession();
      if (!stopped && res.ok) setSession(res.data);
    };
    const timer = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!session) return <p role="status" className="text-ui text-muted">No live session right now. This page updates when your coach starts one.</p>;
  const me = session.participants[0];
  return (
    <Panel title={`${session.title} with ${session.coachName}`} meta={`${me?.sets.length ?? 0} sets`}>
      <LiveFeed sets={me?.sets ?? []} unit={unit} />
    </Panel>
  );
}
