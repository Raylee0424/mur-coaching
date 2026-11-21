import Link from 'next/link';
import { Role } from '@coaching/shared';
import { buttonClass } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { WorkoutLogList } from '@/components/workout-logs/WorkoutLogList';
import { workoutLogsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.CLIENT);
  const params = await searchParams;
  const cursor = firstParam(params.cursor);
  const logged = firstParam(params.logged) === '1';

  const page = await workoutLogsApi.listForClient(user.id, { limit: 20, ...(cursor ? { cursor } : {}) });

  return (
    <>
      <PageHeader title="History" />
      {logged ? (
        <p
          role="status"
          className="mb-4 rounded-md border border-emerald bg-emerald-bg px-3 py-2 text-sm font-medium text-emerald"
        >
          Session logged. Your targets were updated.
        </p>
      ) : null}
      <WorkoutLogList logs={page.items} unit={user.weightUnit} editable />
      <div className="mt-6 flex flex-wrap gap-3">
        {cursor ? (
          <Link href="/client/history" className={buttonClass('secondary')}>
            Newest
          </Link>
        ) : null}
        {page.nextCursor ? (
          <Link href={`/client/history?cursor=${encodeURIComponent(page.nextCursor)}`} className={buttonClass('secondary')}>
            Older sessions
          </Link>
        ) : null}
      </div>
    </>
  );
}
