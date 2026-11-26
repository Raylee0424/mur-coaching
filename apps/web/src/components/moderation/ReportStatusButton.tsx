'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportStatus } from '@coaching/shared';
import { setReportStatus } from '@/actions/moderation';
import { buttonClass } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { nextStatus } from './moderation-model';

/** Flips one report between OPEN and REVIEWED. */
export function ReportStatusButton({ id, status, targetLabel }: { id: string; status: ReportStatus; targetLabel: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const next = nextStatus(status);

  function click(): void {
    start(async () => {
      const res = await setReportStatus(id, next.status);
      if (res.ok) {
        toast.show({ message: next.toast, tone: 'ok' });
        router.refresh();
      } else toast.show({ message: res.error, tone: 'error' });
    });
  }

  return (
    <button
      type="button"
      className={buttonClass(status === 'OPEN' ? 'primary' : 'secondary', undefined, 'sm')}
      disabled={pending}
      aria-label={`${next.label}: ${targetLabel}`}
      onClick={click}
    >
      {next.label}
    </button>
  );
}
