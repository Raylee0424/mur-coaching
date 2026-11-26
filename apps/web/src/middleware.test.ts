import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { safeNext } from '@/lib/routes';
import { SESSION_COOKIE } from '@/lib/claims';
import { middleware } from './middleware';

function token(role: 'COACH' | 'CLIENT'): string {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${enc({ alg: 'HS256' })}.${enc({ sub: 'u1', role, exp: Date.now() / 1000 + 3600 })}.sig`;
}

function request(path: string, role?: 'COACH' | 'CLIENT'): NextRequest {
  const headers = role ? { cookie: `${SESSION_COOKIE}=${token(role)}` } : undefined;
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
}

describe('middleware', () => {
  it('renders the landing page for anonymous visitors', () => {
    const res = middleware(request('/'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('sends signed-in users from / to their home', () => {
    expect(middleware(request('/', 'COACH')).headers.get('location')).toBe('http://localhost:3000/coach/clients');
    expect(middleware(request('/', 'CLIENT')).headers.get('location')).toBe('http://localhost:3000/client');
  });

  it('still sends anonymous app requests to /login', () => {
    expect(middleware(request('/coach/clients')).headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fcoach%2Fclients',
    );
  });

  it('keeps the query in next so a copied offer link survives sign-in', () => {
    expect(middleware(request('/client/billing?offer=o1')).headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fclient%2Fbilling%3Foffer%3Do1',
    );
    expect(safeNext('/client/billing?offer=o1', 'CLIENT')).toBe('/client/billing?offer=o1');
  });

  it('keeps sign-in, sign-up, forgot, reset and invite pages public', () => {
    for (const path of ['/login', '/signup', '/forgot', '/reset?token=abc', '/invite/abc123']) {
      expect(middleware(request(path)).headers.get('location')).toBeNull();
    }
  });

  it('sends signed-in users away from login, signup and forgot', () => {
    for (const path of ['/login', '/signup', '/forgot']) {
      expect(middleware(request(path, 'CLIENT')).headers.get('location')).toBe('http://localhost:3000/client');
    }
  });

  it('lets signed-in users open reset and invite links', () => {
    expect(middleware(request('/reset?token=abc', 'COACH')).headers.get('location')).toBeNull();
    expect(middleware(request('/invite/abc', 'CLIENT')).headers.get('location')).toBeNull();
  });

  it('requires a session for /verify', () => {
    expect(middleware(request('/verify')).headers.get('location')).toBe('http://localhost:3000/login');
    expect(middleware(request('/verify', 'CLIENT')).headers.get('location')).toBeNull();
  });

  it('requires a session for /moderation but lets either role through', () => {
    expect(middleware(request('/moderation')).headers.get('location')).toBe('http://localhost:3000/login');
    expect(middleware(request('/moderation', 'COACH')).headers.get('location')).toBeNull();
    expect(middleware(request('/moderation', 'CLIENT')).headers.get('location')).toBeNull();
  });
});
