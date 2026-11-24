import { Role } from '@coaching/shared';

export function homeFor(role: Role): string {
  return role === Role.COACH ? '/coach/clients' : '/client';
}

/** Onboarding stepper for a role. */
export function onboardingFor(role: Role): string {
  return role === Role.COACH ? '/welcome/coach' : '/welcome/client';
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

/** String key so server layouts can pass nav to client components; `shell/nav-icons.ts` maps it to an icon. */
export type NavIconKey = 'users' | 'queue' | 'dumbbell' | 'calendar-range' | 'sliders' | 'today' | 'history' | 'tools' | 'user' | 'billing';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
  /** Match the exact path only (otherwise prefix match). */
  exact?: boolean;
}

export const COACH_NAV: readonly NavItem[] = [
  { href: '/coach/clients', label: 'Roster', icon: 'users' },
  { href: '/coach/progression', label: 'Progression queue', icon: 'queue' },
  { href: '/coach/exercises', label: 'Exercise library', icon: 'dumbbell' },
  { href: '/coach/programs', label: 'Programs', icon: 'calendar-range' },
  { href: '/coach/settings', label: 'Engine rules', icon: 'sliders' },
  { href: '/coach/billing', label: 'Billing', icon: 'billing' },
];

/** Phone bottom tab bar (and desktop sidebar). Lift detail pages count as History. */
export const CLIENT_NAV: readonly NavItem[] = [
  { href: '/client', label: 'Today', exact: true, icon: 'today' },
  { href: '/client/history', label: 'History', icon: 'history' },
  { href: '/client/exercises', label: 'Exercises', icon: 'dumbbell' },
  { href: '/client/tools', label: 'Tools', icon: 'tools' },
  { href: '/client/profile', label: 'Profile', icon: 'user' },
];
