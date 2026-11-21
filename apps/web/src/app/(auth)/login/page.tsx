import Link from 'next/link';
import { AuthHeading } from '@/components/shell/auth/AuthHeading';
import { SignInForm } from '@/components/shell/auth/SignInForm';
import { DemoLogin } from '@/components/shell/LoginPanels';
import { firstParam as first } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: 'Sign in · Ray Coaching' };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const expired = first(params.reason) === 'expired';
  const next = first(params.next);

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to your Ray Coaching workspace." />
      {expired ? (
        <p role="status" className="rounded-md border border-amber/40 bg-amber-bg px-3 py-2 text-sm font-medium text-amber">
          Your session expired. Please sign in again.
        </p>
      ) : null}
      <SignInForm {...(next ? { next } : {})} />
      <p className="text-center text-sm text-muted">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create account
        </Link>
      </p>
      <div className="border-t border-line pt-6">
        <DemoLogin />
      </div>
    </>
  );
}
