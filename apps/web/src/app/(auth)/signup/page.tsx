import { AuthHeading } from '@/components/shell/auth/AuthHeading';
import { SignupForm } from '@/components/shell/auth/SignupForm';

export const metadata = { title: 'Create account · Ray Coaching' };

export default function SignupPage() {
  return (
    <>
      <AuthHeading title="Create account" subtitle="Choose your role to configure your workspace." />
      <SignupForm />
    </>
  );
}
