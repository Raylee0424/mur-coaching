import type { AuthUser } from '@coaching/shared';
import { logout } from '@/actions/auth';
import { Badge } from '@/components/ui/Badge';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function UserMenu({ user }: { user: AuthUser }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 text-right md:text-left">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <Badge tone={user.role === 'COACH' ? 'indigo' : 'emerald'}>{user.role === 'COACH' ? 'Coach' : 'Client'}</Badge>
      </div>
      <form action={logout}>
        <SubmitButton variant="secondary" className="min-h-9 py-1" pendingLabel="Signing out…">
          Sign out
        </SubmitButton>
      </form>
    </div>
  );
}
