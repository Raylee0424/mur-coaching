import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_NAV, CLIENT_TABS, COACH_NAV, COACH_TABS, MODERATION_NAV_ITEM, groupNav, homeFor, isNavActive, navFor, onboardingFor, safeNext } from './routes';

describe('routes', () => {
  it('maps roles to home', () => {
    expect(homeFor('COACH')).toBe('/coach/clients');
    expect(homeFor('CLIENT')).toBe('/client');
    expect(onboardingFor('COACH')).toBe('/welcome/coach');
    expect(onboardingFor('CLIENT')).toBe('/welcome/client');
  });

  it('safeNext keeps only same-role in-app paths', () => {
    expect(safeNext('/coach/clients/abc', 'COACH')).toBe('/coach/clients/abc');
    expect(safeNext('/client', 'CLIENT')).toBe('/client');
    expect(safeNext('/client/log', 'COACH')).toBeNull();
    expect(safeNext('https://evil.com', 'COACH')).toBeNull();
    expect(safeNext('//evil.com', 'CLIENT')).toBeNull();
    expect(safeNext('/coachevil', 'COACH')).toBeNull();
    expect(safeNext(undefined, 'COACH')).toBeNull();
  });
});

const APP = join(__dirname, '..', 'app');
const pageExists = (href: string, area: '(client)' | '(coach)') => existsSync(join(APP, area, ...href.split('/').filter(Boolean), 'page.tsx'));
const summary = (nav: readonly { group: string; label: string }[]) => groupNav(nav as never).map((g) => [g.group, g.items.map((i) => i.label)]);

describe('CLIENT_NAV', () => {
  it('groups Train / Progress / Body & Fuel / Coach / Account', () => {
    expect(summary(CLIENT_NAV)).toEqual([
      ['Train', ['Today', 'Log workout', 'Templates', 'Exercises', 'Calculators']],
      ['Progress', ['History', 'Records', 'Muscle map']],
      ['Body & Fuel', ['Body', 'Nutrition', 'Steps', 'Weekly check-in']],
      ['Coach', ['Messages', 'Calls', 'AI coach', 'Groups']],
      ['Account', ['Profile', 'Billing']],
    ]);
    expect(CLIENT_NAV[0]?.exact).toBe(true);
  });

  it('links only to routes that exist, with tabs drawn from the nav', () => {
    for (const item of CLIENT_NAV) expect(pageExists(item.href, '(client)'), item.href).toBe(true);
    expect(CLIENT_TABS.map((h) => CLIENT_NAV.find((i) => i.href === h)?.short ?? CLIENT_NAV.find((i) => i.href === h)?.label)).toEqual([
      'Today',
      'Log',
      'History',
      'Profile',
    ]);
  });
});

describe('COACH_NAV', () => {
  it('groups Clients / Coaching / Communication / Business / Settings', () => {
    expect(summary(COACH_NAV)).toEqual([
      ['Clients', ['Roster', 'Leads', 'Check-ins', 'Form checks']],
      ['Coaching', ['Progression queue', 'Programs', 'Exercise library', 'Live session']],
      ['Communication', ['Messages', 'Calls', 'Automations']],
      ['Business', ['Resources', 'Billing']],
      ['Settings', ['Engine rules']],
    ]);
  });

  it('links only to routes that exist, with tabs drawn from the nav', () => {
    for (const item of COACH_NAV) expect(pageExists(item.href, '(coach)'), item.href).toBe(true);
    for (const href of COACH_TABS) expect(COACH_NAV.some((i) => i.href === href), href).toBe(true);
  });
});

describe('isNavActive', () => {
  const find = (href: string) => CLIENT_NAV.find((i) => i.href === href)!;
  it('matches Today exactly and others by prefix', () => {
    expect(isNavActive(find('/client'), '/client')).toBe(true);
    expect(isNavActive(find('/client'), '/client/log')).toBe(false);
    expect(isNavActive(find('/client/nutrition'), '/client/nutrition/plans')).toBe(true);
    expect(isNavActive(find('/client/log'), '/client/logbook')).toBe(false);
  });
  it('lights History on lift detail pages', () => {
    expect(isNavActive(find('/client/history'), '/client/lifts/abc')).toBe(true);
    expect(isNavActive(find('/client/records'), '/client/lifts/abc')).toBe(false);
  });
});

describe('navFor', () => {
  it('leaves the nav alone for non-moderators', () => {
    expect(navFor(COACH_NAV, { isModerator: false })).toBe(COACH_NAV);
    expect(navFor(CLIENT_NAV, { isModerator: false })).toBe(CLIENT_NAV);
  });

  it('appends Reports last for moderators, in its own Platform group', () => {
    const nav = navFor(COACH_NAV, { isModerator: true });
    expect(nav.at(-1)).toBe(MODERATION_NAV_ITEM);
    expect(nav).toHaveLength(COACH_NAV.length + 1);
    const groups = groupNav(nav);
    expect(groups.at(-1)).toEqual({ group: 'Platform', items: [MODERATION_NAV_ITEM] });
  });
});
