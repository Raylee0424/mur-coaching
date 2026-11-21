import { Role } from '@coaching/shared';
import { ProgressionQueue } from '@/components/progression/ProgressionQueue';
import { parseActionFilter } from '@/components/progression/queue-model';
import { PageHeader } from '@/components/ui/PageHeader';
import { progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Every pending recommendation across the coach's active clients. */
export default async function ProgressionQueuePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(Role.COACH);
  const params = await searchParams;
  const action = parseActionFilter(firstParam(params.action));
  const q = firstParam(params.q)?.trim() ?? '';
  const queue = await progressionApi.queue({ ...(action !== 'ALL' ? { action } : {}), ...(q ? { q } : {}) });

  return (
    <>
      <PageHeader
        title="Progression queue"
        subtitle={`${queue.counts.total} pending ${queue.counts.total === 1 ? 'recommendation' : 'recommendations'}. Accept in bulk, or open a call to see why the engine made it.`}
      />
      <ProgressionQueue queue={queue} action={action} q={q} unit={user.weightUnit} />
    </>
  );
}
