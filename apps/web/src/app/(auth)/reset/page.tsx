import { ResetForm } from '@/components/shell/auth/ResetForm';
import { firstParam } from '@/lib/form';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: 'Set new password · Ray Coaching' };

export default async function ResetPage({ searchParams }: { searchParams: SearchParams }) {
  const token = firstParam((await searchParams).token);
  return <ResetForm token={token || undefined} />;
}
