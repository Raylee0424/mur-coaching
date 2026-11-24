import { notFound } from 'next/navigation';
import { Role } from '@coaching/shared';
import { SessionReview } from '@/components/session-review/SessionReview';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api/client';
import { sessionReviewApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Session review · MUR Coaching' };

export default async function SessionReviewPage({ params }: { params: Promise<{ clientId: string; logId: string }> }) {
  const user = await requireUser(Role.COACH);
  const { clientId, logId } = await params;
  // The API answers 404 for unknown and cross-tenant ids alike.
  const review = await sessionReviewApi.get(clientId, logId).catch((err: unknown) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  return (
    <>
      <PageHeader
        title={`${review.workoutName ?? 'Session'} · ${review.clientName}`}
        meta={formatDate(review.performedAt)}
        back={{ href: `/coach/clients/${clientId}`, label: `Back to ${review.clientName}` }}
      />
      <SessionReview review={review} unit={user.weightUnit} />
    </>
  );
}
