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
export type NavIconKey =
  | 'users' | 'queue' | 'dumbbell' | 'calendar-range' | 'sliders' | 'today' | 'history' | 'tools' | 'user' | 'billing'
  | 'inbox' | 'folder' | 'message' | 'clipboard' | 'video' | 'phone' | 'zap' | 'radio'
  | 'log' | 'template' | 'trophy' | 'muscle' | 'scale' | 'food' | 'steps' | 'sparkles' | 'group';

export interface NavItem {
  href: string;
  label: string;
  /** Sidebar and "More" sheet heading the item sits under. */
  group: string;
  icon: NavIconKey;
  /** Shorter label for the phone tab bar. */
  short?: string;
  /** Match the exact path only (otherwise prefix match). */
  exact?: boolean;
  /** Extra path prefixes that also light this item (e.g. lift detail pages count as History). */
  also?: readonly string[];
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  return under(item.href) || (item.also ?? []).some(under);
}

/** Groups in display order, each with its items. Order follows first appearance in `nav`. */
export function groupNav(nav: readonly NavItem[]): Array<{ group: string; items: NavItem[] }> {
  const out: Array<{ group: string; items: NavItem[] }> = [];
  for (const item of nav) {
    const bucket = out.find((g) => g.group === item.group);
    if (bucket) bucket.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}

export const COACH_NAV: readonly NavItem[] = [
  { group: 'Clients', href: '/coach/clients', label: 'Roster', icon: 'users' },
  { group: 'Clients', href: '/coach/leads', label: 'Leads', icon: 'inbox' },
  { group: 'Clients', href: '/coach/check-ins', label: 'Check-ins', icon: 'clipboard' },
  { group: 'Clients', href: '/coach/form-checks', label: 'Form checks', icon: 'video' },
  { group: 'Coaching', href: '/coach/progression', label: 'Progression queue', short: 'Queue', icon: 'queue' },
  { group: 'Coaching', href: '/coach/programs', label: 'Programs', icon: 'calendar-range' },
  { group: 'Coaching', href: '/coach/exercises', label: 'Exercise library', icon: 'dumbbell' },
  { group: 'Coaching', href: '/coach/sessions/live', label: 'Live session', icon: 'radio' },
  { group: 'Communication', href: '/coach/messages', label: 'Messages', icon: 'message' },
  { group: 'Communication', href: '/coach/schedule', label: 'Calls', icon: 'phone' },
  { group: 'Communication', href: '/coach/automations', label: 'Automations', icon: 'zap' },
  { group: 'Business', href: '/coach/resources', label: 'Resources', icon: 'folder' },
  { group: 'Business', href: '/coach/billing', label: 'Billing', icon: 'billing' },
  { group: 'Settings', href: '/coach/settings', label: 'Engine rules', icon: 'sliders' },
];

/** Phone tab bar for coaches, in tab order; everything else lives in the "More" sheet. */
export const COACH_TABS: readonly string[] = ['/coach/clients', '/coach/progression', '/coach/messages', '/coach/check-ins'];

export const CLIENT_NAV: readonly NavItem[] = [
  { group: 'Train', href: '/client', label: 'Today', exact: true, icon: 'today' },
  { group: 'Train', href: '/client/log', label: 'Log workout', short: 'Log', icon: 'log' },
  { group: 'Train', href: '/client/templates', label: 'Templates', icon: 'template' },
  { group: 'Train', href: '/client/exercises', label: 'Exercises', icon: 'dumbbell' },
  { group: 'Train', href: '/client/tools', label: 'Calculators', icon: 'tools' },
  { group: 'Progress', href: '/client/history', label: 'History', icon: 'history', also: ['/client/lifts'] },
  { group: 'Progress', href: '/client/records', label: 'Records', icon: 'trophy' },
  { group: 'Progress', href: '/client/analytics/muscles', label: 'Muscle map', icon: 'muscle' },
  { group: 'Body & Fuel', href: '/client/body', label: 'Body', icon: 'scale' },
  { group: 'Body & Fuel', href: '/client/nutrition', label: 'Nutrition', icon: 'food' },
  { group: 'Body & Fuel', href: '/client/health', label: 'Steps', icon: 'steps' },
  { group: 'Body & Fuel', href: '/client/check-in', label: 'Weekly check-in', icon: 'clipboard' },
  { group: 'Coach', href: '/client/messages', label: 'Messages', icon: 'message' },
  { group: 'Coach', href: '/client/calls', label: 'Calls', icon: 'phone' },
  { group: 'Coach', href: '/client/coach-ai', label: 'AI coach', icon: 'sparkles' },
  { group: 'Coach', href: '/client/groups', label: 'Groups', icon: 'group' },
  { group: 'Account', href: '/client/profile', label: 'Profile', icon: 'user' },
  { group: 'Account', href: '/client/billing', label: 'Billing', icon: 'billing' },
];

/** Phone tab bar for athletes, in tab order; everything else lives in the "More" sheet. */
export const CLIENT_TABS: readonly string[] = ['/client', '/client/log', '/client/history', '/client/profile'];
