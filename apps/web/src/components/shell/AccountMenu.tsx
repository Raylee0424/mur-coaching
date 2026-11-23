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

/** Account chip + popover: weight unit and sign out. */
export function AccountMenu({ user }: { user: AuthUser }) {
  return (
    <details className="group relative">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-2.5 rounded px-2 hover:bg-raised/60 [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-micro text-ink">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 flex-1 text-left sm:block">
          <span className="block truncate text-ui font-medium">{user.name}</span>
          <span className="block font-mono text-micro uppercase text-faint">{user.role === Role.COACH ? 'Coach' : 'Client'}</span>
        </span>
        <span className="hidden text-faint sm:block">
          <Icon icon={ChevronsUpDown} />
        </span>
      </summary>
      <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-line bg-raised p-1 max-md:top-full md:bottom-full md:right-auto md:left-0 md:mb-1 md:mt-0">
        <form action={setWeightUnit} aria-label="Weight unit" className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-ui text-muted">Weight unit</span>
          <span className="flex rounded border border-line bg-canvas-low p-0.5">
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
                    'h-7 rounded-sm px-2.5 font-mono text-micro uppercase',
                    active ? 'bg-card text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {unit === WeightUnit.KG ? 'kg' : 'lb'}
                </button>
              );
            })}
          </span>
        </form>
        <div className="my-1 border-t border-line" />
        <form action={logout}>
          <SubmitButton variant="ghost" className="w-full justify-start" pendingLabel="Signing out…">
            <Icon icon={LogOut} />
            Sign out
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}
