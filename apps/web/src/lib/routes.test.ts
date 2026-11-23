import { describe, expect, it } from 'vitest';
import { CLIENT_NAV, homeFor, onboardingFor, safeNext } from './routes';

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

describe('CLIENT_NAV', () => {
  it('is Today / History / Exercises / Tools / Profile, with Today matched exactly', () => {
    expect(CLIENT_NAV.map((i) => [i.label, i.href])).toEqual([
      ['Today', '/client'],
      ['History', '/client/history'],
      ['Exercises', '/client/exercises'],
      ['Tools', '/client/tools'],
      ['Profile', '/client/profile'],
    ]);
    expect(CLIENT_NAV[0]?.exact).toBe(true);
  });
});
