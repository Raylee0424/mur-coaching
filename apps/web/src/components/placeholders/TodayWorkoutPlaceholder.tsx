import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/** Replaced by real schedule data once GET /me/schedule exists. */
export function TodayWorkoutPlaceholder() {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold">Today&apos;s workout</h2>
        <p className="mt-1 text-sm text-muted">Your program schedule will appear here.</p>
      </div>
      <Link href="/client/log" className={buttonClass('primary')}>
        Log a session
      </Link>
    </Card>
  );
}
