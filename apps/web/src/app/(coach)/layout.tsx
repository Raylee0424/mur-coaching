import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Role } from '@coaching/shared';
import { AppShell } from '@/components/shell/AppShell';
import { checkInsApi, formChecksApi, messagingApi, progressionApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { COACH_NAV, onboardingFor } from '@/lib/routes';

export default async function CoachLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(Role.COACH);
  if (!user.onboardedAt) redirect(onboardingFor(user.role));
  // Badges are best effort: a failed count never blocks the page.
  const [pending, unread, unreviewed, formChecks] = await Promise.all([
    progressionApi.queue().then((q) => q.counts.total).catch(() => 0),
    messagingApi.inbox().then((i) => i.totalUnread).catch(() => 0),
    checkInsApi.inbox().then((i) => i.unreviewed).catch(() => 0),
    formChecksApi.queue().then((q) => q.pending.length).catch(() => 0),
  ]);
  return (
    <AppShell user={user} nav={COACH_NAV} badges={{ '/coach/progression': pending, '/coach/messages': unread, '/coach/check-ins': unreviewed, '/coach/form-checks': formChecks }}>
      {children}
    </AppShell>
  );
}
