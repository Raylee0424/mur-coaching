import { ChevronsUpDown, LogOut } from 'lucide-react';
import clsx from 'clsx';
import type { AuthUser } from '@coaching/shared';
import { Role, WeightUnit } from '@coaching/shared';
import { setWeightUnit } from '@/actions/account';
import { logout } from '@/actions/auth';
import { Icon } from '@/components/ui/Icon';
import { SubmitButton } from '@/components/ui/SubmitButton';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Stitch bottom user chip + popover: weight unit and sign out. */
export function AccountMenu({ user }: { user: AuthUser }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm border border-transparent p-1.5 transition-colors hover:bg-raised md:border-line md:bg-card md:p-3 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-sans text-label-md text-primary">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 flex-1 text-left md:block">
          <span className="block truncate font-sans text-label-md text-ink">{user.name}</span>
          <span className="block truncate font-sans text-label-sm text-muted">
            {user.role === Role.COACH ? 'Head Coach' : 'Athlete'}
          </span>
        </span>
        <span className="hidden text-muted md:block">
          <Icon icon={ChevronsUpDown} />
        </span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-line bg-card p-2 max-md:top-full md:bottom-full md:right-auto md:left-0 md:mb-2 md:mt-0">
        <form action={setWeightUnit} aria-label="Weight unit" className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="font-sans text-label-md text-muted">Weight unit</span>
          <span className="inline-flex rounded-full border border-line bg-canvas-low p-0.5">
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
                  className={clsx(
                    'h-7 rounded-full px-3 font-sans text-label-sm uppercase transition-colors',
                    active ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {unit === WeightUnit.KG ? 'kg' : 'lb'}
                </button>
              );
            })}
          </span>
        </form>
        <div className="my-1.5 border-t border-line" />
        <form action={logout}>
          <SubmitButton variant="ghost" size="sm" className="w-full justify-start rounded-sm" pendingLabel="Signing out…">
            <Icon icon={LogOut} />
            Sign out
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}
