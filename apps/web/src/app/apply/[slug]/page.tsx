import Link from 'next/link';
import type { Metadata } from 'next';
import { Unlink } from 'lucide-react';
import type { PublicIntakeDto } from '@coaching/shared';
import { ApplyForm } from '@/components/leads/ApplyForm';
import { Wordmark } from '@/components/shell/Wordmark';
import { buttonClass } from '@/components/ui/Button';
import { ApiError } from '@/lib/api/client';
import { intakeApi } from '@/lib/api/endpoints';

export const metadata: Metadata = {
  title: 'Apply for coaching · MUR Coaching',
  description: 'Apply to train with a MUR Coaching coach.',
};

/** Public application form. No session needed. */
export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let form: PublicIntakeDto;
  try {
    form = await intakeApi.preview(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-6">
          <Unlink aria-hidden="true" className="size-8 text-rose" />
          <h1 className="font-display text-h2">This application form is not available</h1>
          <p className="text-body text-muted">The coach may have paused applications or changed the link. Ask them for the current one.</p>
          <Link href="/" className={buttonClass('secondary', undefined, 'lg')}>
            MUR Coaching home
          </Link>
        </main>
      );
    }
    throw err;
  }
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <Wordmark />
      <h1 className="mt-8 font-display text-h2">{form.headline}</h1>
      {form.intro ? <p className="mt-2 text-body text-muted">{form.intro}</p> : null}
      <p className="mt-1 font-mono text-meta text-faint">Coach: {form.coachName}</p>
      <div className="mt-8">
        <ApplyForm slug={slug} form={form} />
      </div>
    </main>
  );
}
