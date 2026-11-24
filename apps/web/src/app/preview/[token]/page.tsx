import Link from 'next/link';
import type { Metadata } from 'next';
import { Unlink } from 'lucide-react';
import type { SharedProgramDto } from '@coaching/shared';
import { SharedProgramView } from '@/components/programs/SharedProgramView';
import { buttonClass } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';
import { programSharingApi } from '@/lib/api/endpoints';

// A private link: keep it out of search indexes and out of Referer headers.
export const metadata: Metadata = {
  title: 'Program preview · MUR Coaching',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function ProgramPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let program: SharedProgramDto;
  try {
    program = await programSharingApi.preview(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-6">
          <Unlink aria-hidden="true" className="size-8 text-rose" />
          <h1 className="font-display text-h2">This preview link is no longer valid</h1>
          <p className="text-body text-muted">The coach may have turned it off or replaced it. Ask them for a new link.</p>
          <Link href="/" className={buttonClass('secondary', undefined, 'lg')}>
            MUR Coaching home
          </Link>
        </main>
      );
    }
    throw err;
  }
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <SharedProgramView program={program} />
    </main>
  );
}
