import { Role } from '@coaching/shared';

export function homeFor(role: Role): string {
  return role === Role.COACH ? '/coach/clients' : '/client';
}

export function areaFor(role: Role): '/coach' | '/client' {
  return role === Role.COACH ? '/coach' : '/client';
}

/** Open-redirect guard: only same-role in-app paths survive. */
export function safeNext(next: string | null | undefined, role: Role): string | null {
  if (!next) return null;
  const area = areaFor(role);
  return next === area || next.startsWith(`${area}/`) ? next : null;
}

export interface NavItem {
  href: string;
  label: string;
  /** Match the exact path only (otherwise prefix match). */
  exact?: boolean;
  /** Feature not built yet: shown with a "Soon" tag. */
  soon?: boolean;
}

export const COACH_NAV: readonly NavItem[] = [
  { href: '/coach/clients', label: 'Clients' },
  { href: '/coach/progression', label: 'Progression' },
  { href: '/coach/exercises', label: 'Exercises' },
  { href: '/coach/programs', label: 'Programs', soon: true },
];

export const CLIENT_NAV: readonly NavItem[] = [
  { href: '/client', label: 'Today', exact: true },
  { href: '/client/log', label: 'Log session' },
  { href: '/client/history', label: 'History' },
];
