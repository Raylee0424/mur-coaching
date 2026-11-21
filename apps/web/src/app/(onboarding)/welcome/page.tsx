import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { onboardingFor } from '@/lib/routes';

export default async function WelcomePage(): Promise<never> {
  const user = await getCurrentUser();
  redirect(onboardingFor(user.role));
}
