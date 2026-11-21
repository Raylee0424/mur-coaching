import { Role, WeightUnit } from '@coaching/shared';
import { setWeightUnit } from '@/actions/account';
import { logout } from '@/actions/auth';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { meApi } from '@/lib/api/endpoints';
import { requireUser } from '@/lib/auth';

export default async function ProfilePage() {
  const user = await requireUser(Role.CLIENT);
  const today = await meApi.today();
  const rows: Array<[string, string]> = [
    ['Name', user.displayName ?? user.name],
    ['Email', user.email],
    ['Coach', today.coachName ?? 'No active coach'],
  ];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" />
      <div className="space-y-5">
        <Card>
          <dl className="divide-y divide-line">
            {rows.map(([term, value]) => (
              <div key={term} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{term}</dt>
                <dd className="min-w-0 truncate text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Weight units</h2>
            <p className="text-xs text-muted">Targets and logs are shown in this unit.</p>
          </div>
          <form action={setWeightUnit} className="flex rounded-full border border-line p-0.5" aria-label="Weight unit">
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
                  className={
                    active
                      ? 'min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-primary-ink'
                      : 'min-h-11 rounded-full px-4 text-sm font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
                  }
                >
                  {unit === WeightUnit.KG ? 'kg' : 'lb'}
                </button>
              );
            })}
          </form>
        </Card>

        <form action={logout}>
          <SubmitButton variant="secondary" className="min-h-12 w-full" pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
