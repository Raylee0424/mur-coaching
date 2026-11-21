import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/claims';

/** Route handlers may mutate cookies (Server Components may not), hence this hop on a 401. */
export function GET(request: NextRequest): NextResponse {
  const url = new URL('/login', request.url);
  if (request.nextUrl.searchParams.get('reason') === 'expired') url.searchParams.set('reason', 'expired');
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
