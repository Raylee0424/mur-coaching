import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

/** Graceful 402: explains the Pro feature and keeps every logged set. */
export function UpgradeCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="max-w-xl">
      <EmptyState
        title={title}
        action={
          <Link href="/client/billing" className={buttonClass('primary', undefined, 'md')}>
            See MUR Coaching Pro
          </Link>
        }
      >
        {message} Your logs and history are kept on every plan.
      </EmptyState>
    </div>
  );
}
