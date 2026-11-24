import { Clock } from 'lucide-react';
import Link from 'next/link';
import { AuthHeading } from '@/components/shell/auth/AuthHeading';
import { SignInForm } from '@/components/shell/auth/SignInForm';
import { DemoLogin } from '@/components/shell/LoginPanels';
import { Icon } from '@/components/ui/Icon';
import { firstParam as first } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: 'Sign in · MUR Coaching' };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const expired = first(params.reason) === 'expired';
  const next = first(params.next);

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to your MUR Coaching workspace." />
      {expired ? (
        <div role="status" className="flex items-start gap-3 rounded-sm border border-amber/40 bg-amber-bg p-3.5 text-amber">
          <Icon icon={Clock} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-label-md">Session expired (401 timeout)</p>
            <p className="mt-0.5 font-sans text-label-sm font-normal text-ink/90">
              Your session timed out after inactivity. Local workout drafts remain preserved — sign in to continue.
            </p>
          </div>
        </div>
      ) : null}
      <SignInForm {...(next ? { next } : {})} />
      <p className="text-center font-sans text-body-md text-muted">
        New here?{' '}
        <Link href="/signup" className="font-sans text-label-lg text-primary hover:underline">
          Create account
        </Link>
      </p>
      <div className="border-t border-line pt-5">
        <DemoLogin />
      </div>
    </>
  );
}
