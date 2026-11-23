import Link from 'next/link';
import type { InvitePreviewDto } from '@coaching/shared';
import { AuthHeading, StatusIcon } from '@/components/shell/auth/AuthHeading';
import { InviteForm } from '@/components/shell/auth/InviteForm';
import { buttonClass } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';
import { invitesApi } from '@/lib/api/endpoints';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Accept invite · MUR Coaching' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let preview: InvitePreviewDto;
  try {
    preview = await invitesApi.preview(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
      return (
        <div className="space-y-6">
          <StatusIcon tone="rose">
            <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
            <path d="m3 3 18 18" />
          </StatusIcon>
          <AuthHeading title="Invite link expired" subtitle="This invitation link is no longer valid. Ask your coach for a new link." />
          <Link href="/login" className={buttonClass('secondary')}>
            Back to sign in
          </Link>
        </div>
      );
    }
    throw err;
  }

  const summary = [preview.programName, preview.startDate ? `Starts ${formatDate(preview.startDate)}` : null].filter(Boolean).join(' · ');
  return (
    <>
      <AuthHeading title="Accept invite" subtitle="Create your password to join your coach's workspace." />
      <InviteForm token={token} preview={preview} summary={summary || null} />
    </>
  );
}
