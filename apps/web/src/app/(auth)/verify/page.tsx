import { redirect } from 'next/navigation';
import { AuthHeading } from '@/components/shell/auth/AuthHeading';
import { VerifyForm } from '@/components/shell/auth/VerifyForm';
import { getCurrentUser } from '@/lib/auth';
import { homeFor, onboardingFor } from '@/lib/routes';

export const metadata = { title: 'Verify email · MUR Coaching' };

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (user.emailVerified) redirect(user.onboardedAt ? homeFor(user.role) : onboardingFor(user.role));
  return (
    <>
      <AuthHeading
        title="Verify your email"
        subtitle={
          <>
            Enter the 6-digit code sent to <span className="font-semibold text-ink">{user.email}</span>. It expires in 15 minutes.
          </>
        }
      />
      <VerifyForm />
    </>
  );
}
