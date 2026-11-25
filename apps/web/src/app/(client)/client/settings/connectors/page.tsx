import { Feature, Role } from '@coaching/shared';
import { ConnectorsManager } from '@/components/ai/ConnectorsManager';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { billingApi, connectorsApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { API_PUBLIC_URL } from '@/lib/env';

/** AI connectors (`athlete_web_voice_logging_hud_ai_connectors`, bottom half). Listing and revoking never need Pro. */
export default async function ConnectorsPage() {
  await requireUser(Role.CLIENT);
  const [grants, entitlements] = await Promise.all([connectorsApi.list(), billingApi.entitlements()]);
  return (
    <>
      <PageHeader title="AI Connectors" meta={<Badge tone="signal">PRO · READ-ONLY</Badge>} back={{ href: '/client/profile', label: 'Back to profile' }} />
      <ConnectorsManager grants={grants} canCreate={entitlements.features.includes(Feature.AI_COACH)} apiBase={`${API_PUBLIC_URL}/connect/v1`} />
    </>
  );
}
