import type { AuthUser } from '@coaching/shared';
import { WeightUnit } from '@coaching/shared';
import { setWeightUnit } from '@/actions/account';
import { logout } from '@/actions/auth';
import { Badge } from '@/components/ui/Badge';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function UserMenu({ user }: { user: AuthUser }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 md:justify-between">
      <div className="hidden min-w-0 sm:block md:basis-full">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <Badge tone={user.role === 'COACH' ? 'indigo' : 'emerald'}>{user.role === 'COACH' ? 'Coach' : 'Client'}</Badge>
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
                  ? 'min-h-9 rounded-full bg-primary px-3 text-xs font-bold text-primary-ink'
                  : 'min-h-9 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
              }
            >
              {unit === WeightUnit.KG ? 'kg' : 'lb'}
            </button>
          );
        })}
      </form>
      <form action={logout}>
        <SubmitButton variant="secondary" className="min-h-9 py-1" pendingLabel="Signing out…">
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
