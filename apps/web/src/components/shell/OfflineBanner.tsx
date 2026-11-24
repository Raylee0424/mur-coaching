'use client';

import { CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/** Stitch offline utility banner (`mur_coaching_utility_states_404_session_expired_offline_sync`). */
export function OfflineBanner() {
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="border-b border-rose/40 bg-rose-bg px-4 py-2 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm border border-rose/40 bg-canvas-low text-rose">
            <Icon icon={CloudOff} size={14} />
          </span>
          <span className="rounded-full border border-rose/40 bg-card px-2.5 py-0.5 font-mono text-label-sm uppercase text-rose">
            OFFLINE SYNC
          </span>
          <span className="font-sans text-label-md font-normal text-ink">
            Connection offline. Active workout drafts remain safe in local storage until you reconnect.
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
          Retry Sync Now
        </Button>
      </div>
    </div>
  );
}
