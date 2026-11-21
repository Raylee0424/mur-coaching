import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@coaching/shared';
import { SESSION_COOKIE, decodeClaims } from '@/lib/claims';
import { homeFor } from '@/lib/routes';

/** Optimistic gate on unverified claims (UX only). Layouts re-check via /auth/me. */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = decodeClaims(token);

  const redirectTo = (path: string): NextResponse => NextResponse.redirect(new URL(path, request.url));

  const inCoach = pathname === '/coach' || pathname.startsWith('/coach/');
  const inClient = pathname === '/client' || pathname.startsWith('/client/');

  if (inCoach || inClient) {
    if (!claims) {
      const url = new URL('/login', request.url);
      url.searchParams.set('next', pathname);
      const res = NextResponse.redirect(url);
      if (token) res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    if (inCoach && claims.role !== Role.COACH) return redirectTo(homeFor(claims.role));
    if (inClient && claims.role !== Role.CLIENT) return redirectTo(homeFor(claims.role));
    return NextResponse.next();
  }

  // Signed-in users skip the landing page and login; anonymous users see them.
  if ((pathname === '/' || pathname === '/login') && claims) return redirectTo(homeFor(claims.role));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|auth/signout).*)'],
};
