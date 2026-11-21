import { firstParam as first } from '@/lib/form';
import { DemoLogin, EmailLogin } from '@/components/shell/LoginPanels';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const expired = first(params.reason) === 'expired';
  const next = first(params.next);

  return (
    <>
      <header className="space-y-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">Precision strength coaching</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Ray Coaching</h1>
        <p className="text-lg text-muted">
          Coach-built programs plus an engine that tells you when to add weight, and when to deload.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Log sets, reps, load and RPE in seconds.</li>
          <li>Progressive-overload recommendations from your real training history.</li>
          <li>Coaches accept or dismiss each recommendation with the numbers in view.</li>
        </ul>
      </header>

      {expired ? (
        <p role="status" className="rounded-md border border-amber/40 bg-amber-bg px-3 py-2 text-sm font-medium text-amber">
          Your session expired. Please sign in again.
        </p>
      ) : null}

      <DemoLogin />
      <EmailLogin {...(next ? { next } : {})} />
    </>
  );
}
