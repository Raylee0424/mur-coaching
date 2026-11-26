import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@coaching/shared';
import { SESSION_COOKIE, decodeClaims } from '@/lib/claims';
import { homeFor, onboardingFor } from '@/lib/routes';

const ENTRY_PATHS = new Set(['/', '/login', '/signup', '/forgot']);

/** Optimistic gate on unverified claims (UX only). Layouts re-check via /auth/me. */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = decodeClaims(token);

  const redirectTo = (path: string): NextResponse => NextResponse.redirect(new URL(path, request.url));

  const inCoach = pathname === '/coach' || pathname.startsWith('/coach/');
  const inClient = pathname === '/client' || pathname.startsWith('/client/');
  const inModeration = pathname === '/moderation' || pathname.startsWith('/moderation/');
  const inWelcome = pathname === '/welcome' || pathname.startsWith('/welcome/');

  if (inWelcome) {
    if (!claims) return redirectTo('/login');
    const own = onboardingFor(claims.role);
    return pathname === own || pathname.startsWith(`${own}/`) ? NextResponse.next() : redirectTo(own);
  }

  if (inCoach || inClient) {
    if (!claims) {
      const url = new URL('/login', request.url);
      // Keep the query: a coach's copied link (/client/billing?offer=id) must survive sign-in.
      url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      const res = NextResponse.redirect(url);
      if (token) res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    if (inCoach && claims.role !== Role.COACH) return redirectTo(homeFor(claims.role));
    if (inClient && claims.role !== Role.CLIENT) return redirectTo(homeFor(claims.role));
    return NextResponse.next();
  }

  // Any role may be a moderator; the API decides (404 otherwise). Only a session is required here.
  if (inModeration) {
    if (claims) return NextResponse.next();
    const res = redirectTo('/login');
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Verifying needs a session (the code belongs to the signed-in account).
  if (pathname === '/verify') {
    return claims ? NextResponse.next() : redirectTo('/login');
  }

  // Signed-in users skip the landing page and the sign-in / sign-up / forgot pages.
  // /reset and /invite/* stay open to everyone: the link itself is the credential.
  if (claims && ENTRY_PATHS.has(pathname)) return redirectTo(homeFor(claims.role));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|auth/signout).*)'],
};
