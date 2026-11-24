import { Role } from '@coaching/shared';
import type { AiConversationDto, CoachOverviewDto } from '@coaching/shared';
import { CoachChat } from '@/components/ai/CoachChat';
import { UpgradeCard } from '@/components/ai/UpgradeCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { aiApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** MUR AI Training Coach (Stitch AI training coach Pro screen). `?c=<id>` opens a past conversation. */
export default async function CoachAiPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(Role.CLIENT);
  const conversationId = firstParam((await searchParams).c);

  let overview: CoachOverviewDto | null = null;
  let upgrade: string | null = null;
  try {
    overview = await aiApi.coachOverview();
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) upgrade = err.messages.join(' ');
    else throw err;
  }

  let conversation: AiConversationDto | null = null;
  if (overview && conversationId) {
    try {
      conversation = await aiApi.conversation(conversationId);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
  }

  return (
    <>
      <PageHeader
        title="MUR AI Training Coach"
        meta={<Badge tone="signal">PRO</Badge>}
        back={{ href: '/client', label: 'Back to today' }}
        actions={
          overview ? (
            <span className="hidden font-mono text-label-sm uppercase text-muted md:inline">
              INDEXED: {overview.stats.sessionsIndexed} SESSIONS · {overview.stats.activeLimitations} ACTIVE LIMITATIONS
            </span>
          ) : undefined
        }
      />
      {upgrade ? (
        <UpgradeCard title="The MUR AI Training Coach is a Pro feature" message={upgrade} />
      ) : overview ? (
        <CoachChat key={conversation?.id ?? 'new'} overview={overview} initial={conversation} />
      ) : null}
    </>
  );
}
