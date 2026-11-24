import { Role, WeightUnit } from '@coaching/shared';
import clsx from 'clsx';
import Link from 'next/link';
import { setWeightUnit } from '@/actions/account';
import { logout } from '@/actions/auth';
import { LimitationsPanel } from '@/components/limitations/LimitationsPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { exercisesApi, limitationsApi, meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ProfilePage() {
  const user = await requireUser(Role.CLIENT);
  const [today, limitations, exercises] = await Promise.all([meApi.today(), limitationsApi.list(user.id), exercisesApi.list()]);
  const day = new Date().toISOString().slice(0, 10);
  const rows: Array<[string, string]> = [
    ['Name', user.displayName ?? user.name],
    ['Email', user.email],
    ['Coach', today.coachName ?? 'No active coach'],
  ];

  return (
    <>
      <PageHeader title="Profile" />
      <div className="max-w-2xl space-y-8">
        <dl className="divide-y divide-line border-y border-line">
          {rows.map(([term, value]) => (
            <div key={term} className="flex items-center justify-between gap-4 py-3">
              <dt className="font-mono text-micro uppercase text-muted">{term}</dt>
              <dd className="min-w-0 truncate text-ui">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 py-3">
            <dt>
              <span className="block font-mono text-micro uppercase text-muted">Units</span>
              <span className="block text-meta text-faint">Targets and logs are shown in this unit.</span>
            </dt>
            <dd>
              <form action={setWeightUnit} className="flex gap-0.5 rounded border border-line bg-canvas-low p-0.5" aria-label="Weight unit">
                {[WeightUnit.KG, WeightUnit.LB].map((unit) => {
                  const active = user.weightUnit === unit;
                  return (
                    <button
                      key={unit}
                      type="submit"
                      name="unit"
                      value={unit}
                      aria-pressed={active}
                      disabled={active}
                      className={clsx('h-10 rounded-sm px-4 font-mono text-micro uppercase', active ? 'bg-raised text-ink' : 'text-muted hover:text-ink')}
                    >
                      {unit === WeightUnit.KG ? 'kg' : 'lb'}
                    </button>
                  );
                })}
              </form>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="font-mono text-micro uppercase text-muted">Plan and billing</dt>
            <dd>
              <Link href="/client/billing" className="text-ui text-primary hover:underline">
                Manage
              </Link>
            </dd>
          </div>
        </dl>

        <LimitationsPanel
          clientId={user.id}
          limitations={limitations}
          exercises={exercises.map((e) => ({ id: e.id, name: e.name }))}
          today={day}
          large
        />

        <form action={logout}>
          <SubmitButton variant="secondary" size="lg" className="w-full" pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
