import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
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
});
