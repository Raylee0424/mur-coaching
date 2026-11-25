import 'server-only';
import type { GroupSummaryDto } from '@coaching/shared';
import { socialApi } from '@/lib/api/endpoints';
import type { StepBoard } from './HealthOverview';

/** The requested group, else the first one the viewer shares stats in, else their first group. */
export async function loadStepBoard(groupId: string | undefined): Promise<{ groups: GroupSummaryDto[]; board: StepBoard | null }> {
  const { groups } = await socialApi.overview();
  const group = groups.find((g) => g.id === groupId) ?? groups.find((g) => g.shareStats) ?? groups[0];
  if (!group) return { groups, board: null };
  return { groups, board: { group, board: await socialApi.leaderboard(group.id) } };
}
